
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

    const id = `SCH${Date.now()}`;
    const newItem: Schedule = { ...item, id };
    const stmt = db.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, classroomId, day, time) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, item.classId, item.subjectId, item.facultyId, item.classroomId, item.day, item.time);
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSchedule(updatedItem: Schedule) {
    const db = getDb();
    checkForConflict(updatedItem, updatedItem.id);
    
    const existing = db.prepare('SELECT * FROM schedule WHERE id = ?').get(updatedItem.id);
    if (existing) {
        const stmt = db.prepare('UPDATE schedule SET classId = ?, subjectId = ?, facultyId = ?, classroomId = ?, day = ?, time = ? WHERE id = ?');
        stmt.run(updatedItem.classId, updatedItem.subjectId, updatedItem.facultyId, updatedItem.classroomId, updatedItem.day, updatedItem.time, updatedItem.id);
    } else {
        // This case should ideally not be hit if we are "updating", but as a fallback:
        const stmt = db.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, classroomId, day, time) VALUES (?, ?, ?, ?, ?, ?, ?)');
        stmt.run(updatedItem.id, updatedItem.classId, updatedItem.subjectId, updatedItem.facultyId, updatedItem.classroomId, updatedItem.day, updatedItem.time);
    }
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteSchedule(id: string) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM schedule WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}
