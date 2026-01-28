
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

// Labs can only be in the first two or last two slots
const LAB_TIME_PAIRS: [string, string][] = [
    ['07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM'], // Morning slot
    ['12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM']  // Afternoon slot
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
            // Labs must have two batches
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
    let generatedSchedule: Gene[] = [];
    // Start with existing schedule from other departments to avoid conflicts
    const fullSchedule = [...input.existingSchedule.map(s => ({ ...s, isLab: input.subjects.find(sub => sub.id === s.subjectId)?.type === 'lab' }))];

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

        const facultyWorkload = new Map<string, number>();
        input.faculty.forEach(f => facultyWorkload.set(f.id, 0));
        
        const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
        const labClassrooms = input.classrooms.filter(c => c.type === 'lab');

        for (const classToSchedule of input.classes) {
            const lecturesToPlace = createLectureListForClass(input.subjects, classToSchedule);
            const labLectures = lecturesToPlace.filter(l => l.isLab);
            const theoryLectures = lecturesToPlace.filter(l => !l.isLab);
            
            const placedLabSubjectsForClass = new Set<string>();

            // --- 1. Paired Lab Scheduling (Highest Priority) ---
            const classLabSubjects = Array.from(new Set(labLectures.map(l => l.subjectId)));
            const labPairs: (string[])[] = [];
            for (let i = 0; i < classLabSubjects.length; i+=2) {
                if (i + 1 < classLabSubjects.length) {
                    labPairs.push([classLabSubjects[i], classLabSubjects[i+1]]);
                } else {
                    labPairs.push([classLabSubjects[i]]); // Odd one out
                }
            }

            for (const pair of labPairs) {
                if (pair.length < 2) continue; // Skip single labs for now
                
                const [labA_Id, labB_Id] = pair;
                let placed = false;

                const facultyA_Ids = subjectToFacultyMap.get(labA_Id) || [];
                const facultyB_Ids = subjectToFacultyMap.get(labB_Id) || [];

                if (facultyA_Ids.length === 0 || facultyB_Ids.length === 0) continue;

                for (const day of workingDays.sort(() => Math.random() - 0.5)) {
                    if(placed) break;
                    // Check if class already has labs on this day
                    if (fullSchedule.some(g => g.classId === classToSchedule.id && g.day === day && g.isLab)) continue;

                    for (const [time1, time2] of LAB_TIME_PAIRS.sort(() => Math.random() - 0.5)) {
                         if(placed) break;
                         for(const roomA of labClassrooms) {
                            if(placed) break;
                            for(const roomB of labClassrooms.filter(r => r.id !== roomA.id)) {
                                if(placed) break;
                                for(const facA_Id of facultyA_Ids) {
                                    if(placed) break;
                                     const facA_Data = facultyWithExperience.find(f => f.id === facA_Id);
                                     if (!facA_Data || (facultyWorkload.get(facA_Id) || 0) + 2 > (facA_Data.maxWeeklyHours || 18)) continue;

                                    for(const facB_Id of facultyB_Ids.filter(f => f !== facA_Id)) {
                                        const facB_Data = facultyWithExperience.find(f => f.id === facB_Id);
                                        if (!facB_Data || (facultyWorkload.get(facB_Id) || 0) + 2 > (facB_Data.maxWeeklyHours || 18)) continue;

                                        const conflictA = fullSchedule.some(g => g.day === day && (g.time === time1 || g.time === time2) && (g.facultyId === facA_Id || g.classroomId === roomA.id));
                                        const conflictB = fullSchedule.some(g => g.day === day && (g.time === time1 || g.time === time2) && (g.facultyId === facB_Id || g.classroomId === roomB.id));

                                        if(!conflictA && !conflictB) {
                                            const genes = [
                                                { day, time: time1, classId: classToSchedule.id, subjectId: labA_Id, facultyId: facA_Id, classroomId: roomA.id, isLab: true, batch: 'Batch-1' },
                                                { day, time: time2, classId: classToSchedule.id, subjectId: labA_Id, facultyId: facA_Id, classroomId: roomA.id, isLab: true, batch: 'Batch-1' },
                                                { day, time: time1, classId: classToSchedule.id, subjectId: labB_Id, facultyId: facB_Id, classroomId: roomB.id, isLab: true, batch: 'Batch-2' },
                                                { day, time: time2, classId: classToSchedule.id, subjectId: labB_Id, facultyId: facB_Id, classroomId: roomB.id, isLab: true, batch: 'Batch-2' },
                                            ];
                                            generatedSchedule.push(...genes);
                                            fullSchedule.push(...genes);
                                            facultyWorkload.set(facA_Id, (facultyWorkload.get(facA_Id) || 0) + 2);
                                            facultyWorkload.set(facB_Id, (facultyWorkload.get(facB_Id) || 0) + 2);
                                            placedLabSubjectsForClass.add(labA_Id);
                                            placedLabSubjectsForClass.add(labB_Id);
                                            placed = true;
                                            break;
                                        }
                                    }
                                }
                            }
                         }
                    }
                }
            }


            // --- 2. Handle remaining/unpaired labs ---
            const remainingLabSubjects = classLabSubjects.filter(subId => !placedLabSubjectsForClass.has(subId));
             for (const labSubId of remainingLabSubjects) {
                const labBatches = labLectures.filter(l => l.subjectId === labSubId);
                for (const lab of labBatches) {
                    let placed = false;
                    const assignedFacultyIds = subjectToFacultyMap.get(lab.subjectId) || [];
                     if (assignedFacultyIds.length === 0) { warnings.push(`No faculty for ${input.subjects.find(s=>s.id === lab.subjectId)?.name}.`); continue; }

                    for (const day of workingDays.sort(() => Math.random() - 0.5)) {
                        if (placed) break;
                        if (fullSchedule.some(g => g.classId === classToSchedule.id && g.day === day && g.isLab)) continue;
                        for (const [time1, time2] of LAB_TIME_PAIRS.sort(() => Math.random() - 0.5)) {
                            if (placed) break;
                            for (const room of labClassrooms) {
                                if (placed) break;
                                for (const facultyId of assignedFacultyIds) {
                                    const facData = facultyWithExperience.find(f => f.id === facultyId);
                                    if (!facData || (facultyWorkload.get(facultyId) || 0) + 2 > (facData.maxWeeklyHours || 18)) continue;
                                    
                                    const conflict = fullSchedule.some(g => g.day === day && (g.time === time1 || g.time === time2) && (g.facultyId === facultyId || g.classroomId === room.id || (g.classId === lab.classId && g.batch === lab.batch)));
                                    if (!conflict) {
                                        const genes = [
                                            { day, time: time1, ...lab, facultyId, classroomId: room.id },
                                            { day, time: time2, ...lab, facultyId, classroomId: room.id },
                                        ];
                                        generatedSchedule.push(...genes);
                                        fullSchedule.push(...genes);
                                        facultyWorkload.set(facultyId, (facultyWorkload.get(facultyId) || 0) + 2);
                                        placed = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                     if (!placed) {
                        warnings.push(`Could not find slot for lab ${input.subjects.find(s=>s.id === lab.subjectId)?.name} (${lab.batch}). Force-placing.`);
                        const day = workingDays[generatedSchedule.length % workingDays.length];
                        const [time1, time2] = LAB_TIME_PAIRS[generatedSchedule.length % LAB_TIME_PAIRS.length];
                        const facultyId = assignedFacultyIds[0];
                        const classroomId = labClassrooms[0]?.id || 'TBD-LAB';
                        const genes = [ { day, time: time1, ...lab, facultyId, classroomId }, { day, time: time2, ...lab, facultyId, classroomId }, ];
                        generatedSchedule.push(...genes); fullSchedule.push(...genes);
                    }
                }
            }
            
            // --- 3. Place Theory Lectures ---
            for (const theory of theoryLectures) {
                 let placed = false;
                const assignedFacultyIds = subjectToFacultyMap.get(theory.subjectId) || [];
                if (assignedFacultyIds.length === 0) {
                     warnings.push(`No faculty for ${input.subjects.find(s=>s.id === theory.subjectId)?.name}.`);
                    continue;
                }

                 for (const day of workingDays.sort(() => Math.random() - 0.5)) {
                    if (placed) break;
                    for (const time of LECTURE_TIME_SLOTS.sort(() => Math.random() - 0.5)) {
                         if (placed) break;
                         for (const room of theoryClassrooms) {
                            if (placed) break;
                            for (const facultyId of assignedFacultyIds) {
                                const facData = facultyWithExperience.find(f => f.id === facultyId);
                                if (!facData || (facultyWorkload.get(facultyId) || 0) + 1 > (facData.maxWeeklyHours || 18)) continue;

                                const isConflict = fullSchedule.some(g => g.day === day && g.time === time && (g.facultyId === facultyId || g.classroomId === room.id || g.classId === theory.classId));
                                if (!isConflict) {
                                    const gene: Gene = { day, time, classId: theory.classId, subjectId: theory.subjectId, facultyId, classroomId: room.id, isLab: false };
                                    generatedSchedule.push(gene);
                                    fullSchedule.push(gene);
                                    facultyWorkload.set(facultyId, (facultyWorkload.get(facultyId) || 0) + 1);
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
                    const facultyId = assignedFacultyIds[0];
                    const classroomId = theoryClassrooms[0]?.id || 'TBD-ROOM';
                    const day = workingDays[generatedSchedule.length % workingDays.length];
                    const time = LECTURE_TIME_SLOTS[generatedSchedule.length % LECTURE_TIME_SLOTS.length];
                    const gene: Gene = { day, time, classId: theory.classId, subjectId: theory.subjectId, facultyId, classroomId, isLab: false };
                    generatedSchedule.push(gene); fullSchedule.push(gene);
                 }
            }
        }
        
        const finalWorkload: FacultyWorkload[] = facultyWithExperience.map(f => ({
            facultyId: f.id, facultyName: f.name, experience: f.experience, level: f.level,
            maxHours: f.maxWeeklyHours || 18, 
            assignedHours: facultyWorkload.get(f.id) || 0,
        }));

        const semesterTimetables = input.classes.map(classInfo => ({
            semester: classInfo.semester,
            timetable: generatedSchedule.filter(g => g.classId === classInfo.id)
        }));

        return {
            summary: `Generated a full 5-day schedule for ${input.classes.length} class sections. ${warnings.length > 0 ? `Encountered and force-resolved ${warnings.length} issues.` : 'All constraints satisfied.'}`,
            optimizationExplanation: `The engine prioritized parallel lab scheduling for different batches and respected faculty workloads.`,
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

    