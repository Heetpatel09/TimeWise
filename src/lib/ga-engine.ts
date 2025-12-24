
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
    batch?: 'A' | 'B';
}

interface Lecture {
    classId: string;
    subjectId: string;
    isLab: boolean;
    facultyId: string;
    batch?: 'A' | 'B';
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
            // A lab needs a 2-hour slot. We add two genes for it.
            lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, facultyId: facultyId, batch: 'A' });
            lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, facultyId: facultyId, batch: 'A' });
            lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, facultyId: facultyId, batch: 'B' });
            lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, facultyId: facultyId, batch: 'B' });
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: false, facultyId: facultyId });
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
    
    const labsA = lectureQueue.filter(l => l.isLab && l.batch === 'A');
    const labsB = lectureQueue.filter(l => l.isLab && l.batch === 'B');
    const theories = lectureQueue.filter(l => !l.isLab);

    const placeLabBatch = (labBatch: Lecture[], batchName: 'A' | 'B') => {
        const labRooms = input.classrooms.filter(c => c.type === 'lab');
        if (labRooms.length === 0) return false;

        let placed = false;
        
        for(const day of workingDays) {
            for (let i = 0; i < timeSlots.length - 1; i++) {
                 const time1 = timeSlots[i];
                 const time2 = timeSlots[i+1];

                 const slotKey1 = `${day}-${time1}`;
                 const slotKey2 = `${day}-${time2}`;
                
                const facultyBusy = facultyTimeMap.get(labBatch[0].facultyId)?.has(slotKey1) || facultyTimeMap.get(labBatch[0].facultyId)?.has(slotKey2);
                if (facultyBusy) continue;

                if (finalSchedule.some(g => g.day === day && (g.time === time1 || g.time === time2))) continue;

                const availableRoom = labRooms.find(room => 
                    !classroomTimeMap.get(room.id)?.has(slotKey1) && 
                    !classroomTimeMap.get(room.id)?.has(slotKey2)
                );

                if (availableRoom) {
                    finalSchedule.push({ ...labBatch[0], day, time: time1, classroomId: availableRoom.id, batch: batchName });
                    finalSchedule.push({ ...labBatch[0], day, time: time2, classroomId: availableRoom.id, batch: batchName });

                    if (!facultyTimeMap.has(labBatch[0].facultyId)) facultyTimeMap.set(labBatch[0].facultyId, new Set());
                    facultyTimeMap.get(labBatch[0].facultyId)!.add(slotKey1).add(slotKey2);
                    
                    if (!classroomTimeMap.has(availableRoom.id)) classroomTimeMap.set(availableRoom.id, new Set());
                    classroomTimeMap.get(availableRoom.id)!.add(slotKey1).add(slotKey2);
                    
                    placed = true;
                    break;
                }
            }
            if (placed) break;
        }
        return placed;
    }
    
    placeLabBatch(labsA, 'A');
    placeLabBatch(labsB, 'B');

    // 2. Place Theory Lectures
    const theoryRooms = input.classrooms.filter(c => c.type === 'classroom');
    for (const theory of theories) {
         let placed = false;
         for (const day of workingDays) {
             for (const time of timeSlots) {
                const slotKey = `${day}-${time}`;
                
                if (finalSchedule.some(g => g.day === day && g.time === time)) continue;

                if (facultyTimeMap.get(theory.facultyId)?.has(slotKey)) continue;

                const availableRoom = theoryRooms.find(room => !classroomTimeMap.get(room.id)?.has(slotKey));

                if (availableRoom) {
                    const gene: Gene = { ...theory, day, time, classroomId: availableRoom.id };
                    finalSchedule.push(gene);

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
    
    const academicSlotsCount = finalSchedule.filter(s => s.subjectId !== 'LIB001').length;
    if (academicSlotsCount < 21) {
        return { success: false, message: `Could not schedule all required lectures. Only placed ${academicSlotsCount} out of 21. Please check constraints (e.g., faculty availability, classroom availability).`, bestTimetable: null, generations: 0, fitness: -1, codeChefDay: null };
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


    return { 
        success: true, 
        message: 'Successfully generated a conflict-free schedule.', 
        bestTimetable: finalSchedule, 
        generations: 1, 
        fitness: 0, 
        codeChefDay: codeChefDay 
    };
}

    