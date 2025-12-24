
'use server';

import type { GenerateTimetableInput, Subject, Faculty, Classroom, Schedule, SubjectPriority } from './types';

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
    priority: SubjectPriority | undefined;
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
                isLab: true, batch: 'A', priority: sub.priority, hours: 2
            });
            lectures.push({
                classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                isLab: true, batch: 'B', priority: sub.priority, hours: 2
            });
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lectures.push({
                    classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyForSubject.id,
                    isLab: false, priority: sub.priority, hours: 1
                });
            }
        }
    }
    
    // Sort by priority: Labs first, then NN > High > Medium > Low
    const priorityOrder = { 'Non Negotiable': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    lectures.sort((a, b) => {
        const priorityA = a.isLab ? 5 : priorityOrder[a.priority || 'Low'] || 0;
        const priorityB = b.isLab ? 5 : priorityOrder[b.priority || 'Low'] || 0;
        return priorityB - priorityA;
    });

    return lectures;
}

function isConflict(schedule: Gene[], day: string, time: string, facultyId: string, classroomId: string, classId: string): boolean {
    return schedule.some(gene => 
        gene.day === day && 
        gene.time === time &&
        (gene.facultyId === facultyId || gene.classroomId === classroomId || gene.classId === classId)
    );
}


function canPlaceLab(schedule: Gene[], day: string, time1: string, time2: string, facultyId: string, classroomId: string, classId: string, input: GenerateTimetableInput): boolean {
    const fullSchedule = [...schedule, ...input.existingSchedule];
    // Check conflicts for both slots
    if (isConflict(fullSchedule, day, time1, facultyId, classroomId, classId) || isConflict(fullSchedule, day, time2, facultyId, classroomId, classId)) {
        return false;
    }
    // Check max one lab per day for this class
    if (schedule.some(g => g.classId === classId && g.day === day && g.isLab)) {
        return false;
    }
    return true;
}


function canPlaceTheory(schedule: Gene[], day: string, time: string, facultyId: string, classroomId: string, classId: string, input: GenerateTimetableInput): boolean {
    const fullSchedule = [...schedule, ...input.existingSchedule];
    if (isConflict(fullSchedule, day, time, facultyId, classroomId, classId)) {
        return false;
    }
    const daySchedule = schedule.filter(g => g.classId === classId && g.day === day && !g.isLab);
    // Max 2 consecutive theory
    const timeIndex = LECTURE_TIME_SLOTS.indexOf(time);
    const prevSlot = LECTURE_TIME_SLOTS[timeIndex - 1];
    const prev2Slot = LECTURE_TIME_SLOTS[timeIndex - 2];
    if (
        daySchedule.some(s => s.time === prevSlot) &&
        daySchedule.some(s => s.time === prev2Slot)
    ) {
        return false;
    }
    return true;
}

/**
 * The main backtracking solver function.
 */
function solve(
    lecturesToPlace: LectureToBePlaced[],
    currentSchedule: Gene[],
    workingDays: string[],
    input: GenerateTimetableInput
): Gene[] | null {
    if (lecturesToPlace.length === 0) {
        return currentSchedule; // All lectures placed, solution found
    }

    const lecture = lecturesToPlace[0];
    const remainingLectures = lecturesToPlace.slice(1);
    
    if (lecture.isLab) {
        const availableClassrooms = input.classrooms.filter(c => c.type === 'lab');
        const labTimePairs: [string, string][] = [];
        for (let i = 0; i < LECTURE_TIME_SLOTS.length - 1; i++) {
             // Avoid breaks
            if(LECTURE_TIME_SLOTS[i+1] === '10:00 AM - 11:00 AM' && LECTURE_TIME_SLOTS[i] === '08:30 AM - 09:30 AM') continue;
            if(LECTURE_TIME_SLOTS[i+1] === '01:00 PM - 02:00 PM' && LECTURE_TIME_SLOTS[i] === '11:00 AM - 12:00 PM') continue;
            labTimePairs.push([LECTURE_TIME_SLOTS[i], LECTURE_TIME_SLOTS[i+1]]);
        }
        
        for (const day of workingDays) {
            for (const [time1, time2] of labTimePairs) {
                for (const classroom of availableClassrooms) {
                    if (canPlaceLab(currentSchedule, day, time1, time2, lecture.facultyId, classroom.id, lecture.classId, input)) {
                        const newGenes: Gene[] = [
                            { day, time: time1, ...lecture, classroomId: classroom.id },
                            { day, time: time2, ...lecture, classroomId: classroom.id },
                        ];
                        const result = solve(remainingLectures, [...currentSchedule, ...newGenes], workingDays, input);
                        if (result) return result;
                    }
                }
            }
        }

    } else { // It's a theory lecture
        const availableClassrooms = input.classrooms.filter(c => c.type === 'classroom');
        for (const day of workingDays) {
            for (const time of LECTURE_TIME_SLOTS) {
                for (const classroom of availableClassrooms) {
                    if (canPlaceTheory(currentSchedule, day, time, lecture.facultyId, classroom.id, lecture.classId, input)) {
                        const newGene: Gene = { day, time, ...lecture, classroomId: classroom.id };
                        const result = solve(remainingLectures, [...currentSchedule, newGene], workingDays, input);
                        if (result) return result;
                    }
                }
            }
        }
    }
    
    return null; // No valid placement found for this lecture
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
    const requiredLabSlots = lecturesToPlace.filter(l => l.isLab).length;
    const totalAcademicSlotsRequired = requiredTheorySlots + requiredLabSlots;
    
    if (totalAcademicSlotsRequired > workingDays.length * LECTURE_TIME_SLOTS.length) {
         return { success: false, message: "Not enough time slots in the week to schedule all required lectures." };
    }
    
    // 3. Run the solver
    let generatedSchedule = solve(lecturesToPlace, [], workingDays, input);

    if (!generatedSchedule) {
        return { success: false, message: "Could not generate a valid timetable. The constraints are too restrictive. Please check faculty workload and classroom availability." };
    }
    
    // 4. Fill remaining slots with Library and CodeChef
    const finalSchedule: Gene[] = generatedSchedule.map((g, i) => ({ ...g, id: `GEN${i}${Date.now()}` }));
    const classToSchedule = input.classes[0];
    
    // Fill CodeChef Day
    LECTURE_TIME_SLOTS.forEach(time => {
        finalSchedule.push({
            id: `GEN_CC_${time.replace(/\s/g, '')}`, day: codeChefDay, time, classId: classToSchedule.id,
            subjectId: 'CODECHEF', facultyId: 'NA', classroomId: 'NA', isLab: false, isCodeChef: true
        });
    });

    // Fill Library Slots
    const totalSlotsPerWeek = workingDays.length * LECTURE_TIME_SLOTS.length;
    const scheduledSlotKeys = new Set(finalSchedule.filter(g => !g.isCodeChef).map(g => `${g.day}-${g.time}`));
    
    let librarySlotsPlaced = 0;
    if (scheduledSlotKeys.size < totalSlotsPerWeek) {
         for(const day of workingDays) {
            for(const time of LECTURE_TIME_SLOTS) {
                const key = `${day}-${time}`;
                if(!scheduledSlotKeys.has(key)) {
                    finalSchedule.push({
                        id: `GEN_LIB_${librarySlotsPlaced}`, day, time, classId: classToSchedule.id,
                        subjectId: 'LIB001', facultyId: 'NA', classroomId: 'NA', isLab: false
                    });
                    librarySlotsPlaced++;
                }
            }
        }
    }
    
    const finalAcademicCount = finalSchedule.filter(g => !g.isCodeChef && g.subjectId !== 'LIB001').length;
    
    if (finalAcademicCount < requiredTheorySlots + requiredLabSlots) {
         return { success: false, message: `Engine failed to place all academic slots. Placed ${finalAcademicCount} out of ${totalAcademicSlotsRequired}.` };
    }

    return {
        success: true,
        message: `Successfully generated a complete schedule with ${finalAcademicCount} academic slots.`,
        bestTimetable: finalSchedule,
        generations: 1, 
        fitness: 0, 
        codeChefDay: codeChefDay,
    };
}

    