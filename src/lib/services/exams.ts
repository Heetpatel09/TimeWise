
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Exam, EnrichedExam } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
}

export async function getExams(): Promise<EnrichedExam[]> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
        e.id,
        e.subjectId,
        e.classId,
        e.date,
        e.time,
        s.name as subjectName,
        c.name as className
    FROM exams e
    JOIN subjects s ON e.subjectId = s.id
    JOIN classes c ON e.classId = c.id
  `);
  return stmt.all() as EnrichedExam[];
}

export async function addExam(item: Omit<Exam, 'id'>) {
    const db = getDb();
    const id = `EXM${Date.now()}`;
    const stmt = db.prepare('INSERT INTO exams (id, subjectId, classId, date, time) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, item.subjectId, item.classId, item.date, item.time);
    revalidateAll();
    const newItem: Exam = { ...item, id };
    return Promise.resolve(newItem);
}

export async function updateExam(updatedItem: Exam) {
    const db = getDb();
    const stmt = db.prepare('UPDATE exams SET subjectId = ?, classId = ?, date = ?, time = ? WHERE id = ?');
    stmt.run(updatedItem.subjectId, updatedItem.classId, updatedItem.date, updatedItem.time, updatedItem.id);
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteExam(id: string) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM exams WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}
