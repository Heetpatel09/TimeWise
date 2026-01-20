
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

function createLectureList(input: GenerateTimetableInput, maxSlots: number): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classToSchedule = input.classes[0];
    const classSubjects = input.subjects.filter(
        s => s.semester === classToSchedule.semester && s.departmentId === classToSchedule.departmentId
    );

    // 1. Add Academic Lectures
    for (const sub of classSubjects) {
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
        } else {
            // Theory subjects have hours based on priority.
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lectures.push({
                    classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                    isLab: false, hours: 1
                });
            }
        }
    }
    
    // Sort by labs first (most constrained), then theory
    lectures.sort((a, b) => (b.isLab ? 1 : 0) - (a.isLab ? 1 : 0));

    // 2. Calculate remaining slots to meet the "at most 4 empty slots" goal and fill with Library
    const academicHours = lectures.reduce((sum, l) => sum + l.hours, 0);
    const targetFilledSlots = maxSlots - 4;
    
    const librarySlotsToCreate = Math.max(0, targetFilledSlots - academicHours);
    
    for (let i = 0; i < librarySlotsToCreate; i++) {
        lectures.push({
            classId: classToSchedule.id, subjectId: 'LIB001', facultyId: 'FAC_LIB',
            isLab: false, hours: 1
        });
    }

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
    let workingDays = [...DAYS];

    if (classTakesCodeChef) {
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      codeChefDay = weekdays[Math.floor(Math.random() * weekdays.length)];
      workingDays = DAYS.filter(d => d !== codeChefDay);
    }
    
    const availableSlotsPerWeek = workingDays.length * LECTURE_TIME_SLOTS.length;
    
    const impossibilityReason = runPreChecks(input);
    if (impossibilityReason) {
        return { success: false, message: impossibilityReason, bestTimetable: [], codeChefDay: undefined };
    }

    const lecturesToPlace = createLectureList(input, availableSlotsPerWeek);
    
    const labLectures = lecturesToPlace.filter(l => l.isLab);
    const theoryLectures = lecturesToPlace.filter(l => !l.isLab);

    const generatedSchedule: Gene[] = [];
    const fullSchedule: (Gene | Schedule)[] = [...(input.existingSchedule || [])];

    const availableLabRooms = input.classrooms.filter(c => c.type === 'lab');
    if (availableLabRooms.length === 0 && labLectures.length > 0) {
        return { success: false, message: "Cannot schedule labs. No lab classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }

    const labTimePairs: [string, string][] = [
        ['07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM'],
        ['09:30 AM - 10:25 AM', '10:25 AM - 11:20 AM'],
        ['12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM'],
    ];

    for (const lab of labLectures) {
        let placed = false;
        const shuffledDays = workingDays.sort(() => Math.random() - 0.5);

        for (const day of shuffledDays) {
            const timePairsToTry = labTimePairs.sort(() => Math.random() - 0.5);
            for (const [time1, time2] of timePairsToTry) {
                 for (const room of availableLabRooms.sort(() => Math.random() - 0.5)) {
                    if (canPlaceLab(fullSchedule, day, time1, time2, lab.facultyId, room.id, lab.classId)) {
                        const gene1: Gene = { day, time: time1, ...lab, classroomId: room.id, isLab: true };
                        const gene2: Gene = { day, time: time2, ...lab, classroomId: room.id, isLab: true };
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
             const subject = input.subjects.find(s => s.id === lab.subjectId);
             return { success: false, message: `Could not schedule lab for '${subject?.name || lab.subjectId}'. Not enough conflict-free lab slots available.`, bestTimetable: [], codeChefDay: undefined };
        }
    }
    
    // Place Theory lectures
    const availableClassrooms = input.classrooms.filter(c => c.type === 'classroom');
    if (availableClassrooms.length === 0 && theoryLectures.filter(t => t.subjectId !== 'LIB001').length > 0) {
        return { success: false, message: "Cannot schedule theory lectures. No classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }

    const lecturesPerDay = workingDays.reduce((acc, day) => {
        acc[day] = fullSchedule.filter(s => s.day === day && s.classId === classToSchedule.id).length;
        return acc;
    }, {} as Record<string, number>);

    for (const theory of theoryLectures) {
        let placed = false;
        
        const possibleSlots = [];
        for (const day of workingDays) {
            for (const time of LECTURE_TIME_SLOTS) {
                if (fullSchedule.some(g => g.classId === theory.classId && g.day === day && g.time === time)) continue;
                
                let score = 0;
                score -= lecturesPerDay[day] * 10;
                if (LECTURE_TIME_SLOTS.indexOf(time) < 4) score += 5;
                const timeIndex = LECTURE_TIME_SLOTS.indexOf(time);
                const daySchedule = fullSchedule.filter(s => s.classId === theory.classId && s.day === day);
                if (timeIndex > 0 && daySchedule.some(s => s.time === LECTURE_TIME_SLOTS[timeIndex - 1])) score += 20;
                if (timeIndex < LECTURE_TIME_SLOTS.length - 1 && daySchedule.some(s => s.time === LECTURE_TIME_SLOTS[timeIndex + 1])) score += 20;
                
                possibleSlots.push({ day, time, score });
            }
        }
        
        possibleSlots.sort((a, b) => b.score - a.score + (Math.random() - 0.5) * 5);

        for (const { day, time } of possibleSlots) {
            if (theory.subjectId === 'LIB001') {
                 const gene = { day, time, ...theory, classroomId: 'CR_LIB', facultyId: 'FAC_LIB', isLab: false };
                 generatedSchedule.push(gene);
                 fullSchedule.push(gene);
                 lecturesPerDay[day]++;
                 placed = true;
                 break;
            }
            
            for (const room of availableClassrooms.sort(() => Math.random() - 0.5)) {
                 if (canPlaceTheory(fullSchedule, day, time, theory.facultyId, room.id, theory.classId, theory.subjectId)) {
                    const gene = { day, time, ...theory, classroomId: room.id, isLab: false };
                    generatedSchedule.push(gene);
                    fullSchedule.push(gene);
                    lecturesPerDay[day]++;
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
