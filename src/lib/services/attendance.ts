
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Attendance, EnrichedAttendance } from '@/lib/types';
import { addNotification } from './notifications';
import { adminUser } from '../placeholder-data';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getAttendanceForSlot(scheduleId: string, date: string): Promise<Attendance[]> {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM attendance WHERE scheduleId = ? AND date = ?');
    return stmt.all(scheduleId, date) as Attendance[];
}

export async function getStudentAttendance(studentId: string): Promise<EnrichedAttendance[]> {
    const db = getDb();
    const stmt = db.prepare(`
        SELECT 
            a.*,
            s.name as studentName,
            sch.day,
            sch.time,
            sub.name as subjectName
        FROM attendance a
        JOIN students s ON a.studentId = s.id
        JOIN schedule sch ON a.scheduleId = sch.id
        JOIN subjects sub ON sch.subjectId = sub.id
        WHERE a.studentId = ? 
        ORDER BY a.date DESC, a.timestamp DESC
    `);
    const results = stmt.all(studentId) as any[];
    return results.map(r => ({ ...r, isLocked: !!r.isLocked }));
}


export async function upsertAttendance(records: Omit<Attendance, 'id' | 'timestamp' | 'isLocked'>[]): Promise<void> {
    const db = getDb();
    
    const transaction = db.transaction(() => {
        for (const record of records) {
            const updateStmt = db.prepare(`
                UPDATE attendance 
                SET status = ?, timestamp = ? 
                WHERE scheduleId = ? AND studentId = ? AND date = ? AND isLocked = 0
            `);
            const insertStmt = db.prepare(`
                INSERT INTO attendance (id, scheduleId, studentId, date, status, isLocked, timestamp) 
                VALUES (?, ?, ?, ?, ?, 0, ?)
            `);
            
            const timestamp = new Date().toISOString();
            const result = updateStmt.run(record.status, timestamp, record.scheduleId, record.studentId, record.date);

            if (result.changes === 0) {
                const existing = db.prepare('SELECT id, isLocked FROM attendance WHERE scheduleId = ? AND studentId = ? AND date = ?').get(record.scheduleId, record.studentId, record.date) as { id: string, isLocked: number} | undefined;
                if (!existing) {
                    const id = `ATT${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
                    insertStmt.run(id, record.scheduleId, record.studentId, record.date, record.status, timestamp);
                }
            }
        }
    });

    transaction();
    revalidateAll();
}

export async function disputeAttendance(attendanceId: string, studentId: string): Promise<void> {
    const db = getDb();

    const record: Attendance | undefined = db.prepare('SELECT * FROM attendance WHERE id = ? AND studentId = ?').get(attendanceId, studentId) as any;

    if (!record) {
        throw new Error('Attendance record not found.');
    }
    if (record.isLocked) {
        throw new Error('Attendance is locked and cannot be disputed.');
    }
    if (record.status !== 'absent') {
        throw new Error('Only absent records can be disputed.');
    }

    db.prepare('UPDATE attendance SET status = ? WHERE id = ?').run('disputed', attendanceId);
    
    // Notify faculty
    const schedule = db.prepare('SELECT facultyId FROM schedule WHERE id = ?').get(record.scheduleId) as { facultyId: string };
    if (schedule) {
        const student = db.prepare('SELECT name FROM students WHERE id = ?').get(studentId) as { name: string };
        await addNotification({
            userId: schedule.facultyId,
            message: `${student.name} has disputed an attendance record for your class.`,
            category: 'requests'
        });
    }

    revalidateAll();
}

export async function getAllAttendanceRecords(): Promise<EnrichedAttendance[]> {
    const db = getDb();
    const stmt = db.prepare(`
        SELECT 
            a.*,
            s.name as studentName,
            c.name as className,
            sub.name as subjectName,
            f.name as facultyName,
            sch.day,
            sch.time
        FROM attendance a
        JOIN students s ON a.studentId = s.id
        JOIN schedule sch ON a.scheduleId = sch.id
        JOIN classes c ON sch.classId = c.id
        JOIN subjects sub ON sch.subjectId = sub.id
        JOIN faculty f ON sch.facultyId = f.id
        ORDER BY a.date DESC
    `);
     const results = stmt.all() as any[];
    return results.map(r => ({ ...r, isLocked: !!r.isLocked }));
}


export async function lockAttendanceSlot(scheduleId: string, date: string): Promise<void> {
    const db = getDb();
    db.prepare('UPDATE attendance SET isLocked = 1 WHERE scheduleId = ? AND date = ?').run(scheduleId, date);
    revalidateAll();
}
