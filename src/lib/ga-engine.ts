
'use server';

import type { GenerateTimetableInput, SubjectPriority, Class, Subject, Faculty, Classroom, Schedule } from './types';

// --- Configuration ---
const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MAX_CONSECUTIVE_THEORY = 2;

// --- Data Structures ---
interface SubjectRequirement {
    subjectId: string;
    classId: string;
    hours: number;
    isLab: boolean;
    priority: number;
}

interface Slot {
    day: string;
    time: string;
    classId: string;
    subjectId?: string;
    facultyId?: string;
    classroomId?: string;
    isLabSession: boolean;
}

// --- Helper Functions ---
const getHoursForPriority = (priority?: SubjectPriority): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 3;
    }
};

const getPriorityValue = (priority?: SubjectPriority): number => {
    switch (priority) {
        case 'Non Negotiable': return 4;
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 0;
    }
};

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Main Scheduling Engine ---
export async function generateTimetable(input: Omit<GenerateTimetableInput, 'existingSchedule'>) {
    const { classes, subjects, faculty, classrooms } = input;
    
    // Select one random day as CodeChef Day
    const codeChefDay = WORKING_DAYS[Math.floor(Math.random() * WORKING_DAYS.length)];
    const scheduleDays = WORKING_DAYS.filter(day => day !== codeChefDay);
    const timeSlots = input.timeSlots.filter(t => t !== '09:20-09:30' && t !== '11:20-12:20');

    // 1. Create a list of all required lectures (subject requirements)
    const subjectRequirements: SubjectRequirement[] = [];
    classes.forEach(cls => {
        subjects
            .filter(sub => sub.department === cls.department && sub.semester === cls.semester)
            .forEach(sub => {
                subjectRequirements.push({
                    subjectId: sub.id,
                    classId: cls.id,
                    hours: getHoursForPriority(sub.priority),
                    isLab: sub.type === 'lab',
                    priority: getPriorityValue(sub.priority),
                });
            });
    });
    // Sort by priority (descending)
    subjectRequirements.sort((a, b) => b.priority - a.priority);

    // 2. Section-wise Slot Planning
    let sectionTimetables = new Map<string, Slot[]>(); // classId -> slots
    let impossibilityReason: string | null = null;

    for (const cls of classes) {
        const classRequirements = subjectRequirements.filter(req => req.classId === cls.id);
        const classSlots: Slot[] = [];
        
        const availableSlots: { day: string, time: string }[] = [];
        scheduleDays.forEach(day => timeSlots.forEach(time => availableSlots.push({ day, time })));
        shuffleArray(availableSlots);

        // Place labs first (2 consecutive slots)
        for (const req of classRequirements.filter(r => r.isLab)) {
            for (let h = 0; h < req.hours / 2; h++) { // Labs are in 2-hour blocks
                let placed = false;
                for (let i = 0; i < availableSlots.length - 1; i++) {
                    const slot1 = availableSlots[i];
                    const slot2 = availableSlots[i + 1];
                    const timeIndex1 = timeSlots.indexOf(slot1.time);
                    const timeIndex2 = timeSlots.indexOf(slot2.time);

                    if (slot1.day === slot2.day && timeIndex2 === timeIndex1 + 1) {
                        classSlots.push({ day: slot1.day, time: slot1.time, classId: cls.id, subjectId: req.subjectId, isLabSession: true });
                        classSlots.push({ day: slot2.day, time: slot2.time, classId: cls.id, subjectId: req.subjectId, isLabSession: true });
                        
                        // Remove placed slots
                        availableSlots.splice(i, 2);
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    impossibilityReason = `Could not find a 2-hour consecutive slot for lab "${subjects.find(s => s.id === req.subjectId)?.name}" for class ${cls.name}.`;
                    break;
                }
            }
            if (impossibilityReason) break;
        }
        if (impossibilityReason) break;

        // Place theory subjects
        for (const req of classRequirements.filter(r => !r.isLab)) {
            for (let h = 0; h < req.hours; h++) {
                if (availableSlots.length === 0) {
                    impossibilityReason = `Not enough time slots available to schedule all subjects for class ${cls.name}.`;
                    break;
                }
                const slot = availableSlots.pop()!;
                classSlots.push({ day: slot.day, time: slot.time, classId: cls.id, subjectId: req.subjectId, isLabSession: false });
            }
            if (impossibilityReason) break;
        }

        sectionTimetables.set(cls.id, classSlots);
    }
    
    if (impossibilityReason) {
        return { summary: impossibilityReason, generatedSchedule: [], codeChefDay };
    }

    // Combine all section timetables into one master list
    let masterSchedule: Slot[] = Array.from(sectionTimetables.values()).flat();

    // 3. Faculty Assignment
    const facultyWorkload = new Map<string, number>(); // facultyId -> hours
    faculty.forEach(f => facultyWorkload.set(f.id, 0));

    for (const slot of masterSchedule) {
        const subject = subjects.find(s => s.id === slot.subjectId);
        if (!subject) continue;

        const potentialFaculty = faculty.filter(f => 
            f.allottedSubjects.includes(subject.id) &&
            (facultyWorkload.get(f.id) || 0) < (f.maxWeeklyHours || 18)
        );

        if (potentialFaculty.length === 0) {
            impossibilityReason = `No available faculty for subject "${subject.name}". All assigned faculty have reached their max workload.`;
            break;
        }
        
        // Simple assignment for now, can be optimized
        const assignedFaculty = potentialFaculty[0];
        slot.facultyId = assignedFaculty.id;
        facultyWorkload.set(assignedFaculty.id, (facultyWorkload.get(assignedFaculty.id) || 0) + 1);
    }
    
    if (impossibilityReason) {
        return { summary: impossibilityReason, generatedSchedule: [], codeChefDay };
    }
    
    // 4. Classroom Assignment (Final Step)
    const classroomSchedule = new Map<string, string>(); // day-time -> classroomId

    for (const cls of classes) {
        const classSchedule = masterSchedule.filter(s => s.classId === cls.id);
        const days = [...new Set(classSchedule.map(s => s.day))];

        for (const day of days) {
            const daySchedule = classSchedule.filter(s => s.day === day).sort((a, b) => timeSlots.indexOf(a.time) - timeSlots.indexOf(b.time));

            for (let i = 0; i < daySchedule.length; i++) {
                const slot1 = daySchedule[i];
                if (slot1.classroomId) continue; // Already assigned

                const isLab = subjects.find(s => s.id === slot1.subjectId)?.type === 'lab';
                let consecutiveSlots = [slot1];

                // Group consecutive slots
                if (isLab) {
                    if (i + 1 < daySchedule.length && daySchedule[i+1].subjectId === slot1.subjectId) {
                        consecutiveSlots.push(daySchedule[i+1]);
                        i++; // Skip next slot as it's part of the group
                    }
                } else { // Theory
                     if (i + 1 < daySchedule.length && subjects.find(s => s.id === daySchedule[i+1].subjectId)?.type === 'theory') {
                        consecutiveSlots.push(daySchedule[i+1]);
                        i++;
                    }
                }
                
                // Find an available classroom for the group
                const requiredType = isLab ? 'lab' : 'classroom';
                const availableClassrooms = classrooms.filter(room => {
                    if (room.type !== requiredType) return false;
                    // Check if this room is free for all consecutive slots
                    return consecutiveSlots.every(slot => !classroomSchedule.has(`${slot.day}-${slot.time}-${room.id}`));
                });

                if (availableClassrooms.length === 0) {
                     impossibilityReason = `Could not find an available ${requiredType} for class ${cls.name} on ${day} at ${slot1.time}.`;
                     break;
                }
                
                const assignedClassroom = availableClassrooms[0];
                consecutiveSlots.forEach(slot => {
                    slot.classroomId = assignedClassroom.id;
                    classroomSchedule.set(`${slot.day}-${slot.time}-${assignedClassroom.id}`, cls.id);
                });
            }
             if (impossibilityReason) break;
        }
        if (impossibilityReason) break;
    }
    
     if (impossibilityReason) {
        return { summary: impossibilityReason, generatedSchedule: [], codeChefDay };
    }


    const finalSchedule = masterSchedule.map(s => ({
        classId: s.classId,
        subjectId: s.subjectId!,
        facultyId: s.facultyId!,
        classroomId: s.classroomId!,
        day: s.day,
        time: s.time,
    }));

    return {
        summary: `Successfully generated a master timetable for ${classes.length} classes, designating ${codeChefDay} as Code Chef Day.`,
        generatedSchedule: finalSchedule,
        codeChefDay
    };
}
