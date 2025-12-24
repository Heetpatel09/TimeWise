
'use server';

import type { GenerateTimetableInput, Subject, Faculty, Classroom, Schedule } from './types';

// This is a more robust, deterministic scheduler that combines dynamic data with a structured template.

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const CODECHEF_DAY = 'Saturday';

// The precise time slots as requested by the user
const ALL_TIME_SLOTS = [
    '07:30-08:25',
    '08:25-09:20',
    '09:20-09:30', // Break
    '09:30-10:25',
    '10:25-11:20',
    '11:20-12:20', // Lunch
    '12:20-01:15',
    '01:15-02:10'
];

const LECTURE_TIME_SLOTS = ALL_TIME_SLOTS.filter(t => t !== '09:20-09:30' && t !== '11:20-12:20');

// --- Helper Functions ---
function getFacultyForSubject(subjectId: string, facultyList: Faculty[]): string | null {
    const assignedFaculty = facultyList.find(f => f.allottedSubjects?.includes(subjectId));
    return assignedFaculty?.id || null;
}

function findAvailableRoom(type: 'lab' | 'classroom', day: string, time: string, classrooms: Classroom[], schedule: Schedule[]): string | null {
    const availableRooms = classrooms.filter(room => room.type === type);
    for (const room of availableRooms) {
        const isOccupied = schedule.some(slot =>
            slot.day === day && slot.time === time && slot.classroomId === room.id
        );
        if (!isOccupied) {
            return room.id;
        }
    }
    return null;
}

const getHoursForPriority = (priority?: Subject['priority']): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 3; // Default to 3 hours if not specified
    }
};

export async function runGA(input: GenerateTimetableInput) {
    const { classes: classesToSchedule, subjects, faculty, classrooms, existingSchedule } = input;
    const finalSchedule: Schedule[] = [...(existingSchedule || [])];
    const classToSchedule = classesToSchedule[0]; // We are generating for one class at a time.

    const allClassSubjects = subjects.filter(s => s.semester === classToSchedule.semester && s.department === classToSchedule.department);
    
    // --- Create a list of all required lectures ---
    const lectureQueue: { subjectId: string, isLab: boolean, batch?: 'A' | 'B' }[] = [];
    
    // 1. Add Lab subjects (2 consecutive slots for each batch)
    const labSubjects = allClassSubjects.filter(s => s.type === 'lab');
    labSubjects.forEach(sub => {
        // One session for Batch A (represented by two consecutive genes)
        lectureQueue.push({ subjectId: sub.id, isLab: true, batch: 'A' });
        lectureQueue.push({ subjectId: sub.id, isLab: true, batch: 'A' });
        // One session for Batch B
        lectureQueue.push({ subjectId: sub.id, isLab: true, batch: 'B' });
        lectureQueue.push({ subjectId: sub.id, isLab: true, batch: 'B' });
    });

    // 2. Add Theory subjects based on priority
    const theorySubjects = allClassSubjects.filter(s => s.type === 'theory');
    theorySubjects.forEach(sub => {
        const hours = getHoursForPriority(sub.priority);
        for (let i = 0; i < hours; i++) {
            lectureQueue.push({ subjectId: sub.id, isLab: false });
        }
    });

    const generatedSchedule: Schedule[] = [];
    const occupiedSlots = new Set<string>(); // "day-time" for the current class

    // --- Placement Algorithm ---

    // 1. Place Labs First (Max 1 lab session per day for this class)
    const dailyLabCount = new Map<string, number>();
    DAYS.forEach(d => dailyLabCount.set(d, 0));

    const labQueue = lectureQueue.filter(l => l.isLab);
    const placedLabSubjects = new Set<string>(); // To track which lab (subject+batch) has been placed

    for (let i = 0; i < labQueue.length; i += 2) {
        const labGene1 = labQueue[i];
        const labGene2 = labQueue[i+1];
        const subjectId = labGene1.subjectId;
        const batch = labGene1.batch;
        
        if (placedLabSubjects.has(`${subjectId}-${batch}`)) continue;

        let placed = false;
        for (const day of DAYS) {
            if ((dailyLabCount.get(day) || 0) >= 1) continue; // Max one lab session per day for this class

            for (let j = 0; j < LECTURE_TIME_SLOTS.length - 1; j++) {
                const time1 = LECTURE_TIME_SLOTS[j];
                const time2 = LECTURE_TIME_SLOTS[j+1];

                const slotKey1 = `${day}-${time1}`;
                const slotKey2 = `${day}-${time2}`;

                if (occupiedSlots.has(slotKey1) || occupiedSlots.has(slotKey2)) continue;

                const facultyId = getFacultyForSubject(subjectId, faculty);
                if (!facultyId) continue;
                
                // Check faculty availability for both slots in the master schedule
                const isFacultyBusy = finalSchedule.some(s => s.facultyId === facultyId && s.day === day && (s.time === time1 || s.time === time2));
                if (isFacultyBusy) continue;

                const classroomId = findAvailableRoom('lab', day, time1, classrooms, finalSchedule);
                if (!classroomId || findAvailableRoom('lab', day, time2, classrooms, finalSchedule) !== classroomId) continue; // Must be same room and available

                // Place the lab
                generatedSchedule.push({ id: `GEN${Date.now()}${Math.random()}`, day, time: time1, classId: classToSchedule.id, subjectId, facultyId, classroomId, batch });
                generatedSchedule.push({ id: `GEN${Date.now()}${Math.random()}`, day, time: time2, classId: classToSchedule.id, subjectId, facultyId, classroomId, batch });
                occupiedSlots.add(slotKey1);
                occupiedSlots.add(slotKey2);
                dailyLabCount.set(day, (dailyLabCount.get(day) || 0) + 1);
                placedLabSubjects.add(`${subjectId}-${batch}`);
                placed = true;
                break;
            }
            if (placed) break;
        }
    }
    
    // 2. Place Theory Lectures
    const theoryQueue = lectureQueue.filter(l => !l.isLab);
    theoryQueue.forEach(theoryGene => {
        let placed = false;
        for (const day of DAYS) {
            for (const time of LECTURE_TIME_SLOTS) {
                const slotKey = `${day}-${time}`;
                if (occupiedSlots.has(slotKey)) continue;

                const facultyId = getFacultyForSubject(theoryGene.subjectId, faculty);
                if (!facultyId) continue;
                
                const isFacultyBusy = [...finalSchedule, ...generatedSchedule].some(s => s.facultyId === facultyId && s.day === day && s.time === time);
                if (isFacultyBusy) continue;

                const classroomId = findAvailableRoom('classroom', day, time, classrooms, [...finalSchedule, ...generatedSchedule]);
                if (!classroomId) continue;

                // Soft constraint: avoid more than 2 lectures of same subject on a day
                const subjectCountToday = generatedSchedule.filter(g => g.day === day && g.subjectId === theoryGene.subjectId).length;
                if(subjectCountToday >= 2) continue;

                generatedSchedule.push({ id: `GEN${Date.now()}${Math.random()}`, day, time, classId: classToSchedule.id, ...theoryGene, classroomId });
                occupiedSlots.add(slotKey);
                placed = true;
                break;
            }
            if (placed) break;
        }
    });

    // 3. Fill remaining slots with Library (up to 3)
    let librarySlots = 0;
    for (const day of DAYS) {
        if(librarySlots >= 3) break;
        for (const time of LECTURE_TIME_SLOTS) {
             if(librarySlots >= 3) break;
            const slotKey = `${day}-${time}`;
            if (!occupiedSlots.has(slotKey)) {
                generatedSchedule.push({
                    id: `GEN${Date.now()}${Math.random()}`,
                    day, time, classId: classToSchedule.id,
                    subjectId: 'LIB001', facultyId: 'NA', classroomId: 'NA',
                    isLab: false
                });
                occupiedSlots.add(slotKey);
                librarySlots++;
            }
        }
    }

    // 4. Check if we managed to schedule all required academic lectures
    const academicSlotsCount = generatedSchedule.filter(g => g.subjectId !== 'LIB001' && g.subjectId !== 'CODECHEF').length;
    if (academicSlotsCount < lectureQueue.length) {
         return {
             success: false,
             message: `Could not schedule all required lectures. Only placed ${academicSlotsCount} out of ${lectureQueue.length}. This may be due to a lack of available faculty or classrooms.`,
             bestTimetable: [],
             generations: 0,
             fitness: -1,
             codeChefDay: CODECHEF_DAY,
        }
    }
    
    // Add CodeChef day to the final schedule for display purposes. This doesn't go into the main DB.
    LECTURE_TIME_SLOTS.forEach(time => {
        generatedSchedule.push({
            id: `GEN${Date.now()}${Math.random()}`,
            day: CODECHEF_DAY,
            time,
            classId: classToSchedule.id,
            subjectId: 'CODECHEF',
            facultyId: 'NA',
            classroomId: 'NA',
            isLab: false,
            isCodeChef: true,
        });
    });


    return {
        success: true,
        message: 'Successfully generated a complete and conflict-free schedule.',
        bestTimetable: generatedSchedule,
        generations: 1, // Not using GA generations anymore
        fitness: 0, // No conflicts
        codeChefDay: CODECHEF_DAY,
    };
}
