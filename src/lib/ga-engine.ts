
'use server';

import type { GenerateTimetableInput, Schedule, SubjectPriority } from './types';

// --- Data Structures ---
interface Gene {
    day: string;
    time: string;
    classId: string;
    subjectId: string;
    facultyId: string;
    classroomId: string;
    isLab: boolean;
    batch?: 'A' | 'B';
    isCodeChef?: boolean;
}

interface LectureToBePlaced {
    subjectId: string;
    facultyId: string;
    isLab: boolean;
    classId: string;
    batch?: 'A' | 'B';
    hours: number;
}

// --- Helper Functions & Configuration ---
const LECTURE_TIME_SLOTS = [
    '07:30 AM - 08:30 AM',
    '08:30 AM - 09:30 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '01:00 PM - 02:00 PM',
    '02:00 PM - 03:00 PM'
];

const getHoursForPriority = (priority?: SubjectPriority): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 2; // Default hours
    }
};

/**
 * Creates a list of lectures to be placed based on subject priorities.
 */
function createLectureList(input: GenerateTimetableInput): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classToSchedule = input.classes[0];
    const classSubjects = input.subjects.filter(
        s => s.semester === classToSchedule.semester && s.department === classToSchedule.department
    );

    for (const sub of classSubjects) {
        const facultyForSubject = input.faculty.find(f => f.allottedSubjects?.includes(sub.id));
        if (!facultyForSubject) {
            console.warn(`[Scheduler] No faculty found for subject ${sub.name}. Skipping.`);
            continue;
        }

        if (sub.type === 'lab') {
            // Labs are 2 hours long. We need one session for Batch A and one for Batch B.
            lectures.push({
                classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                isLab: true, batch: 'A', hours: 2
            });
            lectures.push({
                classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                isLab: true, batch: 'B', hours: 2
            });
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lectures.push({
                    classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                    isLab: false, hours: 1
                });
            }
        }
    }
    
    // Sort by labs first, then theory
    lectures.sort((a, b) => (b.isLab ? 1 : 0) - (a.isLab ? 1 : 0));

    return lectures;
}

function isConflict(schedule: (Gene | Schedule)[], day: string, time: string, facultyId: string, classroomId: string, classId: string): boolean {
    return schedule.some(gene => 
        gene.day === day && 
        gene.time === time &&
        (gene.facultyId === facultyId || gene.classroomId === classroomId || gene.classId === classId)
    );
}


function canPlaceLab(schedule: (Gene | Schedule)[], day: string, time1: string, time2: string, facultyId: string, classroomId: string, classId: string): boolean {
    // Check conflicts for both slots in the combined schedule
    if (isConflict(schedule, day, time1, facultyId, classroomId, classId) || isConflict(schedule, day, time2, facultyId, classroomId, classId)) {
        return false;
    }
    // Check max one lab per day for this class
    if (schedule.some(g => g.classId === classId && g.day === day && (g as Gene).isLab)) {
        return false;
    }
    return true;
}


function canPlaceTheory(schedule: (Gene | Schedule)[], day: string, time: string, facultyId: string, classroomId: string, classId: string): boolean {
    if (isConflict(schedule, day, time, facultyId, classroomId, classId)) {
        return false;
    }
    const daySchedule = schedule.filter(g => g.classId === classId && g.day === day && !(g as Gene).isLab);
    // Max 2 consecutive theory
    const timeIndex = LECTURE_TIME_SLOTS.indexOf(time);
    if(timeIndex > 1) { // Can't have 2 previous if index is 0 or 1
        const prevSlot = LECTURE_TIME_SLOTS[timeIndex - 1];
        const prev2Slot = LECTURE_TIME_SLOTS[timeIndex - 2];
        if (
            daySchedule.some(s => s.time === prevSlot) &&
            daySchedule.some(s => s.time === prev2Slot)
        ) {
            return false;
        }
    }
    return true;
}


export async function runGA(input: GenerateTimetableInput) {
    // 1. Setup days
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const codeChefDayIndex = Math.floor(Math.random() * allDays.length);
    const codeChefDay = allDays[codeChefDayIndex];
    const workingDays = allDays.filter(d => d !== codeChefDay);
    
    // 2. Create list of lectures to be scheduled
    const lecturesToPlace = createLectureList(input);
    const labLectures = lecturesToPlace.filter(l => l.isLab);
    const theoryLectures = lecturesToPlace.filter(l => !l.isLab);

    const generatedSchedule: Gene[] = [];
    const fullSchedule = [...generatedSchedule, ...input.existingSchedule || []];

    // 3. Place Labs first (most constrained)
    const availableLabRooms = input.classrooms.filter(c => c.type === 'lab');
    const labTimePairs: [string, string][] = [];
    for (let i = 0; i < LECTURE_TIME_SLOTS.length - 1; i++) {
        // Avoid breaks
        if(LECTURE_TIME_SLOTS[i+1] === '10:00 AM - 11:00 AM' && LECTURE_TIME_SLOTS[i] === '08:30 AM - 09:30 AM') continue;
        if(LECTURE_TIME_SLOTS[i+1] === '01:00 PM - 02:00 PM' && LECTURE_TIME_SLOTS[i] === '11:00 AM - 12:00 PM') continue;
        labTimePairs.push([LECTURE_TIME_SLOTS[i], LECTURE_TIME_SLOTS[i+1]]);
    }

    for (const lab of labLectures) {
        let placed = false;
        for (const day of workingDays) {
            for (const [time1, time2] of labTimePairs) {
                 for (const room of availableLabRooms) {
                    if (canPlaceLab(fullSchedule, day, time1, time2, lab.facultyId, room.id, lab.classId)) {
                        const gene1 = { day, time: time1, ...lab, classroomId: room.id };
                        const gene2 = { day, time: time2, ...lab, classroomId: room.id };
                        generatedSchedule.push(gene1, gene2);
                        fullSchedule.push(gene1, gene2);
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
            if (placed) break;
        }
        if (!placed) {
            return { success: false, message: `Could not schedule lab for subject ID ${lab.subjectId}. Not enough free lab slots.` };
        }
    }

    // 4. Place Theory lectures
    const availableClassrooms = input.classrooms.filter(c => c.type === 'classroom');
    for (const theory of theoryLectures) {
        let placed = false;
        for (const day of workingDays) {
            for (const time of LECTURE_TIME_SLOTS) {
                for (const room of availableClassrooms) {
                    if (canPlaceTheory(fullSchedule, day, time, theory.facultyId, room.id, theory.classId)) {
                        const gene = { day, time, ...theory, classroomId: room.id };
                        generatedSchedule.push(gene);
                        fullSchedule.push(gene);
                        placed = true;
                        break;
                    }
                }
                 if (placed) break;
            }
             if (placed) break;
        }
         if (!placed) {
            const subject = input.subjects.find(s => s.id === theory.subjectId);
            return { success: false, message: `Could not schedule theory lecture for ${subject?.name}. Not enough free classroom slots or faculty is overbooked.` };
        }
    }
    
    const finalSchedule: Schedule[] = generatedSchedule.map((g, i) => ({ 
        id: `GEN${i}${Date.now()}`,
        day: g.day as any,
        time: g.time,
        classId: g.classId,
        subjectId: g.subjectId,
        facultyId: g.facultyId,
        classroomId: g.classroomId,
    }));

    return {
        success: true,
        message: `Successfully generated a complete schedule with ${finalSchedule.length} academic slots.`,
        bestTimetable: finalSchedule,
        codeChefDay,
    };
}
