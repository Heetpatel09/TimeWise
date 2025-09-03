

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Schedule, EnrichedSchedule, Faculty } from '@/lib/types';
import { getClasses } from './classes';
import { getSubjects } from './subjects';
import { getClassrooms } from './classrooms';
import { getFaculty } from './faculty';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getSchedule(): Promise<Schedule[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM schedule');
  const results = stmt.all() as Schedule[];
  // Ensure plain objects are returned
  return JSON.parse(JSON.stringify(results));
}

const MIN_LECTURES_PER_DAY = 4;
const MAX_LECTURES_PER_DAY = 6;

function checkForLectureCount(classId: string, day: string, adjustment: 1 | -1 | 0) {
    const db = getDb();
    const currentCount: { count: number } = db.prepare('SELECT count(*) as count FROM schedule WHERE classId = ? AND day = ?').get(classId, day) as any;
    const newCount = currentCount.count + adjustment;

    if (newCount > MAX_LECTURES_PER_DAY) {
        throw new Error(`This class already has ${currentCount.count} lectures on ${day}. You cannot add more than ${MAX_LECTURES_PER_DAY}.`);
    }
    if (adjustment === -1 && newCount < MIN_LECTURES_PER_DAY) {
        // This check can be disruptive, so we'll just log a warning instead of throwing an error for now.
        console.warn(`Warning: Class ${classId} will have fewer than ${MIN_LECTURES_PER_DAY} lectures on ${day}.`);
    }
}


function checkForConflict(item: Omit<Schedule, 'id'>, existingId?: string) {
    const db = getDb();
    const params: (string | number)[] = [item.day, item.time];
    let queryExclusion = '';

    if (existingId) {
        queryExclusion = 'AND id != ?';
        params.push(existingId);
    }

    // Check for class conflict
    const classConflict = db.prepare(`SELECT id FROM schedule WHERE classId = ? AND day = ? AND time = ? ${queryExclusion}`).get(item.classId, ...params);
    if (classConflict) {
        throw new Error('This class is already scheduled for another subject at this time.');
    }

    // Check for faculty conflict
    const facultyConflict = db.prepare(`SELECT id FROM schedule WHERE facultyId = ? AND day = ? AND time = ? ${queryExclusion}`).get(item.facultyId, ...params);
    if (facultyConflict) {
        throw new Error('This faculty member is already scheduled for another class at this time.');
    }

    // Check for classroom conflict
    const classroomConflict = db.prepare(`SELECT id FROM schedule WHERE classroomId = ? AND day = ? AND time = ? ${queryExclusion}`).get(item.classroomId, ...params);
    if (classroomConflict) {
        throw new Error('This classroom is already booked at this time.');
    }
}

export async function addSchedule(item: Omit<Schedule, 'id'>) {
    const db = getDb();
    checkForConflict(item);
    // checkForLectureCount(item.classId, item.day, 1);

    const id = `SCH${Date.now()}`;
    const newItem: Schedule = { ...item, id };
    const stmt = db.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, classroomId, day, time) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, item.classId, item.subjectId, item.facultyId, item.classroomId, item.day, item.time);
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSchedule(updatedItem: Schedule) {
    const db = getDb();
    const existingItem: Schedule | undefined = db.prepare('SELECT * FROM schedule WHERE id = ?').get(updatedItem.id) as any;

    if (!existingItem) {
        throw new Error("Schedule slot not found.");
    }
    
    // Perform checks before any DB modification
    checkForConflict(updatedItem, updatedItem.id);

    // If class or day is changing, check lecture counts for both old and new
    if (existingItem.classId !== updatedItem.classId || existingItem.day !== updatedItem.day) {
        // Check if removing from old slot violates minimum
        // checkForLectureCount(existingItem.classId, existingItem.day, -1);
        // Check if adding to new slot violates maximum
        // checkForLectureCount(updatedItem.classId, updatedItem.day, 1);
    }
    
    const stmt = db.prepare('UPDATE schedule SET classId = ?, subjectId = ?, facultyId = ?, classroomId = ?, day = ?, time = ? WHERE id = ?');
    stmt.run(updatedItem.classId, updatedItem.subjectId, updatedItem.facultyId, updatedItem.classroomId, updatedItem.day, updatedItem.time, updatedItem.id);
    
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteSchedule(id: string) {
    const db = getDb();
    const itemToDelete: Schedule | undefined = db.prepare('SELECT * FROM schedule WHERE id = ?').get(id) as any;

    if (!itemToDelete) {
        throw new Error("Schedule slot not found.");
    }

    // checkForLectureCount(itemToDelete.classId, itemToDelete.day, -1);
    
    const stmt = db.prepare('DELETE FROM schedule WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}

export async function replaceSchedule(schedule: Omit<Schedule, 'id'>[]) {
    const dbInstance = getDb();
    
    const transaction = dbInstance.transaction(() => {
        // Clear the existing schedule and related requests
        dbInstance.prepare('DELETE FROM schedule').run();
        dbInstance.prepare('DELETE FROM schedule_change_requests').run();
        dbInstance.prepare('DELETE FROM new_slot_requests').run();

        const insertStmt = dbInstance.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, classroomId, day, time) VALUES (?, ?, ?, ?, ?, ?, ?)');

        for (const item of schedule) {
            const id = `SCH${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
            insertStmt.run(id, item.classId, item.subjectId, item.facultyId, item.classroomId, item.day, item.time);
        }
    });

    transaction();
    
    revalidateAll();
    return Promise.resolve({ success: true });
}

export async function getScheduleForFacultyInRange(facultyId: string, startDate: string, endDate: string): Promise<EnrichedSchedule[]> {
    const db = getDb();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysToFetch = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        daysToFetch.push(dayMap[d.getDay()]);
    }
    const uniqueDays = [...new Set(daysToFetch)];

    if (uniqueDays.length === 0) return [];
    
    const placeholders = uniqueDays.map(() => '?').join(',');
    const query = `
        SELECT *
        FROM schedule 
        WHERE facultyId = ? AND day IN (${placeholders})
    `;

    const scheduledSlots = db.prepare(query).all(facultyId, ...uniqueDays) as Schedule[];

    const [classes, subjects, classrooms, faculty] = await Promise.all([
        getClasses(), getSubjects(), getClassrooms(), getFaculty()
    ]);
    
    const classMap = new Map(classes.map(c => [c.id, c.name]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const classroomMap = new Map(classrooms.map(c => [c.id, c.name]));
    const facultyMap = new Map(faculty.map(f => [f.id, f.name]));
    
    return scheduledSlots.map(s => ({
        ...s,
        className: classMap.get(s.classId) || 'N/A',
        subjectName: subjectMap.get(s.subjectId)?.name || 'N/A',
        subjectIsSpecial: subjectMap.get(s.subjectId)?.isSpecial || false,
        classroomName: classroomMap.get(s.classroomId) || 'N/A',
        classroomType: classrooms.find(cr => cr.id === s.classroomId)?.type || 'classroom',
        facultyName: facultyMap.get(s.facultyId) || 'N/A',
    }));
}


export async function getAvailableFacultyForSlot(day: string, time: string): Promise<Faculty[]> {
    const db = getDb();

    // Get IDs of all faculty who are busy at the specified time
    const busyFacultyIds = db.prepare(`
        SELECT facultyId FROM schedule
        WHERE day = ? AND time = ?
    `).all(day, time).map((row: any) => row.facultyId);
    
    // Get all faculty
    const allFaculty = await getFaculty();

    // Filter out the busy ones
    if (busyFacultyIds.length > 0) {
        const busyIdsSet = new Set(busyFacultyIds);
        return allFaculty.filter(f => !busyIdsSet.has(f.id));
    }

    return allFaculty;
}

export async function getAvailableClassroomsForSlot(day: string, time: string, type: 'classroom' | 'lab'): Promise<Faculty[]> {
    const db = getDb();

    // Get IDs of all classrooms that are busy at the specified time
    const busyClassroomIds = db.prepare(`
        SELECT classroomId FROM schedule
        WHERE day = ? AND time = ?
    `).all(day, time).map((row: any) => row.classroomId);
    
    // Get all classrooms
    const allClassrooms = await getClassrooms();

    // Filter out the busy ones and by type
    const busyIdsSet = new Set(busyClassroomIds);
    return allClassrooms.filter(c => !busyIdsSet.has(c.id) && c.type === type);
}
