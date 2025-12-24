
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Subject, Faculty } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getSubjects(): Promise<Subject[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM subjects');
  const results = stmt.all() as any[];
  return JSON.parse(JSON.stringify(results.map(s => ({ 
      ...s, 
      isSpecial: !!s.isSpecial,
      facultyIds: s.facultyIds ? JSON.parse(s.facultyIds) : [],
    }))));
}

export async function addSubject(item: Omit<Subject, 'id'>): Promise<Subject> {
    const db = getDb();
    const id = `SUB${Date.now()}`;
    
    let finalName = item.name;
    if (item.type === 'lab' && !finalName.toLowerCase().includes('lab')) {
        finalName += ' (Lab)';
    }

    const newItem: Subject = { ...item, id, name: finalName };
    
    const stmt = db.prepare('INSERT INTO subjects (id, name, code, isSpecial, type, semester, syllabus, department, priority, facultyIds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, item.code, (item.isSpecial || false) ? 1 : 0, item.type, item.semester, item.syllabus, item.department, item.priority, JSON.stringify(item.facultyIds || []));
    
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSubject(updatedItem: Subject, allFaculty: Faculty[]): Promise<Subject> {
    const db = getDb();
    
    let finalName = updatedItem.name;
    if (updatedItem.type === 'lab' && !finalName.toLowerCase().includes('lab')) {
        finalName += ' (Lab)';
    }
    const finalItem = { ...updatedItem, name: finalName };

    const stmt = db.prepare('UPDATE subjects SET name = ?, code = ?, isSpecial = ?, type = ?, semester = ?, syllabus = ?, department = ?, priority = ?, facultyIds = ? WHERE id = ?');
    stmt.run(finalItem.name, finalItem.code, (finalItem.isSpecial || false) ? 1 : 0, finalItem.type, finalItem.semester, finalItem.syllabus, finalItem.department, finalItem.priority, JSON.stringify(finalItem.facultyIds || []), finalItem.id);
    
    revalidateAll();
    return Promise.resolve(finalItem);
}

export async function deleteSubject(id: string) {
    const db = getDb();
    
    const inUse = db.prepare('SELECT 1 FROM schedule WHERE subjectId = ? LIMIT 1').get(id);
    if (inUse) {
        throw new Error("Cannot delete subject that is currently in use in the schedule.");
    }
    
    const stmt = db.prepare('DELETE FROM subjects WHERE id = ?');
    stmt.run(id);

    revalidateAll();
    return Promise.resolve(id);
}
