'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Subject } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
}

export async function getSubjects(): Promise<Subject[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM subjects');
  return stmt.all() as Subject[];
}

export async function addSubject(item: Omit<Subject, 'id'>) {
    const db = getDb();
    const id = `SUB${Date.now()}`;
    const newItem: Subject = { ...item, id };
    const stmt = db.prepare('INSERT INTO subjects (id, name, code) VALUES (?, ?, ?)');
    stmt.run(id, item.name, item.code);
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSubject(updatedItem: Subject) {
    const db = getDb();
    const stmt = db.prepare('UPDATE subjects SET name = ?, code = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.code, updatedItem.id);
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteSubject(id: string) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM subjects WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}
