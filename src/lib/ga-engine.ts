
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
    '07:30 AM - 08:30 AM',
    '08:30 AM - 09:30 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '01:00 PM - 02:00 PM',
    '02:00 PM - 03:00 PM'
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
 * Creates a definitive list of all academic and library lectures that need to be scheduled.
 * This is the corrected, final version of this function.
 */
function createLectureList(input: GenerateTimetableInput): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classToSchedule = input.classes[0];
    const classSubjects = input.subjects.filter(
        s => s.semester === classToSchedule.semester && s.department === classToSchedule.department
    );

    // 1. Add Academic Lectures
    for (const sub of classSubjects) {
        // Find all faculty for a subject, and select the one with the least current workload
        const qualifiedFaculty = input.faculty.filter(f => f.allottedSubjects?.includes(sub.id));
        if (qualifiedFaculty.length === 0) {
             console.warn(`[Scheduler] No faculty found for subject ${sub.name}. Skipping.`);
            continue;
        }

        // Simple load balancing: just pick one for now. The engine will balance later.
        const facultyForSubject = qualifiedFaculty[0];

        if (sub.type === 'lab') {
            // A lab session is 2 hours long, scheduled once a week.
            // It consists of two 1-hour genes that must be consecutive.
            // We represent this as a single lecture item that the engine will handle.
            lectures.push({
                classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                isLab: true, hours: 2
            });
        } else {
            // Theory subjects have hours based on priority. Add one 1-hour lecture for each required hour.
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lectures.push({
                    classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                    isLab: false, hours: 1
                });
            }
        }
    }
    
    // 2. Add exactly 3 Library Slots
     const libraryFaculty = input.faculty.find(f => f.allottedSubjects?.includes('LIB001'));
    if (libraryFaculty) {
        for (let i = 0; i < 3; i++) {
            lectures.push({
                classId: classToSchedule.id, subjectId: 'LIB001', facultyId: libraryFaculty.id,
                isLab: false, hours: 1
            });
        }
    }
    
    // Sort by labs first (most constrained), then theory
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
    // Rule: Each day will have only 1 lab slot for a given class
    if (schedule.some(g => g.classId === classId && g.day === day && (g as Gene).isLab)) {
        return false;
    }
    return true;
}

function canPlaceTheory(schedule: (Gene | Schedule)[], day: string, time: string, facultyId: string, classroomId: string, classId: string, subjectId: string): boolean {
    if (isConflict(schedule, day, time, facultyId, classroomId, classId)) {
        return false;
    }
    // Rule: Do not give same subject classes more than 2 on same day
    const daySchedule = schedule.filter(g => g.classId === classId && g.day === day);
    if (daySchedule.filter(s => s.subjectId === subjectId).length >= 2) {
        return false;
    }
    return true;
}

/**
 * Pre-checks if a schedule is even possible.
 */
function runPreChecks(lectures: LectureToBePlaced[], input: GenerateTimetableInput, workingDays: string[]): string | null {
    const classToSchedule = input.classes[0];

    // Check for faculty assignment
    const subjectsWithoutFaculty = input.subjects
        .filter(s => s.semester === classToSchedule.semester && s.department === classToSchedule.department && s.id !== 'LIB001')
        .find(sub => !input.faculty.some(f => f.allottedSubjects?.includes(sub.id)));
    
    if (subjectsWithoutFaculty) {
        return `Cannot generate schedule. Subject '${subjectsWithoutFaculty.name}' has no assigned faculty. Please assign faculty to this subject in the Departments & Subjects section.`;
    }
    
    // Check if total required slots exceed available slots
    const totalRequiredHours = lectures.reduce((acc, l) => acc + (l.hours === 2 ? 2 : l.hours), 0);
    const totalAvailableSlots = workingDays.length * LECTURE_TIME_SLOTS.length;

    if (totalRequiredHours > totalAvailableSlots) {
        return `Cannot generate schedule. Required slots (${totalRequiredHours}) exceed available slots (${totalAvailableSlots}). The constraints might be too tight.`;
    }
    
    return null;
}


// --- Main Deterministic Engine ---
export async function runGA(input: GenerateTimetableInput) {
    // 1. Setup days
    const codeChefDayIndex = Math.floor(Math.random() * DAYS.length);
    const codeChefDay = DAYS[codeChefDayIndex];
    const workingDays = DAYS.filter(d => d !== codeChefDay);
    
    // 2. Create list of lectures to be scheduled
    const lecturesToPlace = createLectureList(input);

    // 3. Run Pre-checks for impossible scenarios
    const impossibilityReason = runPreChecks(lecturesToPlace, input, workingDays);
    if (impossibilityReason) {
        return { success: false, message: impossibilityReason, bestTimetable: [], codeChefDay: undefined };
    }
    
    const labLectures = lecturesToPlace.filter(l => l.isLab);
    const theoryLectures = lecturesToPlace.filter(l => !l.isLab);

    const generatedSchedule: Gene[] = [];
    const fullSchedule = [...generatedSchedule, ...input.existingSchedule || []];

    // 4. Place Labs (most constrained)
    const availableLabRooms = input.classrooms.filter(c => c.type === 'lab');
    if (availableLabRooms.length === 0 && labLectures.length > 0) {
        return { success: false, message: "Cannot schedule labs. No lab classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }

    const labTimePairs: [string, string][] = [
        ['07:30 AM - 08:30 AM', '08:30 AM - 09:30 AM'], // Morning
        ['01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM'], // Afternoon
        ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM'], // Mid-day
    ];
    
    // Sort lab lectures to handle different labs for the same class (e.g., different batches)
    labLectures.sort((a, b) => a.subjectId.localeCompare(b.subjectId));
    let lastLabDayIndex = -1; // Track last used day index to avoid consecutive lab days

    for (const lab of labLectures) {
        let placed = false;
        const shuffledDays = workingDays.sort(() => Math.random() - 0.5);

        for (const day of shuffledDays) {
            if (shuffledDays.indexOf(day) === lastLabDayIndex) continue;

            const shuffledTimePairs = labTimePairs.sort(() => Math.random() - 0.5);
            const shuffledLabRooms = availableLabRooms.sort(() => Math.random() - 0.5);

            for (const [time1, time2] of shuffledTimePairs) {
                for (const room of shuffledLabRooms) {
                    if (canPlaceLab(fullSchedule, day, time1, time2, lab.facultyId, room.id, lab.classId)) {
                        generatedSchedule.push({ day, time: time1, ...lab, classroomId: room.id, hours: 1, isLab: true });
                        generatedSchedule.push({ day, time: time2, ...lab, classroomId: room.id, hours: 1, isLab: true });
                        fullSchedule.push(...generatedSchedule.slice(-2));
                        placed = true;
                        lastLabDayIndex = shuffledDays.indexOf(day);
                        break;
                    }
                }
                if (placed) break;
            }
            if (placed) break;
        }
        if (!placed) {
             return { success: false, message: `Could not schedule lab for subject ID ${lab.subjectId}. Not enough conflict-free lab slots available.`, bestTimetable: [], codeChefDay: undefined };
        }
    }
    
    // 5. Place Theory and Library lectures
    const availableClassrooms = input.classrooms.filter(c => c.type === 'classroom');
    if (availableClassrooms.length === 0 && theoryLectures.filter(t => t.subjectId !== 'LIB001').length > 0) {
        return { success: false, message: "Cannot schedule theory lectures. No classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }

    for (const theory of theoryLectures) {
        let placed = false;
        // Systematic placement for guaranteed result
        for (const day of workingDays) {
             for (const time of LECTURE_TIME_SLOTS) {
                  if (fullSchedule.some(g => g.classId === theory.classId && g.day === day && g.time === time)) continue;
                  
                  if (theory.subjectId === 'LIB001') {
                     const libraryFaculty = input.faculty.find(f => f.allottedSubjects?.includes('LIB001'));
                     const gene = { day, time, ...theory, classroomId: 'CR_LIB', facultyId: libraryFaculty!.id, isLab: false };
                     generatedSchedule.push(gene);
                     fullSchedule.push(gene);
                     placed = true;
                     break;
                  }
                  
                  const shuffledClassrooms = availableClassrooms.sort(() => Math.random() - 0.5);
                  
                  // Classroom Consistency Logic
                  const previousSlotTime = LECTURE_TIME_SLOTS[LECTURE_TIME_SLOTS.indexOf(time) - 1];
                  const previousSlot = fullSchedule.find(g => g.classId === theory.classId && g.day === day && g.time === previousSlotTime && !(g as Gene).isLab);
                  
                  let preferredClassroomOrder = shuffledClassrooms;
                  if (previousSlot && previousSlot.classroomId) {
                      // Move the previously used classroom to the front of the list to try it first
                      const prevRoom = shuffledClassrooms.find(c => c.id === previousSlot.classroomId);
                      if (prevRoom) {
                          preferredClassroomOrder = [prevRoom, ...shuffledClassrooms.filter(c => c.id !== prevRoom.id)];
                      }
                  }

                  for (const room of preferredClassroomOrder) {
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

    const academicSlotsCount = finalSchedule.filter(s => s.subjectId !== 'LIB001').length;
    const finalLibraryCount = finalSchedule.filter(s => s.subjectId === 'LIB001').length;

    if (academicSlotsCount + finalLibraryCount < 24) {
        return {
            success: false,
            message: `Generation failed. Only generated ${academicSlotsCount} academic and ${finalLibraryCount} library slots.`,
            bestTimetable: [],
            codeChefDay,
        }
    }

    return {
        success: true,
        message: `Successfully generated a schedule with ${academicSlotsCount} academic slots and ${finalLibraryCount} library slots.`,
        bestTimetable: finalSchedule,
        codeChefDay,
    };
}
