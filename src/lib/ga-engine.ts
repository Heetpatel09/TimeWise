
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
    hours: number;
    priorityValue: number;
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
const BREAK_SLOTS = ['09:20 AM - 09:30 AM', '11:20 AM - 12:20 PM'];
const ALL_TIME_SLOTS = [
    '07:30 AM - 08:25 AM',
    '08:25 AM - 09:20 AM',
    '09:20 AM - 09:30 AM',
    '09:30 AM - 10:25 AM',
    '10:25 AM - 11:20 AM',
    '11:20 AM - 12:20 PM',
    '12:20 PM - 01:15 PM',
    '01:15 PM - 02:10 PM'
];

const getHoursForPriority = (priority?: SubjectPriority): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 2;
    }
};

const getPriorityValue = (priority?: SubjectPriority): number => {
     switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 0;
    }
}

function createLectureList(input: GenerateTimetableInput, maxSlots: number): LectureToBePlaced[] {
    const potentialLectures: LectureToBePlaced[] = [];
    const classToSchedule = input.classes[0];
    const classSubjects = input.subjects.filter(
        s => s.semester === classToSchedule.semester && s.department === classToSchedule.department
    );

    for (const sub of classSubjects) {
        if (sub.isSpecial) continue;
        
        const facultyForSubject = input.faculty.find(f => f.allottedSubjects?.includes(sub.id));
        if (!facultyForSubject) {
            console.warn(`[Scheduler] No faculty for subject ${sub.name}. Skipping.`);
            continue;
        }

        if (sub.type === 'lab') {
            potentialLectures.push({
                classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                isLab: true, hours: 2, priorityValue: 5 // Labs get highest priority
            });
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                potentialLectures.push({
                    classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                    isLab: false, hours: 1, priorityValue: getPriorityValue(sub.priority)
                });
            }
        }
    }
    
    potentialLectures.sort((a, b) => {
        if (a.isLab && !b.isLab) return -1;
        if (!a.isLab && b.isLab) return 1;
        return b.priorityValue - a.priorityValue;
    });

    const finalLectures: LectureToBePlaced[] = [];
    let totalHours = 0;
    for (const potentialLecture of potentialLectures) {
         if (totalHours + potentialLecture.hours <= maxSlots) {
            finalLectures.push(potentialLecture);
            totalHours += potentialLecture.hours;
        }
    }
    
    // Add library slots to fill up to 21 total slots
    const academicAndLabHours = finalLectures.reduce((sum, l) => sum + l.hours, 0);
    const librarySlotsToCreate = Math.max(0, 21 - academicAndLabHours);
     for (let i = 0; i < librarySlotsToCreate; i++) {
        finalLectures.push({
            classId: classToSchedule.id, subjectId: 'LIB001', facultyId: 'FAC_LIB',
            isLab: false, hours: 1, priorityValue: -1 // Lowest priority
        });
    }

    return finalLectures;
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
    // Each day will have only 1 lab slot for a given class.
    return !schedule.some(g => g.classId === classId && g.day === day && (g as Gene).isLab);
}

function canPlaceTheory(schedule: (Gene | Schedule)[], day: string, time: string, facultyId: string, classroomId: string, classId: string, subjectId: string): boolean {
    if (isConflict(schedule, day, time, facultyId, classroomId, classId)) {
        return false;
    }
    
    const dayScheduleForClass = schedule.filter(g => g.classId === classId && g.day === day);
    
    if (dayScheduleForClass.filter(s => s.subjectId === subjectId).length >= 2) {
        return false;
    }
    
    const previousSlotTime = LECTURE_TIME_SLOTS[LECTURE_TIME_SLOTS.indexOf(time) - 1];
    if (previousSlotTime) {
        const previousSlot = dayScheduleForClass.find(s => s.time === previousSlotTime);
        if (previousSlot && previousSlot.subjectId === subjectId) {
            return false;
        }
    }
    
    return true;
}


function runPreChecks(input: GenerateTimetableInput): string | null {
    const classToSchedule = input.classes[0];
     const subjectsWithoutFaculty = input.subjects
        .filter(s => s.semester === classToSchedule.semester && s.department === classToSchedule.department && !s.isSpecial && s.id !== 'LIB001')
        .find(sub => !input.faculty.some(f => f.allottedSubjects?.includes(sub.id)));
    
    if (subjectsWithoutFaculty) {
        return `Cannot generate schedule. Subject '${subjectsWithoutFaculty.name}' has no assigned faculty. Please assign faculty to this subject in the Departments & Subjects section.`;
    }

    return null;
}


// --- Main Deterministic Engine ---
export async function runGA(input: GenerateTimetableInput) {
    const codeChefDayIndex = Math.floor(Math.random() * (DAYS.length - 1));
    const codeChefDay = DAYS[codeChefDayIndex];
    const workingDays = DAYS.filter(d => d !== codeChefDay);
    const availableSlotsPerWeek = workingDays.length * LECTURE_TIME_SLOTS.length;
    
    const impossibilityReason = runPreChecks(input);
    if (impossibilityReason) {
        return { success: false, message: impossibilityReason, bestTimetable: [], codeChefDay: undefined };
    }

    const lecturesToPlace = createLectureList(input, availableSlotsPerWeek);
    
    const labLectures = lecturesToPlace.filter(l => l.isLab);
    const theoryLectures = lecturesToPlace.filter(l => !l.isLab);

    const generatedSchedule: Gene[] = [];
    let fullSchedule: (Gene | Schedule)[] = [...input.existingSchedule || []];

    const availableLabRooms = input.classrooms.filter(c => c.type === 'lab');
    if (availableLabRooms.length === 0 && labLectures.length > 0) {
        return { success: false, message: "Cannot schedule labs. No lab classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }

    const labTimePairs: [string, string][] = [
        ['07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM'],
        ['12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM'],
    ];

    let lastLabWasMorning = false;
    for (const lab of labLectures) {
        let placed = false;
        const shuffledDays = workingDays.sort(() => Math.random() - 0.5);

        for (const day of shuffledDays) {
            const timePairsToTry = lastLabWasMorning ? [...labTimePairs].reverse() : labTimePairs;
            for (const [time1, time2] of timePairsToTry) {
                 for (const room of availableLabRooms.sort(() => Math.random() - 0.5)) {
                    if (canPlaceLab(fullSchedule, day, time1, time2, lab.facultyId, room.id, lab.classId)) {
                        const gene1 = { day, time: time1, ...lab, classroomId: room.id, isLab: true };
                        const gene2 = { day, time: time2, ...lab, classroomId: room.id, isLab: true };
                        generatedSchedule.push(gene1, gene2);
                        fullSchedule = [...fullSchedule, gene1, gene2];
                        placed = true;
                        lastLabWasMorning = labTimePairs.indexOf(timePairsToTry[0]) === 0;
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
    if (availableClassrooms.length === 0 && theoryLectures.filter(t => t.subjectId !== 'LIB001').length > 0) {
        return { success: false, message: "Cannot schedule theory lectures. No classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }

    for (const theory of theoryLectures) {
        let placed = false;
        const allPossibleSlots = workingDays.flatMap(day => LECTURE_TIME_SLOTS.map(time => ({ day, time }))).sort(() => Math.random() - 0.5);
        
        for (const { day, time } of allPossibleSlots) {
             if (fullSchedule.some(g => g.classId === theory.classId && g.day === day && g.time === time)) continue;
              
              if (theory.subjectId === 'LIB001') {
                 const gene = { day, time, ...theory, classroomId: 'CR_LIB', facultyId: 'FAC_LIB', isLab: false };
                 generatedSchedule.push(gene);
                 fullSchedule = [...fullSchedule, gene];
                 placed = true;
                 break;
              }

              let roomToUse: string | undefined = undefined;
              const previousSlotTime = LECTURE_TIME_SLOTS[LECTURE_TIME_SLOTS.indexOf(time) - 1];
              if (previousSlotTime) {
                  const previousSlot = fullSchedule.find(g => g.classId === theory.classId && g.day === day && g.time === previousSlotTime && !(g as Gene).isLab);
                  if (previousSlot) {
                      roomToUse = previousSlot.classroomId;
                  }
              }

              const roomsToTry = roomToUse 
                ? availableClassrooms.filter(c => c.id === roomToUse)
                : availableClassrooms.sort(() => Math.random() - 0.5);
              
              for (const room of roomsToTry) {
                 if (canPlaceTheory(fullSchedule, day, time, theory.facultyId, room.id, theory.classId, theory.subjectId)) {
                    const gene = { day, time, ...theory, classroomId: room.id, isLab: false };
                    generatedSchedule.push(gene);
                    fullSchedule = [...fullSchedule, gene];
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

    const academicSlotsCount = finalSchedule.filter(s => s.subjectId !== 'LIB001').length;
   
    return {
        success: true,
        message: `Successfully generated a schedule with ${academicSlotsCount} academic slots.`,
        bestTimetable: finalSchedule,
        codeChefDay,
    };
}

    