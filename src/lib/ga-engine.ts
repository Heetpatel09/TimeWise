
'use server';

import type { GenerateTimetableInput, SubjectPriority, Class, Subject, Faculty, Classroom, Schedule } from './types';

// --- Data Structures ---
interface Gene {
    day: string;
    time: string;
    classId: string;
    subjectId: string;
    facultyId: string;
    classroomId: string;
    isLab: boolean;
    isCodeChef?: boolean;
    batch?: 'A' | 'B';
}

interface Lecture {
    classId: string;
    subjectId: string;
    isLab: boolean;
    facultyId: string;
    batch?: 'A' | 'B';
    priorityValue: number; // Added for sorting
    isDouble: boolean; // For consecutive lab slots
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
        default: return 2;
    }
};

function getFacultyForSubject(subjectId: string, facultyList: Faculty[]): string | null {
    const assignedFaculty = facultyList.find(f => f.allottedSubjects?.includes(subjectId));
    return assignedFaculty?.id || null;
}


function createLectureList(input: GenerateTimetableInput): Lecture[] {
    const lectures: Lecture[] = [];
    const classToSchedule = input.classes[0]; 
    
    const classSubjects = input.subjects.filter(s => s.semester === classToSchedule.semester && s.department === classToSchedule.department);

    classSubjects.forEach(sub => {
        const facultyId = getFacultyForSubject(sub.id, input.faculty);
        if (!facultyId) {
            console.warn(`Skipping subject ${sub.name} as no faculty is assigned.`);
            return;
        }
        const priorityValue = getPriorityValue(sub.priority);

        if (sub.type === 'lab') {
            // A lab is 2 hours (2 slots). This represents ONE 2-hour session for the subject.
            // We push one item marked as 'isDouble' to signal the placement algorithm.
            lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, facultyId: facultyId, batch: 'A', priorityValue, isDouble: true });
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: false, facultyId: facultyId, priorityValue, isDouble: false });
            }
        }
    });

    // Sort by labs first, then by priority (higher value first)
    lectures.sort((a, b) => {
        if (a.isLab && !b.isLab) return -1;
        if (!a.isLab && b.isLab) return 1;
        return b.priorityValue - a.priorityValue;
    });

    return lectures;
}


export async function runGA(input: GenerateTimetableInput) {
    let lectureQueue = createLectureList(input);
    const lectureSlots = input.timeSlots;
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // 1. Setup Environment
    const codeChefDay = allDays[Math.floor(Math.random() * allDays.length)];
    const workingDays = allDays.filter(d => d !== codeChefDay);
    const finalSchedule: Gene[] = [];
    
    const facultyTimeMap = new Map<string, Set<string>>(); // key: facultyId, value: Set<day-time>
    const classroomTimeMap = new Map<string, Set<string>>(); // key: classroomId, value: Set<day-time>
    const classTimeMap = new Map<string, Set<string>>(); // key: classId, value: Set<day-time>
    
    input.existingSchedule?.forEach(slot => {
        const slotKey = `${slot.day}-${slot.time}`;
        if (!facultyTimeMap.has(slot.facultyId)) facultyTimeMap.set(slot.facultyId, new Set());
        facultyTimeMap.get(slot.facultyId)!.add(slotKey);
        
        if (!classroomTimeMap.has(slot.classroomId)) classroomTimeMap.set(slot.classroomId, new Set());
        classroomTimeMap.get(slot.classroomId)!.add(slotKey);
    });

    // 2. Main Placement Loop
    let attempts = 0;
    const MAX_ATTEMPTS = 50000;
    while(lectureQueue.length > 0 && attempts < MAX_ATTEMPTS) {
        const lecture = lectureQueue.shift()!;
        attempts++;
        let placed = false;
        
        if (lecture.isDouble) { // Handle 2-hour lab placement
            const labRooms = input.classrooms.filter(c => c.type === 'lab');
            if (labRooms.length === 0) continue;

            const consecutiveSlots = [
                ['07:30 AM - 08:30 AM', '08:30 AM - 09:30 AM'],
                ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM'],
                ['01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM'],
            ];

            for (const day of workingDays) {
                for (const slotPair of consecutiveSlots) {
                    const time1 = slotPair[0];
                    const time2 = slotPair[1];
                    const slotKey1 = `${day}-${time1}`;
                    const slotKey2 = `${day}-${time2}`;

                    const classBusy = classTimeMap.get(lecture.classId)?.has(slotKey1) || classTimeMap.get(lecture.classId)?.has(slotKey2);
                    if (classBusy) continue;
                    
                    const facultyBusy = facultyTimeMap.get(lecture.facultyId)?.has(slotKey1) || facultyTimeMap.get(lecture.facultyId)?.has(slotKey2);
                    if (facultyBusy) continue;
                    
                    // Place Batch A and B in different lab rooms if possible, or the same if only one is available
                    const availableRoomA = labRooms.find(r => !classroomTimeMap.get(r.id)?.has(slotKey1) && !classroomTimeMap.get(r.id)?.has(slotKey2));
                    const availableRoomB = labRooms.find(r => r.id !== availableRoomA?.id && !classroomTimeMap.get(r.id)?.has(slotKey1) && !classroomTimeMap.get(r.id)?.has(slotKey2)) || availableRoomA;

                    if (availableRoomA && availableRoomB) {
                        const geneA1: Gene = { ...lecture, batch: 'A', day, time: time1, classroomId: availableRoomA.id, isDouble: true };
                        const geneA2: Gene = { ...lecture, batch: 'A', day, time: time2, classroomId: availableRoomA.id, isDouble: true };
                        const geneB1: Gene = { ...lecture, batch: 'B', day, time: time1, classroomId: availableRoomB.id, isDouble: true };
                        const geneB2: Gene = { ...lecture, batch: 'B', day, time: time2, classroomId: availableRoomB.id, isDouble: true };

                        finalSchedule.push(geneA1, geneA2, geneB1, geneB2);

                        // Mark slots as busy for the class and faculty
                        if (!classTimeMap.has(lecture.classId)) classTimeMap.set(lecture.classId, new Set());
                        classTimeMap.get(lecture.classId)!.add(slotKey1).add(slotKey2);
                        
                        if (!facultyTimeMap.has(lecture.facultyId)) facultyTimeMap.set(lecture.facultyId, new Set());
                        facultyTimeMap.get(lecture.facultyId)!.add(slotKey1).add(slotKey2);

                        // Mark slots as busy for classrooms
                        if (!classroomTimeMap.has(availableRoomA.id)) classroomTimeMap.set(availableRoomA.id, new Set());
                        classroomTimeMap.get(availableRoomA.id)!.add(slotKey1).add(slotKey2);
                        if (!classroomTimeMap.has(availableRoomB.id)) classroomTimeMap.set(availableRoomB.id, new Set());
                        classroomTimeMap.get(availableRoomB.id)!.add(slotKey1).add(slotKey2);
                        
                        placed = true;
                        break; // Exit slotPair loop
                    }
                }
                if (placed) break; // Exit day loop
            }

        } else { // Handle 1-hour theory placement
            const theoryRooms = input.classrooms.filter(c => c.type === 'classroom');
            if(theoryRooms.length === 0) continue;

             for (const day of workingDays) {
                for (const time of lectureSlots) {
                    const slotKey = `${day}-${time}`;

                    if (classTimeMap.get(lecture.classId)?.has(slotKey)) continue;
                    if (facultyTimeMap.get(lecture.facultyId)?.has(slotKey)) continue;
                    
                    const availableRoom = theoryRooms.find(r => !classroomTimeMap.get(r.id)?.has(slotKey));
                    if (availableRoom) {
                        const gene: Gene = { ...lecture, day, time, classroomId: availableRoom.id };
                        finalSchedule.push(gene);

                        if (!classTimeMap.has(lecture.classId)) classTimeMap.set(lecture.classId, new Set());
                        classTimeMap.get(lecture.classId)!.add(slotKey);

                        if (!facultyTimeMap.has(lecture.facultyId)) facultyTimeMap.set(lecture.facultyId, new Set());
                        facultyTimeMap.get(lecture.facultyId)!.add(slotKey);

                        if (!classroomTimeMap.has(availableRoom.id)) classroomTimeMap.set(availableRoom.id, new Set());
                        classroomTimeMap.get(availableRoom.id)!.add(slotKey);

                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
        }
        
        if (!placed) {
            lectureQueue.push(lecture); // Add back to try again
        }
    }

    if (lectureQueue.length > 0) {
        return { success: false, message: `Could not schedule all required lectures. Failed to place ${lectureQueue.length} lectures. Please check constraints (e.g., faculty availability, classroom availability).`, bestTimetable: null, generations: 0, fitness: -1, codeChefDay: null };
    }

    // 3. Fill remaining slots with Library
    const TOTAL_WEEKLY_SLOTS = workingDays.length * lectureSlots.length;
    const LIBRARY_SLOTS = 3;
    const expectedAcademicSlots = TOTAL_WEEKLY_SLOTS - LIBRARY_SLOTS;

    // We take the schedule as is, and fill the blanks
    const openSlots: {day: string, time: string}[] = [];
    workingDays.forEach(day => {
        lectureSlots.forEach(time => {
            const isFilled = finalSchedule.some(g => g.day === day && g.time === time && g.classId === input.classes[0].id);
            if (!isFilled) {
                openSlots.push({ day, time });
            }
        });
    });

    for (let i = 0; i < LIBRARY_SLOTS && i < openSlots.length; i++) {
        const { day, time } = openSlots[i];
         finalSchedule.push({
            day, time,
            classId: input.classes[0].id,
            subjectId: 'LIB001', // Special ID for Library
            facultyId: 'NA', classroomId: 'NA',
            isLab: false,
        });
    }

    return { 
        success: true, 
        message: 'Successfully generated a conflict-free schedule.', 
        bestTimetable: finalSchedule, 
        generations: attempts, 
        fitness: 0, 
        codeChefDay: codeChefDay 
    };
}
