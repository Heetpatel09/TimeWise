
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
    priorityValue: number; 
    isDouble: boolean; 
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


function createLectureList(input: GenerateTimetableInput): { theoryLectures: Lecture[], labLectures: Lecture[] } {
    const theoryLectures: Lecture[] = [];
    const labLectures: Lecture[] = [];
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
            // Each lab subject gets ONE 2-hour session per week.
            labLectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, facultyId: facultyId, priorityValue, isDouble: true });
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                theoryLectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: false, facultyId: facultyId, priorityValue, isDouble: false });
            }
        }
    });

    theoryLectures.sort((a, b) => b.priorityValue - a.priorityValue);
    labLectures.sort((a, b) => b.priorityValue - a.priorityValue);

    return { theoryLectures, labLectures };
}


export async function runGA(input: GenerateTimetableInput) {
    const { theoryLectures, labLectures } = createLectureList(input);
    const lectureSlots = input.timeSlots;
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const codeChefDay = allDays[Math.floor(Math.random() * allDays.length)];
    const workingDays = allDays.filter(d => d !== codeChefDay);
    
    const finalSchedule: Gene[] = [];
    
    const facultyTimeMap = new Map<string, Set<string>>();
    const classroomTimeMap = new Map<string, Set<string>>();
    const classTimeMap = new Map<string, Set<string>>();
    const classLabDayMap = new Map<string, Set<string>>(); // Tracks days a class already has a lab
    
    input.existingSchedule?.forEach(slot => {
        const slotKey = `${slot.day}-${slot.time}`;
        if (!facultyTimeMap.has(slot.facultyId)) facultyTimeMap.set(slot.facultyId, new Set());
        facultyTimeMap.get(slot.facultyId)!.add(slotKey);
        
        if (!classroomTimeMap.has(slot.classroomId)) classroomTimeMap.set(slot.classroomId, new Set());
        classroomTimeMap.get(slot.classroomId)!.add(slotKey);
    });

    let lectureQueue: Lecture[] = [...theoryLectures, ...labLectures];
    let placedLectures: Lecture[] = [];

    const placeLecture = (lecture: Lecture, day: string, time: string, classroomId: string, isSecondHalfOfLab = false) => {
        const slotKey = `${day}-${time}`;
        
        // Conflict checks
        if (classTimeMap.get(lecture.classId)?.has(slotKey)) return false;
        if (facultyTimeMap.get(lecture.facultyId)?.has(slotKey)) return false;
        if (classroomTimeMap.get(classroomId)?.has(slotKey)) return false;

        const gene: Gene = { ...lecture, day, time, classroomId };
        finalSchedule.push(gene);

        if (!classTimeMap.has(lecture.classId)) classTimeMap.set(lecture.classId, new Set());
        classTimeMap.get(lecture.classId)!.add(slotKey);

        if (!facultyTimeMap.has(lecture.facultyId)) facultyTimeMap.set(lecture.facultyId, new Set());
        facultyTimeMap.get(lecture.facultyId)!.add(slotKey);

        if (!classroomTimeMap.has(classroomId)) classroomTimeMap.set(classroomId, new Set());
        classroomTimeMap.get(classroomId)!.add(slotKey);
        
        return true;
    }

    // --- Main Placement Algorithm ---
    const allSlots = workingDays.flatMap(day => lectureSlots.map(time => ({ day, time })));
    let successfulPlacements = 0;
    
    // 1. Place Theory Lectures First
    for (const lecture of theoryLectures) {
        let placed = false;
        const theoryRooms = input.classrooms.filter(c => c.type === 'classroom');

        for (const { day, time } of allSlots) {
             for (const room of theoryRooms) {
                 if (placeLecture(lecture, day, time, room.id)) {
                     placed = true;
                     break;
                 }
             }
             if (placed) break;
        }
        if (placed) successfulPlacements++;
    }

    // 2. Place Lab Lectures
    const labRooms = input.classrooms.filter(c => c.type === 'lab');
    const consecutiveSlots = [
        ['07:30 AM - 08:30 AM', '08:30 AM - 09:30 AM'],
        ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM'],
        ['01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM'],
    ];

    for (const lecture of labLectures) {
         let placed = false;
         for (const day of workingDays) {
            // Constraint: Max one lab per day for a class
            if (classLabDayMap.get(lecture.classId)?.has(day)) continue;

            for (const slotPair of consecutiveSlots) {
                const [time1, time2] = slotPair;
                
                 for (const room of labRooms) {
                     // Check if both slots are free for all resources
                     const slotKey1 = `${day}-${time1}`;
                     const slotKey2 = `${day}-${time2}`;
                     
                     const canPlaceLab =
                        !classTimeMap.get(lecture.classId)?.has(slotKey1) &&
                        !classTimeMap.get(lecture.classId)?.has(slotKey2) &&
                        !facultyTimeMap.get(lecture.facultyId)?.has(slotKey1) &&
                        !facultyTimeMap.get(lecture.facultyId)?.has(slotKey2) &&
                        !classroomTimeMap.get(room.id)?.has(slotKey1) &&
                        !classroomTimeMap.get(room.id)?.has(slotKey2);

                    if (canPlaceLab) {
                        placeLecture(lecture, day, time1, room.id);
                        placeLecture(lecture, day, time2, room.id, true);
                        
                        if (!classLabDayMap.has(lecture.classId)) classLabDayMap.set(lecture.classId, new Set());
                        classLabDayMap.get(lecture.classId)!.add(day);

                        placed = true;
                        break; 
                    }
                 }
                 if(placed) break;
            }
            if(placed) break;
         }
         if (placed) successfulPlacements++;
    }
    
    // Check if all lectures were placed
    const totalRequiredLectures = theoryLectures.length + labLectures.length;
    const placedTheoryCount = finalSchedule.filter(g => !g.isLab).length;
    const placedLabSessions = finalSchedule.filter(g => g.isLab).length / 2; // Each session has 2 genes
    const allPlaced = (placedTheoryCount + placedLabSessions) === totalRequiredLectures;


    if (!allPlaced) {
        const unplacedCount = totalRequiredLectures - (placedTheoryCount + placedLabSessions);
        return { 
            success: false, 
            message: `Could not schedule all required lectures. Failed to place ${unplacedCount} lectures. This may be due to overly restrictive constraints (e.g., not enough faculty or classrooms available).`, 
            bestTimetable: null, 
            generations: 0, 
            fitness: -1, 
            codeChefDay: null 
        };
    }

    // 3. Fill remaining slots with Library
    const LIBRARY_SLOTS = 3;
    let placedLibrarySlots = 0;
    const classId = input.classes[0].id;

    for (const day of workingDays) {
        if (placedLibrarySlots >= LIBRARY_SLOTS) break;
        for (const time of lectureSlots) {
            if (placedLibrarySlots >= LIBRARY_SLOTS) break;
            const slotKey = `${day}-${time}`;
            if (!classTimeMap.get(classId)?.has(slotKey)) {
                 finalSchedule.push({
                    day, time, classId,
                    subjectId: 'LIB001', facultyId: 'NA', classroomId: 'NA',
                    isLab: false,
                });
                if (!classTimeMap.has(classId)) classTimeMap.set(classId, new Set());
                classTimeMap.get(classId)!.add(slotKey);
                placedLibrarySlots++;
            }
        }
    }

    return { 
        success: true, 
        message: 'Successfully generated a conflict-free schedule.', 
        bestTimetable: finalSchedule, 
        generations: 1, 
        fitness: 0, 
        codeChefDay: codeChefDay 
    };
}
