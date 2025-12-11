
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Result, EnrichedResult } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/student', 'layout');
}

function getGrade(marks: number, totalMarks: number): string {
    const percentage = (marks / totalMarks) * 100;
    if (percentage >= 90) return 'O';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
}

function getGradePoint(grade: string): number {
    switch(grade) {
        case 'O': return 10;
        case 'A': return 9;
        case 'B': return 8;
        case 'C': return 7;
        case 'D': return 6;
        case 'E': return 5;
        default: return 0;
    }
}

export async function getResults(): Promise<EnrichedResult[]> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
        r.id,
        r.studentId,
        r.subjectId,
        r.semester,
        r.marks,
        r.totalMarks,
        r.grade,
        s.name as studentName,
        sub.name as subjectName,
        sub.code as subjectCode
    FROM results r
    JOIN students s ON r.studentId = s.id
    JOIN subjects sub ON r.subjectId = sub.id
  `);
  return stmt.all() as EnrichedResult[];
}

export async function getResultsForStudent(studentId: string): Promise<EnrichedResult[]> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
        r.id,
        r.studentId,
        r.subjectId,
        r.semester,
        r.marks,
        r.totalMarks,
        r.grade,
        s.name as studentName,
        sub.name as subjectName,
        sub.code as subjectCode
    FROM results r
    JOIN students s ON r.studentId = s.id
    JOIN subjects sub ON r.subjectId = sub.id
    WHERE r.studentId = ?
    ORDER BY r.semester
  `);
  return stmt.all(studentId) as EnrichedResult[];
}

async function calculateAndSaveGpa(studentId: string) {
    const db = getDb();
    const results: Result[] = db.prepare('SELECT * FROM results WHERE studentId = ?').all(studentId) as any[];

    if (results.length === 0) {
        db.prepare('UPDATE students SET sgpa = 0, cgpa = 0 WHERE id = ?').run(studentId);
        return;
    }

    const resultsBySemester: Record<number, Result[]> = {};
    results.forEach(r => {
        if (!resultsBySemester[r.semester]) {
            resultsBySemester[r.semester] = [];
        }
        resultsBySemester[r.semester].push(r);
    });

    let totalGradePoints = 0;
    let totalSubjects = 0;
    let latestSemesterSgpa = 0;

    const semesters = Object.keys(resultsBySemester).map(Number).sort((a,b) => a-b);
    
    semesters.forEach(sem => {
        const semesterResults = resultsBySemester[sem];
        const semesterGradePoints = semesterResults.reduce((sum, r) => sum + getGradePoint(r.grade), 0);
        totalGradePoints += semesterGradePoints;
        totalSubjects += semesterResults.length;
        
        const sgpa = semesterResults.length > 0 ? semesterGradePoints / semesterResults.length : 0;
        if (sem === semesters[semesters.length - 1]) {
            latestSemesterSgpa = sgpa;
        }
    });

    const cgpa = totalSubjects > 0 ? totalGradePoints / totalSubjects : 0;

    db.prepare('UPDATE students SET sgpa = ?, cgpa = ? WHERE id = ?').run(latestSemesterSgpa.toFixed(2), cgpa.toFixed(2), studentId);
}

export async function addResult(item: Omit<Result, 'id' | 'grade' | 'totalMarks'> & { totalMarks?: number }) {
    const db = getDb();
    const id = `RES${Date.now()}`;
    const totalMarks = item.totalMarks || 100;
    const grade = getGrade(item.marks, totalMarks);
    
    const stmt = db.prepare('INSERT OR REPLACE INTO results (id, studentId, subjectId, semester, marks, totalMarks, grade) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, item.studentId, item.subjectId, item.semester, item.marks, totalMarks, grade);

    await calculateAndSaveGpa(item.studentId);
    
    revalidateAll();
    const newItem: Result = { ...item, id, grade, totalMarks };
    return Promise.resolve(newItem);
}

export async function addOrUpdateResults(results: (Omit<Result, 'id' | 'grade' | 'totalMarks'> & { totalMarks?: number })[]) {
    const db = getDb();
    
    const studentIds = new Set(results.map(r => r.studentId));

    const insertStmt = db.prepare(`
      INSERT INTO results (id, studentId, subjectId, semester, marks, totalMarks, grade) 
      VALUES (@id, @studentId, @subjectId, @semester, @marks, @totalMarks, @grade)
      ON CONFLICT(studentId, subjectId, semester) DO UPDATE SET
        marks = excluded.marks,
        totalMarks = excluded.totalMarks,
        grade = excluded.grade
    `);

    db.transaction(() => {
        for (const item of results) {
             const id = `RES${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
             const totalMarks = item.totalMarks || 100;
             const grade = getGrade(item.marks, totalMarks);
             insertStmt.run({
                id,
                studentId: item.studentId,
                subjectId: item.subjectId,
                semester: item.semester,
                marks: item.marks,
                totalMarks: totalMarks,
                grade: grade,
             });
        }
    })();
    
    for (const studentId of studentIds) {
        await calculateAndSaveGpa(studentId);
    }

    revalidateAll();
    return Promise.resolve(true);
}


export async function deleteResult(id: string) {
    const db = getDb();
    const result: Result | undefined = db.prepare('SELECT * FROM results WHERE id = ?').get(id) as any;
    
    if (result) {
        const stmt = db.prepare('DELETE FROM results WHERE id = ?');
        stmt.run(id);
        await calculateAndSaveGpa(result.studentId);
    }
    
    revalidateAll();
    return Promise.resolve(id);
}

    

    