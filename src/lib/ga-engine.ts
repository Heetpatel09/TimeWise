
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
    batch?: 'A' | 'B';
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

function isConflict(gene: Omit<Gene, 'id'>, schedule: (Gene | Schedule)[]): boolean {
    return schedule.some(slot => {
        if (slot.day !== gene.day || slot.time !== gene.time) return false;
        if (slot.facultyId === gene.facultyId) return true; // Same faculty, same time
        if (slot.classroomId === gene.classroomId) return true; // Same classroom, same time
        // Same class has two different subjects at the same time (labs are handled by batch)
        if (slot.classId === gene.classId && ('batch' in slot ? slot.batch !== gene.batch : true)) return true;
        return false;
    });
}

function solveTimetable(lectures: LectureToBePlaced[], input: GenerateTimetableInput): Gene[] | null {
    let schedule: Gene[] = [];
    const combinedExistingSchedule = [...input.existingSchedule];

    // Helper to check all constraints for a potential slot
    const checkAllConstraints = (gene: Omit<Gene, 'id'>, currentSchedule: Gene[]): boolean => {
        // 1. Check for conflicts within the newly generated schedule
        if (isConflict(gene, currentSchedule)) return true;
        // 2. Check for conflicts with schedules of other classes
        if (isConflict(gene, combinedExistingSchedule)) return true;
        // 3. Max one lab per day for this class
        if (gene.isLab && currentSchedule.some(g => g.day === gene.day && g.isLab && g.classId === gene.classId)) {
            return true;
        }
        // 4. Max two lectures of the same subject per day
        if (!gene.isLab && currentSchedule.filter(g => g.day === gene.day && g.subjectId === gene.subjectId).length >= 2) {
            return true;
        }
        return false;
    };

    // --- 1. Place Labs First ---
    const labLectures = lectures.filter(l => l.isLab);
    const theoryLectures = lectures.filter(l => !l.isLab);

    const placedLabs = new Set<string>(); // Keep track of placed labs (subjectId-batch)

    for (const lab of labLectures) {
        const labKey = `${lab.subjectId}-${lab.batch}`;
        if (placedLabs.has(labKey)) continue;

        let placed = false;
        const labClassrooms = input.classrooms.filter(c => c.type === 'lab');

        // Shuffle days and classrooms to get variety
        const shuffledDays = [...WORKING_DAYS].sort(() => Math.random() - 0.5);

        for (const day of shuffledDays) {
            for (let i = 0; i < LECTURE_TIME_SLOTS.length - 1; i++) {
                const time1 = LECTURE_TIME_SLOTS[i];
                const time2 = LECTURE_TIME_SLOTS[i + 1];

                // Ensure slots are consecutive and not across a break
                const time1Index = ALL_TIME_SLOTS.indexOf(time1);
                const time2Index = ALL_TIME_SLOTS.indexOf(time2);
                if (time2Index - time1Index !== 1) continue;

                const shuffledClassrooms = [...labClassrooms].sort(() => Math.random() - 0.5);

                for (const classroom of shuffledClassrooms) {
                    const gene1: Omit<Gene, 'id'> = { ...lab, day, time: time1, classroomId: classroom.id };
                    const gene2: Omit<Gene, 'id'> = { ...lab, day, time: time2, classroomId: classroom.id };

                    if (!checkAllConstraints(gene1, schedule) && !checkAllConstraints(gene2, schedule)) {
                        schedule.push({ ...gene1, id: '' }, { ...gene2, id: '' });
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
            if (placed) break;
        }
        if (!placed) return null; // Could not place a lab, impossible schedule
        placedLabs.add(labKey);
    }


    // --- 2. Place Theory Lectures ---
    for (const lecture of theoryLectures) {
        let placed = false;
        const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
        const shuffledDays = [...WORKING_DAYS].sort(() => Math.random() - 0.5);

        for (const day of shuffledDays) {
            const shuffledTimes = [...LECTURE_TIME_SLOTS].sort(() => Math.random() - 0.5);
            for (const time of shuffledTimes) {
                const shuffledClassrooms = [...theoryClassrooms].sort(() => Math.random() - 0.5);
                for (const classroom of shuffledClassrooms) {
                    const gene: Omit<Gene, 'id'> = { ...lecture, day, time, classroomId: classroom.id };
                    if (!checkAllConstraints(gene, schedule)) {
                        schedule.push({ ...gene, id: '' });
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
            if (placed) break;
        }
        if (!placed) return null; // Could not place a theory lecture
    }
    
    return schedule;
}


export async function runGA(input: GenerateTimetableInput) {
    const { classes: classesToSchedule, subjects, faculty } = input;
    const classToSchedule = classesToSchedule[0];

    const allClassSubjects = subjects.filter(s => s.semester === classToSchedule.semester && s.department === classToSchedule.department);
    
    // Create a list of all individual 1-hour lecture/lab slots required
    let lecturesToPlace: LectureToBePlaced[] = [];
    allClassSubjects.forEach(sub => {
        const facultyId = getFacultyForSubject(sub.id, faculty);
        if (!facultyId) {
            console.warn(`Skipping subject ${sub.name} as no faculty is assigned.`);
            return;
        }
        
        if (sub.type === 'lab') {
            // A 2-hour lab needs 2 slots. We schedule one 'lab event' which the solver will expand.
            lecturesToPlace.push({ classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyId, isLab: true, batch: 'A' });
            lecturesToPlace.push({ classId: classToSchedule.id, subjectId: sub.id, facultyId: facultyId, isLab: true, batch: 'B' });
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lecturesToPlace.push({ classId: classToSchedule.id, subjectId: sub.id, facultyId, isLab: false });
            }
        }
    });

    const totalAcademicSlots = allClassSubjects.reduce((acc, sub) => {
        if(sub.type === 'lab') return acc + 4; // 2 batches * 2 hours
        return acc + getHoursForPriority(sub.priority);
    }, 0);


    // --- Run the Solver ---
    let generatedSchedule: Gene[] | null = null;
    // Try multiple times to find a solution, as there's randomness involved
    for (let i = 0; i < 50; i++) {
        generatedSchedule = solveTimetable(lecturesToPlace, input);
        if (generatedSchedule) break;
    }


    if (!generatedSchedule || generatedSchedule.length < totalAcademicSlots) {
        return {
             success: false,
             message: `Could not generate a valid timetable after multiple attempts. The constraints might be too restrictive. Please check faculty availability and classroom resources. Required slots: ${totalAcademicSlots}, Placed: ${generatedSchedule?.length || 0}`,
             bestTimetable: [],
             codeChefDay: CODECHEF_DAY,
        }
    }
    
    let finalSchedule = generatedSchedule.map((g, i) => ({ ...g, id: `GEN${i}${Date.now()}` }));
    
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
                    subjectId: 'LIB001', // Placeholder for Library
                    facultyId: 'NA', classroomId: 'NA',
                    isLab: false
                });
                occupiedSlots.add(slotKey);
                librarySlotsPlaced++;
            }
        }
    }

    return {
        success: true,
        message: `Successfully generated a complete schedule with ${totalAcademicSlots} academic slots and ${librarySlotsPlaced} library slots.`,
        bestTimetable: finalSchedule,
        generations: 1, 
        fitness: 0, 
        codeChefDay: CODECHEF_DAY,
    };
}

    