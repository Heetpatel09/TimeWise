
'use server';

import type { GenerateTimetableInput, Subject, Faculty, Classroom, Schedule } from './types';

// This is a robust, deterministic scheduler that combines dynamic data with a structured template.

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CODECHEF_DAY = 'Saturday';

// The precise time slots as requested by the user
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
const TOTAL_ACADEMIC_SLOTS_REQUIRED = 21;

// --- Helper Functions ---
function getFacultyForSubject(subjectId: string, facultyList: Faculty[]): string | null {
    const assignedFaculty = facultyList.find(f => f.allottedSubjects?.includes(subjectId));
    return assignedFaculty?.id || null;
}

const getHoursForPriority = (priority?: Subject['priority']): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 3; // Default to 3 hours if not specified
    }
};

interface Gene {
    id: string;
    day: string;
    time: string;
    classId: string;
    subjectId: string;
    facultyId: string;
    classroomId: string;
    isLab: boolean;
    isCodeChef?: boolean;
}

interface LectureToBePlaced {
    subjectId: string;
    facultyId: string;
    isLab: boolean;
    duration: number; // 1 for theory, 2 for lab
    classId: string;
}

function isConflict(gene: Omit<Gene, 'id'>, schedule: Gene[]): boolean {
    return schedule.some(slot => {
        if (slot.day !== gene.day || slot.time !== gene.time) return false;
        // A faculty member can't be in two places at once.
        if (slot.facultyId === gene.facultyId) return true;
        // A classroom can't be used by two classes at once.
        if (slot.classroomId === gene.classroomId) return true;
        // The same class can't have two different lectures at the same time.
        if (slot.classId === gene.classId) return true;
        return false;
    });
}

// Main solving function with backtracking
function solveTimetable(
    lecturesToPlace: LectureToBePlaced[],
    schedule: Gene[],
    input: GenerateTimetableInput
): Gene[] | null {
    // If all lectures are placed, we have a solution
    if (lecturesToPlace.length === 0) {
        return schedule;
    }

    const lecture = lecturesToPlace[0];
    const remainingLectures = lecturesToPlace.slice(1);
    
    const availableClassrooms = input.classrooms.filter(c => c.type === (lecture.isLab ? 'lab' : 'classroom'));

    // --- Try to place the current lecture ---
    // Iterate through all possible days (excluding CodeChef day) and time slots
    for (const day of DAYS.filter(d => d !== CODECHEF_DAY)) {
        
        // Constraint: At most one lab session per day for the class
        if (lecture.isLab && schedule.some(s => s.classId === lecture.classId && s.day === day && s.isLab)) {
            continue;
        }

        // Constraint: At most two lectures of the same subject per day
        if (!lecture.isLab && schedule.filter(s => s.classId === lecture.classId && s.day === day && s.subjectId === lecture.subjectId).length >= 2) {
            continue;
        }

        if (lecture.isLab) {
            // Find two consecutive slots for the lab
            for (let i = 0; i < LECTURE_TIME_SLOTS.length - 1; i++) {
                const time1 = LECTURE_TIME_SLOTS[i];
                const time2 = LECTURE_TIME_SLOTS[i+1];

                const time1Index = ALL_TIME_SLOTS.indexOf(time1);
                const time2Index = ALL_TIME_SLOTS.indexOf(time2);
                if (time2Index - time1Index !== 1) continue; // Skip non-consecutive slots (across breaks)

                for (const classroom of availableClassrooms) {
                    const gene1: Omit<Gene, 'id'> = { ...lecture, day, time: time1, classroomId: classroom.id, isCodeChef: false };
                    const gene2: Omit<Gene, 'id'> = { ...lecture, day, time: time2, classroomId: classroom.id, isCodeChef: false };

                    // Check for conflicts for both slots
                    if (!isConflict(gene1, [...schedule, ...input.existingSchedule]) && !isConflict(gene2, [...schedule, ...input.existingSchedule])) {
                        const newSchedule = [...schedule, { ...gene1, id: '' }, { ...gene2, id: '' }];
                        const result = solveTimetable(remainingLectures, newSchedule, input);
                        if (result) return result; // Found a solution
                    }
                }
            }
        } else { // Theory lecture
            for (const time of LECTURE_TIME_SLOTS) {
                for (const classroom of availableClassrooms) {
                    const gene: Omit<Gene, 'id'> = { ...lecture, day, time, classroomId: classroom.id, isCodeChef: false };
                    if (!isConflict(gene, [...schedule, ...input.existingSchedule])) {
                        const newSchedule = [...schedule, { ...gene, id: '' }];
                        const result = solveTimetable(remainingLectures, newSchedule, input);
                        if (result) return result; // Found a solution
                    }
                }
            }
        }
    }

    // If we've tried all possibilities for the current lecture and found no solution,
    // it means we need to backtrack by returning null.
    return null;
}

export async function runGA(input: GenerateTimetableInput) {
    const { classes: classesToSchedule, subjects, faculty, classrooms } = input;

    if (classesToSchedule.length === 0) {
        return { success: false, message: 'No class selected for timetable generation.', bestTimetable: [] };
    }
    const classToSchedule = classesToSchedule[0];

    const allClassSubjects = subjects.filter(s => s.semester === classToSchedule.semester && s.department === classToSchedule.department);
    
    const lecturesToPlace: LectureToBePlaced[] = [];

    // Create a list of all required lectures based on subject type and priority
    allClassSubjects.forEach(sub => {
        const facultyId = getFacultyForSubject(sub.id, faculty);
        if (!facultyId) {
            console.warn(`No faculty for subject ${sub.name}`);
            return; // Skip subjects without faculty
        }

        if (sub.type === 'lab') {
            // Labs are 2 hours long, once per week
            lecturesToPlace.push({ subjectId: sub.id, facultyId, isLab: true, duration: 2, classId: classToSchedule.id });
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lecturesToPlace.push({ subjectId: sub.id, facultyId, isLab: false, duration: 1, classId: classToSchedule.id });
            }
        }
    });

    // Solve the timetable
    const initialSchedule: Gene[] = [];
    const generatedSchedule = solveTimetable(lecturesToPlace, initialSchedule, input);

    const actualAcademicSlots = generatedSchedule ? generatedSchedule.filter(g => !g.isCodeChef).length : 0;

    if (!generatedSchedule || actualAcademicSlots < TOTAL_ACADEMIC_SLOTS_REQUIRED) {
        return {
             success: false,
             message: `Generation failed. Could not schedule all required ${TOTAL_ACADEMIC_SLOTS_REQUIRED} academic slots. Only placed ${actualAcademicSlots}. This is likely due to restrictive constraints (e.g., not enough available faculty or classrooms for the required times).`,
             bestTimetable: [],
             codeChefDay: CODECHEF_DAY,
        }
    }

    // --- Fill remaining slots with Library ---
    let librarySlots = 0;
    const occupiedSlots = new Set(generatedSchedule.map(g => `${g.day}-${g.time}`));
    for (const day of DAYS.filter(d => d !== CODECHEF_DAY)) {
        if(librarySlots >= 3) break;
        for (const time of LECTURE_TIME_SLOTS) {
             if(librarySlots >= 3) break;
            const slotKey = `${day}-${time}`;
            if (!occupiedSlots.has(slotKey)) {
                generatedSchedule.push({
                    id: `GEN_LIB_${librarySlots}`,
                    day, time, classId: classToSchedule.id,
                    subjectId: 'LIB001', facultyId: 'NA', classroomId: 'NA',
                    isLab: false
                });
                occupiedSlots.add(slotKey);
                librarySlots++;
            }
        }
    }

    // Add CodeChef day for display purposes
    LECTURE_TIME_SLOTS.forEach(time => {
        generatedSchedule.push({
            id: `GEN_CC_${time}`,
            day: CODECHEF_DAY, time, classId: classToSchedule.id,
            subjectId: 'CODECHEF', facultyId: 'NA', classroomId: 'NA', isLab: false, isCodeChef: true,
        });
    });

    const finalSchedule = generatedSchedule.map(g => ({ ...g, id: g.id || `GEN${Date.now()}${Math.random()}` }));
    
    return {
        success: true,
        message: `Successfully generated a complete and conflict-free schedule with ${actualAcademicSlots} academic slots.`,
        bestTimetable: finalSchedule,
        generations: 1, // Not applicable for this algorithm
        fitness: 0, // 0 fitness means no conflicts
        codeChefDay: CODECHEF_DAY,
    };
}
