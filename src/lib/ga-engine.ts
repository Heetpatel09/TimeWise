
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
            // A lab subject gets ONE 2-hour session per week. This means 2 genes.
            labLectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, facultyId: facultyId, priorityValue });
            labLectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, facultyId: facultyId, priorityValue });
        } else {
            const hours = getHoursForPriority(sub.priority);
            for (let i = 0; i < hours; i++) {
                theoryLectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: false, facultyId: facultyId, priorityValue });
            }
        }
    });

    // Sort by priority to attempt placing more important lectures first
    theoryLectures.sort((a, b) => b.priorityValue - a.priorityValue);
    labLectures.sort((a, b) => b.priorityValue - a.priorityValue);

    return { theoryLectures, labLectures };
}


export async function runGA(input: GenerateTimetableInput) {
    const { theoryLectures, labLectures } = createLectureList(input);
    const lectureSlots = input.timeSlots;
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Designate CodeChef day
    const codeChefDayIndex = Math.floor(Math.random() * allDays.length);
    const codeChefDay = allDays.splice(codeChefDayIndex, 1)[0];
    const workingDays = allDays;
    
    let finalSchedule: Gene[] = [];
    
    const facultyTimeMap = new Map<string, Set<string>>(); // facultyId -> Set<day-time>
    const classroomTimeMap = new Map<string, Set<string>>(); // classroomId -> Set<day-time>
    const classTimeMap = new Map<string, Set<string>>(); // classId -> Set<day-time>
    const classLabDayMap = new Map<string, Set<string>>(); // classId -> Set<day> - One lab per day
    const classSubjectDayCount = new Map<string, number>(); // key: `classId-subjectId-day`, value: count

    // Pre-populate maps with existing schedule
    input.existingSchedule?.forEach(slot => {
        const slotKey = `${slot.day}-${slot.time}`;
        if (!facultyTimeMap.has(slot.facultyId)) facultyTimeMap.set(slot.facultyId, new Set());
        facultyTimeMap.get(slot.facultyId)!.add(slotKey);
        
        if (!classroomTimeMap.has(slot.classroomId)) classroomTimeMap.set(slot.classroomId, new Set());
        classroomTimeMap.get(slot.classroomId)!.add(slotKey);
    });

    // --- Placement Algorithm ---
    const allPossibleSlots = workingDays.flatMap(day => lectureSlots.map(time => ({ day, time })));

    // 1. Place Lab Lectures First
    const labRooms = input.classrooms.filter(c => c.type === 'lab');
    const uniqueLabSubjects = [...new Map(labLectures.map(item => [item.subjectId, item])).values()];

    for (const labLecture of uniqueLabSubjects) {
        let placed = false;
        const consecutiveSlots = [
            ['07:30 AM - 08:30 AM', '08:30 AM - 09:30 AM'],
            ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM'],
            ['01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM'],
        ];

        for (const day of workingDays) {
            if (classLabDayMap.get(labLecture.classId)?.has(day)) continue;

            for (const slotPair of consecutiveSlots) {
                const [time1, time2] = slotPair;
                const slotKey1 = `${day}-${time1}`;
                const slotKey2 = `${day}-${time2}`;

                for (const room of labRooms) {
                    const canPlaceLab =
                        !classTimeMap.get(labLecture.classId)?.has(slotKey1) &&
                        !classTimeMap.get(labLecture.classId)?.has(slotKey2) &&
                        !facultyTimeMap.get(labLecture.facultyId)?.has(slotKey1) &&
                        !facultyTimeMap.get(labLecture.facultyId)?.has(slotKey2) &&
                        !classroomTimeMap.get(room.id)?.has(slotKey1) &&
                        !classroomTimeMap.get(room.id)?.has(slotKey2);

                    if (canPlaceLab) {
                        const gene1: Gene = { ...labLecture, day, time: time1, classroomId: room.id };
                        const gene2: Gene = { ...labLecture, day, time: time2, classroomId: room.id };
                        finalSchedule.push(gene1, gene2);
                        
                        // Update maps
                        if (!classTimeMap.has(labLecture.classId)) classTimeMap.set(labLecture.classId, new Set());
                        classTimeMap.get(labLecture.classId)!.add(slotKey1).add(slotKey2);
                        if (!facultyTimeMap.has(labLecture.facultyId)) facultyTimeMap.set(labLecture.facultyId, new Set());
                        facultyTimeMap.get(labLecture.facultyId)!.add(slotKey1).add(slotKey2);
                        if (!classroomTimeMap.has(room.id)) classroomTimeMap.set(room.id, new Set());
                        classroomTimeMap.get(room.id)!.add(slotKey1).add(slotKey2);
                        if (!classLabDayMap.has(labLecture.classId)) classLabDayMap.set(labLecture.classId, new Set());
                        classLabDayMap.get(labLecture.classId)!.add(day);
                        
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
            if (placed) break;
        }
    }

    // 2. Place Theory Lectures
    const theoryRooms = input.classrooms.filter(c => c.type === 'classroom');
    for (const lecture of theoryLectures) {
        let placed = false;
        for (const { day, time } of allPossibleSlots) {
            const subjectDayKey = `${lecture.classId}-${lecture.subjectId}-${day}`;
            if ((classSubjectDayCount.get(subjectDayKey) || 0) >= 2) {
                continue; // Max 2 slots for same subject on same day
            }
            const slotKey = `${day}-${time}`;
            if (classTimeMap.get(lecture.classId)?.has(slotKey)) continue;

            for (const room of theoryRooms) {
                 const canPlace =
                    !facultyTimeMap.get(lecture.facultyId)?.has(slotKey) &&
                    !classroomTimeMap.get(room.id)?.has(slotKey);
                
                 if (canPlace) {
                    const gene: Gene = { ...lecture, day, time, classroomId: room.id };
                    finalSchedule.push(gene);
                    
                    if (!classTimeMap.has(lecture.classId)) classTimeMap.set(lecture.classId, new Set());
                    classTimeMap.get(lecture.classId)!.add(slotKey);
                    if (!facultyTimeMap.has(lecture.facultyId)) facultyTimeMap.set(lecture.facultyId, new Set());
                    facultyTimeMap.get(lecture.facultyId)!.add(slotKey);
                    if (!classroomTimeMap.has(room.id)) classroomTimeMap.set(room.id, new Set());
                    classroomTimeMap.get(room.id)!.add(slotKey);
                    classSubjectDayCount.set(subjectDayKey, (classSubjectDayCount.get(subjectDayKey) || 0) + 1);

                    placed = true;
                    break;
                }
            }
            if (placed) break;
        }
    }

    const totalRequiredLectures = theoryLectures.length + uniqueLabSubjects.length * 2;
    if (finalSchedule.filter(g => !g.isCodeChef).length < totalRequiredLectures) {
         return { 
            success: false, 
            message: `Could not schedule all required lectures. Failed to place ${totalRequiredLectures - finalSchedule.length} lectures. Please check faculty/classroom availability and constraints.`, 
            bestTimetable: null, 
            generations: 0, 
            fitness: -1, 
            codeChefDay: null 
        };
    }
    
    // 3. Fill remaining with Library slots
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
        message: 'Successfully generated a conflict-free and balanced schedule.', 
        bestTimetable: finalSchedule, 
        generations: 1, 
        fitness: 0, 
        codeChefDay: codeChefDay 
    };
}
