
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Result, EnrichedResult } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/student', 'layout');
}

function getGrade(marks: number | null, totalMarks: number | null): string {
    if (marks === null || totalMarks === null || totalMarks === 0) return 'N/A';
    const percentage = (marks / totalMarks) * 100;
    if (percentage >= 90) return 'O';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
}

function getGradePoint(grade: string | null): number {
    if (!grade) return 0;
    switch(grade.toUpperCase()) {
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
        r.examType,
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
        r.examType,
        s.name as studentName,
        sub.name as subjectName,
        sub.code as subjectCode
    FROM results r
    JOIN students s ON r.studentId = s.id
    JOIN subjects sub ON r.subjectId = sub.id
    WHERE r.studentId = ?
    ORDER BY r.semester, r.examType
  `);
  const results = stmt.all(studentId) as any[];
  return results.map(r => ({
      ...r,
      marks: r.marks,
      totalMarks: r.totalMarks,
  }))
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
        let semesterGradePoints = 0;
        
        // Use a map to handle internal and external results for the same subject
        const subjectGradeMap = new Map<string, number>();

        semesterResults.forEach(r => {
            const gradePoint = getGradePoint(r.grade);
            if (!subjectGradeMap.has(r.subjectId) || gradePoint > (subjectGradeMap.get(r.subjectId) ?? 0)) {
                subjectGradeMap.set(r.subjectId, gradePoint);
            }
        });
        
        semesterGradePoints = Array.from(subjectGradeMap.values()).reduce((sum, gp) => sum + gp, 0);

        totalGradePoints += semesterGradePoints;
        totalSubjects += subjectGradeMap.size;
        
        const sgpa = subjectGradeMap.size > 0 ? semesterGradePoints / subjectGradeMap.size : 0;
        if (sem === semesters[semesters.length - 1]) {
            latestSemesterSgpa = sgpa;
        }
    });

    const cgpa = totalSubjects > 0 ? totalGradePoints / totalSubjects : 0;

    db.prepare('UPDATE students SET sgpa = ?, cgpa = ? WHERE id = ?').run(latestSemesterSgpa.toFixed(2), cgpa.toFixed(2), studentId);
}

export async function addOrUpdateResults(results: (Omit<Result, 'id'>)[]) {
    const db = getDb();
    
    const studentIds = new Set(results.map(r => r.studentId));

    const insertOrUpdateStmt = db.prepare(`
      INSERT INTO results (id, studentId, subjectId, semester, marks, totalMarks, grade, examType) 
      VALUES (@id, @studentId, @subjectId, @semester, @marks, @totalMarks, @grade, @examType)
      ON CONFLICT(studentId, subjectId, semester, examType) DO UPDATE SET
        marks = excluded.marks,
        totalMarks = excluded.totalMarks,
        grade = excluded.grade
    `);

    db.transaction(() => {
        for (const item of results) {
             const id = `RES${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
             let finalGrade = item.grade;
             if (item.examType === 'internal') {
                finalGrade = getGrade(item.marks, item.totalMarks);
             }

             insertOrUpdateStmt.run({
                id,
                studentId: item.studentId,
                subjectId: item.subjectId,
                semester: item.semester,
                marks: item.marks,
                totalMarks: item.totalMarks,
                grade: finalGrade,
                examType: item.examType,
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

    