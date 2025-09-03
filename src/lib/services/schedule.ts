
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Schedule } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getSchedule(): Promise<Schedule[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM schedule');
  return stmt.all() as Schedule[];
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
        throw new Error(`This class must have at least ${MIN_LECTURES_PER_DAY} lectures on ${day}. Deleting this slot would bring the count to ${newCount}.`);
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
    checkForLectureCount(item.classId, item.day, 1);

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
        checkForLectureCount(existingItem.classId, existingItem.day, -1);
        // Check if adding to new slot violates maximum
        checkForLectureCount(updatedItem.classId, updatedItem.day, 1);
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

    checkForLectureCount(itemToDelete.classId, itemToDelete.day, -1);
    
    const stmt = db.prepare('DELETE FROM schedule WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}
