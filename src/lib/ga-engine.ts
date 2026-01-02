
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
    hours: number; // 1 for theory, 2 for a single lab session
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
        default: return 2; // Default if priority is not set
    }
};

/**
 * Creates a definitive list of all academic lectures that need to be scheduled.
 */
function createLectureList(input: GenerateTimetableInput): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classToSchedule = input.classes[0];
    const classSubjects = input.subjects.filter(
        s => s.semester === classToSchedule.semester && s.department === classToSchedule.department
    );
     const facultyWorkload = new Map<string, number>();
    input.faculty.forEach(f => facultyWorkload.set(f.id, 0));

    // 1. Add Academic Lectures
    for (const sub of classSubjects) {
        if (sub.isSpecial) continue;

        const qualifiedFaculty = input.faculty
            .filter(f => f.allottedSubjects?.includes(sub.id))
            .sort((a,b) => (facultyWorkload.get(a.id) || 0) - (facultyWorkload.get(b.id) || 0));
        
        const facultyForSubject = qualifiedFaculty[0];
        if (!facultyForSubject) {
             console.warn(`[Scheduler] No faculty found for subject ${sub.name}. Skipping this subject.`);
            continue; // CRITICAL FIX: Instead of stopping, just skip this subject
        }

        if (sub.type === 'lab') {
            const labHours = 2; // A lab session is 2 hours long
            for (let i=0; i<2; i++) { // Create 2 separate 2-hour lab slots
                 lectures.push({
                    classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                    isLab: true, hours: labHours
                });
            }
            facultyWorkload.set(facultyForSubject.id, (facultyWorkload.get(facultyForSubject.id) || 0) + (labHours * 2));

        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lectures.push({
                    classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                    isLab: false, hours: 1
                });
            }
             facultyWorkload.set(facultyForSubject.id, (facultyWorkload.get(facultyForSubject.id) || 0) + hours);
        }
    }
    
    lectures.sort((a, b) => (b.isLab ? 1 : 0) - (a.isLab ? 1 : 0));

    return lectures;
}


// --- Conflict Checking Functions ---
function isConflict(schedule: (Gene | Schedule)[], day: string, time: string, facultyId: string, classroomId: string, classId: string): boolean {
    return schedule.some(gene => 
        gene.day === day && 
        gene.time === time &&
        (gene.facultyId === facultyId || gene.classroomId === classroomId || gene.classId === classId)
    );
}

function canPlaceLab(schedule: (Gene | Schedule)[], day: string, time1: string, time2: string, facultyId: string, classroomId: string, classId: string): boolean {
    if (isConflict(schedule, day, time1, facultyId, classroomId, classId) || isConflict(schedule, day, time2, facultyId, classroomId, classId)) {
        return false;
    }
    return true;
}

function canPlaceTheory(schedule: (Gene | Schedule)[], day: string, time: string, facultyId: string, classroomId: string, classId: string, subjectId: string): boolean {
    if (isConflict(schedule, day, time, facultyId, classroomId, classId)) {
        return false;
    }
    
    const dayScheduleForClass = schedule.filter(g => g.classId === classId && g.day === day);
    
    // Rule: Do not give same subject classes more than 2 on same day
    if (dayScheduleForClass.filter(s => s.subjectId === subjectId).length >= 2) {
        return false;
    }
    
    // Rule: Strictly avoid back-to-back lectures of the same subject.
    const previousSlotTime = LECTURE_TIME_SLOTS[LECTURE_TIME_SLOTS.indexOf(time) - 1];
    if (previousSlotTime) {
        const previousSlot = dayScheduleForClass.find(s => s.time === previousSlotTime);
        if (previousSlot && previousSlot.subjectId === subjectId) {
            return false;
        }
    }
    
    return true;
}

/**
 * Pre-checks if a schedule is even possible.
 */
function runPreChecks(lectures: LectureToBePlaced[], input: GenerateTimetableInput, workingDays: string[]): string | null {
    const totalRequiredHours = lectures.reduce((acc, l) => acc + l.hours, 0);
    const totalAvailableSlots = workingDays.length * LECTURE_TIME_SLOTS.length;

    if (totalRequiredHours > totalAvailableSlots) {
        return `Cannot generate schedule. Required slots (${totalRequiredHours}) exceed available slots (${totalAvailableSlots}). The constraints might be too tight.`;
    }
    
    return null;
}


// --- Main Deterministic Engine ---
export async function runGA(input: GenerateTimetableInput) {
    const codeChefDayIndex = Math.floor(Math.random() * DAYS.length);
    const codeChefDay = DAYS[codeChefDayIndex];
    const workingDays = DAYS.filter(d => d !== codeChefDay);
    
    const lecturesToPlace = createLectureList(input);

    const impossibilityReason = runPreChecks(lecturesToPlace, input, workingDays);
    if (impossibilityReason) {
        return { success: false, message: impossibilityReason, bestTimetable: [], codeChefDay: undefined };
    }
    
    const labLectures = lecturesToPlace.filter(l => l.isLab);
    const theoryLectures = lecturesToPlace.filter(l => !l.isLab);

    const generatedSchedule: Gene[] = [];
    const fullSchedule = [...generatedSchedule, ...input.existingSchedule || []];

    // Place Labs
    const availableLabRooms = input.classrooms.filter(c => c.type === 'lab');
    if (availableLabRooms.length === 0 && labLectures.length > 0) {
        return { success: false, message: "Cannot schedule labs. No lab classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }

    const labTimePairs: [string, string][] = [
        ['07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM'],
        ['09:30 AM - 10:25 AM', '10:25 AM - 11:20 AM'],
        ['12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM'],
    ];
    
    labLectures.sort((a, b) => a.subjectId.localeCompare(b.subjectId));

    for (const lab of labLectures) {
        let placed = false;
        const shuffledDays = workingDays.sort(() => Math.random() - 0.5);

        for (const day of shuffledDays) {
            const shuffledTimePairs = labTimePairs.sort(() => Math.random() - 0.5);
            const shuffledLabRooms = availableLabRooms.sort(() => Math.random() - 0.5);

            for (const [time1, time2] of shuffledTimePairs) {
                for (const room of shuffledLabRooms) {
                    if (canPlaceLab(fullSchedule, day, time1, time2, lab.facultyId, room.id, lab.classId)) {
                        generatedSchedule.push({ day, time: time1, ...lab, classroomId: room.id, hours: 1, isLab: true });
                        generatedSchedule.push({ day, time: time2, ...lab, classroomId: room.id, hours: 1, isLab: true });
                        fullSchedule.push(...generatedSchedule.slice(-2));
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
            if (placed) break;
        }
        if (!placed) {
             const subject = input.subjects.find(s => s.id === lab.subjectId);
             return { success: false, message: `Could not schedule lab for '${subject?.name || lab.subjectId}'. Not enough conflict-free lab slots available.`, bestTimetable: [], codeChefDay: undefined };
        }
    }
    
    // Place Theory lectures
    const availableClassrooms = input.classrooms.filter(c => c.type === 'classroom');
    if (availableClassrooms.length === 0 && theoryLectures.length > 0) {
        return { success: false, message: "Cannot schedule theory lectures. No classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }

    for (const theory of theoryLectures) {
        let placed = false;
        
        const allPossibleSlots = workingDays.flatMap(day => LECTURE_TIME_SLOTS.map(time => ({ day, time }))).sort(() => Math.random() - 0.5);
        
        for (const { day, time } of allPossibleSlots) {
             if (fullSchedule.some(g => g.classId === theory.classId && g.day === day && g.time === time)) continue;
              
              let roomToUse: string | undefined = undefined;
              const previousSlotTime = LECTURE_TIME_SLOTS[LECTURE_TIME_SLOTS.indexOf(time) - 1];
              if (previousSlotTime) {
                  const previousSlot = fullSchedule.find(g => g.classId === theory.classId && g.day === day && g.time === previousSlotTime && !(g as Gene).isLab);
                  if (previousSlot) {
                      roomToUse = previousSlot.classroomId;
                  }
              }

              const roomsToTry = roomToUse ? [availableClassrooms.find(c => c.id === roomToUse)].filter(Boolean) as any[] : availableClassrooms.sort(() => Math.random() - 0.5);
              
              for (const room of roomsToTry) {
                 if (canPlaceTheory(fullSchedule, day, time, theory.facultyId, room.id, theory.classId, theory.subjectId)) {
                    const gene = { day, time, ...theory, classroomId: room.id, isLab: false };
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
            return { success: false, message: `Could not schedule all lectures. Failed on '${subject?.name || 'a subject'}'. The schedule is too constrained.`, bestTimetable: [], codeChefDay: undefined };
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

    const academicSlotsCount = finalSchedule.length;
   
    return {
        success: true,
        message: `Successfully generated a schedule with ${academicSlotsCount} academic slots.`,
        bestTimetable: finalSchedule,
        codeChefDay,
    };
}
