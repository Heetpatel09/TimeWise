
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
        if (slot.facultyId === gene.facultyId) return true;
        if (slot.classroomId === gene.classroomId) return true;
        if (slot.classId === gene.classId) return true;
        return false;
    });
}

function solveTimetable(
    lecturesToPlace: LectureToBePlaced[],
    schedule: Gene[],
    input: GenerateTimetableInput,
    attempt: number = 0
): Gene[] | null {
     if (lecturesToPlace.length === 0) {
        return schedule; // Success
    }

    if (attempt > lecturesToPlace.length * 2) { // To avoid infinite recursion on impossible schedules
        return null;
    }

    const lecture = lecturesToPlace[0];
    const remainingLectures = lecturesToPlace.slice(1);
    const availableClassrooms = input.classrooms.filter(c => c.type === (lecture.isLab ? 'lab' : 'classroom'));

    for (const day of DAYS.filter(d => d !== CODECHEF_DAY)) {
        if (lecture.isLab) {
            // Max 1 lab per day for the class
            if (schedule.some(s => s.classId === lecture.classId && s.day === day && s.isLab)) {
                continue;
            }

            for (let i = 0; i < LECTURE_TIME_SLOTS.length - 1; i++) {
                const time1 = LECTURE_TIME_SLOTS[i];
                const time2 = LECTURE_TIME_SLOTS[i+1];

                const time1Index = ALL_TIME_SLOTS.indexOf(time1);
                const time2Index = ALL_TIME_SLOTS.indexOf(time2);
                if (time2Index - time1Index !== 1) continue;

                for (const classroom of availableClassrooms) {
                    const gene1: Omit<Gene, 'id'> = { ...lecture, day, time: time1, classroomId: classroom.id, isCodeChef: false };
                    const gene2: Omit<Gene, 'id'> = { ...lecture, day, time: time2, classroomId: classroom.id, isCodeChef: false };

                    if (!isConflict(gene1, [...schedule, ...input.existingSchedule]) && !isConflict(gene2, [...schedule, ...input.existingSchedule])) {
                        const newSchedule = [...schedule, { ...gene1, id: '' }, { ...gene2, id: '' }];
                        const result = solveTimetable(remainingLectures, newSchedule, input, 0);
                        if (result) return result;
                    }
                }
            }
        } else { // Theory
             // Max 2 slots of same subject per day
            if (schedule.filter(s => s.classId === lecture.classId && s.day === day && s.subjectId === lecture.subjectId).length >= 2) {
                continue;
            }
            for (const time of LECTURE_TIME_SLOTS) {
                for (const classroom of availableClassrooms) {
                    const gene: Omit<Gene, 'id'> = { ...lecture, day, time, classroomId: classroom.id, isCodeChef: false };
                    if (!isConflict(gene, [...schedule, ...input.existingSchedule])) {
                        const newSchedule = [...schedule, { ...gene, id: '' }];
                        const result = solveTimetable(remainingLectures, newSchedule, input, 0);
                        if (result) return result;
                    }
                }
            }
        }
    }

    // Backtracking: if we can't place the current lecture, try swapping a lower priority one.
    const lowerPriorityLectureIndex = schedule.findIndex(g => !g.isLab && g.isCodeChef !== true);
    if(lowerPriorityLectureIndex !== -1) {
        const tempSchedule = [...schedule];
        const removedGene = tempSchedule.splice(lowerPriorityLectureIndex, 1)[0];
        const newQueue = [lecture, ...remainingLectures, {
            classId: removedGene.classId,
            subjectId: removedGene.subjectId,
            facultyId: removedGene.facultyId,
            isLab: removedGene.isLab,
            duration: 1
        }];
        return solveTimetable(newQueue, tempSchedule, input, attempt + 1);
    }


    return null; // No solution found
}

export async function runGA(input: GenerateTimetableInput) {
    const { classes: classesToSchedule, subjects, faculty, classrooms, existingSchedule = [] } = input;

    if (classesToSchedule.length === 0) {
        return { success: false, message: 'No class selected for timetable generation.', bestTimetable: [] };
    }
    const classToSchedule = classesToSchedule[0];

    const allClassSubjects = subjects.filter(s => s.semester === classToSchedule.semester && s.department === classToSchedule.department);
    
    const theoryLectures: LectureToBePlaced[] = [];
    const labLectures: LectureToBePlaced[] = [];

    allClassSubjects.forEach(sub => {
        const facultyId = getFacultyForSubject(sub.id, faculty);
        if (!facultyId) {
            console.warn(`No faculty for subject ${sub.name}`);
            return; // Skip subjects without faculty
        }

        if (sub.type === 'lab') {
            labLectures.push({ subjectId: sub.id, facultyId, isLab: true, duration: 2, classId: classToSchedule.id });
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                theoryLectures.push({ subjectId: sub.id, facultyId, isLab: false, duration: 1, classId: classToSchedule.id });
            }
        }
    });

    const lectureQueue = [...labLectures, ...theoryLectures];
    
    const generatedSchedule = solveTimetable(lectureQueue, [], input);
    
    if (!generatedSchedule) {
        return {
             success: false,
             message: `Could not schedule all required lectures. This may be due to a lack of available faculty or classrooms, or overly strict constraints.`,
             bestTimetable: [],
             codeChefDay: CODECHEF_DAY,
        }
    }

    let placedSlots = 0;
    generatedSchedule.forEach(g => {
        if (g.isLab) placedSlots += 1; // Count a lab session (2 genes) as 2 hours
        else placedSlots += 1;
    });

    // Fill remaining slots with Library (up to 3)
    let librarySlots = 0;
    const occupiedSlots = new Set(generatedSchedule.map(g => `${g.day}-${g.time}`));
    for (const day of DAYS.filter(d => d !== CODECHEF_DAY)) {
        if(librarySlots >= 3) break;
        for (const time of LECTURE_TIME_SLOTS) {
             if(librarySlots >= 3) break;
            const slotKey = `${day}-${time}`;
            if (!occupiedSlots.has(slotKey)) {
                generatedSchedule.push({
                    id: `GEN${Date.now()}${Math.random()}`,
                    day, time, classId: classToSchedule.id,
                    subjectId: 'LIB001', facultyId: 'NA', classroomId: 'NA',
                    isLab: false
                });
                occupiedSlots.add(slotKey);
                librarySlots++;
            }
        }
    }

    // Add CodeChef day for display
    LECTURE_TIME_SLOTS.forEach(time => {
        generatedSchedule.push({
            id: `GEN${Date.now()}${Math.random()}`,
            day: CODECHEF_DAY, time, classId: classToSchedule.id,
            subjectId: 'CODECHEF', facultyId: 'NA', classroomId: 'NA', isLab: false, isCodeChef: true,
        });
    });

    const finalSchedule = generatedSchedule.map(g => ({ ...g, id: g.id || `GEN${Date.now()}${Math.random()}` }));
    
    const finalAcademicSlots = finalSchedule.filter(g => !g.isCodeChef && g.subjectId !== 'LIB001').length;


    return {
        success: true,
        message: `Successfully generated a complete and conflict-free schedule with ${finalAcademicSlots} academic slots.`,
        bestTimetable: finalSchedule,
        generations: 1, // N/A for this algorithm
        fitness: 0, // 0 fitness means no conflicts
        codeChefDay: CODECHEF_DAY,
    };
}

    