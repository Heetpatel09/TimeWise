

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Subject, Schedule } from '@/lib/types';
import { addSchedule } from './schedule';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getSubjects(): Promise<Subject[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM subjects');
  const results = stmt.all() as any[];
  return JSON.parse(JSON.stringify(results.map(s => ({ ...s, isSpecial: !!s.isSpecial }))));
}

export async function addSubject(item: Omit<Subject, 'id'>): Promise<Subject> {
    const db = getDb();
    const id = `SUB${Date.now()}`;
    const newItem: Subject = { ...item, id };
    
    const stmt = db.prepare('INSERT INTO subjects (id, name, code, isSpecial, type, semester, syllabus, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, item.name, item.code, (item.isSpecial || false) ? 1 : 0, item.type, item.semester, item.syllabus, item.department);

    // Get all classes in the same department
    if (item.department) {
        const classesInDept = db.prepare('SELECT id FROM classes WHERE department = ? AND semester = ?').all(item.department, item.semester) as { id: string }[];
        
        for (const aClass of classesInDept) {
             try {
                // Add a placeholder schedule slot for the new subject in each class
                // We use "Unassigned" as placeholders. The admin can then fill these in.
                await addSchedule({
                    classId: aClass.id,
                    subjectId: newItem.id,
                    facultyId: 'FAC007', // Placeholder/Unassigned faculty
                    classroomId: 'CR001', // Placeholder classroom
                    day: 'Monday', // Placeholder day
                    time: 'Unassigned',
                });
            } catch (error) {
                console.error(`Failed to add schedule for class ${aClass.id} and subject ${newItem.id}:`, error);
            }
        }
    }
    
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSubject(updatedItem: Subject) {
    const db = getDb();
    const stmt = db.prepare('UPDATE subjects SET name = ?, code = ?, isSpecial = ?, type = ?, semester = ?, syllabus = ?, department = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.code, (updatedItem.isSpecial || false) ? 1 : 0, updatedItem.type, updatedItem.semester, updatedItem.syllabus, updatedItem.department, updatedItem.id);
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteSubject(id: string) {
    const db = getDb();
    
    // Check if subject is in use
    const inUse = db.prepare('SELECT 1 FROM schedule WHERE subjectId = ? LIMIT 1').get(id);
    if (inUse) {
        throw new Error("Cannot delete subject that is currently in use in the schedule.");
    }
    
    const stmt = db.prepare('DELETE FROM subjects WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}

    
