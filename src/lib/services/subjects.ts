
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
  // Ensure plain objects are returned and booleans are correct
  return JSON.parse(JSON.stringify(results.map(s => ({ 
      ...s, 
      isSpecial: !!s.isSpecial,
      facultyIds: [], // This is derived dynamically, not stored
    }))));
}

export async function addSubject(item: Omit<Subject, 'id'>, allFaculty: Faculty[]): Promise<Subject> {
    const db = getDb();
    const id = `SUB${Date.now()}`;
    
    let finalName = item.name;
    if (item.type === 'lab' && !finalName.toLowerCase().includes('lab')) {
        finalName += ' (Lab)';
    }

    const newItem: Subject = { ...item, id, name: finalName };
    
    const stmt = db.prepare('INSERT INTO subjects (id, name, code, isSpecial, type, semester, syllabus, department, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, item.code, (item.isSpecial || false) ? 1 : 0, item.type, item.semester, item.syllabus, item.department, item.priority);
    
    // Update faculty assignments
    const facultyIds = item.facultyIds || [];
    if (facultyIds.length > 0) {
        db.transaction(() => {
            facultyIds.forEach(facultyId => {
                const fac = allFaculty.find(f => f.id === facultyId);
                if (fac) {
                    const allottedSubjects = fac.allottedSubjects ? [...fac.allottedSubjects] : [];
                    if (!allottedSubjects.includes(id)) {
                        allottedSubjects.push(id);
                        db.prepare('UPDATE faculty SET allottedSubjects = ? WHERE id = ?').run(JSON.stringify(allottedSubjects), facultyId);
                    }
                }
            });
        })();
    }

    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSubject(updatedItem: Subject, allFaculty: Faculty[]) {
    const db = getDb();
    
    let finalName = updatedItem.name;
    if (updatedItem.type === 'lab' && !finalName.toLowerCase().includes('lab')) {
        finalName += ' (Lab)';
    }
    const finalItem = { ...updatedItem, name: finalName };

    const stmt = db.prepare('UPDATE subjects SET name = ?, code = ?, isSpecial = ?, type = ?, semester = ?, syllabus = ?, department = ?, priority = ? WHERE id = ?');
    stmt.run(finalItem.name, finalItem.code, (finalItem.isSpecial || false) ? 1 : 0, finalItem.type, finalItem.semester, finalItem.syllabus, finalItem.department, finalItem.priority, finalItem.id);
    
    // Update faculty assignments based on changes
    const newFacultyIds = finalItem.facultyIds || [];
    const oldFacultyIds = allFaculty
        .filter(f => f.allottedSubjects?.includes(finalItem.id))
        .map(f => f.id);

    const addedFaculty = newFacultyIds.filter(id => !oldFacultyIds.includes(id));
    const removedFaculty = oldFacultyIds.filter((id: string) => !newFacultyIds.includes(id));

    db.transaction(() => {
        // Add subject to newly assigned faculty
        addedFaculty.forEach(facultyId => {
            const fac = allFaculty.find(f => f.id === facultyId);
            if (fac) {
                const subjects = fac.allottedSubjects || [];
                if (!subjects.includes(finalItem.id)) {
                    subjects.push(finalItem.id);
                    db.prepare('UPDATE faculty SET allottedSubjects = ? WHERE id = ?').run(JSON.stringify(subjects), facultyId);
                }
            }
        });
        // Remove subject from unassigned faculty
        removedFaculty.forEach((facultyId: string) => {
            const fac = allFaculty.find(f => f.id === facultyId);
            if (fac) {
                let subjects = fac.allottedSubjects || [];
                subjects = subjects.filter((subId: string) => subId !== finalItem.id);
                db.prepare('UPDATE faculty SET allottedSubjects = ? WHERE id = ?').run(JSON.stringify(subjects), facultyId);
            }
        });
    })();

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

    // Also remove from all faculty allotted subjects
    const allFaculty: Faculty[] = db.prepare('SELECT id, allottedSubjects FROM faculty').all() as any[];
    db.transaction(() => {
        allFaculty.forEach(fac => {
            if (fac.allottedSubjects) {
                let subjects = Array.isArray(fac.allottedSubjects) ? fac.allottedSubjects : JSON.parse(fac.allottedSubjects as any);
                if (subjects.includes(id)) {
                    const updatedSubjects = subjects.filter((subId: string) => subId !== id);
                    db.prepare('UPDATE faculty SET allottedSubjects = ? WHERE id = ?').run(JSON.stringify(updatedSubjects), fac.id);
                }
            }
        });
    })();


    revalidateAll();
    return Promise.resolve(id);
}
