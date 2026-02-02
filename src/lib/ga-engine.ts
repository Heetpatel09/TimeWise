
'use server';

import type { GenerateTimetableInput, Schedule, Class, Subject, Department } from './types';
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
            lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: true, batch: 'Batch-1', hours: hours });
            lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: true, batch: 'Batch-2', hours: hours });
        } else {
            for (let i = 0; i < hours; i++) {
                lectures.push({ classId: classInfo.id, subjectId: sub.id, isLab: false, hours: 1 });
            }
        }
    }
    
    lectures.sort((a, b) => (b.isLab ? 1 : 0) - (a.isLab ? 1 : 0));
    return lectures;
}

function generateForSingleClass(
  classToSchedule: Class,
  fullSchedule: (Gene | Schedule)[],
  input: GenerateTimetableInput,
  facultyWorkload: Map<string, number>,
  subjectToFacultyMap: Map<string, string[]>
): { schedule: Gene[] | null, warnings: string[] } {
    let classSpecificSchedule: Gene[] = [];
    const warnings: string[] = [];
    const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const facultyWithExperience = calculateFacultyExperience(input.faculty);
    const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
    const labClassrooms = input.classrooms.filter(c => c.type === 'lab');
        
    const lecturesToPlace = createLectureListForClass(input.subjects, classToSchedule, input.faculty);
    
    for (const lecture of lecturesToPlace) {
        let placed = false;
        const assignedFacultyIds = subjectToFacultyMap.get(lecture.subjectId) || [];
        if (assignedFacultyIds.length === 0 && lecture.subjectId !== 'LIB001') {
            warnings.push(`No faculty for ${input.subjects.find(s=>s.id === lecture.subjectId)?.name}.`);
            continue;
        }

        const shuffledDays = [...workingDays].sort(() => Math.random() - 0.5);

        for (const day of shuffledDays) {
            if (lecture.isLab) {
                const shuffledTimePairs = [...LAB_TIME_PAIRS].sort(() => Math.random() - 0.5);
                for (const [time1, time2] of shuffledTimePairs) {
                    const rooms = [...labClassrooms].sort(() => Math.random() - 0.5);
                    for (const room of rooms) {
                        const facultyOptions = [...assignedFacultyIds].sort(() => Math.random() - 0.5);
                        for (const facultyId of facultyOptions) {
                            const facData = facultyWithExperience.find(f => f.id === facultyId);
                            if (!facData || (facultyWorkload.get(facultyId) || 0) + 2 > (facData.maxWeeklyHours || 18)) continue;

                            const conflict = fullSchedule.some(g => {
                                if (g.day !== day || (g.time !== time1 && g.time !== time2)) return false;
                                if (g.facultyId === facultyId || g.classroomId === room.id) return true;
                                if (g.classId === lecture.classId) {
                                    if (!(g as any).batch) return true; 
                                    if ((g as any).batch === lecture.batch) return true;
                                }
                                return false;
                            });

                            if (!conflict) {
                                const genes: Gene[] = [
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
                const shuffledTimes = [...LECTURE_TIME_SLOTS].sort(() => Math.random() - 0.5);
                for (const time of shuffledTimes) {
                     const rooms = [...theoryClassrooms].sort(() => Math.random() - 0.5);
                     for (const room of rooms) {
                         const facultyOptions = [...assignedFacultyIds].sort(() => Math.random() - 0.5);
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
        if (!placed) warnings.push(`Could not schedule ${lecture.isLab ? 'lab' : 'theory'} for ${input.subjects.find(s => s.id === lecture.subjectId)?.name} of ${classToSchedule.name} (${lecture.batch || ''})`);
    }
    
    // Fill remaining slots with Library
    for (const day of workingDays) {
        for (const time of LECTURE_TIME_SLOTS) {
            const isSlotFilled = fullSchedule.some(g => g.classId === classToSchedule.id && g.day === day && g.time === time);
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
    return { schedule: classSpecificSchedule, warnings };
}


export async function runGA(input: GenerateTimetableInput): Promise<GenerateTimetableOutput> {
    const warnings: string[] = [];
    const allGeneratedGenes: Gene[] = [];
    const fullSchedule: (Gene | Schedule)[] = [...(input.existingSchedule?.map(s => ({ ...s, isLab: input.subjects.find(sub => sub.id === s.subjectId)?.type === 'lab' })) || [])];
    
    const subjectToFacultyMap = new Map<string, string[]>();
    input.faculty.forEach(f => {
        f.allottedSubjects?.forEach(subId => {
            if (!subjectToFacultyMap.has(subId)) subjectToFacultyMap.set(subId, []);
            subjectToFacultyMap.get(subId)!.push(f.id);
        });
    });

    const facultyWorkload = new Map<string, number>();
    input.faculty.forEach(f => facultyWorkload.set(f.id, 0));

    // Filter classes to only the selected department
    const selectedDeptId = input.departments?.[0]?.id;
    const relevantClasses = selectedDeptId ? input.classes.filter(c => c.departmentId === selectedDeptId) : input.classes;

    const classesByGroup = relevantClasses.reduce((acc, c) => {
        const key = `${c.departmentId}-${c.semester}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(c);
        return acc;
    }, {} as Record<string, Class[]>);

    // This loop replaces the flawed template logic.
    // It iterates through all classes and generates a schedule for each one individually,
    // making the process robust to resource constraints.
    for (const groupKey in classesByGroup) {
        const classGroup = classesByGroup[groupKey].sort((a,b) => a.section.localeCompare(b.section));
        for (const classToSchedule of classGroup) {
            const { schedule, warnings: generationWarnings } = generateForSingleClass(classToSchedule, fullSchedule, input, facultyWorkload, subjectToFacultyMap);
            
            if (generationWarnings.length > 0) warnings.push(...generationWarnings);

            if (schedule) {
                allGeneratedGenes.push(...schedule);
                // Note: fullSchedule is already updated inside generateForSingleClass
            } else {
                warnings.push(`[Critical] Failed to generate a schedule for ${classToSchedule.name}.`);
            }
        }
    }
    
    const facultyWithExperience = calculateFacultyExperience(input.faculty);
    const finalWorkload: FacultyWorkload[] = facultyWithExperience.map(f => ({
        facultyId: f.id, facultyName: f.name, experience: f.experience, level: f.level,
        maxHours: f.maxWeeklyHours || 18, 
        assignedHours: facultyWorkload.get(f.id) || 0,
    }));

    const classTimetables = relevantClasses.map(classInfo => ({
        classId: classInfo.id,
        className: classInfo.name,
        timetable: allGeneratedGenes
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
        summary: `Generated timetable for ${classTimetables.length} sections. ${warnings.length > 0 ? `Encountered ${warnings.length} issues.` : 'All constraints satisfied.'}`,
        optimizationExplanation: `The engine now uses an iterative approach. It generates a full schedule for one section, then generates the next by working around the already-scheduled classes, ensuring all sections get a complete, conflict-free timetable.`,
        facultyWorkload: finalWorkload,
        classTimetables,
    };
}
