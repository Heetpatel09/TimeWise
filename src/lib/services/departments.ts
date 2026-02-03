
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Department } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
}

export async function getDepartments(): Promise<Department[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM departments ORDER BY name');
  return stmt.all() as Department[];
}

export async function addDepartment(item: Omit<Department, 'id'>) {
    const db = getDb();
    const id = `DEPT${Date.now()}`;
    const stmt = db.prepare('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)');
    stmt.run(id, item.name, item.code);
    revalidateAll();
    const newItem: Department = { ...item, id };
    return Promise.resolve(newItem);
}

export async function updateDepartment(updatedItem: Department) {
    const db = getDb();
    const stmt = db.prepare('UPDATE departments SET name = ?, code = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.code, updatedItem.id);
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteDepartment(id: string) {
    const db = getDb();
    
    // Check if department is in use by classes, subjects, or faculty
    const classCheck = db.prepare('SELECT 1 FROM classes WHERE departmentId = ? LIMIT 1').get(id);
    if (classCheck) {
        throw new Error("Cannot delete department. Please re-assign or delete classes in this department first.");
    }
    const subjectCheck = db.prepare('SELECT 1 FROM subjects WHERE departmentId = ? LIMIT 1').get(id);
    if (subjectCheck) {
        throw new Error("Cannot delete department. Please re-assign or delete subjects in this department first.");
    }
     const facultyCheck = db.prepare('SELECT 1 FROM faculty WHERE departmentId = ? LIMIT 1').get(id);
    if (facultyCheck) {
        throw new Error("Cannot delete department. Please re-assign or delete faculty in this department first.");
    }
    
    const stmt = db.prepare('DELETE FROM departments WHERE id = ?');
    stmt.run(id);
    
    revalidateAll();
    return Promise.resolve(id);
}
