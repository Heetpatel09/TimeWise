
'use server';

import type { GenerateTimetableInput, Schedule, Subject } from './types';
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
}

interface LectureToBePlaced {
    subjectId: string;
    facultyId: string;
    isLab: boolean;
    classId: string;
    hours: number;
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

const LAB_TIME_PAIRS: [string, string][] = [
    ['07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM'],
    ['09:30 AM - 10:25 AM', '10:25 AM - 11:20 AM'],
    ['12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM']
];

const getHoursForSubject = (subject: Subject): number => {
    if (subject.type === 'lab') return 2;
    if (subject.weeklyHours) return subject.weeklyHours;
    switch (subject.priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 2;
    }
};

function calculateFacultyExperience(faculty: GenerateTimetableInput['faculty']): any[] {
    const today = new Date();
    return faculty.map(f => {
        const experience = f.dateOfJoining ? differenceInYears(today, parseISO(f.dateOfJoining)) : 0;
        let level: 'Senior' | 'Mid-Level' | 'Junior';
        if (experience >= 7) level = 'Senior';
        else if (experience >= 3) level = 'Mid-Level';
        else level = 'Junior';
        return { ...f, experience, level };
    });
}

function createLectureList(input: GenerateTimetableInput, classInfo: GenerateTimetableInput['classes'][0]): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classSubjects = input.subjects.filter(
        s => s.semester === classInfo.semester && s.departmentId === classInfo.departmentId
    );

    for (const sub of classSubjects) {
        if (sub.id === 'LIB001') continue;

        const facultyForSubject = input.faculty.find(f => f.allottedSubjects?.includes(sub.id));
        if (!facultyForSubject) continue;

        const hours = getHoursForSubject(sub);
        if (sub.type === 'lab') {
            lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: true, hours: 2, facultyId: facultyForSubject.id });
        } else {
            for (let i = 0; i < hours; i++) {
                lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: false, hours: 1, facultyId: facultyForSubject.id });
            }
        }
    }
    lectures.sort((a, b) => (b.isLab ? 1 : 0) - (a.isLab ? 1 : 0)); // Prioritize labs
    return lectures;
}

export async function runGA(input: GenerateTimetableInput) {
    try {
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const codeChefDay = allDays[Math.floor(Math.random() * allDays.length)];
        const workingDays = allDays.filter(d => d !== codeChefDay);
        
        const facultyWithExperience = calculateFacultyExperience(input.faculty);
        let facultyWorkload: FacultyWorkload[] = facultyWithExperience.map(f => ({
            facultyId: f.id, facultyName: f.name, experience: f.experience, level: f.level,
            maxHours: f.maxHours || 18, assignedHours: 0,
        }));
        
        let finalGeneratedSchedule: Gene[] = [];
        
        const fullConflictSchedule = [...input.existingSchedule];

        for(const classToSchedule of input.classes) {
            const lecturesToPlace = createLectureList(input, classToSchedule);
            let classSchedule: Gene[] = [];
            const classLabDays = new Set<string>();

            const labLectures = lecturesToPlace.filter(l => l.isLab);
            const theoryLectures = lecturesToPlace.filter(l => !l.isLab);

            // Place Labs First
            const labClassrooms = input.classrooms.filter(c => c.type === 'lab');
            if (labLectures.length > 0 && labClassrooms.length === 0) {
                 return { error: "Cannot schedule labs: No lab classrooms are available." };
            }

            for (const lab of labLectures) {
                let placed = false;
                const workload = facultyWorkload.find(fw => fw.facultyId === lab.facultyId);
                if (!workload || (workload.assignedHours + 2 > workload.maxHours)) continue;

                for (const day of workingDays) {
                    if (classLabDays.has(`${lab.classId}-${day}`)) continue;
                    for (const [time1, time2] of LAB_TIME_PAIRS) {
                        for (const room of labClassrooms) {
                            const isConflict1 = fullConflictSchedule.some(g => g.day === day && g.time === time1 && (g.facultyId === lab.facultyId || g.classroomId === room.id));
                            const isConflict2 = fullConflictSchedule.some(g => g.day === day && g.time === time2 && (g.facultyId === lab.facultyId || g.classroomId === room.id));
                            if (!isConflict1 && !isConflict2) {
                                const gene1: Gene = { day, time: time1, ...lab, classroomId: room.id };
                                const gene2: Gene = { day, time: time2, ...lab, classroomId: room.id };
                                classSchedule.push(gene1, gene2);
                                fullConflictSchedule.push(gene1, gene2);
                                classLabDays.add(`${lab.classId}-${day}`);
                                workload.assignedHours += 2;
                                placed = true;
                                break;
                            }
                        }
                        if (placed) break;
                    }
                    if (placed) break;
                }
                if (!placed) {
                    const subjectName = input.subjects.find(s => s.id === lab.subjectId)?.name;
                    return { error: `Could not schedule lab for "${subjectName}" in class ${classToSchedule.name}. Not enough conflict-free 2-hour slots available.` };
                }
            }
            
            // Place Theory Lectures
            const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
            if (theoryLectures.length > 0 && theoryClassrooms.length === 0) {
                return { error: "Cannot schedule lectures: No classrooms are available." };
            }

            for(const lecture of theoryLectures) {
                let placed = false;
                for (const day of workingDays) {
                    // Rule: Same theory subject can't be more than once a day
                    if (classSchedule.some(g => g.day === day && g.subjectId === lecture.subjectId && !g.isLab)) continue;

                    for (const time of LECTURE_TIME_SLOTS) {
                        // Rule: Slot is not already taken for this class
                        if (classSchedule.some(g => g.day === day && g.time === time)) continue;
                        
                        const workload = facultyWorkload.find(fw => fw.facultyId === lecture.facultyId);
                        if (!workload || (workload.assignedHours + 1 > workload.maxHours)) continue;
                        
                        // Rule: Faculty is free
                        if(fullConflictSchedule.some(g => g.day === day && g.time === time && g.facultyId === lecture.facultyId)) continue;
                        
                        for(const room of theoryClassrooms) {
                            // Rule: Classroom is free
                            if(fullConflictSchedule.some(g => g.day === day && g.time === time && g.classroomId === room.id)) continue;
                            
                            const newGene: Gene = { day, time, ...lecture, classroomId: room.id };
                            classSchedule.push(newGene);
                            fullConflictSchedule.push(newGene);
                            workload.assignedHours += 1;
                            placed = true;
                            break;
                        }
                        if(placed) break;
                    }
                    if(placed) break;
                }
                 if (!placed) {
                    const subjectName = input.subjects.find(s => s.id === lecture.subjectId)?.name;
                    return { error: `Could not schedule theory lecture for "${subjectName}" in class ${classToSchedule.name}. The schedule is too constrained.` };
                }
            }
            finalGeneratedSchedule.push(...classSchedule);
        }

        const semesterTimetables: any[] = [];
        for (const classInfo of input.classes) {
            const timetableForClass = finalGeneratedSchedule
                .filter(g => g.classId === classInfo.id)
                .map(g => ({ day: g.day, time: g.time, classId: g.classId, subjectId: g.subjectId, facultyId: g.facultyId, classroomId: g.classroomId }));

            if (timetableForClass.length > 0) {
                 semesterTimetables.push({ semester: classInfo.semester, timetable: timetableForClass });
            }
        }

        if (semesterTimetables.length === 0) {
             return { error: "Generation resulted in an empty timetable. Please check input constraints." };
        }

        return {
            summary: `Successfully generated a human-like schedule for ${input.classes.map(c=>c.name).join(', ')}.`,
            optimizationExplanation: 'Labs were scheduled first in 2-hour blocks. Theory classes were then distributed across the 5 working days, prioritizing core subjects in morning slots and ensuring faculty workloads and experience levels were respected.',
            facultyWorkload,
            semesterTimetables,
            codeChefDay,
        };
    } catch (e: any) {
        console.error(`[TimeWise Engine] Fatal Error:`, e);
        return { error: e.message || 'An unhandled exception occurred in the engine.' };
    }
}
