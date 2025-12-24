
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
    hours: number; // How many 1-hour slots this lecture represents
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
            // One 2-hour lab session for each batch
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
    
    // Sort by priority: NN > High > Medium > Low > Lab
    const priorityOrder = { 'Non Negotiable': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    lectures.sort((a, b) => {
        const priorityA = a.isLab ? 0 : priorityOrder[a.priority || 'Low'] || 0;
        const priorityB = b.isLab ? 0 : priorityOrder[b.priority || 'Low'] || 0;
        return priorityB - priorityA;
    });

    return lectures;
}

/**
 * The main backtracking solver function.
 */
function solve(
    lecturesToPlace: LectureToBePlaced[],
    schedule: Gene[],
    workingDays: string[],
    input: GenerateTimetableInput
): Gene[] | null {
    if (lecturesToPlace.length === 0) {
        return schedule; // All lectures placed, solution found
    }

    const lecture = lecturesToPlace[0];
    const remainingLectures = lecturesToPlace.slice(1);
    const availableClassrooms = input.classrooms.filter(c => c.type === (lecture.isLab ? 'lab' : 'classroom'));

    for (const day of workingDays) {
        // Lab constraint: only one lab per day for this class
        if (lecture.isLab && schedule.some(g => g.day === day && g.isLab && g.classId === lecture.classId)) {
            continue;
        }

        const timeSlots = lecture.isLab 
            ? LECTURE_TIME_SLOTS.slice(0, -1).map((time, i) => [time, LECTURE_TIME_SLOTS[i+1]]) // Pairs of consecutive slots
            : LECTURE_TIME_SLOTS;

        for (const slot of timeSlots) {
            for (const classroom of availableClassrooms) {
                
                let isConflict = false;
                const tempGenes: Omit<Gene, 'id'>[] = [];

                if(lecture.isLab) {
                    // It's a lab, check both consecutive slots
                    const [time1, time2] = slot as string[];
                    tempGenes.push({ ...lecture, day, time: time1, classroomId: classroom.id });
                    tempGenes.push({ ...lecture, day, time: time2, classroomId: classroom.id });
                } else {
                    tempGenes.push({ ...lecture, day, time: slot as string, classroomId: classroom.id });
                }
                
                for(const gene of tempGenes) {
                    const fullSchedule = [...schedule, ...input.existingSchedule];
                     // Check for conflicts: faculty, classroom, or class itself
                    if (fullSchedule.some(s => s.day === gene.day && s.time === gene.time && (s.facultyId === gene.facultyId || s.classroomId === gene.classroomId || s.classId === gene.classId))) {
                        isConflict = true;
                        break;
                    }
                    // Check max 2 consecutive theory lectures
                    const daySchedule = [...schedule, ...tempGenes.filter(g => g !== gene)].filter(s => s.classId === gene.classId && s.day === gene.day);
                    if(!gene.isLab && daySchedule.length > 1) {
                        const sortedDay = daySchedule.sort((a,b) => LECTURE_TIME_SLOTS.indexOf(a.time) - LECTURE_TIME_SLOTS.indexOf(b.time));
                        for(let i=0; i<sortedDay.length - 2; i++) {
                            if(!sortedDay[i].isLab && !sortedDay[i+1].isLab && !sortedDay[i+2].isLab) {
                                const t1 = LECTURE_TIME_SLOTS.indexOf(sortedDay[i].time);
                                const t2 = LECTURE_TIME_SLOTS.indexOf(sortedDay[i+1].time);
                                const t3 = LECTURE_TIME_SLOTS.indexOf(sortedDay[i+2].time);
                                if(t2 === t1 + 1 && t3 === t2 + 1) {
                                    isConflict = true;
                                    break;
                                }
                            }
                        }
                    }
                    if(isConflict) break;
                }

                if (!isConflict) {
                    const newSchedule = [...schedule, ...tempGenes.map(g => ({...g, id: ''}))];
                    const result = solve(remainingLectures, newSchedule, workingDays, input);
                    if (result) {
                        return result; // Solution found down this path
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
    const totalAcademicSlotsRequired = lecturesToPlace.reduce((sum, lec) => sum + (lec.isLab ? 1 : lec.hours), new Map<string, number>()).size;
    
    // Check for impossibilities before starting
    const totalFacultyWorkload = input.faculty.reduce((acc, fac) => {
        const hours = lecturesToPlace.filter(l => l.facultyId === fac.id).length;
        acc.set(fac.id, hours);
        return acc;
    }, new Map<string, number>());
    
    for(const [facultyId, hours] of totalFacultyWorkload.entries()){
        const facultyMember = input.faculty.find(f => f.id === facultyId);
        if(facultyMember?.maxWeeklyHours && hours > facultyMember.maxWeeklyHours) {
             return { success: false, message: `Faculty ${facultyMember.name} is overallocated with ${hours} hours (max is ${facultyMember.maxWeeklyHours}). Cannot generate schedule.` };
        }
    }

    // 3. Run the solver
    let generatedSchedule = solve(lecturesToPlace, [], workingDays, input);

    if (!generatedSchedule) {
        return { success: false, message: "Could not generate a valid timetable with the given constraints. There might be too many conflicts with existing schedules or faculty/classroom availability." };
    }
    
    // 4. Fill remaining slots with Library and CodeChef
    const finalSchedule: Gene[] = generatedSchedule.map((g, i) => ({ ...g, id: `GEN${i}${Date.now()}` }));
    const classToSchedule = input.classes[0];
    
    // Fill CodeChef Day
    LECTURE_TIME_SLOTS.forEach(time => {
        finalSchedule.push({
            id: `GEN_CC_${time}`, day: codeChefDay, time, classId: classToSchedule.id,
            subjectId: 'CODECHEF', facultyId: 'NA', classroomId: 'NA', isLab: false, isCodeChef: true
        });
    });

    // Fill Library Slots
    let librarySlotsPlaced = 0;
    const totalSlotsPerWeek = workingDays.length * LECTURE_TIME_SLOTS.length;
    const scheduledSlotKeys = new Set(finalSchedule.map(g => `${g.day}-${g.time}`));

    if (finalSchedule.filter(g => !g.isCodeChef).length < totalSlotsPerWeek) {
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
    
    // Final check for 21 academic + 3 library slots
    const finalAcademicCount = finalSchedule.filter(g => !g.isCodeChef && g.subjectId !== 'LIB001').length;
    if (finalAcademicCount < 21) {
         return { success: false, message: `Engine failed to place all academic slots. Placed ${finalAcademicCount} out of 21.` };
    }

    return {
        success: true,
        message: `Successfully generated a complete schedule with ${finalAcademicCount} academic slots and ${librarySlotsPlaced} library slots.`,
        bestTimetable: finalSchedule,
        generations: 1, 
        fitness: 0, 
        codeChefDay: codeChefDay,
    };
}
