
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
}

interface LectureToBePlaced {
    subjectId: string;
    facultyId: string;
    isLab: boolean;
    classId: string;
    hours: number; // 1 for theory, 2 for a single lab session
}

// --- Helper Functions & Configuration ---
const ALL_TIME_SLOTS = [
    '07:30 AM - 08:25 AM',
    '08:25 AM - 09:20 AM',
    '09:20 AM - 09:30 AM', // Break
    '09:30 AM - 10:25 AM',
    '10:25 AM - 11:20 AM',
    '11:20 AM - 12:20 PM', // Break
    '12:20 PM - 01:15 PM',
    '01:15 PM - 02:10 PM'
];
const LECTURE_TIME_SLOTS = ALL_TIME_SLOTS.filter(t => !t.includes('09:20') && !t.includes('11:20'));
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


const getHoursForPriority = (priority?: SubjectPriority): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 2;
    }
};

function createLectureList(input: GenerateTimetableInput): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classToSchedule = input.classes[0];
    const classSubjects = input.subjects.filter(
        s => s.semester === classToSchedule.semester && s.departmentId === classToSchedule.departmentId
    );

    let academicHours = 0;
    // 1. Add Academic Lectures
    for (const sub of classSubjects) {
        if (sub.isSpecial || sub.id === 'CODECHEF' || sub.id === 'LIB001') continue;

        const facultyForSubject = input.faculty.find(f => f.allottedSubjects?.includes(sub.id));
        if (!facultyForSubject) {
            console.warn(`[Scheduler] No faculty for subject ${sub.name}. Skipping.`);
            continue;
        }

        if (sub.type === 'lab') {
            lectures.push({
                classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                isLab: true, hours: 2
            });
            academicHours += 2;
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lectures.push({
                    classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                    isLab: false, hours: 1
                });
            }
            academicHours += hours;
        }
    }
    
    // The target is 21 slots over 5 days, minus labs.
    // Labs take 2 slots but count as one "session". We need to account for this.
    // Number of theory lectures is academicHours - (labCount * 2).
    // Let's simplify: target is 21 lecture hours in total for the 5 days.
    const totalSlotsTarget = 21;
    const librarySlotsToCreate = Math.max(0, totalSlotsTarget - academicHours);
    
    for (let i = 0; i < librarySlotsToCreate; i++) {
        lectures.push({
            classId: classToSchedule.id, subjectId: 'LIB001', facultyId: 'FAC_LIB',
            isLab: false, hours: 1
        });
    }

    // Sort by labs first (most constrained), then theory
    lectures.sort((a, b) => {
        if (a.isLab && !b.isLab) return -1;
        if (!a.isLab && b.isLab) return 1;
        return Math.random() - 0.5; // Randomize within type
    });
    
    return lectures;
}


// --- Conflict Checking Functions ---
function isConflict(schedule: (Gene | Schedule)[], day: string, time: string, facultyId: string, classroomId: string, classId: string): boolean {
    // Library is a special case, it can be shared
    if (classroomId === 'CR_LIB') {
        // A class cannot have two things at the same time, even if one is library
        return schedule.some(gene => 
            gene.day === day && 
            gene.time === time &&
            gene.classId === classId
        );
    }
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
    return !schedule.some(g => g.classId === classId && g.day === day && (g as Gene).isLab);
}

function canPlaceTheory(schedule: (Gene | Schedule)[], day: string, time: string, facultyId: string, classroomId: string, classId: string, subjectId: string): boolean {
    if (isConflict(schedule, day, time, facultyId, classroomId, classId)) {
        return false;
    }
    
    // Rule: Do not give same subject classes more than 2 on same day
    const dayScheduleForClass = schedule.filter(g => g.classId === classId && g.day === day);
    if (dayScheduleForClass.filter(s => s.subjectId === subjectId).length >= 2) {
        return false;
    }
    
    return true;
}

function canPlaceLibrary(schedule: (Gene | Schedule)[], day: string, time: string, classId: string): boolean {
     // A class cannot have two things at the same time
     return !schedule.some(gene => 
        gene.day === day && 
        gene.time === time &&
        gene.classId === classId
    );
}


function runPreChecks(input: GenerateTimetableInput): string | null {
    const classToSchedule = input.classes[0];
     const subjectsWithoutFaculty = input.subjects
        .filter(s => s.semester === classToSchedule.semester && s.departmentId === classToSchedule.departmentId && !s.isSpecial && s.id !== 'LIB001' && s.id !== 'CODECHEF')
        .find(sub => !input.faculty.some(f => f.allottedSubjects?.includes(sub.id)));
    
    if (subjectsWithoutFaculty) {
        return `Cannot generate schedule. Subject '${subjectsWithoutFaculty.name}' has no assigned faculty. Please assign faculty to this subject in the Departments & Subjects section.`;
    }

    return null;
}


// --- Main Deterministic Engine ---
export async function runGA(input: GenerateTimetableInput) {
    const classToSchedule = input.classes[0];
    if (!classToSchedule) {
        return { success: false, message: "Class for generation was not provided.", bestTimetable: [], codeChefDay: undefined };
    }

    // STEP 1: Determine the working days based on whether the class has CodeChef.
    const classTakesCodeChef = input.subjects.some(s => 
        s.id === 'CODECHEF' && 
        s.departmentId === classToSchedule.departmentId && 
        s.semester === classToSchedule.semester
    );

    let codeChefDay: string | undefined = undefined;
    let workingDays = [...DAYS];

    if (classTakesCodeChef) {
      // Correctly reserve a random day (Mon-Sat) for CodeChef.
      const dayIndex = Math.floor(Math.random() * workingDays.length);
      // .splice() modifies the array in place and returns the removed elements.
      codeChefDay = workingDays.splice(dayIndex, 1)[0]; 
    }
    // 'workingDays' now correctly contains 5 days if CodeChef is active, otherwise 6.
    
    // STEP 2: Pre-check for impossible scenarios.
    const impossibilityReason = runPreChecks(input);
    if (impossibilityReason) {
        return { success: false, message: impossibilityReason, bestTimetable: [], codeChefDay: undefined };
    }

    // STEP 3: Create the list of lectures that need to be scheduled.
    const lecturesToPlace = createLectureList(input);
    
    const labLectures = lecturesToPlace.filter(l => l.isLab);
    const theoryAndLibraryLectures = lecturesToPlace.filter(l => !l.isLab);

    const generatedSchedule: Gene[] = [];
    // The full schedule includes existing slots from other classes to avoid conflicts.
    const fullSchedule: (Gene | Schedule)[] = [...(input.existingSchedule || [])];

    // STEP 4: Place Lab Lectures (most constrained)
    const availableLabRooms = input.classrooms.filter(c => c.type === 'lab');
    if (availableLabRooms.length === 0 && labLectures.length > 0) {
        return { success: false, message: "Cannot schedule labs. No lab classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }

    const labTimePairs: [string, string][] = [
        ['07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM'], // Morning block
        ['09:30 AM - 10:25 AM', '10:25 AM - 11:20 AM'], // Mid-day block
        ['12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM'], // Afternoon block
    ];

    // Alternate lab timings for variety
    const alternateTimePairs = [labTimePairs[0], labTimePairs[2], labTimePairs[1]].sort(() => Math.random() - 0.5);
    let timePairIndex = 0;

    for (const lab of labLectures) {
        let placed = false;
        const dayStartIndex = Math.floor(Math.random() * workingDays.length);

        for (let i = 0; i < workingDays.length; i++) {
            const day = workingDays[(dayStartIndex + i) % workingDays.length];
            const [time1, time2] = alternateTimePairs[timePairIndex % alternateTimePairs.length];

            for (const room of availableLabRooms.sort(() => Math.random() - 0.5)) {
                if (canPlaceLab(fullSchedule, day, time1, time2, lab.facultyId, room.id, lab.classId)) {
                    const gene1: Gene = { day, time: time1, ...lab, classroomId: room.id, isLab: true };
                    const gene2: Gene = { day, time: time2, ...lab, classroomId: room.id, isLab: true };
                    generatedSchedule.push(gene1, gene2);
                    fullSchedule.push(gene1, gene2);
                    placed = true;
                    timePairIndex++;
                    break;
                }
            }
            if (placed) break;
        }
        if (!placed) {
             const subject = input.subjects.find(s => s.id === lab.subjectId);
             return { success: false, message: `Could not schedule lab for '${subject?.name || lab.subjectId}'. Not enough conflict-free lab slots available.`, bestTimetable: [], codeChefDay: undefined };
        }
    }
    
    // STEP 5: Place Theory and Library Lectures
    const availableClassrooms = input.classrooms.filter(c => c.type === 'classroom');
    if (availableClassrooms.length === 0 && theoryAndLibraryLectures.filter(t => t.subjectId !== 'LIB001').length > 0) {
        return { success: false, message: "Cannot schedule theory lectures. No classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }
    
    // Place theory and library lectures
    for (const theory of theoryAndLibraryLectures.sort(() => Math.random() - 0.5)) {
        let placed = false;
        
        // Iterate through days and times systematically but with a random start to ensure placement
        for (const day of workingDays.sort(() => Math.random() - 0.5)) {
             const timeSlotsToTry = LECTURE_TIME_SLOTS.sort(() => Math.random() - 0.5);

             for (const time of timeSlotsToTry) {
                  // Check if this slot is already taken for the current class
                  if (fullSchedule.some(g => g.classId === theory.classId && g.day === day && g.time === time)) continue;
                  
                  // Handle Library slots
                  if (theory.subjectId === 'LIB001') {
                     if (canPlaceLibrary(fullSchedule, day, time, theory.classId)) {
                        const gene = { day, time, ...theory, classroomId: 'CR_LIB', isLab: false };
                        generatedSchedule.push(gene);
                        fullSchedule.push(gene);
                        placed = true;
                        break;
                     }
                     continue; // Try next time/day for library
                  }
                  
                  // Handle Theory slots
                  let roomsToTry = availableClassrooms.sort(() => Math.random() - 0.5);
                  
                  // "Classroom Stickiness" logic: Prioritize using the same room as the previous lecture
                  const prevSlotTime = LECTURE_TIME_SLOTS[LECTURE_TIME_SLOTS.indexOf(time) - 1];
                  if (prevSlotTime) {
                      const previousSlot = fullSchedule.find(s => s.day === day && s.time === prevSlotTime && s.classId === theory.classId);
                      // If the previous slot was a theory class, try to use its room first
                      if (previousSlot && !(previousSlot as Gene).isLab && previousSlot.subjectId !== 'LIB001' && previousSlot.classroomId) {
                          const preferredRoomId = previousSlot.classroomId;
                          roomsToTry = [
                              ...roomsToTry.filter(r => r.id === preferredRoomId),
                              ...roomsToTry.filter(r => r.id !== preferredRoomId)
                          ];
                      }
                  }

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
             if (placed) break;
        }

        if (!placed) {
            const subject = input.subjects.find(s => s.id === theory.subjectId);
            return { success: false, message: `Could not schedule all lectures. Failed on '${subject?.name || 'a subject'}'. The schedule is too constrained. Try generating again.`, bestTimetable: [], codeChefDay: undefined };
        }
    }
    
    // STEP 6: Format the final output
    const finalSchedule: Schedule[] = generatedSchedule.map((g, i) => ({ 
        id: `GEN${Date.now()}${i}`,
        day: g.day as any,
        time: g.time,
        classId: g.classId,
        subjectId: g.subjectId,
        facultyId: g.facultyId,
        classroomId: g.classroomId,
    }));

    const academicSlotsCount = finalSchedule.filter(s => s.subjectId !== 'LIB001').length;
   
    return {
        success: true,
        message: `Successfully generated a schedule with ${academicSlotsCount} academic slots.`,
        bestTimetable: finalSchedule,
        codeChefDay,
    };
}
