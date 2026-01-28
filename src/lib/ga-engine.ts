
'use server';

import type { Class, Department, Faculty, GenerateTimetableInput, Schedule, Subject } from './types';
import { differenceInYears, parseISO } from 'date-fns';

// --- Data Structures ---
interface Gene {
    day: string;
    time: string;
    classId: string;
    subjectId: string;
    facultyId: string;
    classroomId: string;
    isLab: boolean;
    batch?: 'Batch-1' | 'Batch-2';
}

interface LectureToBePlaced {
    subjectId: string;
    isLab: boolean;
    classId: string;
    batch?: 'Batch-1' | 'Batch-2';
}

interface FacultyWorkload {
    facultyId: string;
    facultyName: string;
    experience: number;
    level: 'Senior' | 'Mid-Level' | 'Junior';
    maxHours: number;
    assignedHours: number;
}

const LECTURE_TIME_SLOTS = [
    '07:30 AM - 08:25 AM',
    '08:25 AM - 09:20 AM',
    '09:30 AM - 10:25 AM',
    '10:25 AM - 11:20 AM',
    '12:20 PM - 01:15 PM',
    '01:15 PM - 02:10 PM'
];

// Continuous 2-hour slots for labs
const LAB_TIME_PAIRS: [string, string][] = [
    ['07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM'],
    ['09:30 AM - 10:25 AM', '10:25 AM - 11:20 AM'],
    ['12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM']
];

const getHoursForSubject = (subject: Subject): number => {
    if (subject.type === 'lab') return 2;
    if (subject.priority === 'Non Negotiable') return 4;
    if (subject.priority === 'High') return 3;
    if (subject.priority === 'Medium') return 2;
    if (subject.priority === 'Low') return 1;
    return 2;
};

function calculateFacultyExperience(faculty: Faculty[]): (Faculty & { experience: number; level: 'Senior' | 'Mid-Level' | 'Junior' })[] {
    const today = new Date();
    return faculty.map(f => {
        const experience = f.dateOfJoining ? differenceInYears(today, parseISO(f.dateOfJoining)) : 0;
        let level: 'Senior' | 'Mid-Level' | 'Junior';
        if (experience >= 7) level = 'Senior';
        else if (experience >= 3) level = 'Junior';
        else level = 'Mid-Level';
        return { ...f, experience, level };
    });
}

function createLectureListForClass(allSubjects: Subject[], classInfo: Class): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classSubjects = allSubjects.filter(
        s => s.semester === classInfo.semester && s.departmentId === classInfo.departmentId
    );

    for (const sub of classSubjects) {
        if (sub.id === 'LIB001') continue;

        if (sub.type === 'lab') {
            // For each lab subject, create two separate lecture items, one for each batch.
            // The engine will then schedule one 2-hour session for each of these items.
            lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: true, batch: 'Batch-1' });
            lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: true, batch: 'Batch-2' });
        } else {
            const hours = getHoursForSubject(sub);
            for (let i = 0; i < hours; i++) {
                lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: false });
            }
        }
    }
    return lectures;
}

export async function runGA(input: GenerateTimetableInput) {
    const warnings: string[] = [];
    const generatedSchedule: Gene[] = [];
    const fullSchedule = [...generatedSchedule, ...input.existingSchedule.map(s => ({ ...s, isLab: input.subjects.find(sub => sub.id === s.subjectId)?.type === 'lab' }))];

    try {
        const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        const facultyWithExperience = calculateFacultyExperience(input.faculty);
        
        const subjectToFacultyMap = new Map<string, string[]>();
        input.faculty.forEach(f => {
            f.allottedSubjects?.forEach(subId => {
                if (!subjectToFacultyMap.has(subId)) subjectToFacultyMap.set(subId, []);
                subjectToFacultyMap.get(subId)!.push(f.id);
            });
        });

        const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
        const labClassrooms = input.classrooms.filter(c => c.type === 'lab');

        for (const classToSchedule of input.classes) {
            const lecturesToPlace = createLectureListForClass(input.subjects, classToSchedule);
            const labLectures = lecturesToPlace.filter(l => l.isLab);
            const theoryLectures = lecturesToPlace.filter(l => !l.isLab);

            // --- 1. Place Labs First (High Priority) ---
            for (const lab of labLectures) {
                let placed = false;
                const assignedFacultyIds = subjectToFacultyMap.get(lab.subjectId) || [];
                if (assignedFacultyIds.length === 0) {
                    warnings.push(`No faculty for ${input.subjects.find(s=>s.id === lab.subjectId)?.name}.`);
                    continue;
                }
                const shuffledFaculty = [...assignedFacultyIds].sort(() => Math.random() - 0.5);

                // Attempt to find a conflict-free slot
                for (const day of workingDays.sort(() => Math.random() - 0.5)) {
                    if (placed) break;
                    for (const [time1, time2] of LAB_TIME_PAIRS.sort(() => Math.random() - 0.5)) {
                        if (placed) break;
                        for (const room of labClassrooms) {
                            if (placed) break;
                            for (const facultyId of shuffledFaculty) {
                                const conflict1 = fullSchedule.some(g => g.day === day && g.time === time1 && (g.facultyId === facultyId || g.classroomId === room.id || (g.classId === lab.classId)));
                                const conflict2 = fullSchedule.some(g => g.day === day && g.time === time2 && (g.facultyId === facultyId || g.classroomId === room.id || (g.classId === lab.classId)));
                                
                                if (!conflict1 && !conflict2) {
                                    const gene1: Gene = { day, time: time1, classId: lab.classId, subjectId: lab.subjectId, facultyId, classroomId: room.id, isLab: true, batch: lab.batch };
                                    const gene2: Gene = { day, time: time2, classId: lab.classId, subjectId: lab.subjectId, facultyId, classroomId: room.id, isLab: true, batch: lab.batch };
                                    generatedSchedule.push(gene1, gene2);
                                    fullSchedule.push(gene1, gene2);
                                    placed = true;
                                    break;
                                }
                            }
                        }
                    }
                }

                // If no conflict-free slot was found, force-place it into the first available time slot.
                if (!placed) {
                    const subjectName = input.subjects.find(s=>s.id === lab.subjectId)?.name || 'Unknown Subject';
                    warnings.push(`Could not find a conflict-free slot for ${subjectName} (Lab, ${lab.batch}). Force-placing.`);
                    
                    const facultyId = shuffledFaculty[0];
                    const classroomId = labClassrooms[0]?.id || 'TBD-LAB';
                    if (classroomId === 'TBD-LAB') warnings.push('No lab rooms available. Scheduling will have conflicts.');

                    // Find any day and time pair and just place it.
                    const day = workingDays[generatedSchedule.length % workingDays.length];
                    const [time1, time2] = LAB_TIME_PAIRS[generatedSchedule.length % LAB_TIME_PAIRS.length];

                    const gene1: Gene = { day, time: time1, classId: lab.classId, subjectId: lab.subjectId, facultyId, classroomId, isLab: true, batch: lab.batch };
                    const gene2: Gene = { day, time: time2, classId: lab.classId, subjectId: lab.subjectId, facultyId, classroomId, isLab: true, batch: lab.batch };
                    generatedSchedule.push(gene1, gene2);
                    fullSchedule.push(gene1, gene2);
                }
            }

            // --- 2. Place Theory Lectures ---
            for (const theory of theoryLectures) {
                 let placed = false;
                const assignedFacultyIds = subjectToFacultyMap.get(theory.subjectId) || [];
                if (assignedFacultyIds.length === 0) {
                     warnings.push(`No faculty for ${input.subjects.find(s=>s.id === theory.subjectId)?.name}.`);
                    continue;
                }
                const shuffledFaculty = [...assignedFacultyIds].sort(() => Math.random() - 0.5);

                 for (const day of workingDays.sort(() => Math.random() - 0.5)) {
                    if (placed) break;
                    for (const time of LECTURE_TIME_SLOTS.sort(() => Math.random() - 0.5)) {
                         if (placed) break;
                         for (const room of theoryClassrooms) {
                            if (placed) break;
                            for (const facultyId of shuffledFaculty) {
                                const isConflict = fullSchedule.some(g => g.day === day && g.time === time && (g.facultyId === facultyId || g.classroomId === room.id || g.classId === theory.classId));
                                if (!isConflict) {
                                    const gene: Gene = { day, time, classId: theory.classId, subjectId: theory.subjectId, facultyId, classroomId: room.id, isLab: false };
                                    generatedSchedule.push(gene);
                                    fullSchedule.push(gene);
                                    placed = true;
                                    break;
                                }
                            }
                         }
                    }
                 }

                 if (!placed) {
                    const subjectName = input.subjects.find(s=>s.id === theory.subjectId)?.name || 'Unknown Subject';
                    warnings.push(`Could not find a conflict-free slot for ${subjectName} (Theory). Force-placing.`);
                     
                    const facultyId = shuffledFaculty[0];
                    const classroomId = theoryClassrooms[0]?.id || 'TBD-ROOM';
                    if (classroomId === 'TBD-ROOM') warnings.push('No theory rooms available. Scheduling will have conflicts.');
                     
                    const day = workingDays[generatedSchedule.length % workingDays.length];
                    const time = LECTURE_TIME_SLOTS[generatedSchedule.length % LECTURE_TIME_SLOTS.length];
                     
                    const gene: Gene = { day, time, classId: theory.classId, subjectId: theory.subjectId, facultyId, classroomId, isLab: false };
                    generatedSchedule.push(gene);
                    fullSchedule.push(gene);
                 }
            }
        }
        
        const finalWorkload: FacultyWorkload[] = facultyWithExperience.map(f => ({
            facultyId: f.id, facultyName: f.name, experience: f.experience, level: f.level,
            maxHours: f.maxWeeklyHours || 18, 
            assignedHours: fullSchedule.filter(g => g.facultyId === f.id).length,
        }));

        const semesterTimetables = input.classes.map(classInfo => ({
            semester: classInfo.semester,
            timetable: generatedSchedule.filter(g => g.classId === classInfo.id)
        }));

        return {
            summary: `Generated a full 5-day schedule for ${input.classes.length} class sections. ${warnings.length > 0 ? `Encountered and force-resolved ${warnings.length} issues.` : 'All constraints satisfied.'}`,
            optimizationExplanation: `The engine strictly followed the 5-day week and prioritized placing all labs in 2-hour continuous blocks before scheduling theory classes.`,
            facultyWorkload: finalWorkload,
            semesterTimetables,
            error: warnings.length > 0 ? warnings.join('; ') : undefined,
        };

    } catch (e: any) {
        console.error(`[TimeWise Engine] Fatal Error:`, e);
        return { 
            summary: 'An unexpected error occurred during generation.',
            error: e.message || 'An unhandled exception occurred in the engine.',
            facultyWorkload: [],
            semesterTimetables: [],
        };
    }
}
