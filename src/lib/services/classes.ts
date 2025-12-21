
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
    const stmt = db.prepare('INSERT INTO classes (id, name, semester, department) VALUES (?, ?, ?, ?)');
    stmt.run(id, item.name, item.semester, item.department);
    revalidateAll();
    const newItem: Class = { ...item, id };
    return Promise.resolve(newItem);
}

export async function updateClass(updatedItem: Class) {
    const db = getDb();
    const stmt = db.prepare('UPDATE classes SET name = ?, semester = ?, department = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.semester, updatedItem.department, updatedItem.id);
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteClass(id: string) {
    const db = getDb();
    
    // Before deleting a class, ensure there are no students in it.
    const studentCheck = db.prepare('SELECT 1 FROM students WHERE classId = ? LIMIT 1').get(id);
    if (studentCheck) {
        throw new Error("Cannot delete class. Please re-assign or delete students in this class first.");
    }
    
    // Also delete associated schedule slots
    const scheduleStmt = db.prepare('DELETE FROM schedule WHERE classId = ?');
    scheduleStmt.run(id);

    const stmt = db.prepare('DELETE FROM classes WHERE id = ?');
    stmt.run(id);
    
    revalidateAll();
    return Promise.resolve(id);
}

export async function renameDepartment(oldName: string, newName: string) {
    const db = getDb();

    db.transaction(() => {
        // Update classes
        db.prepare('UPDATE classes SET department = ? WHERE department = ?').run(newName, oldName);
        // Update subjects
        db.prepare('UPDATE subjects SET department = ? WHERE department = ?').run(newName, oldName);
        // Update faculty
        db.prepare('UPDATE faculty SET department = ? WHERE department = ?').run(newName, oldName);
    })();

    revalidateAll();
    return Promise.resolve({ success: true, oldName, newName });
}
