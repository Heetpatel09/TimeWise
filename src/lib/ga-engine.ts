
'use server';

import type { GenerateTimetableInput, Subject, Faculty, Classroom, Schedule } from './types';

// This is a robust, deterministic scheduler that combines dynamic data with a structured template.

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const CODECHEF_DAY = 'Saturday';

// The precise time slots as requested by the user
const ALL_TIME_SLOTS = [
    '07:30-08:25',
    '08:25-09:20',
    '09:20-09:30', // Break
    '09:30-10:25',
    '10:25-11:20',
    '11:20-12:20', // Lunch
    '12:20-01:15',
    '01:15-02:10'
];

const LECTURE_TIME_SLOTS = ALL_TIME_SLOTS.filter(t => t !== '09:20-09:30' && t !== '11:20-12:20');

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

interface LectureToBePlaced {
    subjectId: string;
    facultyId: string;
    isLab: boolean;
    duration: number; // 1 for theory, 2 for lab
    classId: string;
    batch?: 'A' | 'B';
}


function isConflict(gene: Omit<Gene, 'id'>, schedule: Gene[]): boolean {
    return schedule.some(slot => {
        if (slot.day !== gene.day || slot.time !== gene.time) return false;
        if (slot.facultyId === gene.facultyId) return true;
        if (slot.classroomId === gene.classroomId) return true;
        if (slot.classId === gene.classId) return true; // A class can't be in two places at once
        return false;
    });
}


function solveTimetable(
    lecturesToPlace: LectureToBePlaced[],
    schedule: Gene[],
    input: GenerateTimetableInput
): Gene[] | null {
    if (lecturesToPlace.length === 0) {
        return schedule; // Success
    }

    const lecture = lecturesToPlace[0];
    const remainingLectures = lecturesToPlace.slice(1);
    const availableClassrooms = input.classrooms.filter(c => c.type === (lecture.isLab ? 'lab' : 'classroom'));

    for (const day of DAYS) {
        // Max 2 slots of same subject per day
        if (schedule.filter(s => s.classId === lecture.classId && s.day === day && s.subjectId === lecture.subjectId).length >= 2) {
            continue;
        }

        if (lecture.isLab) {
             // Max 1 lab per day for the class
            if (schedule.some(s => s.classId === lecture.classId && s.day === day && s.isLab)) {
                continue;
            }

            for (let i = 0; i < LECTURE_TIME_SLOTS.length - 1; i++) {
                const time1 = LECTURE_TIME_SLOTS[i];
                const time2 = LECTURE_TIME_SLOTS[i+1];

                // Skip if there's a break in between
                const time1Index = ALL_TIME_SLOTS.indexOf(time1);
                const time2Index = ALL_TIME_SLOTS.indexOf(time2);
                if (time2Index - time1Index !== 1) continue;


                for (const classroom of availableClassrooms) {
                    const gene1: Omit<Gene, 'id'> = { ...lecture, day, time: time1, classroomId: classroom.id };
                    const gene2: Omit<Gene, 'id'> = { ...lecture, day, time: time2, classroomId: classroom.id };

                    if (!isConflict(gene1, [...schedule, ...input.existingSchedule]) && !isConflict(gene2, [...schedule, ...input.existingSchedule])) {
                        const newSchedule = [...schedule, { ...gene1, id: '' }, { ...gene2, id: '' }];
                        const result = solveTimetable(remainingLectures, newSchedule, input);
                        if (result) return result;
                    }
                }
            }
        } else { // Theory
            for (const time of LECTURE_TIME_SLOTS) {
                for (const classroom of availableClassrooms) {
                    const gene: Omit<Gene, 'id'> = { ...lecture, day, time, classroomId: classroom.id };
                    if (!isConflict(gene, [...schedule, ...input.existingSchedule])) {
                        const newSchedule = [...schedule, { ...gene, id: '' }];
                        const result = solveTimetable(remainingLectures, newSchedule, input);
                        if (result) return result;
                    }
                }
            }
        }
    }

    return null; // No solution found from this path
}


export async function runGA(input: GenerateTimetableInput) {
    const { classes: classesToSchedule, subjects, faculty, classrooms, existingSchedule = [] } = input;

    if (classesToSchedule.length === 0) {
        return { success: false, message: 'No class selected for timetable generation.', bestTimetable: [] };
    }
    const classToSchedule = classesToSchedule[0];

    const allClassSubjects = subjects.filter(s => s.semester === classToSchedule.semester && s.department === classToSchedule.department);
    
    // --- Create a list of all required lectures to be placed ---
    const lectureQueue: LectureToBePlaced[] = [];
    
    const labSubjects = allClassSubjects.filter(s => s.type === 'lab');
    labSubjects.forEach(sub => {
        const facultyId = getFacultyForSubject(sub.id, faculty);
        if (!facultyId) {
            return { success: false, message: `No faculty assigned for lab subject ${sub.name}.`, bestTimetable: [] };
        }
        // One 2-hour lab session per week. duration=2 signifies it's a paired event.
        lectureQueue.push({ subjectId: sub.id, facultyId, isLab: true, duration: 2, classId: classToSchedule.id });
    });

    const theorySubjects = allClassSubjects.filter(s => s.type === 'theory');
    theorySubjects.forEach(sub => {
        const hours = getHoursForPriority(sub.priority);
        const facultyId = getFacultyForSubject(sub.id, faculty);
        if (!facultyId) {
            return { success: false, message: `No faculty assigned for theory subject ${sub.name}.`, bestTimetable: [] };
        }
        for (let i = 0; i < hours; i++) {
            lectureQueue.push({ subjectId: sub.id, facultyId, isLab: false, duration: 1, classId: classToSchedule.id });
        }
    });

    const totalRequiredAcademicSlots = lectureQueue.reduce((acc, lec) => acc + lec.duration, 0);

    // Sort by duration to place labs first, then by a random factor to vary the search
    lectureQueue.sort((a, b) => b.duration - a.duration || Math.random() - 0.5);

    const generatedSchedule = solveTimetable(lectureQueue, [], input);
    
    if (!generatedSchedule) {
        return {
             success: false,
             message: `Could not schedule all required lectures. Placed 0 out of ${totalRequiredAcademicSlots}. This may be due to a lack of available faculty or classrooms, or overly strict constraints.`,
             bestTimetable: [],
             codeChefDay: CODECHEF_DAY,
        }
    }

    const placedSlots = generatedSchedule.length;
    if (placedSlots < totalRequiredAcademicSlots) {
         return {
             success: false,
             message: `Could not schedule all required lectures. Only placed ${placedSlots} out of ${totalRequiredAcademicSlots}. This may be due to a lack of available faculty or classrooms.`,
             bestTimetable: [],
             codeChefDay: CODECHEF_DAY,
        }
    }


    // Fill remaining slots with Library (up to 3)
    let librarySlots = 0;
    const occupiedSlots = new Set(generatedSchedule.map(g => `${g.day}-${g.time}`));
    for (const day of DAYS) {
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

    return {
        success: true,
        message: 'Successfully generated a complete and conflict-free schedule.',
        bestTimetable: finalSchedule,
        generations: 1, // N/A for this algorithm
        fitness: 0, // 0 fitness means no conflicts
        codeChefDay: CODECHEF_DAY,
    };
}
