
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
// Strict time slots as per user request
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
        // Skip special subjects like CodeChef, which is handled separately
        if (sub.isSpecial || sub.id === 'LIB001') continue;

        const facultyForSubject = input.faculty.find(f => f.allottedSubjects?.includes(sub.id));
        if (!facultyForSubject) {
            console.warn(`[Scheduler] No faculty for subject ${sub.name}. Skipping.`);
            continue;
        }

        if (sub.type === 'lab') {
            // Labs are 2 hours long, scheduled once a week.
            lectures.push({
                classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                isLab: true, hours: 2
            });
            academicHours += 2;
        } else {
            // Theory subjects have hours based on priority.
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
    
    // 2. Add Library slots to fill up the week, with a max of 4 empty slots
    const totalWeeklySlots = 21; // 7 slots * 3 days = 21 non-break slots per 3 working days is wrong. 7 slots * 5 days = 35. This needs to be 21 as per user
    const librarySlotsToCreate = Math.max(0, totalWeeklySlots - academicHours);
    
    for (let i = 0; i < librarySlotsToCreate; i++) {
        lectures.push({
            classId: classToSchedule.id, subjectId: 'LIB001', facultyId: 'FAC_LIB',
            isLab: false, hours: 1
        });
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
    // Rule: Each day will have only 1 lab slot for a given class.
    return !schedule.some(g => g.classId === classId && g.day === day && (g as Gene).isLab);
}

function canPlaceTheory(schedule: (Gene | Schedule)[], day: string, time: string, facultyId: string, classroomId: string, classId: string, subjectId: string): boolean {
    if (isConflict(schedule, day, time, facultyId, classroomId, classId)) {
        return false;
    }
    
    const dayScheduleForClass = schedule.filter(g => g.classId === classId && g.day === day);
    
    // Rule: Do not give same subject classes more than 2 on same day.
    if (dayScheduleForClass.filter(s => s.subjectId === subjectId).length >= 2) {
        return false;
    }
    
    return true;
}

function canPlaceLibrary(schedule: (Gene | Schedule)[], day: string, time: string, classId: string): boolean {
     // For library, only check if the CLASS is busy. The room (library) can be shared.
     return !schedule.some(gene => 
        gene.day === day && 
        gene.time === time &&
        gene.classId === classId
    );
}


function runPreChecks(input: GenerateTimetableInput): string | null {
    const classToSchedule = input.classes[0];
     const subjectsWithoutFaculty = input.subjects
        .filter(s => s.semester === classToSchedule.semester && s.departmentId === classToSchedule.departmentId && !s.isSpecial && s.id !== 'LIB001')
        .find(sub => !input.faculty.some(f => f.allottedSubjects?.includes(sub.id)));
    
    if (subjectsWithoutFaculty) {
        return `Cannot generate schedule. Subject '${subjectsWithoutFaculty.name}' has no assigned faculty. Please assign faculty to this subject in the Departments & Subjects section.`;
    }

    return null;
}


// --- Main Deterministic Engine ---
export async function runGA(input: GenerateTimetableInput) {
    const classToSchedule = input.classes[0];

    const classTakesCodeChef = input.subjects.some(s => 
        s.id === 'CODECHEF' && 
        s.departmentId === classToSchedule.departmentId && 
        s.semester === classToSchedule.semester
    );
    
    let codeChefDay: string | undefined = undefined;
    let workingDays: string[];

    if (classTakesCodeChef) {
      // Pick a random weekday (Mon-Fri) for CodeChef
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      codeChefDay = weekdays[Math.floor(Math.random() * weekdays.length)];
      // The working days are all days EXCEPT the chosen CodeChef day
      workingDays = DAYS.filter(d => d !== codeChefDay);
    } else {
      // For regular classes, the working week is Monday to Friday
      workingDays = DAYS.filter(d => d !== 'Saturday');
    }
    
    const impossibilityReason = runPreChecks(input);
    if (impossibilityReason) {
        return { success: false, message: impossibilityReason, bestTimetable: [], codeChefDay: undefined };
    }

    const lecturesToPlace = createLectureList(input);
    
    const labLectures = lecturesToPlace.filter(l => l.isLab);
    const theoryAndLibraryLectures = lecturesToPlace.filter(l => !l.isLab).sort(() => Math.random() - 0.5);;

    const generatedSchedule: Gene[] = [];
    const fullSchedule: (Gene | Schedule)[] = [...(input.existingSchedule || [])];

    const availableLabRooms = input.classrooms.filter(c => c.type === 'lab');
    if (availableLabRooms.length === 0 && labLectures.length > 0) {
        return { success: false, message: "Cannot schedule labs. No lab classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }

    // Valid 2-hour lab slots that don't cross breaks
    const labTimePairs: [string, string][] = [
        ['07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM'],
        ['09:30 AM - 10:25 AM', '10:25 AM - 11:20 AM'],
        ['12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM'],
    ];

    // Alternate lab slots to distribute them across the day
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
    
    // Place Theory and Library lectures
    const availableClassrooms = input.classrooms.filter(c => c.type === 'classroom');
    if (availableClassrooms.length === 0 && theoryAndLibraryLectures.filter(t => t.subjectId !== 'LIB001').length > 0) {
        return { success: false, message: "Cannot schedule theory lectures. No classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }
    
    for (const theory of theoryAndLibraryLectures) {
        let placed = false;
        
        for (const day of workingDays.sort(() => Math.random() - 0.5)) {
             const timeSlotsToTry = LECTURE_TIME_SLOTS.sort(() => Math.random() - 0.5);

             for (const time of timeSlotsToTry) {
                  // Skip if slot is already taken for this class
                  if (fullSchedule.some(g => g.classId === theory.classId && g.day === day && g.time === time)) continue;
                  
                  if (theory.subjectId === 'LIB001') {
                     if (canPlaceLibrary(fullSchedule, day, time, theory.classId)) {
                        const gene = { day, time, ...theory, classroomId: 'CR_LIB', isLab: false };
                        generatedSchedule.push(gene);
                        fullSchedule.push(gene);
                        placed = true;
                        break;
                     }
                     continue; 
                  }

                  const shuffledRooms = availableClassrooms.sort(() => Math.random() - 0.5);
                  for (const room of shuffledRooms) {
                     // Classroom consistency check
                     const prevSlotTime = LECTURE_TIME_SLOTS[LECTURE_TIME_SLOTS.indexOf(time) - 1];
                     if(prevSlotTime) {
                        const previousSlot = fullSchedule.find(s => s.day === day && s.time === prevSlotTime && s.classId === theory.classId);
                        // If previous slot was theory, try to use same room
                        if (previousSlot && (previousSlot as Gene).isLab === false && previousSlot.subjectId !== 'LIB001' && previousSlot.classroomId !== room.id) {
                           continue;
                        }
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
            return { success: false, message: `Could not schedule all lectures. Failed on '${subject?.name || 'a subject'}'. The schedule is too constrained. Try generating again.`, bestTimetable: [], codeChefDay: undefined };
        }
    }
    
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
