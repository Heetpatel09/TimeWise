
'use server';

import type { GenerateTimetableInput, Subject, Faculty, Classroom, Schedule, SubjectPriority } from './types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CODECHEF_DAY = 'Saturday';
const WORKING_DAYS = DAYS.filter(d => d !== CODECHEF_DAY);

const ALL_TIME_SLOTS = [
    '07:30 AM - 08:30 AM',
    '08:30 AM - 09:30 AM',
    '09:30 AM - 10:00 AM', // Break
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 01:00 PM', // Break
    '01:00 PM - 02:00 PM',
    '02:00 PM - 03:00 PM'
];
const LECTURE_TIME_SLOTS = ALL_TIME_SLOTS.filter(t => !t.includes('09:30') && !t.includes('12:00'));

// --- Data Structures ---
interface Gene {
    id: string;
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
    batch?: 'A' | 'B'; // Specific to labs
}

// --- Helper Functions ---
const getHoursForPriority = (priority?: SubjectPriority): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 3;
    }
};

function getFacultyForSubject(subjectId: string, facultyList: Faculty[]): string | null {
    const assignedFaculty = facultyList.find(f => f.allottedSubjects?.includes(subjectId));
    return assignedFaculty?.id || null;
}

/**
 * Checks for conflicts for a potential new gene against the current schedule.
 */
function isConflict(gene: Omit<Gene, 'id'>, schedule: Gene[], existingSchedule: Schedule[]): boolean {
    const combinedSchedule = [...schedule, ...existingSchedule];
    return combinedSchedule.some(slot => {
        if (slot.day !== gene.day || slot.time !== gene.time) return false;
        if (slot.facultyId === gene.facultyId) return true;
        if (slot.classroomId === gene.classroomId) return true;
        // The same class can't have two lectures at once (unless it's a split lab batch)
        if (slot.classId === gene.classId && slot.batch !== gene.batch) return true;
        return false;
    });
}

/**
 * The main recursive backtracking solver.
 */
function solveTimetable(
    lectures: LectureToBePlaced[],
    schedule: Gene[],
    input: GenerateTimetableInput
): Gene[] | null {
    if (lectures.length === 0) {
        return schedule; // Success!
    }

    const currentLecture = lectures[0];
    const remainingLectures = lectures.slice(1);
    const { classrooms } = input;

    // --- Handle Lab Placement ---
    if (currentLecture.isLab) {
        const labClassrooms = classrooms.filter(c => c.type === 'lab');
        
        for (const day of WORKING_DAYS) {
            // Constraint: Only one lab session per day for this class
            if (schedule.some(g => g.classId === currentLecture.classId && g.day === day && g.isLab)) {
                continue;
            }

            // Find two consecutive slots
            for (let i = 0; i < LECTURE_TIME_SLOTS.length - 1; i++) {
                const time1 = LECTURE_TIME_SLOTS[i];
                const time2 = LECTURE_TIME_SLOTS[i + 1];
                
                // Ensure slots are consecutive and not across a break
                const time1Index = ALL_TIME_SLOTS.indexOf(time1);
                const time2Index = ALL_TIME_SLOTS.indexOf(time2);
                if (time2Index - time1Index !== 1) continue;

                for (const classroom of labClassrooms) {
                    const gene1: Omit<Gene, 'id'> = { ...currentLecture, day, time: time1, classroomId: classroom.id };
                    const gene2: Omit<Gene, 'id'> = { ...currentLecture, day, time: time2, classroomId: classroom.id };

                    if (!isConflict(gene1, schedule, input.existingSchedule) && !isConflict(gene2, schedule, input.existingSchedule)) {
                        const newSchedule = [...schedule, { ...gene1, id: '' }, { ...gene2, id: '' }];
                        const result = solveTimetable(remainingLectures, newSchedule, input);
                        if (result) return result; // Solution found, propagate it up
                    }
                }
            }
        }
    } 
    // --- Handle Theory Placement ---
    else {
        const theoryClassrooms = classrooms.filter(c => c.type === 'classroom');
        
        for (const day of WORKING_DAYS) {
            // Constraint: At most two lectures of the same subject per day
            if (schedule.filter(g => g.classId === currentLecture.classId && g.day === day && g.subjectId === currentLecture.subjectId).length >= 2) {
                continue;
            }

            for (const time of LECTURE_TIME_SLOTS) {
                for (const classroom of theoryClassrooms) {
                    const gene: Omit<Gene, 'id'> = { ...currentLecture, day, time, classroomId: classroom.id };

                    if (!isConflict(gene, schedule, input.existingSchedule)) {
                        const newSchedule = [...schedule, { ...gene, id: '' }];
                        const result = solveTimetable(remainingLectures, newSchedule, input);
                        if (result) return result; // Solution found
                    }
                }
            }
        }
    }

    return null; // Backtrack
}


export async function runGA(input: GenerateTimetableInput) {
    const { classes: classesToSchedule, subjects, faculty } = input;
    const classToSchedule = classesToSchedule[0];

    const allClassSubjects = subjects.filter(s => s.semester === classToSchedule.semester && s.department === classToSchedule.department);
    
    let lecturesToPlace: LectureToBePlaced[] = [];
    const labSubjects: Subject[] = [];
    const theorySubjects: Subject[] = [];

    allClassSubjects.forEach(s => {
        if(s.type === 'lab') labSubjects.push(s);
        else theorySubjects.push(s);
    });

    // Create lecture list for labs (Batch A and Batch B)
    labSubjects.forEach(sub => {
        const facultyId = getFacultyForSubject(sub.id, faculty);
        if (!facultyId) return;
        lecturesToPlace.push({ classId: classToSchedule.id, subjectId: sub.id, facultyId, isLab: true, batch: 'A' });
        lecturesToPlace.push({ classId: classToSchedule.id, subjectId: sub.id, facultyId, isLab: true, batch: 'B' });
    });

    // Create lecture list for theory subjects
    theorySubjects.forEach(sub => {
        const facultyId = getFacultyForSubject(sub.id, faculty);
        if (!facultyId) return;
        const hours = getHoursForPriority(sub.priority);
        for (let i = 0; i < hours; i++) {
            lecturesToPlace.push({ classId: classToSchedule.id, subjectId: sub.id, facultyId, isLab: false });
        }
    });
    
    const requiredAcademicSlots = lecturesToPlace.length;

    // --- Run the Solver ---
    const initialSchedule: Gene[] = [];
    const generatedSchedule = solveTimetable(lecturesToPlace, initialSchedule, input);

    if (!generatedSchedule || generatedSchedule.length < requiredAcademicSlots) {
        return {
             success: false,
             message: `Could not generate a valid timetable. Failed to schedule all ${requiredAcademicSlots} required academic slots. This is likely due to restrictive constraints (e.g., not enough available faculty or classrooms).`,
             bestTimetable: [],
             codeChefDay: CODECHEF_DAY,
        }
    }
    
    const finalSchedule = generatedSchedule.map((g, i) => ({ ...g, id: `GEN${i}${Date.now()}` }));
    
    // --- Fill remaining slots with Library ---
    let librarySlotsPlaced = 0;
    const occupiedSlots = new Set(finalSchedule.map(g => `${g.day}-${g.time}`));
    for(const day of WORKING_DAYS) {
        if (librarySlotsPlaced >= 3) break;
        for (const time of LECTURE_TIME_SLOTS) {
             if (librarySlotsPlaced >= 3) break;
            const slotKey = `${day}-${time}`;
            if (!occupiedSlots.has(slotKey)) {
                finalSchedule.push({
                    id: `GEN_LIB_${librarySlotsPlaced}`,
                    day, time, classId: classToSchedule.id,
                    subjectId: 'LIB001', facultyId: 'NA', classroomId: 'NA',
                    isLab: false
                });
                occupiedSlots.add(slotKey);
                librarySlotsPlaced++;
            }
        }
    }

    return {
        success: true,
        message: `Successfully generated a complete and conflict-free schedule with ${requiredAcademicSlots} academic slots.`,
        bestTimetable: finalSchedule,
        generations: 1, 
        fitness: 0, 
        codeChefDay: CODECHEF_DAY,
    };
}
