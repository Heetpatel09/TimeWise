
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
    hours: number;
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

        if (sub.type === 'lab') {
            // Each lab subject is one 2-hour session per week
            labLectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: true, facultyId, hours: 2, priorityValue: 5 }); // Labs have high priority
        } else {
            const hours = getHoursForPriority(sub.priority);
            theoryLectures.push({ classId: classToSchedule.id, subjectId: sub.id, isLab: false, facultyId, hours, priorityValue: getHoursForPriority(sub.priority) });
        }
    });

    theoryLectures.sort((a, b) => b.priorityValue - a.priorityValue);

    return { theoryLectures, labLectures };
}

export async function runGA(input: GenerateTimetableInput) {
    const { theoryLectures, labLectures } = createLectureList(input);
    
    const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const codeChefDay = 'Saturday';
    
    const timeSlots = [
        '7:30-8:25', '8:25-9:20', // Morning session 1
        '9:30-10:25', '10:25-11:20', // Morning session 2
        '12:20-01:15', '01:15-02:10' // Afternoon session
    ];
    
    const finalSchedule: Gene[] = [];
    const facultyTimeMap = new Map<string, Set<string>>();
    const classroomTimeMap = new Map<string, Set<string>>();
    const classTimeMap = new Map<string, Set<string>>();
    
    // Pre-populate with existing schedule for conflict checking
    input.existingSchedule?.forEach(slot => {
        const slotKey = `${slot.day}-${slot.time}`;
        if (!facultyTimeMap.has(slot.facultyId)) facultyTimeMap.set(slot.facultyId, new Set());
        facultyTimeMap.get(slot.facultyId)!.add(slotKey);
        
        if (!classroomTimeMap.has(slot.classroomId)) classroomTimeMap.set(slot.classroomId, new Set());
        classroomTimeMap.get(slot.classroomId)!.add(slotKey);
    });

    const labRooms = input.classrooms.filter(c => c.type === 'lab');
    const theoryRooms = input.classrooms.filter(c => c.type === 'classroom');

    // --- 1. Place Lab Sessions (Batched) ---
    // Labs are split into two batches, running concurrently in different lab rooms.
    for (const labLecture of labLectures) {
        let placed = false;
        const consecutivePairs = [
            ['12:20-01:15', '01:15-02:10'],
        ];

        for (const day of workingDays) {
            for (const pair of consecutivePairs) {
                const [time1, time2] = pair;
                const slotKey1 = `${day}-${time1}`;
                const slotKey2 = `${day}-${time2}`;
                
                // Need two available lab rooms at the same time
                const availableLabRooms = labRooms.filter(room => 
                    !classroomTimeMap.get(room.id)?.has(slotKey1) && 
                    !classroomTimeMap.get(room.id)?.has(slotKey2)
                );

                if (availableLabRooms.length >= 2 && !classTimeMap.get(labLecture.classId)?.has(slotKey1) && !classTimeMap.get(labLecture.classId)?.has(slotKey2)) {
                    const room1 = availableLabRooms[0];
                    const room2 = availableLabRooms[1];
                    const faculty = input.faculty.find(f => f.id === labLecture.facultyId);

                    if (faculty && !facultyTimeMap.get(faculty.id)?.has(slotKey1) && !facultyTimeMap.get(faculty.id)?.has(slotKey2)) {
                        // Place Batch A
                        finalSchedule.push({ ...labLecture, day, time: time1, classroomId: room1.id, batch: 'A' });
                        finalSchedule.push({ ...labLecture, day, time: time2, classroomId: room1.id, batch: 'A' });
                        
                        // Place Batch B - assume same faculty for now, can be different
                        finalSchedule.push({ ...labLecture, day, time: time1, classroomId: room2.id, batch: 'B' });
                        finalSchedule.push({ ...labLecture, day, time: time2, classroomId: room2.id, batch: 'B' });

                        // Update maps
                        classTimeMap.set(labLecture.classId, (classTimeMap.get(labLecture.classId) || new Set()).add(slotKey1).add(slotKey2));
                        facultyTimeMap.set(faculty.id, (facultyTimeMap.get(faculty.id) || new Set()).add(slotKey1).add(slotKey2));
                        classroomTimeMap.set(room1.id, (classroomTimeMap.get(room1.id) || new Set()).add(slotKey1).add(slotKey2));
                        classroomTimeMap.set(room2.id, (classroomTimeMap.get(room2.id) || new Set()).add(slotKey1).add(slotKey2));
                        
                        placed = true;
                        break;
                    }
                }
            }
            if (placed) break;
        }
    }


    // --- 2. Place Theory Lectures ---
    const lectureQueue: { lecture: Lecture, hoursLeft: number }[] = theoryLectures.map(l => ({ lecture: l, hoursLeft: l.hours }));
    
    for (const day of workingDays) {
        for (const time of timeSlots) {
            const slotKey = `${day}-${time}`;
            if (classTimeMap.get(input.classes[0].id)?.has(slotKey)) continue;

            // Try to place a lecture from the queue
            for (const item of lectureQueue) {
                if (item.hoursLeft > 0) {
                    const { lecture } = item;
                    const facultyId = lecture.facultyId;

                    if (!facultyTimeMap.get(facultyId)?.has(slotKey)) {
                         for (const room of theoryRooms) {
                            if (!classroomTimeMap.get(room.id)?.has(slotKey)) {
                                finalSchedule.push({ ...lecture, day, time, classroomId: room.id });
                                
                                // Update maps
                                classTimeMap.set(lecture.classId, (classTimeMap.get(lecture.classId) || new Set()).add(slotKey));
                                facultyTimeMap.set(facultyId, (facultyTimeMap.get(facultyId) || new Set()).add(slotKey));
                                classroomTimeMap.set(room.id, (classroomTimeMap.get(room.id) || new Set()).add(slotKey));

                                item.hoursLeft--;
                                break; // Break from room loop
                            }
                        }
                        break; // Break from lecture queue loop
                    }
                }
            }
        }
    }

     // --- 3. Fill remaining slots with Library ---
    let librarySlotsPlaced = 0;
    const MAX_LIBRARY_SLOTS = 3;
    
    // Sort slots to make library placement more predictable (e.g., afternoons)
    const sortedEmptySlots = workingDays.flatMap(day => timeSlots.map(time => ({ day, time })))
        .filter(({ day, time }) => !classTimeMap.get(input.classes[0].id)?.has(`${day}-${time}`))
        .sort((a, b) => timeSlots.indexOf(b.time) - timeSlots.indexOf(a.time));

    for (const { day, time } of sortedEmptySlots) {
        if (librarySlotsPlaced < MAX_LIBRARY_SLOTS) {
            finalSchedule.push({
                day, time, classId: input.classes[0].id,
                subjectId: 'LIB001', facultyId: 'NA', classroomId: 'NA',
                isLab: false,
            });
            librarySlotsPlaced++;
        }
    }


    const totalScheduledTheory = finalSchedule.filter(g => !g.isLab && g.subjectId !== 'LIB001' && !g.isCodeChef).length;
    const totalRequiredTheory = theoryLectures.reduce((sum, l) => sum + l.hours, 0);

    if (totalScheduledTheory < totalRequiredTheory) {
        return { 
            success: false, 
            message: `Could not schedule all required theory lectures. Placed ${totalScheduledTheory} out of ${totalRequiredTheory}. Check faculty/classroom availability.`, 
            bestTimetable: null, 
            generations: 0, 
            fitness: -1, 
            codeChefDay: null 
        };
    }

    return { 
        success: true, 
        message: 'Successfully generated schedule based on reference structure.', 
        bestTimetable: finalSchedule, 
        generations: 1, 
        fitness: 0, 
        codeChefDay: codeChefDay 
    };
}
