
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
            // A lab is 2 hours. We add two genes per batch.
            const labHours = 2;
            for(let i=0; i<labHours; i++){
                lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, facultyId: facultyId, batch: 'A', priorityValue });
                lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, facultyId: facultyId, batch: 'B', priorityValue });
            }
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                lectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: false, facultyId: facultyId, priorityValue });
            }
        }
    });

    // Sort by priority (higher value first) and then by lab status (labs first)
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
    const allDays = input.days;
    
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
    while(lectureQueue.length > 0 && attempts < 50000) {
        const lecture = lectureQueue.shift()!;
        attempts++;

        let placed = false;
        
        if (lecture.isLab) {
            const labRooms = input.classrooms.filter(c => c.type === 'lab');
            if (labRooms.length === 0) continue; // Skip if no lab rooms

            // Find a 2-hour consecutive slot
            for (const day of workingDays) {
                for (let i = 0; i < lectureSlots.length - 1; i++) {
                    const time1 = lectureSlots[i];
                    const time2 = lectureSlots[i+1];
                    const slotKey1 = `${day}-${time1}`;
                    const slotKey2 = `${day}-${time2}`;

                    const classBusy = classTimeMap.get(lecture.classId)?.has(slotKey1) || classTimeMap.get(lecture.classId)?.has(slotKey2);
                    if (classBusy) continue;
                    
                    const facultyBusy = facultyTimeMap.get(lecture.facultyId)?.has(slotKey1) || facultyTimeMap.get(lecture.facultyId)?.has(slotKey2);
                    if (facultyBusy) continue;
                    
                    const availableRoom = labRooms.find(r => !classroomTimeMap.get(r.id)?.has(slotKey1) && !classroomTimeMap.get(r.id)?.has(slotKey2));
                    if (availableRoom) {
                        const gene1: Gene = { ...lecture, day, time: time1, classroomId: availableRoom.id };
                        const gene2: Gene = { ...lecture, day, time: time2, classroomId: availableRoom.id };
                        finalSchedule.push(gene1, gene2);

                        if (!classTimeMap.has(lecture.classId)) classTimeMap.set(lecture.classId, new Set());
                        classTimeMap.get(lecture.classId)!.add(slotKey1).add(slotKey2);
                        
                        if (!facultyTimeMap.has(lecture.facultyId)) facultyTimeMap.set(lecture.facultyId, new Set());
                        facultyTimeMap.get(lecture.facultyId)!.add(slotKey1).add(slotKey2);

                        if (!classroomTimeMap.has(availableRoom.id)) classroomTimeMap.set(availableRoom.id, new Set());
                        classroomTimeMap.get(availableRoom.id)!.add(slotKey1).add(slotKey2);

                        // Remove the other part of the lab from the queue
                        const pairIndex = lectureQueue.findIndex(l => l.subjectId === lecture.subjectId && l.batch === lecture.batch);
                        if (pairIndex !== -1) lectureQueue.splice(pairIndex, 1);
                        
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
        } else { // Theory
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

    const academicSlotsCount = finalSchedule.filter(s => s.subjectId !== 'LIB001' && !s.isCodeChef).length;
    if (academicSlotsCount < 21) {
        return { success: false, message: `Could not schedule all required lectures. Only placed ${academicSlotsCount} out of 21. Please check constraints (e.g., faculty availability, classroom availability).`, bestTimetable: null, generations: 0, fitness: -1, codeChefDay: null };
    }
    
    // 3. Fill remaining slots with Library
    const openSlots: {day: string, time: string}[] = [];
    workingDays.forEach(day => {
        lectureSlots.forEach(time => {
            const isFilled = finalSchedule.some(g => g.day === day && g.time === time);
            if (!isFilled) {
                openSlots.push({ day, time });
            }
        });
    });

    for (let i = 0; i < 3 && i < openSlots.length; i++) {
        const { day, time } = openSlots[i];
         finalSchedule.push({
            day, time,
            classId: input.classes[0].id,
            subjectId: 'LIB001', facultyId: 'NA', classroomId: 'NA',
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
