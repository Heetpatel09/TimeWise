'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { Schedule } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getSchedule(): Promise<Schedule[]> {
  const stmt = db.prepare('SELECT * FROM schedule');
  return stmt.all() as Schedule[];
}

export async function addSchedule(item: Omit<Schedule, 'id'>) {
    const id = `SCH${Date.now()}`;
    const newItem: Schedule = { ...item, id };
    const stmt = db.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, day, time) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, item.classId, item.subjectId, item.facultyId, item.day, item.time);
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSchedule(updatedItem: Schedule) {
    const existing = db.prepare('SELECT * FROM schedule WHERE id = ?').get(updatedItem.id);
    if (existing) {
        const stmt = db.prepare('UPDATE schedule SET classId = ?, subjectId = ?, facultyId = ?, day = ?, time = ? WHERE id = ?');
        stmt.run(updatedItem.classId, updatedItem.subjectId, updatedItem.facultyId, updatedItem.day, updatedItem.time, updatedItem.id);
    } else {
        const stmt = db.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, day, time) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run(updatedItem.id, updatedItem.classId, updatedItem.subjectId, updatedItem.facultyId, updatedItem.day, updatedItem.time);
    }
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteSchedule(id: string) {
    const stmt = db.prepare('DELETE FROM schedule WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}
