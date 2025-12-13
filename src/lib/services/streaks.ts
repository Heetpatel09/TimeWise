

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Student, Faculty, Attendance } from '@/lib/types';
import { format, subDays, startOfDay } from 'date-fns';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

/**
 * Calculates a streak based on consecutive days of attendance.
 * Similar to Snapchat streaks.
 */
function calculateAttendanceStreak(attendanceRecords: Pick<Attendance, 'date'>[]): number {
    if (attendanceRecords.length === 0) return 0;
    
    // Get unique, sorted dates
    const attendedDates = [...new Set(attendanceRecords.map(r => format(startOfDay(new Date(r.date)), 'yyyy-MM-dd')))].sort().reverse();
    
    let streak = 0;
    let currentDate = startOfDay(new Date());

    // Check if today is an attended day
    if (attendedDates[0] === format(currentDate, 'yyyy-MM-dd')) {
        streak++;
        currentDate = subDays(currentDate, 1);
    } else {
        // If they haven't attended today, the streak is based on days before today
        currentDate = subDays(currentDate, 1);
    }
    
    // Continue checking backwards from yesterday
    let i = streak; // Start from 1 if today was attended, 0 otherwise
    while (i < attendedDates.length) {
        const expectedDate = format(currentDate, 'yyyy-MM-dd');
        if (attendedDates[i] === expectedDate) {
            streak++;
            currentDate = subDays(currentDate, 1);
            i++;
        } else {
            // Break the streak if a day is missed
            break;
        }
    }
    
    return streak;
}


export async function updateAllStreaks() {
    const db = getDb();
    
    // Update faculty streaks based on teaching
    const allFaculty: Faculty[] = db.prepare('SELECT id FROM faculty').all() as any[];
    const facultyUpdateStmt = db.prepare('UPDATE faculty SET streak = ? WHERE id = ?');

    allFaculty.forEach(faculty => {
        const facultyAttendance = db.prepare(
            'SELECT DISTINCT date FROM attendance WHERE scheduleId IN (SELECT id FROM schedule WHERE facultyId = ?)'
        ).all(faculty.id) as Pick<Attendance, 'date'>[];
        const streak = calculateAttendanceStreak(facultyAttendance);
        facultyUpdateStmt.run(streak, faculty.id);
    });

    // Update student streaks based on attendance
    const allStudents: Student[] = db.prepare('SELECT id FROM students').all() as any[];
    const studentUpdateStmt = db.prepare('UPDATE students SET streak = ? WHERE id = ?');

    allStudents.forEach(student => {
        const studentAttendance = db.prepare(
            "SELECT date FROM attendance WHERE studentId = ? AND status = 'present'"
        ).all(student.id) as Pick<Attendance, 'date'>[];
        const streak = calculateAttendanceStreak(studentAttendance);
        studentUpdateStmt.run(streak, student.id);
    });

    revalidateAll();
    return Promise.resolve({ success: true });
}

export async function getLeaderboardData(filter: 'student' | 'faculty', department?: string, batch?: string) {
    const db = getDb();
    let query;
    const params: (string | number)[] = [];

    if (filter === 'student') {
        query = `
            SELECT s.id, s.name, s.avatar, s.points, s.department
            FROM students s 
            JOIN classes c ON s.classId = c.id
        `;
        const whereClauses = [];
        if (department) {
            whereClauses.push('c.department = ?');
            params.push(department);
        }
        if (batch) {
            whereClauses.push('s.batch = ?');
            params.push(batch);
        }
        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }
        query += ' ORDER BY s.points DESC';
    } else { // faculty
        query = 'SELECT id, name, avatar, points, department FROM faculty';
        if (department) {
            query += ' WHERE department = ?';
            params.push(department);
        }
        query += ' ORDER BY points DESC';
    }

    return db.prepare(query).all(...params);
}
