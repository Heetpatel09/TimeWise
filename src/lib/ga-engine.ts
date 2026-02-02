
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

function createLectureListForClass(allSubjects: GenerateTimetableInput['subjects'], classInfo: Class): LectureToBePlaced[] {
    const lectures: LectureToBePlaced[] = [];
    const classSubjects = allSubjects.filter(s => s.departmentId === classInfo.departmentId && s.semester === classInfo.semester);

    for (const sub of classSubjects) {
        if (sub.id === 'LIB001') continue;

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
): { schedule: Gene[], warnings: string[] } {
    let classSpecificSchedule: Gene[] = [];
    const warnings: string[] = [];
    const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const theoryClassrooms = input.classrooms.filter(c => c.type === 'classroom');
    const labClassrooms = input.classrooms.filter(c => c.type === 'lab');
    
    // Assign a consistent "home room" for the class's theory lectures
    const homeClassroom = theoryClassrooms.find(c => !fullSchedule.some(s => s.classroomId === c.id && s.classId !== classToSchedule.id)) || theoryClassrooms[0];
    if (!homeClassroom) {
        warnings.push(`No available theory classroom for ${classToSchedule.name}`);
        return { schedule: [], warnings };
    }
        
    const lecturesToPlace = createLectureListForClass(input.subjects, classToSchedule);

    const labsBySubject = lecturesToPlace
        .filter(l => l.isLab)
        .reduce((acc, l) => {
            if (!acc[l.subjectId]) acc[l.subjectId] = [];
            acc[l.subjectId].push(l);
            return acc;
        }, {} as Record<string, LectureToBePlaced[]>);
    
    const theoriesToPlace = lecturesToPlace.filter(l => !l.isLab);

    // --- 1. Place Lab Pairs ---
    for (const subjectId in labsBySubject) {
        const batch1Lab = labsBySubject[subjectId].find(l => l.batch === 'Batch-1');
        const batch2Lab = labsBySubject[subjectId].find(l => l.batch === 'Batch-2');

        if (!batch1Lab || !batch2Lab) {
            warnings.push(`Incomplete lab batches for ${input.subjects.find(s=>s.id === subjectId)?.name}.`);
            continue;
        }

        let pairPlaced = false;
        const facultyForSub = subjectToFacultyMap.get(subjectId) || [];
        
        for (const day of [...workingDays].sort(() => Math.random() - 0.5)) {
            if (pairPlaced) break;
            for (const [time1, time2] of [...LAB_TIME_PAIRS].sort(() => Math.random() - 0.5)) {
                if (pairPlaced) break;
                
                if (fullSchedule.some(g => g.classId === classToSchedule.id && g.day === day && (g.time === time1 || g.time === time2))) continue;

                const availableRooms = labClassrooms.filter(r => 
                    !fullSchedule.some(g => g.classroomId === r.id && g.day === day && (g.time === time1 || g.time === time2))
                );
                
                const availableFaculty = facultyForSub.filter(fId => 
                    !fullSchedule.some(g => g.facultyId === fId && g.day === day && (g.time === time1 || g.time === time2)) && 
                    ((facultyWorkload.get(fId) || 0) + 2 <= (input.faculty.find(f => f.id === fId)?.maxWeeklyHours || 18))
                );

                if (availableRooms.length >= 2 && availableFaculty.length >= 2) {
                    const room1 = availableRooms[0];
                    const room2 = availableRooms[1];
                    const fac1 = availableFaculty[0];
                    const fac2 = availableFaculty[1];
                    
                    const genesB1 = [{ day, time: time1, ...batch1Lab, facultyId: fac1, classroomId: room1.id }, { day, time: time2, ...batch1Lab, facultyId: fac1, classroomId: room1.id }];
                    const genesB2 = [{ day, time: time1, ...batch2Lab, facultyId: fac2, classroomId: room2.id }, { day, time: time2, ...batch2Lab, facultyId: fac2, classroomId: room2.id }];

                    classSpecificSchedule.push(...genesB1, ...genesB2);
                    facultyWorkload.set(fac1, (facultyWorkload.get(fac1) || 0) + 2);
                    facultyWorkload.set(fac2, (facultyWorkload.get(fac2) || 0) + 2);
                    pairPlaced = true;
                }
            }
        }
        
        if (!pairPlaced) {
            warnings.push(`Could not schedule labs for ${input.subjects.find(s=>s.id === subjectId)?.name} of ${classToSchedule.name}. Not enough resources for parallel sessions.`);
        }
    }

    // --- 2. Place Theories ---
    for (const lecture of theoriesToPlace) {
        let placed = false;
        const facultyId = (subjectToFacultyMap.get(lecture.subjectId) || [])[0];
        if (!facultyId) {
            warnings.push(`No faculty for ${input.subjects.find(s=>s.id === lecture.subjectId)?.name}.`);
            continue;
        }

        if ((facultyWorkload.get(facultyId) || 0) + 1 > (input.faculty.find(f => f.id === facultyId)?.maxWeeklyHours || 18)) continue;

        for (const day of [...workingDays].sort(() => Math.random() - 0.5)) {
            if (placed) break;
            for (const time of [...LECTURE_TIME_SLOTS].sort(() => Math.random() - 0.5)) {
                if (placed) break;

                const isConflict = fullSchedule.some(g => g.day === day && g.time === time && (g.facultyId === facultyId || g.classroomId === homeClassroom.id || g.classId === lecture.classId));
                
                if (!isConflict) {
                    const gene = { day, time, ...lecture, facultyId, classroomId: homeClassroom.id };
                    classSpecificSchedule.push(gene);
                    facultyWorkload.set(facultyId, (facultyWorkload.get(facultyId) || 0) + 1);
                    placed = true;
                }
            }
        }
        if (!placed) {
            warnings.push(`Could not schedule a theory slot for ${input.subjects.find(s => s.id === lecture.subjectId)?.name}.`);
        }
    }
    
    // --- 3. Fill remaining with Library ---
    for(const day of workingDays) {
        for(const time of LECTURE_TIME_SLOTS) {
            const isSlotFilled = classSpecificSchedule.some(g => g.day === day && g.time === time);
            if (!isSlotFilled) {
                const libraryGene: Gene = { day, time, classId: classToSchedule.id, subjectId: 'LIB001', facultyId: 'FAC_LIB', classroomId: 'CR_LIB', isLab: false };
                classSpecificSchedule.push(libraryGene);
            }
        }
    }

    return { schedule: classSpecificSchedule, warnings };
}


export async function runGA(input: GenerateTimetableInput): Promise<GenerateTimetableOutput> {
    const warnings: string[] = [];
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
    input.existingSchedule?.forEach(s => {
        if(s.subjectId !== 'LIB001') {
            facultyWorkload.set(s.facultyId, (facultyWorkload.get(s.facultyId) || 0) + 1);
        }
    });

    const departmentClasses = input.classes.filter(c => c.departmentId === input.departments?.[0].id);

    // Group classes by semester
    const classesBySemester = departmentClasses.reduce((acc, c) => {
        if (!acc[c.semester]) acc[c.semester] = [];
        acc[c.semester].push(c);
        return acc;
    }, {} as Record<number, Class[]>);

    const classTimetables: GenerateTimetableOutput['classTimetables'] = [];

    // Generate timetable iteratively for each class
    for (const semester in classesBySemester) {
        for (const classInfo of classesBySemester[semester]) {
            const { schedule, warnings: classWarnings } = generateForSingleClass(classInfo, fullSchedule, input, facultyWorkload, subjectToFacultyMap);
            warnings.push(...classWarnings);
            fullSchedule.push(...schedule); // Add generated schedule to the master list for conflict checking next class
            classTimetables.push({
                classId: classInfo.id,
                className: classInfo.name,
                timetable: schedule.map(g => ({
                    day: g.day, time: g.time, classId: g.classId, subjectId: g.subjectId, facultyId: g.facultyId, classroomId: g.classroomId, batch: g.batch, isLab: g.isLab
                }))
            });
        }
    }
    
    const facultyWithExperience = (input.faculty || []).map(f => {
        const experience = f.dateOfJoining ? differenceInYears(new Date(), parseISO(f.dateOfJoining)) : 0;
        let level: 'Senior' | 'Mid-Level' | 'Junior';
        if (experience >= 7) level = 'Senior';
        else if (experience >= 3) level = 'Junior';
        else level = 'Mid-Level';
        return { ...f, experience, level };
    });

    const finalWorkload: FacultyWorkload[] = facultyWithExperience.map(f => ({
        facultyId: f.id, facultyName: f.name, experience: f.experience, level: f.level,
        maxHours: f.maxWeeklyHours || 18, 
        assignedHours: facultyWorkload.get(f.id) || 0,
    }));

    return {
        summary: `Generated timetable for ${classTimetables.length} sections. ${warnings.length > 0 ? `Encountered ${warnings.length} issues.` : 'All constraints satisfied.'}`,
        optimizationExplanation: `A consistent schedule was generated for all sections in the department. The engine prioritizes labs, then theory, and fills all remaining slots with library time.`,
        facultyWorkload: finalWorkload,
        classTimetables,
    };
}
