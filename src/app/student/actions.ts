
'use server';

import { db as getDb } from '@/lib/db';
import type { Student, EnrichedSchedule } from '@/lib/types';

export async function getTimetableDataForStudent(studentId: string) {
    const db = getDb();
    const student: (Student & { className: string }) | undefined = db.prepare(`
        SELECT s.*, c.name as className
        FROM students s
        JOIN classes c ON s.classId = c.id
        WHERE s.id = ?
    `).get(studentId) as any;

    if (!student) {
        throw new Error('Student not found');
    }

    const schedule: EnrichedSchedule[] = db.prepare(`
        SELECT 
            sch.id,
            sch.classId,
            sch.subjectId,
            sch.facultyId,
            sch.classroomId,
            sch.day,
            sch.time,
            sub.name as subjectName,
            fac.name as facultyName,
            cls.name as className,
            crm.name as classroomName
        FROM schedule sch
        JOIN subjects sub ON sch.subjectId = sub.id
        JOIN faculty fac ON sch.facultyId = fac.id
        JOIN classes cls ON sch.classId = cls.id
        JOIN classrooms crm ON sch.classroomId = crm.id
        WHERE sch.classId = ?
    `).all(student.classId) as EnrichedSchedule[];

    return { student, schedule };
}
