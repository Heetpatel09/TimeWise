

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Class } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
}

export async function getClasses(): Promise<Class[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM classes');
  return stmt.all() as Class[];
}

export async function addClass(item: Omit<Class, 'id'>) {
    const db = getDb();
    const id = `CLS${Date.now()}`;
    const stmt = db.prepare('INSERT INTO classes (id, name, semester, departmentId, section) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, item.name, item.semester, item.departmentId, item.section);
    revalidateAll();
    const newItem: Class = { ...item, id };
    return Promise.resolve(newItem);
}

export async function updateClass(updatedItem: Class) {
    const db = getDb();
    const stmt = db.prepare('UPDATE classes SET name = ?, semester = ?, departmentId = ?, section = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.semester, updatedItem.departmentId, updatedItem.section, updatedItem.id);
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteClass(id: string) {
    const db = getDb();
    
    const studentCheck = db.prepare('SELECT 1 FROM students WHERE classId = ? LIMIT 1').get(id);
    if (studentCheck) {
        throw new Error("Cannot delete class. Please re-assign or delete students in this class first.");
    }
    
    const scheduleStmt = db.prepare('DELETE FROM schedule WHERE classId = ?');
    scheduleStmt.run(id);

    const stmt = db.prepare('DELETE FROM classes WHERE id = ?');
    stmt.run(id);
    
    revalidateAll();
    return Promise.resolve(id);
}
