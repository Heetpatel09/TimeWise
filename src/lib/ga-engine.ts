
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

function createLectureList(input: GenerateTimetableInput): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classToSchedule = input.classes[0];
    if (!classToSchedule) return [];

    const classSubjects = input.subjects.filter(
        s => s.semester === classToSchedule.semester && s.departmentId === classToSchedule.departmentId
    );

    for (const sub of classSubjects) {
        if (sub.id === 'LIB001') continue;

        const facultyForSubject = input.faculty.find(f => f.allottedSubjects?.includes(sub.id));
        if (!facultyForSubject) continue;

        const hours = getHoursForSubject(sub);
        if (sub.type === 'lab') {
            lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, hours: 2, facultyId: facultyForSubject.id });
        } else {
            for (let i = 0; i < hours; i++) {
                lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: false, hours: 1, facultyId: facultyForSubject.id });
            }
        }
    }
    lectures.sort((a, b) => (b.isLab ? 1 : 0) - (a.isLab ? 1 : 0));
    return lectures;
}

export async function runGA(input: GenerateTimetableInput) {
    try {
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const codeChefDay = allDays[Math.floor(Math.random() * allDays.length)];
        const workingDays = allDays.filter(d => d !== codeChefDay);
        
        const lecturesToPlace = createLectureList(input);
        const facultyWithExperience = calculateFacultyExperience(input.faculty);

        let facultyWorkload: FacultyWorkload[] = facultyWithExperience.map(f => ({
            facultyId: f.id, facultyName: f.name, experience: f.experience, level: f.level,
            maxHours: f.maxHours || 18, assignedHours: 0,
        }));

        let generatedSchedule: Gene[] = [];
        
        const facultySlots = new Set<string>();
        const classroomSlots = new Set<string>();
        const classSlots = new Set<string>();
        const classLabDays = new Set<string>();
        
        for (const existing of input.existingSchedule) {
            if (existing.classId === input.classes[0]?.id) continue;
            const keyPrefix = `${existing.day}-${existing.time}`;
            facultySlots.add(`${keyPrefix}-${existing.facultyId}`);
            classroomSlots.add(`${keyPrefix}-${existing.classroomId}`);
        }

        const labLectures = lecturesToPlace.filter(l => l.isLab);
        const theoryLectures = lecturesToPlace.filter(l => !l.isLab);
        
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
                        const key1 = `${day}-${time1}`;
                        const key2 = `${day}-${time2}`;
                        
                        const isConflict1 = facultySlots.has(`${key1}-${lab.facultyId}`) || classroomSlots.has(`${key1}-${room.id}`) || classSlots.has(`${key1}-${lab.classId}`);
                        const isConflict2 = facultySlots.has(`${key2}-${lab.facultyId}`) || classroomSlots.has(`${key2}-${room.id}`) || classSlots.has(`${key2}-${lab.classId}`);

                        if (!isConflict1 && !isConflict2) {
                            const gene1 = { day, time: time1, ...lab, classroomId: room.id };
                            const gene2 = { day, time: time2, ...lab, classroomId: room.id };
                            generatedSchedule.push(gene1, gene2);
                            
                            facultySlots.add(`${key1}-${lab.facultyId}`); classroomSlots.add(`${key1}-${room.id}`); classSlots.add(`${key1}-${lab.classId}`);
                            facultySlots.add(`${key2}-${lab.facultyId}`); classroomSlots.add(`${key2}-${room.id}`); classSlots.add(`${key2}-${lab.classId}`);
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
                return { error: `Could not schedule lab for "${subjectName}". Not enough conflict-free 2-hour slots available.` };
            }
        }

        const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
        if (theoryLectures.length > 0 && theoryClassrooms.length === 0) {
            return { error: "Cannot schedule lectures: No classrooms are available." };
        }
        
        const theoryPool = [...theoryLectures];
        theoryPool.sort((a,b) => {
            const prioA = getHoursForSubject(input.subjects.find(s=>s.id === a.subjectId)!);
            const prioB = getHoursForSubject(input.subjects.find(s=>s.id === b.subjectId)!);
            return prioB - prioA;
        });

        for (const day of workingDays) {
            for (const time of LECTURE_TIME_SLOTS) {
                const key = `${day}-${time}`;
                if (classSlots.has(`${key}-${input.classes[0].id}`)) continue;

                for (let i = 0; i < theoryPool.length; i++) {
                    const lecture = theoryPool[i];
                    const workload = facultyWorkload.find(fw => fw.facultyId === lecture.facultyId);
                    if (!workload || (workload.assignedHours + 1 > workload.maxHours)) continue;
                    if (facultySlots.has(`${key}-${lecture.facultyId}`)) continue;
                    if (generatedSchedule.filter(g => g.classId === lecture.classId && g.day === day && g.subjectId === lecture.subjectId).length >= 2) continue;

                    for (const room of theoryClassrooms) {
                        if (classroomSlots.has(`${key}-${room.id}`)) continue;
                        
                        const gene = { day, time, ...lecture, classroomId: room.id };
                        generatedSchedule.push(gene);

                        facultySlots.add(`${key}-${lecture.facultyId}`);
                        classroomSlots.add(`${key}-${room.id}`);
                        classSlots.add(`${key}-${lecture.classId}`);
                        workload.assignedHours += 1;
                        theoryPool.splice(i, 1);
                        i = theoryPool.length; // exit lecture loop
                        break;
                    }
                }
            }
        }
        
        if (theoryPool.length > 0) {
             const subjectName = input.subjects.find(s => s.id === theoryPool[0].subjectId)?.name;
             return { error: `Could not schedule all theory lectures. Failed on "${subjectName}". The schedule is too constrained.` };
        }

        const semesterTimetables: any[] = [];
        for (const classInfo of input.classes) {
            const timetableForClass = generatedSchedule
                .filter(g => g.classId === classInfo.id)
                .map(g => ({ day: g.day, time: g.time, classId: g.classId, subjectId: g.subjectId, facultyId: g.facultyId, classroomId: g.classroomId }));

            if (timetableForClass.length > 0) {
                 const generatedDays = new Set(timetableForClass.map(g => g.day));
                 if (generatedDays.size < workingDays.length && lecturesToPlace.length > timetableForClass.length) {
                    return { error: `Generation failed for ${classInfo.name}. Could only generate for ${generatedDays.size} out of 5 required teaching days. The constraints might be too tight.` };
                 }
                 semesterTimetables.push({ semester: classInfo.semester, timetable: timetableForClass });
            }
        }

        if (semesterTimetables.length === 0) {
             return { error: "Generation resulted in an empty timetable. Please check input constraints." };
        }

        return {
            summary: `Successfully generated a human-like schedule for ${input.classes.map(c=>c.name).join(', ')}.`,
            facultyWorkload,
            semesterTimetables,
            codeChefDay,
        };
    } catch (e: any) {
        console.error(`[TimeWise Engine] Fatal Error:`, e);
        return { error: e.message || 'An unhandled exception occurred in the engine.' };
    }
}
