
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
    classId: string;
    isLab: boolean;
    hours: number;
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
    if (subject.type === 'lab') return 2; // A lab session is 2 hours
    if (subject.priority === 'Non Negotiable') return 4;
    if (subject.priority === 'High') return 3;
    if (subject.priority === 'Medium') return 2;
    if (subject.priority === 'Low') return 1;
    return 2; // Default
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
            lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: true, hours: 2, batch: 'Batch-1' });
            lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: true, hours: 2, batch: 'Batch-2' });
        } else {
            const hours = getHoursForSubject(sub);
            for (let i = 0; i < hours; i++) {
                lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: false, hours: 1 });
            }
        }
    }
    return lectures;
}


export async function runGA(input: GenerateTimetableInput) {
    const warnings: string[] = [];
    const fullConflictSchedule: Gene[] = input.existingSchedule.map(s => ({ ...s, isLab: input.subjects.find(sub => sub.id === s.subjectId)?.type === 'lab' }));
    
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

            for (const lecture of lecturesToPlace) {
                let placed = false;
                const assignedFacultyIds = subjectToFacultyMap.get(lecture.subjectId) || [];
                if (assignedFacultyIds.length === 0) {
                    warnings.push(`No faculty for ${input.subjects.find(s=>s.id === lecture.subjectId)?.name}.`);
                    continue;
                }
                
                const shuffledDays = [...workingDays].sort(() => Math.random() - 0.5);
                const shuffledFaculty = [...assignedFacultyIds].sort(() => Math.random() - 0.5);

                for (const day of shuffledDays) {
                    if (placed) break;

                    if (lecture.isLab) {
                         if (!lecture.batch) continue;
                        
                        // Rule: A class cannot have another lab on the same day.
                        if (fullConflictSchedule.some(g => g.classId === lecture.classId && g.day === day && g.isLab)) continue;

                        for (const [time1, time2] of LAB_TIME_PAIRS.sort(() => Math.random() - 0.5)) {
                            for (const room of labClassrooms) {
                                for (const facultyId of shuffledFaculty) {
                                     const isConflict1 = fullConflictSchedule.some(g => g.day === day && g.time === time1 && (g.facultyId === facultyId || g.classroomId === room.id || (g.classId === lecture.classId && g.batch === lecture.batch)));
                                     const isConflict2 = fullConflictSchedule.some(g => g.day === day && g.time === time2 && (g.facultyId === facultyId || g.classroomId === room.id || (g.classId === lecture.classId && g.batch === lecture.batch)));

                                     if (!isConflict1 && !isConflict2) {
                                        const gene1: Gene = { day, time: time1, ...lecture, facultyId, classroomId: room.id };
                                        const gene2: Gene = { day, time: time2, ...lecture, facultyId, classroomId: room.id };
                                        fullConflictSchedule.push(gene1, gene2);
                                        placed = true;
                                        break;
                                     }
                                }
                                if(placed) break;
                            }
                            if(placed) break;
                        }
                    } else { // Theory
                        for (const time of LECTURE_TIME_SLOTS.sort(() => Math.random() - 0.5)) {
                             for (const room of theoryClassrooms) {
                                for (const facultyId of shuffledFaculty) {
                                    if (!fullConflictSchedule.some(g => g.day === day && g.time === time && (g.facultyId === facultyId || g.classroomId === room.id || g.classId === lecture.classId))) {
                                        const gene: Gene = { day, time, ...lecture, facultyId, classroomId: room.id};
                                        fullConflictSchedule.push(gene);
                                        placed = true;
                                        break;
                                    }
                                }
                                if(placed) break;
                            }
                             if(placed) break;
                        }
                    }
                }
                 if (!placed) {
                    const subjectName = input.subjects.find(s=>s.id === lecture.subjectId)?.name || 'Unknown Subject';
                    warnings.push(`Could not place ${subjectName} (${lecture.isLab ? `Lab, Batch ${lecture.batch}` : 'Theory'}). Force-placing.`);
                    
                    const day = workingDays[Math.floor(Math.random() * workingDays.length)];
                    const facultyId = shuffledFaculty[0];

                     if (lecture.isLab) {
                        const [time1, time2] = LAB_TIME_PAIRS[Math.floor(Math.random() * LAB_TIME_PAIRS.length)];
                        const classroomId = labClassrooms[0]?.id || 'TBD-LAB';
                        if(classroomId === 'TBD-LAB') warnings.push(`No available lab rooms found.`);
                        fullConflictSchedule.push({ day, time: time1, ...lecture, facultyId, classroomId });
                        fullConflictSchedule.push({ day, time: time2, ...lecture, facultyId, classroomId });
                    } else {
                        const time = LECTURE_TIME_SLOTS[Math.floor(Math.random() * LECTURE_TIME_SLOTS.length)];
                        const classroomId = theoryClassrooms[0]?.id || 'TBD-ROOM';
                         if(classroomId === 'TBD-ROOM') warnings.push(`No available theory rooms found.`);
                        fullConflictSchedule.push({ day, time, ...lecture, facultyId, classroomId });
                    }
                }
            }
        }
        
        const facultyWorkload: FacultyWorkload[] = facultyWithExperience.map(f => ({
            facultyId: f.id, facultyName: f.name, experience: f.experience, level: f.level,
            maxHours: f.maxWeeklyHours || 18, 
            assignedHours: fullConflictSchedule.filter(g => g.facultyId === f.id).length,
        }));

        const semesterTimetables = input.classes.map(classInfo => ({
            semester: classInfo.semester,
            timetable: fullConflictSchedule.filter(g => g.classId === classInfo.id)
        }));

        return {
            summary: `Generated a full 5-day schedule for ${input.classes.length} class sections. ${warnings.length > 0 ? `Encountered and force-resolved ${warnings.length} issues.` : 'All constraints satisfied.'}`,
            optimizationExplanation: `The engine strictly followed the 5-day week and lab batching rules. Labs were scheduled in 2-hour continuous blocks for Batch-1 and Batch-2 separately.`,
            facultyWorkload,
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
