

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Exam, EnrichedExam, GenerateTestPaperOutput } from '@/lib/types';
import { addNotification } from './notifications';
import { getStudentsByClass } from './students';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getExams(): Promise<EnrichedExam[]> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
        e.id,
        e.subjectId,
        e.classId,
        e.classroomId,
        e.date,
        e.time,
        e.testId,
        s.name as subjectName,
        c.name as className,
        cr.name as classroomName
    FROM exams e
    JOIN subjects s ON e.subjectId = s.id
    JOIN classes c ON e.classId = c.id
    LEFT JOIN classrooms cr ON e.classroomId = cr.id
  `);
  return stmt.all() as EnrichedExam[];
}

export async function addExam(item: Omit<Exam, 'id'>): Promise<Exam> {
    const db = getDb();

    // Check if an exam with this testId already exists
    const existingExam: Exam | undefined = item.testId 
        ? db.prepare('SELECT * FROM exams WHERE testId = ?').get(item.testId) as any
        : undefined;

    if (existingExam) {
        // Update existing exam
        const updatedItem = { ...existingExam, ...item };
        const stmt = db.prepare('UPDATE exams SET subjectId = ?, classId = ?, classroomId = ?, date = ?, time = ? WHERE id = ?');
        stmt.run(updatedItem.subjectId, updatedItem.classId, updatedItem.classroomId, updatedItem.date, updatedItem.time, updatedItem.id);
        revalidateAll();
        return Promise.resolve(updatedItem);
    } else {
        // Insert new exam
        const id = `EXM${Date.now()}`;
        const stmt = db.prepare('INSERT INTO exams (id, subjectId, classId, classroomId, date, time, testId) VALUES (?, ?, ?, ?, ?, ?, ?)');
        stmt.run(id, item.subjectId, item.classId, item.classroomId, item.date, item.time, item.testId);
        
        // Notify students of the class
        const students = await getStudentsByClass(item.classId);
        const subject = db.prepare('SELECT name FROM subjects WHERE id = ?').get(item.subjectId) as {name: string};
        for (const student of students) {
            await addNotification({
                userId: student.id,
                message: `A new exam for ${subject.name} has been scheduled on ${item.date}.`,
                category: 'exam_schedule'
            });
        }

        revalidateAll();
        const newItem: Exam = { ...item, id };
        return Promise.resolve(newItem);
    }
}


export async function updateExam(updatedItem: Exam) {
    const db = getDb();
    const stmt = db.prepare('UPDATE exams SET subjectId = ?, classId = ?, classroomId = ?, date = ?, time = ? WHERE id = ?');
    stmt.run(updatedItem.subjectId, updatedItem.classId, updatedItem.classroomId, updatedItem.date, updatedItem.time, updatedItem.id);
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

export async function replaceExams(exams: Exam[]) {
    const dbInstance = getDb();
    
    const transaction = dbInstance.transaction(() => {
        dbInstance.prepare('DELETE FROM exams').run();
        const insertStmt = dbInstance.prepare('INSERT INTO exams (id, subjectId, classId, classroomId, date, time) VALUES (?, ?, ?, ?, ?, ?)');
        for (const item of exams) {
            const id = item.id || `EXM${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
            insertStmt.run(id, item.subjectId, item.classId, item.classroomId, item.date, item.time);
        }
    });

    transaction();
    revalidateAll();
    return Promise.resolve({ success: true });
}

export async function saveGeneratedTest(
    subjectId: string,
    classId: string,
    facultyId: string,
    paper: GenerateTestPaperOutput
): Promise<string> {
    const db = getDb();
    const id = `TEST${Date.now()}`;
    const createdAt = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO generated_tests (id, subjectId, classId, facultyId, questions, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, subjectId, classId, facultyId, JSON.stringify(paper.questions), createdAt);
    revalidateAll();
    return Promise.resolve(id);
}

    
