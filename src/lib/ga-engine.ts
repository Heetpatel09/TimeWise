
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
 */
function createLectureList(input: GenerateTimetableInput): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classToSchedule = input.classes[0];
    if (!classToSchedule) return [];

    // Correctly filter subjects by department ID AND semester
    const classSubjects = input.subjects.filter(
        s => s.departmentId === classToSchedule.departmentId && s.semester === classToSchedule.semester
    );

    // 1. Add Academic Lectures
    for (const sub of classSubjects) {
        const facultyForSubject = input.faculty.find(f => f.allottedSubjects?.includes(sub.id));
        if (!facultyForSubject) {
            console.warn(`[Scheduler] No faculty found for subject ${sub.name}. This should have been caught in pre-checks.`);
            continue;
        }

        if (sub.type === 'lab') {
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
    
    // 2. Add exactly 3 Library Slots
    for (let i = 0; i < 3; i++) {
        lectures.push({
            classId: classToSchedule.id, subjectId: 'LIB001', facultyId: 'FAC_LIB', // Placeholder IDs
            isLab: false, hours: 1
        });
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
    if (!classToSchedule || !input.subjects) {
        return "Internal error: Class or subjects data is missing.";
    }

    const subjectsForClass = input.subjects.filter(
        s => s.departmentId === classToSchedule.departmentId && s.semester === classToSchedule.semester
    );

    if (subjectsForClass.length === 0) {
        const department = input.departments?.find(d => d.id === classToSchedule.departmentId);
        return `No subjects found for Semester ${classToSchedule.semester} in the ${department?.name || 'selected'} department. Please add subjects before generating a timetable.`
    }

    const subjectsWithoutFaculty = subjectsForClass
        .filter(sub => sub.id !== 'LIB001') // Don't check library for faculty
        .find(sub => !input.faculty.some(f => f.allottedSubjects?.includes(sub.id)));
    
    if (subjectsWithoutFaculty) {
        return `Cannot generate schedule. Subject '${subjectsWithoutFaculty.name}' has no assigned faculty. Please assign faculty to this subject in the Departments & Subjects section.`;
    }
    
    const totalRequiredHours = lectures.reduce((acc, l) => acc + (l.hours === 2 ? 2 : l.hours), 0);
    const totalAvailableSlots = workingDays.length * LECTURE_TIME_SLOTS.length;

    if (totalRequiredHours > totalAvailableSlots) {
        return `Cannot generate schedule. Required slots (${totalRequiredHours}) exceed available slots (${totalAvailableSlots}) for a ${workingDays.length}-day week. The constraints are too tight.`;
    }
    
    return null;
}


// --- Main Deterministic Engine ---
export async function runGA(input: GenerateTimetableInput) {
    // --- Input Validation ---
    if (!input.days || input.days.length === 0) {
        return { success: false, message: "Invalid input: The list of working days cannot be empty.", bestTimetable: [], codeChefDay: undefined };
    }

    // 1. Setup days
    const hasCodeChef = input.subjects.some(s => s.id === 'CODECHEF' && s.departmentId === input.classes[0]?.departmentId && s.semester === input.classes[0]?.semester);
    let codeChefDay: string | undefined = undefined;
    let workingDays = [...input.days];
    if (hasCodeChef) {
         if (input.days.length <= 1) {
            return { success: false, message: "Cannot schedule CodeChef day with only one working day provided.", bestTimetable: [], codeChefDay: undefined };
        }
        const codeChefDayIndex = Math.floor(Math.random() * input.days.length);
        codeChefDay = input.days[codeChefDayIndex];
        workingDays = input.days.filter(d => d !== codeChefDay);
    }
    
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
        [LECTURE_TIME_SLOTS[0], LECTURE_TIME_SLOTS[1]], // Morning
        [LECTURE_TIME_SLOTS[4], LECTURE_TIME_SLOTS[5]], // Afternoon
        [LECTURE_TIME_SLOTS[2], LECTURE_TIME_SLOTS[3]], // Mid-day
    ];
    
    labLectures.sort((a, b) => a.subjectId.localeCompare(b.subjectId));
    let lastLabDayIndex = -1;

    for (const lab of labLectures) {
        let placed = false;
        const shuffledDays = workingDays.sort(() => Math.random() - 0.5);

        for (const day of shuffledDays) {
            if (shuffledDays.indexOf(day) === lastLabDayIndex) continue;

            const shuffledTimePairs = labTimePairs.sort(() => Math.random() - 0.5);

            for (const [time1, time2] of shuffledTimePairs) {
                for (const room of availableLabRooms) {
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
        for (const day of workingDays) {
             for (const time of LECTURE_TIME_SLOTS) {
                  if (fullSchedule.some(g => g.classId === theory.classId && g.day === day && g.time === time)) continue;
                  
                  if (theory.subjectId === 'LIB001') {
                     const gene = { day, time, ...theory, classroomId: 'CR_LIB', facultyId: 'FAC_LIB', isLab: false };
                     generatedSchedule.push(gene);
                     fullSchedule.push(gene);
                     placed = true;
                     break;
                  }

                  for (const room of availableClassrooms) {
                    const previousSlotTime = LECTURE_TIME_SLOTS[LECTURE_TIME_SLOTS.indexOf(time) - 1];
                    const previousSlot = fullSchedule.find(g => g.classId === theory.classId && g.day === day && g.time === previousSlotTime);
                    if (previousSlot && previousSlot.subjectId !== 'LIB001' && previousSlot.classroomId !== room.id) {
                        continue;
                    }

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
    const requiredHours = createLectureList(input).reduce((sum, l) => sum + (l.hours === 2 ? 2 : l.hours), 0);

    if (academicSlotsCount + finalLibraryCount < requiredHours) {
        return {
            success: false,
            message: `Generation failed. Could only place ${academicSlotsCount + finalLibraryCount} out of ${requiredHours} required slots. Constraints are too restrictive.`,
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
