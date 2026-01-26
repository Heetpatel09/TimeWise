
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

// Correct and ordered time slots based on user's last prompt
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
    for (const classToSchedule of input.classes) {
        const classSubjects = input.subjects.filter(
            s => s.semester === classToSchedule.semester && s.departmentId === classToSchedule.departmentId
        );
        for (const sub of classSubjects) {
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
    }
    lectures.sort((a, b) => (b.isLab ? 1 : 0) - (a.isLab ? 1 : 0));
    return lectures;
}

// Main Engine
export async function runGA(input: GenerateTimetableInput) {
    try {
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const codeChefDay = allDays[Math.floor(Math.random() * allDays.length)];
        const workingDays = allDays.filter(d => d !== codeChefDay);
        
        const lecturesToPlace = createLectureList(input);
        const facultyWithExperience = calculateFacultyExperience(input.faculty);

        let facultyWorkload: FacultyWorkload[] = facultyWithExperience.map(f => ({
            facultyId: f.id,
            facultyName: f.name,
            experience: f.experience,
            level: f.level,
            maxHours: f.maxHours || 18,
            assignedHours: 0,
        }));

        let generatedSchedule: Gene[] = [];
        
        // --- State Tracking Sets ---
        const facultySlots = new Set<string>();
        const classroomSlots = new Set<string>();
        const classSlots = new Set<string>();
        const classLabDays = new Set<string>();
        
        // Pre-fill state with existing schedule to avoid conflicts with other classes
        for (const existing of input.existingSchedule) {
            const keyPrefix = `${existing.day}-${existing.time}`;
            facultySlots.add(`${keyPrefix}-${existing.facultyId}`);
            classroomSlots.add(`${keyPrefix}-${existing.classroomId}`);
            classSlots.add(`${keyPrefix}-${existing.classId}`);
        }

        const labLectures = lecturesToPlace.filter(l => l.isLab);
        const theoryLectures = lecturesToPlace.filter(l => !l.isLab);
        
        // --- 1. Place Labs (Most Constrained) ---
        const labClassrooms = input.classrooms.filter(c => c.type === 'lab');
        if (labLectures.length > 0 && labClassrooms.length === 0) {
             return { error: "Cannot schedule labs: No lab classrooms are available." };
        }

        for (const lab of labLectures) {
            let placed = false;
            const workload = facultyWorkload.find(fw => fw.facultyId === lab.facultyId);
            if (!workload || (workload.assignedHours + 2 > workload.maxHours)) continue; // Check workload before trying to place

            for (const day of workingDays) {
                if (classLabDays.has(`${lab.classId}-${day}`)) continue; // Max one lab per day per class

                for (const [time1, time2] of LAB_TIME_PAIRS) {
                    for (const room of labClassrooms) {
                        const key1 = `${day}-${time1}`;
                        const key2 = `${day}-${time2}`;
                        
                        // Check for conflicts for BOTH slots
                        const isConflict1 = facultySlots.has(`${key1}-${lab.facultyId}`) || classroomSlots.has(`${key1}-${room.id}`) || classSlots.has(`${key1}-${lab.classId}`);
                        const isConflict2 = facultySlots.has(`${key2}-${lab.facultyId}`) || classroomSlots.has(`${key2}-${room.id}`) || classSlots.has(`${key2}-${lab.classId}`);

                        if (!isConflict1 && !isConflict2) {
                            // Place the lab
                            const gene1 = { day, time: time1, ...lab, classroomId: room.id };
                            const gene2 = { day, time: time2, ...lab, classroomId: room.id };
                            generatedSchedule.push(gene1, gene2);
                            
                            // Update state
                            facultySlots.add(`${key1}-${lab.facultyId}`);
                            classroomSlots.add(`${key1}-${room.id}`);
                            classSlots.add(`${key1}-${lab.classId}`);
                            facultySlots.add(`${key2}-${lab.facultyId}`);
                            classroomSlots.add(`${key2}-${room.id}`);
                            classSlots.add(`${key2}-${lab.classId}`);
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

        // --- 2. Place Theory Lectures ---
        const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
        if (theoryLectures.length > 0 && theoryClassrooms.length === 0) {
            return { error: "Cannot schedule lectures: No classrooms are available." };
        }
        
        theoryLectures.sort((a,b) => {
            const prioA = getHoursForSubject(input.subjects.find(s=>s.id === a.subjectId)!);
            const prioB = getHoursForSubject(input.subjects.find(s=>s.id === b.subjectId)!);
            return prioB - prioA;
        });

        for (const theory of theoryLectures) {
            let placed = false;
            const workload = facultyWorkload.find(fw => fw.facultyId === theory.facultyId);
            if (!workload || (workload.assignedHours + 1 > workload.maxHours)) continue;
            
            for (const day of workingDays) {
                if (generatedSchedule.filter(g => g.classId === theory.classId && g.day === day && g.subjectId === theory.subjectId).length >= 2) {
                    continue;
                }
                for (const time of LECTURE_TIME_SLOTS) {
                    const key = `${day}-${time}`;
                    
                    if (facultySlots.has(`${key}-${theory.facultyId}`) || classSlots.has(`${key}-${theory.classId}`)) {
                        continue;
                    }

                    for (const room of theoryClassrooms) {
                         if (classroomSlots.has(`${key}-${room.id}`)) {
                             continue;
                         }

                        const previousSlotIndex = LECTURE_TIME_SLOTS.indexOf(time) - 1;
                        if (previousSlotIndex >= 0) {
                            const previousTime = LECTURE_TIME_SLOTS[previousSlotIndex];
                            const previousGene = generatedSchedule.find(g => g.classId === theory.classId && g.day === day && g.time === previousTime);
                            if (previousGene && !previousGene.isLab && previousGene.classroomId !== room.id) {
                                continue;
                            }
                        }
                        
                        const gene = { day, time, ...theory, classroomId: room.id };
                        generatedSchedule.push(gene);

                        facultySlots.add(`${key}-${theory.facultyId}`);
                        classroomSlots.add(`${key}-${room.id}`);
                        classSlots.add(`${key}-${theory.classId}`);
                        workload.assignedHours += 1;

                        placed = true;
                        break;
                    }
                    if (placed) break;
                }
                if (placed) break;
            }
             if (!placed) {
                const subjectName = input.subjects.find(s => s.id === theory.subjectId)?.name;
                return { error: `Could not schedule theory lecture for "${subjectName}". The schedule is too constrained.` };
            }
        }
        
        // 3. Final formatting and validation
        const semesterTimetables: any[] = [];
        for (const classInfo of input.classes) {
            const timetableForClass = generatedSchedule
                .filter(g => g.classId === classInfo.id)
                .map(g => ({ day: g.day, time: g.time, classId: g.classId, subjectId: g.subjectId, facultyId: g.facultyId, classroomId: g.classroomId }));

            if (timetableForClass.length > 0) {
                 const generatedDays = new Set(timetableForClass.map(g => g.day));
                 if (generatedDays.size < workingDays.length) {
                    return { error: `Generation failed for ${classInfo.name}. Could only generate for ${generatedDays.size} out of 5 required teaching days. The constraints might be too tight.` };
                 }

                 semesterTimetables.push({
                    semester: classInfo.semester,
                    timetable: timetableForClass,
                });
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
