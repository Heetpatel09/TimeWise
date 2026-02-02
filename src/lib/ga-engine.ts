'use server';

import type { GenerateTimetableInput, Schedule, Class, Subject } from './types';
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

const ALL_TIME_SLOTS = [
    '07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM',
    '09:20 AM - 09:30 AM', // Recess
    '09:30 AM - 10:25 AM', '10:25 AM - 11:20 AM',
    '11:20 AM - 12:20 PM', // Lunch
    '12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM'
];

const LECTURE_TIME_SLOTS = ALL_TIME_SLOTS.filter(t => !['09:20 AM - 09:30 AM', '11:20 AM - 12:20 PM'].includes(t));

const LAB_TIME_PAIRS: [string, string][] = [
    ['07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM'], // Morning slot
    ['12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM']  // Afternoon slot
];

const getHoursForSubject = (subject: { type: string, credits?: number | null }): number => {
    if (subject.type === 'lab') return 2; // Labs are 2 hours
    return subject.credits || 3; // Default to 3 hours for theory
};

function calculateFacultyExperience(faculty: GenerateTimetableInput['faculty']): (GenerateTimetableInput['faculty'][0] & { experience: number; level: 'Senior' | 'Mid-Level' | 'Junior' })[] {
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

function createLectureListForClass(allSubjects: GenerateTimetableInput['subjects'], classInfo: Class, facultyList: GenerateTimetableInput['faculty']): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classSubjects = allSubjects.filter(s => s.departmentId === classInfo.departmentId && s.semester === classInfo.semester);

    for (const sub of classSubjects) {
        if (sub.id === 'LIB001') continue;

        const assignedFaculty = facultyList.find(f => f.allottedSubjects?.includes(sub.id));
        if (!assignedFaculty) {
             console.warn(`[Engine] No faculty assigned to subject ${sub.name} (${sub.id}). Skipping.`);
             continue;
        }

        const hours = getHoursForSubject(sub);
        if (sub.type === 'lab') {
            // Create two separate lab sessions for two batches
            lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: true, batch: 'Batch-1', hours: hours });
            lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: true, batch: 'Batch-2', hours: hours });
        } else {
            for (let i = 0; i < hours; i++) {
                lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: false, hours: 1 });
            }
        }
    }
    
    // Sort to prioritize labs, which are harder to place
    lectures.sort((a, b) => (b.isLab ? 1 : 0) - (a.isLab ? 1 : 0));
    return lectures;
}


export async function runGA(input: GenerateTimetableInput) {
    const warnings: string[] = [];
    let finalGeneratedSchedule: Gene[] = [];
    const fullSchedule: Gene[] = [...(input.existingSchedule?.map(s => ({ ...s, isLab: input.subjects.find(sub => sub.id === s.subjectId)?.type === 'lab' })) || [])];

    const facultyWithExperience = calculateFacultyExperience(input.faculty);
    
    const subjectToFacultyMap = new Map<string, string[]>();
    input.faculty.forEach(f => {
        f.allottedSubjects?.forEach(subId => {
            if (!subjectToFacultyMap.has(subId)) subjectToFacultyMap.set(subId, []);
            subjectToFacultyMap.get(subId)!.push(f.id);
        });
    });

    const facultyWorkload = new Map<string, number>();
    input.faculty.forEach(f => facultyWorkload.set(f.id, 0));
    
    const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
    const labClassrooms = input.classrooms.filter(c => c.type === 'lab');

    for (const classToSchedule of input.classes) {
        let classSpecificSchedule: Gene[] = [];
        const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        const lecturesToPlace = createLectureListForClass(input.subjects, classToSchedule, input.faculty);
        
        for (const lecture of lecturesToPlace) {
            let placed = false;
            const assignedFacultyIds = subjectToFacultyMap.get(lecture.subjectId) || [];
            if (assignedFacultyIds.length === 0) {
                warnings.push(`No faculty for ${input.subjects.find(s=>s.id === lecture.subjectId)?.name}.`);
                continue;
            }

            const shuffledDays = workingDays.sort(() => Math.random() - 0.5);

            for (const day of shuffledDays) {
                if (lecture.isLab) {
                    const shuffledTimePairs = LAB_TIME_PAIRS.sort(() => Math.random() - 0.5);
                    for (const [time1, time2] of shuffledTimePairs) {
                        const rooms = labClassrooms.sort(() => Math.random() - 0.5);
                        for (const room of rooms) {
                            const facultyOptions = assignedFacultyIds.sort(() => Math.random() - 0.5);
                            for (const facultyId of facultyOptions) {
                                const facData = facultyWithExperience.find(f => f.id === facultyId);
                                if (!facData || (facultyWorkload.get(facultyId) || 0) + 2 > (facData.maxWeeklyHours || 18)) continue;

                                const conflict = fullSchedule.some(g => {
                                    if (g.day !== day || (g.time !== time1 && g.time !== time2)) return false;
                                    if (g.facultyId === facultyId || g.classroomId === room.id) return true;
                                    if (g.classId === lecture.classId) {
                                        if (!(g as any).batch) return true; // Theory conflict
                                        if ((g as any).batch === lecture.batch) return true; // Same batch conflict
                                    }
                                    return false;
                                });

                                if (!conflict) {
                                    const genes = [
                                        { day, time: time1, ...lecture, facultyId, classroomId: room.id },
                                        { day, time: time2, ...lecture, facultyId, classroomId: room.id },
                                    ];
                                    classSpecificSchedule.push(...genes);
                                    fullSchedule.push(...genes);
                                    facultyWorkload.set(facultyId, (facultyWorkload.get(facultyId) || 0) + 2);
                                    placed = true;
                                    break;
                                }
                            }
                            if (placed) break;
                        }
                        if (placed) break;
                    }
                } else { // Theory
                    const shuffledTimes = LECTURE_TIME_SLOTS.sort(() => Math.random() - 0.5);
                    for (const time of shuffledTimes) {
                         const rooms = theoryClassrooms.sort(() => Math.random() - 0.5);
                         for (const room of rooms) {
                             const facultyOptions = assignedFacultyIds.sort(() => Math.random() - 0.5);
                             for (const facultyId of facultyOptions) {
                                const facData = facultyWithExperience.find(f => f.id === facultyId);
                                if (!facData || (facultyWorkload.get(facultyId) || 0) + 1 > (facData.maxWeeklyHours || 18)) continue;
                                
                                const conflict = fullSchedule.some(g => g.day === day && g.time === time && (g.facultyId === facultyId || g.classroomId === room.id || g.classId === lecture.classId));
                                if (!conflict) {
                                    const gene: Gene = { day, time, ...lecture, facultyId, classroomId: room.id };
                                    classSpecificSchedule.push(gene);
                                    fullSchedule.push(gene);
                                    facultyWorkload.set(facultyId, (facultyWorkload.get(facultyId) || 0) + 1);
                                    placed = true;
                                    break;
                                }
                             }
                             if (placed) break;
                         }
                         if (placed) break;
                    }
                }
                if (placed) break;
            }
            if (!placed) warnings.push(`Could not schedule ${lecture.isLab ? 'lab' : 'theory'} for ${input.subjects.find(s => s.id === lecture.subjectId)?.name} (${lecture.batch || ''})`);
        }
        
        // Fill remaining slots with Library
        for (const day of workingDays) {
            for (const time of LECTURE_TIME_SLOTS) {
                const isSlotFilled = classSpecificSchedule.some(g => g.day === day && g.time === time);
                if (!isSlotFilled) {
                    const gene: Gene = {
                        day, time, classId: classToSchedule.id, subjectId: 'LIB001',
                        facultyId: 'FAC_LIB', classroomId: 'CR_LIB', isLab: false,
                    };
                    classSpecificSchedule.push(gene);
                    fullSchedule.push(gene);
                }
            }
        }
        finalGeneratedSchedule.push(...classSpecificSchedule);
    }
    
    const finalWorkload: FacultyWorkload[] = facultyWithExperience.map(f => ({
        facultyId: f.id, facultyName: f.name, experience: f.experience, level: f.level,
        maxHours: f.maxWeeklyHours || 18, 
        assignedHours: facultyWorkload.get(f.id) || 0,
    }));

    const classTimetables = input.classes.map(classInfo => ({
        classId: classInfo.id,
        className: classInfo.name,
        timetable: finalGeneratedSchedule
            .filter(g => g.classId === classInfo.id)
            .map(g => ({
                day: g.day,
                time: g.time,
                classId: g.classId,
                subjectId: g.subjectId,
                facultyId: g.facultyId,
                classroomId: g.classroomId,
                batch: g.batch,
                isLab: g.isLab,
            }))
    }));

    return {
        summary: `Generated a full 6-day schedule for ${input.classes.length} sections. ${warnings.length > 0 ? `Encountered ${warnings.length} issues.` : 'All constraints satisfied.'}`,
        optimizationExplanation: `The engine prioritized labs and then filled remaining slots with theory and library periods to ensure a complete schedule.`,
        facultyWorkload: finalWorkload,
        classTimetables,
    };
}
