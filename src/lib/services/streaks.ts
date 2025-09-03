'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Student, Faculty } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

export async function updateAllStreaks() {
    const db = getDb();
    
    // Update faculty streaks
    const allFaculty: Faculty[] = db.prepare('SELECT * FROM faculty').all() as any[];
    const facultyUpdateStmt = db.prepare('UPDATE faculty SET streak = ? WHERE id = ?');

    allFaculty.forEach(faculty => {
        const scheduleCount: { count: number } = db.prepare(
            'SELECT COUNT(*) as count FROM schedule WHERE facultyId = ?'
        ).get(faculty.id) as any;
        facultyUpdateStmt.run(scheduleCount.count, faculty.id);
    });

    // Update student streaks
    const allStudents: Student[] = db.prepare('SELECT * FROM students').all() as any[];
    const studentUpdateStmt = db.prepare('UPDATE students SET streak = ? WHERE id = ?');

    allStudents.forEach(student => {
        const scheduleCount: { count: number } = db.prepare(
            'SELECT COUNT(*) as count FROM schedule WHERE classId = ?'
        ).get(student.classId) as any;
        studentUpdateStmt.run(scheduleCount.count, student.id);
    });

    revalidateAll();
    return Promise.resolve({ success: true });
}
