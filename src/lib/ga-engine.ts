
'use server';

import type { GenerateTimetableInput, Schedule, Subject, Faculty } from './lib/types';
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

type Chromosome = Gene[];

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

interface SemesterTimetable {
    semester: number;
    timetable: Chromosome;
}

// --- Helper Functions ---
const getHoursForSubject = (subject: Subject): number => {
    if (subject.type === 'lab') return 2; // Labs are always 2 continuous hours
    if (subject.weeklyHours) return subject.weeklyHours;

    // Fallback to priority if weeklyHours is not defined
    switch (subject.priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 2;
    }
};

function calculateFacultyExperience(faculty: Faculty[]): (Faculty & { experience: number, level: 'Senior' | 'Mid-Level' | 'Junior' })[] {
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
            const hours = getHoursForSubject(sub);
            if (sub.type === 'lab') {
                lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, hours: 2 });
            } else {
                for (let i = 0; i < hours; i++) {
                    lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: false, hours: 1 });
                }
            }
        }
    }
    lectures.sort((a, b) => (b.isLab ? 1 : 0) - (a.isLab ? 1 : 0));
    return lectures;
}

function runPreChecks(lectures: LectureToBePlaced[], input: GenerateTimetableInput, workingDays: string[]): string | null {
    // Total slots check
    const totalRequiredSlots = lectures.reduce((sum, l) => sum + l.hours, 0);
    const totalAvailableSlots = workingDays.length * input.timeSlots.length * input.classes.length;
    if (totalRequiredSlots > totalAvailableSlots) {
        return `Timetable cannot be generated because required slots (${totalRequiredSlots}) exceed available slots (${totalAvailableSlots}).`;
    }
    
    // Faculty assignment check
    for (const classToSchedule of input.classes) {
        const subjectsForClass = input.subjects.filter(s => s.departmentId === classToSchedule.departmentId && s.semester === classToSchedule.semester);
        for (const sub of subjectsForClass) {
            const hasFaculty = input.faculty.some(f => f.allottedSubjects?.includes(sub.id));
            if (!hasFaculty) {
                return `Constraint Error: Subject '${sub.name}' has no assigned faculty.`;
            }
        }
    }
    
    return null;
}

// --- Main Engine ---
export async function runGA(input: GenerateTimetableInput) {
    try {
        if (!input.classes || input.classes.length === 0) {
            return { summary: "No classes provided for timetable generation.", facultyWorkload: [], semesterTimetables: [], codeChefDay: "N/A", error: "Input Error: No classes were provided to the engine." };
        }
        
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const codeChefDay = allDays[Math.floor(Math.random() * allDays.length)];
        const workingDays = allDays.filter(d => d !== codeChefDay);

        const lecturesToPlace = createLectureList(input);

        const impossibilityReason = runPreChecks(lecturesToPlace, input, workingDays);
        if (impossibilityReason) {
            return { summary: "Timetable generation failed due to unmet constraints.", facultyWorkload: [], semesterTimetables: [], codeChefDay: codeChefDay, error: impossibilityReason };
        }
        
        const facultyWithExperience = calculateFacultyExperience(input.faculty);
        let facultyWorkload: FacultyWorkload[] = facultyWithExperience.map(f => ({
            facultyId: f.id,
            facultyName: f.name,
            experience: f.experience,
            level: f.level,
            maxHours: f.maxWeeklyHours || 18,
            assignedHours: 0,
        }));
        
        let semesterTimetables: SemesterTimetable[] = input.classes.map(c => ({
            semester: c.semester,
            timetable: []
        }));

        let schedule: Gene[] = [];

        // This is a placeholder for a complex deterministic or heuristic algorithm
        // For now, it will do a basic greedy assignment.
        const classLectures = lecturesToPlace.filter(l => input.classes.some(c => c.id === l.classId));
        
        for (const lecture of classLectures) {
            let placed = false;
            for (const day of workingDays) {
                for (const time of input.timeSlots) {
                    const expertFaculty = facultyWithExperience.filter(f => f.allottedSubjects?.includes(lecture.subjectId));
                    for (const faculty of expertFaculty) {
                        const workload = facultyWorkload.find(fw => fw.facultyId === faculty.id);
                        if (!workload || workload.assignedHours >= workload.maxHours) continue;

                        const availableClassrooms = input.classrooms.filter(c => c.type === (lecture.isLab ? 'lab' : 'classroom'));
                        for (const classroom of availableClassrooms) {
                            const isConflict = schedule.some(s => s.day === day && s.time === time && (s.facultyId === faculty.id || s.classroomId === classroom.id || s.classId === lecture.classId));
                            
                            if (!isConflict) {
                                const newGene: Gene = { day, time, classId: lecture.classId, subjectId: lecture.subjectId, facultyId: faculty.id, classroomId: classroom.id, isLab: lecture.isLab };
                                schedule.push(newGene);
                                workload.assignedHours += 1;
                                
                                const semesterTimetable = semesterTimetables.find(st => st.semester === input.classes.find(c => c.id === lecture.classId)?.semester);
                                semesterTimetable?.timetable.push(newGene);
                                
                                placed = true;
                                break;
                            }
                        }
                        if (placed) break;
                    }
                    if (placed) break;
                }
                if (placed) break;
            }
        }

        return {
            summary: "Timetable generated using a rule-based deterministic approach.",
            facultyWorkload,
            semesterTimetables,
            codeChefDay,
        };

    } catch (e: any) {
        console.error(`[TimeWise Engine] Fatal Error:`, e);
        return {
            summary: "Fatal error during timetable generation.",
            facultyWorkload: [],
            semesterTimetables: [],
            codeChefDay: 'N/A',
            error: e.message || 'An unhandled exception occurred in the engine.'
        };
    }
}
