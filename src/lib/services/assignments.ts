
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Assignment, Submission, EnrichedAssignment, EnrichedSubmission } from '@/lib/types';
import { addNotification } from './notifications';
import { getStudentsByClass } from './students';

function revalidateAll() {
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

export async function addAssignment(item: Omit<Assignment, 'id' | 'createdAt'>): Promise<Assignment> {
    const db = getDb();
    const id = `ASN${Date.now()}`;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(
        'INSERT INTO assignments (id, facultyId, classId, subjectId, title, description, fileUrl, dueDate, type, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, item.facultyId, item.classId, item.subjectId, item.title, item.description, item.fileUrl, item.dueDate, item.type, createdAt);

    // Notify students
    const students = await getStudentsByClass(item.classId);
    const subject = db.prepare('SELECT name FROM subjects WHERE id = ?').get(item.subjectId) as { name: string };
    for (const student of students) {
        await addNotification({
            userId: student.id,
            message: `New ${item.type} posted for ${subject.name}: "${item.title}"`,
            category: 'general'
        });
    }

    revalidateAll();
    const newAssignment: Assignment = { ...item, id, createdAt };
    return Promise.resolve(newAssignment);
}

export async function getAssignmentsForFaculty(facultyId: string): Promise<EnrichedAssignment[]> {
    const db = getDb();
    const stmt = db.prepare(`
        SELECT 
            a.*,
            s.name as subjectName,
            c.name as className,
            f.name as facultyName,
            (SELECT COUNT(*) FROM submissions sub WHERE sub.assignmentId = a.id) as submissionCount
        FROM assignments a
        JOIN subjects s ON a.subjectId = s.id
        JOIN classes c ON a.classId = c.id
        JOIN faculty f ON a.facultyId = f.id
        WHERE a.facultyId = ?
        ORDER BY a.createdAt DESC
    `);
    return stmt.all(facultyId) as EnrichedAssignment[];
}

export async function getAssignmentsForStudent(studentId: string): Promise<(EnrichedAssignment & { submission: Submission | null })[]> {
    const db = getDb();
    const student = db.prepare('SELECT classId FROM students WHERE id = ?').get(studentId) as { classId: string };
    if (!student) return [];

    const assignments = db.prepare(`
        SELECT 
            a.*,
            s.name as subjectName,
            c.name as className,
            f.name as facultyName,
            (SELECT COUNT(*) FROM submissions sub WHERE sub.assignmentId = a.id) as submissionCount
        FROM assignments a
        JOIN subjects s ON a.subjectId = s.id
        JOIN classes c ON a.classId = c.id
        JOIN faculty f ON a.facultyId = f.id
        WHERE a.classId = ?
        ORDER BY a.createdAt DESC
    `).all(student.classId) as EnrichedAssignment[];
    
    const submissions: Submission[] = db.prepare('SELECT * FROM submissions WHERE studentId = ?').all(studentId) as Submission[];
    const submissionMap = new Map(submissions.map(s => [s.assignmentId, s]));

    return assignments.map(a => ({
        ...a,
        submission: submissionMap.get(a.id) || null
    }));
}


export async function addSubmission(item: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission> {
    const db = getDb();
    const id = `SUBM${Date.now()}`;
    const submittedAt = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM submissions WHERE assignmentId = ? AND studentId = ?').get(item.assignmentId, item.studentId);
    if (existing) {
        throw new Error("You have already submitted this assignment.");
    }
    
    const stmt = db.prepare(
        'INSERT INTO submissions (id, assignmentId, studentId, fileUrl, submittedAt) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(id, item.assignmentId, item.studentId, item.fileUrl, submittedAt);

    // Notify faculty
    const assignment = db.prepare('SELECT facultyId, title FROM assignments WHERE id = ?').get(item.assignmentId) as { facultyId: string, title: string };
    const student = db.prepare('SELECT name FROM students WHERE id = ?').get(item.studentId) as { name: string };
    if (assignment && student) {
        await addNotification({
            userId: assignment.facultyId,
            message: `${student.name} submitted their work for "${assignment.title}".`,
            category: 'general'
        });
    }

    revalidateAll();
    const newSubmission: Submission = { ...item, id, submittedAt };
    return Promise.resolve(newSubmission);
}


export async function getSubmissionsForAssignment(assignmentId: string): Promise<EnrichedSubmission[]> {
    const db = getDb();
    const stmt = db.prepare(`
        SELECT 
            sub.*,
            s.name as studentName,
            s.enrollmentNumber as studentEnrollmentNumber
        FROM submissions sub
        JOIN students s ON sub.studentId = s.id
        WHERE sub.assignmentId = ?
        ORDER BY sub.submittedAt ASC
    `);
    return stmt.all(assignmentId) as EnrichedSubmission[];
}

export async function gradeSubmission(submissionId: string, grade: string, remarks?: string): Promise<Submission> {
    const db = getDb();
    const stmt = db.prepare('UPDATE submissions SET grade = ?, remarks = ? WHERE id = ?');
    stmt.run(grade, remarks, submissionId);

    revalidateAll();
    const updatedSubmission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId) as Submission;
    
    // Notify student
     const submission = db.prepare(`
        SELECT sub.studentId, a.title 
        FROM submissions sub JOIN assignments a ON sub.assignmentId = a.id 
        WHERE sub.id = ?`).get(submissionId) as { studentId: string, title: string};
    if (submission) {
        await addNotification({
            userId: submission.studentId,
            message: `Your submission for "${submission.title}" has been graded: ${grade}`,
            category: 'general'
        });
    }

    return Promise.resolve(updatedSubmission);
}
