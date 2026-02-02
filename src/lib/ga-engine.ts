
'use server';

import type { GenerateTimetableInput, Schedule } from './types';
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

const ALL_SLOTS = [
    '07:30 AM - 08:25 AM',
    '08:25 AM - 09:20 AM',
    '09:20 AM - 09:30 AM', // Break
    '09:30 AM - 10:25 AM',
    '10:25 AM - 11:20 AM',
    '11:20 AM - 12:20 PM', // Lunch
    '12:20 PM - 01:15 PM',
    '01:15 PM - 02:10 PM'
];

const LAB_TIME_PAIRS: [string, string][] = [
    ['07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM'], // Morning slot
    ['12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM']  // Afternoon slot
];

const getHoursForSubject = (subject: { type: string, credits?: number | null }): number => {
    if (subject.type === 'lab') return 2; // Labs are always 2-hour blocks
    return subject.credits || 3; // Default to 3 hours for a theory subject if not specified
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

function createLectureListForClass(allSubjects: GenerateTimetableInput['subjects'], classInfo: GenerateTimetableInput['classes'][0], workingDays: string[]): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classSubjects = allSubjects.filter(
        s => s.semester === classInfo.semester && s.departmentId === classInfo.departmentId
    );

    for (const sub of classSubjects) {
        if (sub.id === 'LIB001') continue;

        if (sub.type === 'lab') {
            lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: true, batch: 'Batch-1' });
            lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: true, batch: 'Batch-2' });
        } else {
            const hours = getHoursForSubject(sub);
            for (let i = 0; i < hours; i++) {
                lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: false });
            }
        }
    }
    
    lectures.sort((a, b) => (b.isLab ? 1 : 0) - (a.isLab ? 1 : 0));
    return lectures;
}

export async function runGA(input: GenerateTimetableInput) {
    const warnings: string[] = [];
    let finalGeneratedSchedule: Gene[] = [];
    const fullSchedule: (Gene | Schedule)[] = [...(input.existingSchedule?.map(s => ({ ...s, isLab: input.subjects.find(sub => sub.id === s.subjectId)?.type === 'lab' })) || [])];

    try {
        const allPossibleDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
            // Give each class a different day off to distribute workload
            const dayOff = allPossibleDays[input.classes.indexOf(classToSchedule) % allPossibleDays.length];
            const workingDays = allPossibleDays.filter(day => day !== dayOff);
            
            const lecturesToPlace = createLectureListForClass(input.subjects, classToSchedule, workingDays);
            const labLectures = lecturesToPlace.filter(l => l.isLab);
            const theoryLectures = lecturesToPlace.filter(l => !l.isLab);
            
            // --- 1. Place all labs first ---
             for (const lab of labLectures) {
                let placed = false;
                const assignedFacultyIds = subjectToFacultyMap.get(lab.subjectId) || [];
                if (assignedFacultyIds.length === 0) { warnings.push(`No faculty for lab ${input.subjects.find(s=>s.id === lab.subjectId)?.name}.`); continue; }

                for (const day of workingDays.sort(() => Math.random() - 0.5)) {
                    if (placed) break;
                    if (fullSchedule.some(g => (g as Gene).isLab && g.classId === classToSchedule.id && g.day === day)) continue;

                    for (const [time1, time2] of LAB_TIME_PAIRS.sort(() => Math.random() - 0.5)) {
                        if (placed) break;
                        for (const room of labClassrooms.sort(() => Math.random() - 0.5)) {
                            if (placed) break;
                            for (const facultyId of assignedFacultyIds.sort(() => Math.random() - 0.5)) {
                                const facData = facultyWithExperience.find(f => f.id === facultyId);
                                if (!facData || (facultyWorkload.get(facultyId) || 0) + 2 > (facData.maxWeeklyHours || 18)) continue;
                                
                                const conflict = fullSchedule.some(g => g.day === day && (g.time === time1 || g.time === time2) && (g.facultyId === facultyId || g.classroomId === room.id || (g.classId === classToSchedule.id && (g as Gene).batch === lab.batch)));
                                if (!conflict) {
                                    const genes = [
                                        { day, time: time1, ...lab, facultyId, classroomId: room.id, isLab: true },
                                        { day, time: time2, ...lab, facultyId, classroomId: room.id, isLab: true },
                                    ];
                                    classSpecificSchedule.push(...genes);
                                    fullSchedule.push(...genes);
                                    facultyWorkload.set(facultyId, (facultyWorkload.get(facultyId) || 0) + 2);
                                    placed = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (!placed) warnings.push(`Could not schedule lab for ${input.subjects.find(s=>s.id === lab.subjectId)?.name} (${lab.batch}).`);
            }
            
            // --- 2. Place Theory Lectures ---
            for (const theory of theoryLectures) {
                 let placed = false;
                 const assignedFacultyIds = subjectToFacultyMap.get(theory.subjectId) || [];
                 if (assignedFacultyIds.length === 0) { warnings.push(`No faculty for ${input.subjects.find(s=>s.id === theory.subjectId)?.name}.`); continue; }

                 for (const day of workingDays.sort(() => Math.random() - 0.5)) {
                    if (placed) break;
                    for (const time of LECTURE_TIME_SLOTS.sort(() => Math.random() - 0.5)) {
                         if (placed) break;
                         let roomToUse = (theoryClassrooms.sort(() => Math.random() - 0.5)[0]?.id);
                         if (!roomToUse) { continue; }
                         for(const facultyId of assignedFacultyIds.sort(() => Math.random() - 0.5)) {
                             const facData = facultyWithExperience.find(f => f.id === facultyId);
                             if (!facData || (facultyWorkload.get(facultyId) || 0) + 1 > (facData.maxWeeklyHours || 18)) continue;

                             const isConflict = fullSchedule.some(g => g.day === day && g.time === time && (g.facultyId === facultyId || g.classroomId === roomToUse || g.classId === theory.classId));
                             if (!isConflict) {
                                const gene: Gene = { day, time, ...theory, facultyId, classroomId: roomToUse };
                                classSpecificSchedule.push(gene);
                                fullSchedule.push(gene);
                                facultyWorkload.set(facultyId, (facultyWorkload.get(facultyId) || 0) + 1);
                                placed = true;
                                break;
                             }
                         }
                    }
                 }
                 if (!placed) warnings.push(`Could not schedule theory lecture for ${input.subjects.find(s=>s.id === theory.subjectId)?.name}.`);
            }
            
            // --- 3. Fill empty slots with Library ---
            for (const day of workingDays) {
                for (const time of LECTURE_TIME_SLOTS) {
                    const isSlotFilled = classSpecificSchedule.some(g => g.day === day && g.time === time);
                    if (!isSlotFilled) {
                        const gene: Gene = {
                            day, time, classId: classToSchedule.id, subjectId: 'LIB001',
                            facultyId: 'FAC_LIB', classroomId: 'CR_LIB', isLab: false,
                        };
                        classSpecificSchedule.push(gene);
                        fullSchedule.push(gene); // Also add to master check list
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
                    isLab: g.isLab
                }))
        }));

        return {
            summary: `Generated a full 5-day schedule for ${input.classes.length} sections. ${warnings.length > 0 ? `Encountered ${warnings.length} issues.` : 'All constraints satisfied.'}`,
            optimizationExplanation: `The engine prioritized labs and then filled remaining slots with theory and library periods to ensure a complete schedule.`,
            facultyWorkload: finalWorkload,
            classTimetables,
            error: warnings.length > 0 ? warnings.join('; ') : undefined,
        };

    } catch (e: any) {
        console.error(`[TimeWise Engine] Fatal Error:`, e);
        return { 
            summary: 'An unexpected error occurred during generation.',
            error: e.message || 'An unhandled exception occurred in the engine.',
            facultyWorkload: [],
            classTimetables: [],
        };
    }
}
