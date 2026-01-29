
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
    }))));
}

export async function addSubject(item: Omit<Subject, 'id'>, createLab: boolean = false): Promise<Subject[]> {
    const db = getDb();
    const createdSubjects: Subject[] = [];

    db.transaction(() => {
        const stmt = db.prepare('INSERT INTO subjects (id, name, code, isSpecial, type, semester, syllabus, departmentId, credits) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

        // Theory subject
        const theoryId = `SUB${Date.now()}`;
        const theoryItem: Subject = { ...item, id: theoryId, type: 'theory' };
        stmt.run(theoryId, theoryItem.name, theoryItem.code, (theoryItem.isSpecial || false) ? 1 : 0, 'theory', theoryItem.semester, theoryItem.syllabus, theoryItem.departmentId, theoryItem.credits);
        createdSubjects.push(theoryItem);

        if (createLab) {
            const labId = `SUB${Date.now() + 1}`;
            // Ensure we don't add (Lab) if it's already there for some reason
            const labName = `${theoryItem.name.replace(/\(Lab\)/i, '').trim()} (Lab)`;
            
            const labItem: Subject = {
                ...item,
                id: labId,
                name: labName,
                type: 'lab',
                credits: null, // Labs don't have credits
            };
            stmt.run(labId, labItem.name, labItem.code, (labItem.isSpecial || false) ? 1 : 0, 'lab', labItem.semester, labItem.syllabus, labItem.departmentId, null);
            createdSubjects.push(labItem);
        }
    })();
    
    revalidateAll();
    return Promise.resolve(createdSubjects);
}

export async function updateSubject(updatedItem: Subject): Promise<Subject> {
    const db = getDb();
    
    const stmt = db.prepare('UPDATE subjects SET name = ?, code = ?, isSpecial = ?, type = ?, semester = ?, syllabus = ?, departmentId = ?, credits = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.code, (updatedItem.isSpecial || false) ? 1 : 0, updatedItem.type, updatedItem.semester, updatedItem.syllabus, updatedItem.departmentId, updatedItem.credits, updatedItem.id);
    
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteSubject(id: string) {
    const db = getDb();
    
    const inUse = db.prepare('SELECT 1 FROM schedule WHERE subjectId = ? LIMIT 1').get(id);
    if (inUse) {
        throw new Error("Cannot delete subject that is currently in use in the schedule.");
    }
    
    db.transaction(() => {
        const allFaculty: {id: string, allottedSubjects: string | null}[] = db.prepare('SELECT id, allottedSubjects FROM faculty').all() as any[];
        allFaculty.forEach(fac => {
            if (!fac.allottedSubjects) return;
            const subjects = JSON.parse(fac.allottedSubjects);
            if (Array.isArray(subjects) && subjects.includes(id)) {
                const newSubjects = subjects.filter(sId => sId !== id);
                db.prepare('UPDATE faculty SET allottedSubjects = ? WHERE id = ?').run(JSON.stringify(newSubjects), fac.id);
            }
        });
        const stmt = db.prepare('DELETE FROM subjects WHERE id = ?');
        stmt.run(id);
    })();

    revalidateAll();
    return Promise.resolve(id);
}
