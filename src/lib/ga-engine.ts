
'use server';

import type { GenerateTimetableInput, SubjectPriority, Class, Subject, Faculty, Classroom, Schedule } from './types';

// --- Data Structures ---
interface Gene {
    day: string;
    time: string;
    classId: string;
    subjectId: string;
    facultyId: string;
    classroomId: string;
    isLab: boolean;
    isCodeChef?: boolean;
}

interface Lecture {
    classId: string;
    subjectId: string;
    isLab: boolean;
    facultyId: string;
}

// --- Helper Functions ---
const getHoursForPriority = (priority?: SubjectPriority): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 3;
    }
};

function getFacultyForSubject(subjectId: string, facultyList: Faculty[]): string | null {
    const assignedFaculty = facultyList.find(f => f.allottedSubjects?.includes(subjectId));
    return assignedFaculty?.id || null;
}

/**
 * Creates a list of all required lectures based on subject priorities.
 */
function createLectureList(input: GenerateTimetableInput): Lecture[] {
    const lectures: Lecture[] = [];
    const classToSchedule = input.classes[0]; // We are always scheduling for one class
    
    const classSubjects = input.subjects.filter(s => s.semester === classToSchedule.semester && s.department === classToSchedule.department);

    classSubjects.forEach(sub => {
        const facultyId = getFacultyForSubject(sub.id, input.faculty);
        if (!facultyId) {
            console.warn(`Skipping subject ${sub.name} as no faculty is assigned.`);
            return;
        }

        if (sub.type === 'lab') {
            // Add one entry for the 2-hour lab block
            lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, facultyId });
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: false, facultyId });
            }
        }
    });

    return lectures;
}

/**
 * Main placement algorithm. This is a deterministic approach, not a GA.
 */
export async function runGA(input: GenerateTimetableInput) {
    const lectureQueue = createLectureList(input);
    const timeSlots = input.timeSlots;
    const allDays = input.days;
    
    const codeChefDay = allDays[Math.floor(Math.random() * allDays.length)];
    const workingDays = allDays.filter(d => d !== codeChefDay);

    const finalSchedule: Gene[] = [];
    
    // Create a grid of all available slots, also checking against existing schedule for other classes
    const availableSlots: { day: string, time: string }[] = [];
    workingDays.forEach(day => {
        timeSlots.forEach(time => {
             const isOccupied = input.existingSchedule?.some(slot => slot.day === day && slot.time === time);
             if(!isOccupied) {
                availableSlots.push({ day, time });
             }
        });
    });

    const facultyTimeMap = new Map<string, Set<string>>(); // key: facultyId, value: Set<day-time>
    const classroomTimeMap = new Map<string, Set<string>>(); // key: classroomId, value: Set<day-time>
    
    // Pre-populate maps with existing schedule to avoid conflicts
    input.existingSchedule?.forEach(slot => {
        const slotKey = `${slot.day}-${slot.time}`;
        if (!facultyTimeMap.has(slot.facultyId)) facultyTimeMap.set(slot.facultyId, new Set());
        facultyTimeMap.get(slot.facultyId)!.add(slotKey);
        
        if (!classroomTimeMap.has(slot.classroomId)) classroomTimeMap.set(slot.classroomId, new Set());
        classroomTimeMap.get(slot.classroomId)!.add(slotKey);
    });

    const labs = lectureQueue.filter(l => l.isLab);
    const theories = lectureQueue.filter(l => !l.isLab);

    // 1. Place Labs First (they are the most constrained)
    for (const lab of labs) {
        const labRooms = input.classrooms.filter(c => c.type === 'lab');
        if (labRooms.length === 0) continue; // Cannot schedule lab

        let placed = false;
        // Iterate through days and time slots to find a 2-hour window
        for (const day of workingDays) {
            for (let i = 0; i < timeSlots.length - 1; i++) {
                const time1 = timeSlots[i];
                const time2 = timeSlots[i+1];

                const slotKey1 = `${day}-${time1}`;
                const slotKey2 = `${day}-${time2}`;

                const facultyBusy = facultyTimeMap.get(lab.facultyId)?.has(slotKey1) || facultyTimeMap.get(lab.facultyId)?.has(slotKey2);
                if (facultyBusy) continue;

                // Find an available lab room for both slots
                const availableRoom = labRooms.find(room => 
                    !classroomTimeMap.get(room.id)?.has(slotKey1) && 
                    !classroomTimeMap.get(room.id)?.has(slotKey2)
                );

                if (availableRoom) {
                    const gene1: Gene = { ...lab, day, time: time1, classroomId: availableRoom.id };
                    const gene2: Gene = { ...lab, day, time: time2, classroomId: availableRoom.id };
                    finalSchedule.push(gene1, gene2);

                    // Mark slots as taken
                    if (!facultyTimeMap.has(lab.facultyId)) facultyTimeMap.set(lab.facultyId, new Set());
                    facultyTimeMap.get(lab.facultyId)!.add(slotKey1).add(slotKey2);
                    
                    if (!classroomTimeMap.has(availableRoom.id)) classroomTimeMap.set(availableRoom.id, new Set());
                    classroomTimeMap.get(availableRoom.id)!.add(slotKey1).add(slotKey2);
                    
                    placed = true;
                    break;
                }
            }
            if (placed) break;
        }
    }

    // 2. Place Theory Lectures
    const theoryRooms = input.classrooms.filter(c => c.type === 'classroom');
    for (const theory of theories) {
         let placed = false;
         // Find a free slot for this theory lecture
         for (const day of workingDays) {
             for (const time of timeSlots) {
                const slotKey = `${day}-${time}`;
                
                // Is the class itself already busy?
                if (finalSchedule.some(g => g.day === day && g.time === time)) continue;

                // Is the faculty busy?
                if (facultyTimeMap.get(theory.facultyId)?.has(slotKey)) continue;

                // Find an available classroom
                const availableRoom = theoryRooms.find(room => !classroomTimeMap.get(room.id)?.has(slotKey));

                if (availableRoom) {
                    const gene: Gene = { ...theory, day, time, classroomId: availableRoom.id };
                    finalSchedule.push(gene);

                    // Mark resources as used
                    if (!facultyTimeMap.has(theory.facultyId)) facultyTimeMap.set(theory.facultyId, new Set());
                    facultyTimeMap.get(theory.facultyId)!.add(slotKey);
                    
                    if (!classroomTimeMap.has(availableRoom.id)) classroomTimeMap.set(availableRoom.id, new Set());
                    classroomTimeMap.get(availableRoom.id)!.add(slotKey);

                    placed = true;
                    break;
                }
             }
             if (placed) break;
         }
    }
    
    // 3. Fill remaining slots with Library
    const openSlots: {day: string, time: string}[] = [];
    workingDays.forEach(day => {
        timeSlots.forEach(time => {
            const isFilled = finalSchedule.some(g => g.day === day && g.time === time);
            if (!isFilled) {
                openSlots.push({ day, time });
            }
        });
    });

    for (let i = 0; i < 3 && i < openSlots.length; i++) {
        const { day, time } = openSlots[i];
         finalSchedule.push({
            day,
            time,
            classId: input.classes[0].id,
            subjectId: 'LIB001', // Placeholder for Library
            facultyId: 'NA',
            classroomId: 'NA',
            isLab: false,
        });
    }

    if (finalSchedule.filter(s => !s.isLab).length + (finalSchedule.filter(s => s.isLab).length / 2) < 21) {
         return { success: false, message: 'Failed to schedule all required lectures. Check constraints.', bestTimetable: null, generations: 0, fitness: -1, codeChefDay: null };
    }

    return { 
        success: true, 
        message: 'Successfully generated a conflict-free schedule.', 
        bestTimetable: finalSchedule, 
        generations: 1, // Not a GA anymore, but keeping structure
        fitness: 0, 
        codeChefDay: codeChefDay 
    };
}
