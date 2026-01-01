
'use server';

import type { GenerateTimetableInput, Schedule, Subject, SubjectPriority, Faculty, Classroom } from './types';

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
}

interface LectureToBePlaced {
    subjectId: string;
    facultyIds: string[]; // Now can have multiple faculties
    isLab: boolean;
    classId: string;
    batch?: 'A' | 'B';
    hours: number; // 1 for theory, 2 for a single lab session
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
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getHoursForPriority = (priority?: SubjectPriority): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 2; // Default if priority is not set
    }
};

/**
 * Creates a definitive list of all academic and library lectures that need to be scheduled.
 */
function createLectureList(input: GenerateTimetableInput): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classToSchedule = input.classes[0];
    const classSubjects = input.subjects.filter(
        s => s.semester === classToSchedule.semester && s.department === classToSchedule.department
    );

    // 1. Add Academic Lectures
    for (const sub of classSubjects) {
        if (sub.id === 'LIB001') continue; 
        
        const facultiesForSubject = input.faculty.filter(f => f.allottedSubjects?.includes(sub.id));
        if (facultiesForSubject.length === 0) {
            console.warn(`[Scheduler] No faculty found for subject ${sub.name}. Skipping.`);
            continue;
        }

        if (sub.type === 'lab') {
            lectures.push({
                classId: classToSchedule.id, subjectId: sub.id, facultyIds: facultiesForSubject.map(f => f.id),
                isLab: true, hours: 2
            });
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lectures.push({
                    classId: classToSchedule.id, subjectId: sub.id, facultyIds: facultiesForSubject.map(f => f.id),
                    isLab: false, hours: 1
                });
            }
        }
    }
    
    // 2. Add exactly 3 Library Slots
    const libraryFaculty = input.faculty.find(f => f.id === 'FAC_LIB');
    if (libraryFaculty) {
        for (let i = 0; i < 3; i++) {
            lectures.push({
                classId: classToSchedule.id, subjectId: 'LIB001', facultyIds: [libraryFaculty.id],
                isLab: false, hours: 1
            });
        }
    }
    
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
    if (schedule.some(g => g.classId === classId && g.day === day && (g as Gene).isLab)) {
        return false;
    }
    return true;
}

function canPlaceTheory(schedule: (Gene | Schedule)[], day: string, time: string, facultyId: string, classroomId: string, classId: string, subjectId: string): boolean {
    if (isConflict(schedule, day, time, facultyId, classroomId, classId)) {
        return false;
    }
    const daySchedule = schedule.filter(g => g.classId === classId && g.day === day);
    if (daySchedule.filter(s => s.subjectId === subjectId).length >= 2) {
        return false;
    }
    return true;
}

// --- Main Deterministic Engine ---
export async function runGA(input: GenerateTimetableInput) {
    if (!input.faculty || input.faculty.length === 0) {
        return { success: false, message: 'Critical Error: Faculty data is missing.', bestTimetable: [], codeChefDay: undefined };
    }
    if (!input.classrooms || input.classrooms.length === 0) {
        return { success: false, message: 'Critical Error: Classroom data is missing.', bestTimetable: [], codeChefDay: undefined };
    }
     
    const codeChefDayIndex = Math.floor(Math.random() * DAYS.length);
    const codeChefDay = DAYS[codeChefDayIndex];
    const workingDays = DAYS.filter(d => d !== codeChefDay);
    
    const lecturesToPlace = createLectureList(input);
    
    const labLectures = lecturesToPlace.filter(l => l.isLab);
    const theoryLectures = lecturesToPlace.filter(l => !l.isLab);

    const generatedSchedule: Gene[] = [];
    const fullSchedule: (Gene | Schedule)[] = [...generatedSchedule, ...input.existingSchedule || []];

    // Workload tracking for faculty, initialized with existing schedule load
    const facultyWorkload: Record<string, number> = {};
    input.faculty.forEach(f => facultyWorkload[f.id] = 0);
    fullSchedule.forEach(slot => {
        if (slot.facultyId && facultyWorkload[slot.facultyId] !== undefined) {
            facultyWorkload[slot.facultyId]++;
        }
    });

    const getLeastLoadedFaculty = (facultyIds: string[], hoursToAdd: number): string | null => {
        const availableFaculty = facultyIds
            .map(id => ({ id, faculty: input.faculty.find(f => f.id === id) }))
            .filter(f => f.faculty && (facultyWorkload[f.id] + hoursToAdd) <= (f.faculty.maxWeeklyHours || 20))
            .sort((a, b) => facultyWorkload[a.id] - facultyWorkload[b.id]);
            
        return availableFaculty.length > 0 ? availableFaculty[0].id : null;
    };


    const availableLabRooms = input.classrooms.filter(c => c.type === 'lab');
    if (availableLabRooms.length === 0 && labLectures.length > 0) {
        return { success: false, message: "Cannot schedule labs. No lab classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }

    const labTimePairs: [string, string][] = [
        ['07:30 AM - 08:30 AM', '08:30 AM - 09:30 AM'],
        ['01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM'],
        ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM'],
    ];
    
    let lastLabDayIndex = -1;

    for (const lab of labLectures) {
        let placed = false;
        const shuffledDays = workingDays.sort(() => Math.random() - 0.5);

        // Find the least loaded faculty for this 2-hour lab
        const facultyId = getLeastLoadedFaculty(lab.facultyIds, 2);
        if (!facultyId) {
             const subjectName = input.subjects.find(s => s.id === lab.subjectId)?.name || lab.subjectId;
            return { success: false, message: `Could not find available faculty for lab '${subjectName}'. All are at maximum workload.`, bestTimetable: [], codeChefDay: undefined };
        }

        for (const day of shuffledDays) {
            if (shuffledDays.indexOf(day) === lastLabDayIndex) continue;

            const shuffledTimePairs = labTimePairs.sort(() => Math.random() - 0.5);

            for (const [time1, time2] of shuffledTimePairs) {
                const randomLabRoom = availableLabRooms[Math.floor(Math.random() * availableLabRooms.length)];
                if (canPlaceLab(fullSchedule, day, time1, time2, facultyId, randomLabRoom.id, lab.classId)) {
                    const gene1 = { day, time: time1, ...lab, facultyId, classroomId: randomLabRoom.id, hours: 1, isLab: true };
                    const gene2 = { day, time: time2, ...lab, facultyId, classroomId: randomLabRoom.id, hours: 1, isLab: true };
                    generatedSchedule.push(gene1, gene2);
                    fullSchedule.push(gene1, gene2);
                    facultyWorkload[facultyId] += 2; // Lab is 2 hours
                    placed = true;
                    lastLabDayIndex = shuffledDays.indexOf(day);
                    break;
                }
            }
            if (placed) break;
        }
        if (!placed) {
             const subjectName = input.subjects.find(s => s.id === lab.subjectId)?.name || lab.subjectId;
             return { success: false, message: `Could not schedule lab for '${subjectName}'. Not enough conflict-free lab slots available.`, bestTimetable: [], codeChefDay: undefined };
        }
    }
    
    const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
    const libraryRoom = input.classrooms.find(c => c.id === 'CR_LIB');

    if (theoryClassrooms.length === 0 && theoryLectures.filter(t => t.subjectId !== 'LIB001').length > 0) {
        return { success: false, message: "Cannot schedule theory lectures. No non-library classrooms are available.", bestTimetable: [], codeChefDay: undefined };
    }


    for (const theory of theoryLectures) {
        let placed = false;
        const facultyId = getLeastLoadedFaculty(theory.facultyIds, 1);
        if (!facultyId) {
             const subjectName = input.subjects.find(s => s.id === theory.subjectId)?.name || theory.subjectId;
             return { success: false, message: `Could not find available faculty for subject '${subjectName}'. All are at maximum workload.`, bestTimetable: [], codeChefDay: undefined };
        }

        for (const day of workingDays) {
             for (const time of LECTURE_TIME_SLOTS) {
                  if (fullSchedule.some(g => g.classId === theory.classId && g.day === day && g.time === time)) continue;
                  
                  if (theory.subjectId === 'LIB001') {
                     if (libraryRoom && canPlaceTheory(fullSchedule, day, time, facultyId, libraryRoom.id, theory.classId, theory.subjectId)) {
                        const gene = { day, time, ...theory, facultyId, classroomId: libraryRoom.id, isLab: false };
                        generatedSchedule.push(gene);
                        fullSchedule.push(gene);
                        facultyWorkload[facultyId]++;
                        placed = true;
                        break;
                     }
                  } else {
                    for (const room of theoryClassrooms) {
                        if (canPlaceTheory(fullSchedule, day, time, facultyId, room.id, theory.classId, theory.subjectId)) {
                            const gene = { day, time, ...theory, facultyId, classroomId: room.id, isLab: false };
                            generatedSchedule.push(gene);
                            fullSchedule.push(gene);
                            facultyWorkload[facultyId]++;
                            placed = true;
                            break;
                        }
                    }
                  }
                  if (placed) break;
             }
             if (placed) break;
        }

        if (!placed) {
            const subject = input.subjects.find(s => s.id === theory.subjectId);
             const faculty = input.faculty.find(f => f.id === facultyId);
            return { success: false, message: `Could not schedule all lectures. Failed on '${subject?.name || 'a subject'}'. The schedule is too constrained or resources are unavailable.`, bestTimetable: [], codeChefDay: undefined };
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

    return {
        success: true,
        message: `Successfully generated a schedule with ${finalSchedule.filter(s => s.subjectId !== 'LIB001').length} academic slots and ${finalSchedule.filter(s => s.subjectId === 'LIB001').length} library slots.`,
        bestTimetable: finalSchedule,
        codeChefDay,
    };
}
