
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
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
 * This now includes exactly 3 library slots.
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
            // A lab session is 2 hours long.
            lectures.push({
                classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                isLab: true, hours: 2
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
    
    // Add exactly 3 library slots to the list of lectures to be placed
    for (let i=0; i<3; i++) {
        lectures.push({
            classId: classToSchedule.id, subjectId: 'LIB001', facultyId: 'FAC_LIB',
            isLab: false, hours: 1
        });
    }
    
    // Sort by labs first (most constrained), then theory
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

    // A class can have only one lab session (of any subject/batch) per day
    if (schedule.some(g => g.classId === classId && g.day === day && (g as Gene).isLab)) {
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
    if(timeIndex > 0) { 
        const prevSlot = LECTURE_TIME_SLOTS[timeIndex - 1];
        const prevGene = daySchedule.find(s => s.time === prevSlot);

        // Disallow more than 2 consecutive theory lectures
        if (prevGene && timeIndex > 1) {
            const prev2Slot = LECTURE_TIME_SLOTS[timeIndex - 2];
            const prev2Gene = daySchedule.find(s => s.time === prev2Slot);
            if (prev2Gene && !(prevGene as Gene).isLab && !(prev2Gene as Gene).isLab) {
                 return false;
            }
        }
    }
    return true;
}


export async function runGA(input: GenerateTimetableInput) {
    // 1. Setup days
    const codeChefDayIndex = Math.floor(Math.random() * DAYS.length);
    const codeChefDay = DAYS[codeChefDayIndex];
    const workingDays = DAYS.filter(d => d !== codeChefDay);
    
    // 2. Create list of lectures to be scheduled
    const lecturesToPlace = createLectureList(input);

    const requiredSlots = lecturesToPlace.reduce((acc, l) => acc + l.hours, 0);
    const totalAvailableSlots = workingDays.length * LECTURE_TIME_SLOTS.length;
    
    if (requiredSlots > totalAvailableSlots) {
        return { success: false, message: `Cannot generate schedule. Required slots (${requiredSlots}) exceed available slots (${totalAvailableSlots}). Please reduce subject hours or library slots.` };
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
    const labTimePairsAlternate = [labTimePairs[0], labTimePairs[2], labTimePairs[1]].flat(); // Alternate morning/afternoon

    let lastLabDayIndex = -1;
    let labSlotIndex = 0;
    for (const lab of labLectures) {
        let placed = false;
        const shuffledDays = workingDays.sort(() => Math.random() - 0.5);

        for (const day of shuffledDays) {
            // Simple attempt to spread labs - don't place labs on consecutive days if possible
            if (shuffledDays.indexOf(day) === (lastLabDayIndex + 1) % shuffledDays.length && shuffledDays.length > 1) continue;

            const [time1, time2] = labTimePairs[labSlotIndex % labTimePairs.length];

            for (const room of availableLabRooms) {
                if (canPlaceLab(fullSchedule, day, time1, time2, lab.facultyId, room.id, lab.classId)) {
                    generatedSchedule.push({ day, time: time1, ...lab, classroomId: room.id, isLab: true });
                    generatedSchedule.push({ day, time: time2, ...lab, classroomId: room.id, isLab: true });
                    fullSchedule.push(...generatedSchedule.slice(-2));
                    placed = true;
                    lastLabDayIndex = shuffledDays.indexOf(day);
                    labSlotIndex++;
                    break;
                }
            }
            if (placed) break;
        }
        if (!placed) {
            // Try again without the day-spreading constraint if it fails
            for (const day of shuffledDays) {
                const [time1, time2] = labTimePairs[labSlotIndex % labTimePairs.length];
                for (const room of availableLabRooms) {
                    if (canPlaceLab(fullSchedule, day, time1, time2, lab.facultyId, room.id, lab.classId)) {
                        generatedSchedule.push({ day, time: time1, ...lab, classroomId: room.id, isLab: true });
                        generatedSchedule.push({ day, time: time2, ...lab, classroomId: room.id, isLab: true });
                        fullSchedule.push(...generatedSchedule.slice(-2));
                        placed = true;
                        labSlotIndex++;
                        break;
                    }
                }
                 if (placed) break;
            }
        }
        if (!placed) {
            return { success: false, message: `Could not schedule lab for subject ID ${lab.subjectId}. Not enough free lab slots or faculty is overbooked.` };
        }
    }

    // 4. Place Theory lectures
    const availableClassrooms = input.classrooms.filter(c => c.type === 'classroom');
     if (availableClassrooms.length === 0 && theoryLectures.filter(t => t.subjectId !== 'LIB001').length > 0) {
        return { success: false, message: "Cannot schedule theory lectures. No classrooms are available." };
    }

    for (const theory of theoryLectures) {
        let placed = false;
        // Try to place randomly up to N times for better distribution
        for (let i = 0; i < 200; i++) {
            const day = workingDays[Math.floor(Math.random() * workingDays.length)];
            const time = LECTURE_TIME_SLOTS[Math.floor(Math.random() * LECTURE_TIME_SLOTS.length)];
            
            // Skip if slot is already occupied for this class
            if (fullSchedule.some(g => g.classId === theory.classId && g.day === day && g.time === time)) continue;

            if (theory.subjectId === 'LIB001') {
                const gene = { day, time, ...theory, classroomId: 'LIB_ROOM', facultyId: 'FAC_LIB' };
                generatedSchedule.push(gene);
                fullSchedule.push(gene);
                placed = true;
                break;
            }

            // Classroom consistency logic
            const sameDayLectures = fullSchedule.filter(g => g.classId === theory.classId && g.day === day && !(g as Gene).isLab);
            const preferredRoomId = sameDayLectures.length > 0 ? sameDayLectures[0].classroomId : undefined;
            const roomsToTry = preferredRoomId ? [input.classrooms.find(c => c.id === preferredRoomId)!, ...availableClassrooms.filter(c => c.id !== preferredRoomId)] : [...availableClassrooms].sort(() => 0.5 - Math.random());

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
            // If random placement fails, iterate systematically
            for (const day of workingDays) {
                 for (const time of LECTURE_TIME_SLOTS) {
                      if (fullSchedule.some(g => g.classId === theory.classId && g.day === day && g.time === time)) continue;
                      if (theory.subjectId === 'LIB001') {
                         const gene = { day, time, ...theory, classroomId: 'LIB_ROOM', facultyId: 'FAC_LIB' };
                         generatedSchedule.push(gene);
                         fullSchedule.push(gene);
                         placed = true;
                         break;
                      }
                      for (const room of availableClassrooms) {
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
                 if (placed) break;
            }
        }

        if (!placed) {
            const subject = input.subjects.find(s => s.id === theory.subjectId);
            return { success: false, message: `Could not schedule lecture for ${subject?.name || 'a subject'}. The schedule is too constrained. Try reducing subject hours or adding more faculty/classrooms.` };
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
        message: `Successfully generated a complete schedule with ${finalSchedule.filter(s => s.subjectId !== 'LIB001').length} academic slots and 3 library slots.`,
        bestTimetable: finalSchedule,
        codeChefDay,
    };
}
