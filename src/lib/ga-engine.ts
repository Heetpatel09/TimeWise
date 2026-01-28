
'use server';

import type { GenerateTimetableInput, Schedule, Subject, Faculty, Classroom, Department } from './types';
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
    classId: string;
    isLab: boolean;
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

function calculateFacultyExperience(faculty: Faculty[]): (Faculty & { experience: number; level: 'Senior' | 'Mid-Level' | 'Junior' })[] {
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

function createLectureListForClass(allSubjects: Subject[], classInfo: Class): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classSubjects = allSubjects.filter(
        s => s.semester === classInfo.semester && s.departmentId === classInfo.departmentId
    );

    for (const sub of classSubjects) {
        if (sub.id === 'LIB001') continue; // Library handled separately or not at all

        const hours = getHoursForSubject(sub);
        if (sub.type === 'lab') {
            lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: true, hours: 2 });
        } else {
            for (let i = 0; i < hours; i++) {
                lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: false, hours: 1 });
            }
        }
    }
    return lectures;
}

export async function runGA(input: GenerateTimetableInput) {
    const warnings: string[] = [];

    try {
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const codeChefDay = allDays[Math.floor(Math.random() * allDays.length)];
        const workingDays = allDays.filter(d => d !== codeChefDay);
        
        const facultyWithExperience = calculateFacultyExperience(input.faculty);
        const facultyWorkload: FacultyWorkload[] = facultyWithExperience.map(f => ({
            facultyId: f.id, facultyName: f.name, experience: f.experience, level: f.level,
            maxHours: f.maxHours || 18, assignedHours: 0,
        }));
        
        const fullConflictSchedule: Gene[] = input.existingSchedule.map(s => ({ ...s, isLab: input.subjects.find(sub => sub.id === s.subjectId)?.type === 'lab' }));
        const subjectToFacultyMap = new Map<string, string[]>();
        input.faculty.forEach(f => {
            f.allottedSubjects?.forEach(subId => {
                if (!subjectToFacultyMap.has(subId)) {
                    subjectToFacultyMap.set(subId, []);
                }
                subjectToFacultyMap.get(subId)!.push(f.id);
            });
        });

        const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
        const labClassrooms = input.classrooms.filter(c => c.type === 'lab');

        for (const classToSchedule of input.classes) {
            const lecturesToPlace = createLectureListForClass(input.subjects, classToSchedule);
            const placedInClass = new Set<string>(); // Tracks subject-hours placed for this class

            const placeLecture = (lecture: LectureToBePlaced, isRetry = false) => {
                const availableFaculty = subjectToFacultyMap.get(lecture.subjectId) || [];
                if (availableFaculty.length === 0) {
                    warnings.push(`No faculty assigned for subject ${input.subjects.find(s=>s.id === lecture.subjectId)?.name}. Skipping.`);
                    return true; // Skip this lecture
                }

                // Try to find a perfect slot
                for (const day of workingDays.sort(() => Math.random() - 0.5)) {
                    if (lecture.isLab) {
                         // One lab per day for a class
                        if (fullConflictSchedule.some(g => g.classId === lecture.classId && g.day === day && g.isLab)) continue;

                        for (const [time1, time2] of LAB_TIME_PAIRS.sort(() => Math.random() - 0.5)) {
                            for (const room of labClassrooms) {
                                for (const facultyId of availableFaculty) {
                                     const isConflict1 = fullConflictSchedule.some(g => g.day === day && g.time === time1 && (g.facultyId === facultyId || g.classroomId === room.id || g.classId === lecture.classId));
                                     const isConflict2 = fullConflictSchedule.some(g => g.day === day && g.time === time2 && (g.facultyId === facultyId || g.classroomId === room.id || g.classId === lecture.classId));

                                     if (!isConflict1 && !isConflict2) {
                                        const gene1: Gene = { day, time: time1, ...lecture, facultyId, classroomId: room.id };
                                        const gene2: Gene = { day, time: time2, ...lecture, facultyId, classroomId: room.id };
                                        fullConflictSchedule.push(gene1, gene2);
                                        placedInClass.add(`${lecture.subjectId}-lab`);
                                        return true;
                                     }
                                }
                            }
                        }
                    } else {
                        // Max 2 theory classes of same subject per day
                        const todaySubjectCount = fullConflictSchedule.filter(g => g.classId === lecture.classId && g.day === day && g.subjectId === lecture.subjectId && !g.isLab).length;
                        if (todaySubjectCount >= 2) continue;

                        for (const time of LECTURE_TIME_SLOTS.sort(() => Math.random() - 0.5)) {
                             for (const room of theoryClassrooms) {
                                for (const facultyId of availableFaculty) {
                                    if (!fullConflictSchedule.some(g => g.day === day && g.time === time && (g.facultyId === facultyId || g.classroomId === room.id || g.classId === lecture.classId))) {
                                        const gene: Gene = { day, time, ...lecture, facultyId, classroomId: room.id};
                                        fullConflictSchedule.push(gene);
                                        placedInClass.add(`${lecture.subjectId}-theory-${Date.now()}`); // Unique key for each hour
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                }
                return false; // Could not place
            };
            
            // Place all lectures for the class
            lecturesToPlace.sort((a, b) => (b.isLab ? 1 : 0) - (a.isLab ? 1 : 0));
            for (const lecture of lecturesToPlace) {
                const key = lecture.isLab ? `${lecture.subjectId}-lab` : `${lecture.subjectId}-theory`;
                if (!placeLecture(lecture)) {
                    warnings.push(`Could not find a perfect slot for ${input.subjects.find(s=>s.id===lecture.subjectId)?.name}. The schedule may have conflicts.`);
                    // Force place logic here if needed, for now, just warn.
                }
            }
        }
        
        // Final faculty workload calculation
        facultyWorkload.forEach(fw => {
            fw.assignedHours = fullConflictSchedule.filter(g => g.facultyId === fw.facultyId).length;
        });

        const semesterTimetables = input.classes.map(classInfo => ({
            semester: classInfo.semester,
            timetable: fullConflictSchedule.filter(g => g.classId === classInfo.id)
        }));

        return {
            summary: `Successfully generated a human-like schedule for ${input.classes.length} classes. ${warnings.length > 0 ? `Encountered ${warnings.length} issues.` : ''}`,
            optimizationExplanation: `The engine prioritized lab sessions and distributed theory classes across 5 working days, respecting faculty assignments. ${warnings.join(' ')}`,
            facultyWorkload,
            semesterTimetables,
            codeChefDay,
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
