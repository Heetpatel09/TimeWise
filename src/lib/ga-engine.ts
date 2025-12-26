

'use server';

import type { GenerateTimetableInput, Schedule, Subject, SubjectPriority } from './types';

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
    '07:30 AM - 08:25 AM',
    '08:25 AM - 09:20 AM',
    '09:30 AM - 10:25 AM',
    '10:25 AM - 11:20 AM',
    '12:20 PM - 01:15 PM',
    '01:15 PM - 02:10 PM'
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
            // Labs are 2 hours long. We add 2 genes for a single lab session.
            // One session for Batch A, one for Batch B.
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


function canPlaceLab(schedule: (Gene | Schedule)[], day: string, time1: string, time2: string, facultyId: string, classroomId: string, classId: string, batch: 'A' | 'B'): boolean {
    // Check conflicts for both slots in the combined schedule
    if (isConflict(schedule, day, time1, facultyId, classroomId, classId) || isConflict(schedule, day, time2, facultyId, classroomId, classId)) {
        return false;
    }

    // A class can have multiple labs in a day, but one for Batch A and one for Batch B
    // Check max one lab per day for this specific batch
    if (schedule.some(g => g.classId === classId && g.day === day && (g as Gene).isLab && (g as Gene).batch === batch)) {
        return false;
    }
    return true;
}


function canPlaceTheory(schedule: (Gene | Schedule)[], day: string, time: string, facultyId: string, classroomId: string, classId: string, subjectId: string): boolean {
    if (isConflict(schedule, day, time, facultyId, classroomId, classId)) {
        return false;
    }
    const daySchedule = schedule.filter(g => g.classId === classId && g.day === day);

    // No more than 2 classes of same subject on same day
    if (daySchedule.filter(s => s.subjectId === subjectId).length >= 2) {
        return false;
    }

    const timeIndex = LECTURE_TIME_SLOTS.indexOf(time);
    if(timeIndex > 1) { 
        const prevSlot = LECTURE_TIME_SLOTS[timeIndex - 1];
        const prev2Slot = LECTURE_TIME_SLOTS[timeIndex - 2];
        const prevGene = daySchedule.find(s => s.time === prevSlot);
        const prev2Gene = daySchedule.find(s => s.time === prev2Slot);

        // Disallow more than 2 consecutive theory lectures
        if (prevGene && prev2Gene && !(prevGene as Gene).isLab && !(prev2Gene as Gene).isLab) {
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

    const requiredTheorySlots = lecturesToPlace.filter(l => !l.isLab).length;
    const requiredLabSlots = lecturesToPlace.filter(l => l.isLab).length * 2; // Each lab lecture is 2 hours
    const totalRequiredSlots = requiredTheorySlots + requiredLabSlots;
    const totalAvailableSlots = workingDays.length * LECTURE_TIME_SLOTS.length;

    if (totalRequiredSlots > totalAvailableSlots) {
        return { success: false, message: `Cannot generate schedule. Required slots (${totalRequiredSlots}) exceed available slots (${totalAvailableSlots}). Please reduce subject hours.` };
    }
    
    const labLectures = lecturesToPlace.filter(l => l.isLab);
    const theoryLectures = lecturesToPlace.filter(l => !l.isLab);

    const generatedSchedule: Gene[] = [];
    const fullSchedule = [...generatedSchedule, ...input.existingSchedule || []];

    // 3. Place Labs first (most constrained)
    const availableLabRooms = input.classrooms.filter(c => c.type === 'lab');
    if (availableLabRooms.length === 0 && labLectures.length > 0) {
        return { success: false, message: "Cannot schedule labs. No lab classrooms are available." };
    }

    const labTimePairs: [string, string][] = [];
    labTimePairs.push([LECTURE_TIME_SLOTS[0], LECTURE_TIME_SLOTS[1]]); // Morning
    labTimePairs.push([LECTURE_TIME_SLOTS[2], LECTURE_TIME_SLOTS[3]]); // Mid-day
    labTimePairs.push([LECTURE_TIME_SLOTS[4], LECTURE_TIME_SLOTS[5]]); // Afternoon

    let lastDayLabSlotIndex = -1;

    for (const lab of labLectures) {
        let placed = false;
        const shuffledDays = workingDays.sort(() => Math.random() - 0.5);

        for (const day of shuffledDays) {
            const shuffledPairs = labTimePairs.sort(() => Math.random() - 0.5);
            let startIndex = (lastDayLabSlotIndex + 1) % shuffledPairs.length;

            for (let i = 0; i < shuffledPairs.length; i++) {
                const pairIndex = (startIndex + i) % shuffledPairs.length;
                const [time1, time2] = shuffledPairs[pairIndex];

                 for (const room of availableLabRooms) {
                    if (canPlaceLab(fullSchedule, day, time1, time2, lab.facultyId, room.id, lab.classId, lab.batch!)) {
                        generatedSchedule.push({ day, time: time1, ...lab, classroomId: room.id });
                        generatedSchedule.push({ day, time: time2, ...lab, classroomId: room.id });
                        fullSchedule.push(...generatedSchedule.slice(-2));
                        placed = true;
                        lastDayLabSlotIndex = pairIndex;
                        break;
                    }
                }
                if (placed) break;
            }
            if (placed) break;
        }
        if (!placed) {
            return { success: false, message: `Could not schedule lab for subject ID ${lab.subjectId} (${lab.batch}). Not enough free lab slots or faculty is overbooked.` };
        }
    }

    // 4. Place Theory lectures
    const availableClassrooms = input.classrooms.filter(c => c.type === 'classroom');
     if (availableClassrooms.length === 0 && theoryLectures.length > 0) {
        return { success: false, message: "Cannot schedule theory lectures. No classrooms are available." };
    }

    for (const theory of theoryLectures) {
        let placed = false;
        for (let i = 0; i < 200; i++) { 
            const day = workingDays[Math.floor(Math.random() * workingDays.length)];
            const time = LECTURE_TIME_SLOTS[Math.floor(Math.random() * LECTURE_TIME_SLOTS.length)];

            const sameDayTheory = generatedSchedule.find(g => g.day === day && !g.isLab);
            const preferredRoom = sameDayTheory ? availableClassrooms.find(c => c.id === sameDayTheory.classroomId) : undefined;
            
            const roomsToTry = preferredRoom ? [preferredRoom, ...availableClassrooms.filter(c => c.id !== preferredRoom.id)] : availableClassrooms.sort(() => Math.random() - 0.5);

            for (const room of roomsToTry) {
                 if (canPlaceTheory(fullSchedule, day, time, theory.facultyId, room.id, theory.classId, theory.subjectId)) {
                    const gene = { day, time, ...theory, classroomId: room.id };
                    generatedSchedule.push(gene);
                    fullSchedule.push(gene);
                    placed = true;
                    break;
                }
            }
             if (placed) break;
        }
         if (!placed) {
            const subject = input.subjects.find(s => s.id === theory.subjectId);
            return { success: false, message: `Could not schedule theory lecture for ${subject?.name}. The schedule is too constrained. Try reducing subject hours or adding more faculty/classrooms.` };
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
