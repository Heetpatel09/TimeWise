
'use server';

import { db as getDb } from '@/lib/db';
import type { Student, EnrichedSchedule, Subject, EnrichedResult, Event, LeaveRequest, Fee, EnrichedFee, Exam, EnrichedExam } from '@/lib/types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getStudentAttendance } from '@/lib/services/attendance';


export async function getStudentDashboardData(studentId: string) {
    const db = getDb();
    const student: (Student & { className: string, department: string }) | undefined = db.prepare(`
        SELECT s.*, c.name as className, c.department
        FROM students s
        JOIN classes c ON s.classId = c.id
        WHERE s.id = ?
    `).get(studentId) as any;

    if (!student) {
        throw new Error('Student not found');
    }

    const schedule: EnrichedSchedule[] = db.prepare(`
        SELECT 
            sch.id, sch.classId, sch.subjectId, sch.facultyId, sch.classroomId, sch.day, sch.time,
            sub.name as subjectName, sub.isSpecial as subjectIsSpecial,
            fac.name as facultyName, cls.name as className, crm.name as classroomName, crm.type as classroomType
        FROM schedule sch
        JOIN subjects sub ON sch.subjectId = sub.id
        JOIN faculty fac ON sch.facultyId = fac.id
        JOIN classes cls ON sch.classId = cls.id
        JOIN classrooms crm ON sch.classroomId = crm.id
        WHERE sch.classId = ?
    `).all(student.classId) as EnrichedSchedule[];
    
    const events: Event[] = db.prepare('SELECT * FROM events WHERE userId = ?').all(studentId) as Event[];
    const leaveRequests: LeaveRequest[] = db.prepare('SELECT * FROM leave_requests WHERE requesterId = ?').all(studentId) as LeaveRequest[];
    
    const results: EnrichedResult[] = (db.prepare(`
        SELECT r.*, s.name as subjectName, s.code as subjectCode 
        FROM results r JOIN subjects s ON r.subjectId = s.id WHERE r.studentId = ?
    `).all(studentId) as any[]).map(r => ({ ...r, studentName: student.name }));
    
    const fees: EnrichedFee[] = (db.prepare(`
        SELECT * FROM fees WHERE studentId = ?
    `).all(studentId) as any[]).map(f => ({ ...f, studentName: student.name, studentEnrollmentNumber: student.enrollmentNumber }));
    
    const exams: EnrichedExam[] = (db.prepare(`
        SELECT e.*, s.name as subjectName, c.name as className, cr.name as classroomName
        FROM exams e
        JOIN subjects s ON e.subjectId = s.id
        JOIN classes c ON e.classId = c.id
        LEFT JOIN classrooms cr ON e.classroomId = cr.id
        WHERE e.classId = ?
    `).all(student.classId) as any[]);

    return { 
        student, 
        schedule,
        events,
        leaveRequests,
        results,
        fees,
        exams,
    };
}


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
            sub.isSpecial as subjectIsSpecial,
            fac.name as facultyName,
            cls.name as className,
            crm.name as classroomName,
            crm.type as classroomType
        FROM schedule sch
        JOIN subjects sub ON sch.subjectId = sub.id
        JOIN faculty fac ON sch.facultyId = fac.id
        JOIN classes cls ON sch.classId = cls.id
        JOIN classrooms crm ON sch.classroomId = crm.id
        WHERE sch.classId = ?
    `).all(student.classId) as EnrichedSchedule[];

    const enrichedSchedule = schedule.map(s => ({
        ...s,
        subjectIsSpecial: !!s.subjectIsSpecial
    }));

    return { student, schedule: enrichedSchedule };
}

export async function getSubjectsForStudent(studentId: string): Promise<Subject[]> {
    const db = getDb();
    const studentClass: { semester: number } | undefined = db.prepare(`
        SELECT c.semester 
        FROM students s
        JOIN classes c ON s.classId = c.id
        WHERE s.id = ?
    `).get(studentId) as any;

    if (!studentClass) {
        return [];
    }

    const subjects = db.prepare('SELECT * FROM subjects WHERE semester = ?').all(studentClass.semester) as any[];
    return subjects.map(s => ({ ...s, isSpecial: !!s.isSpecial }));
}

export async function exportResultsToPDF(
    student: Student,
    results: EnrichedResult[],
    semester: number
): Promise<{ pdf?: string, error?: string }> {
    try {
        const doc = new jsPDF();
        doc.text(`Result for ${student.name} - Semester ${semester}`, 14, 16);
        doc.text(`Class: ${student.className}`, 14, 22);

        const tableData = results.map(res => {
            if (res.examType === 'internal') {
                return [res.subjectName, 'Internal', res.marks, res.totalMarks, res.grade];
            }
            return [res.subjectName, 'External', '-', '-', res.grade];
        });

        (doc as any).autoTable({
            head: [['Subject', 'Type', 'Marks Obtained', 'Total Marks', 'Grade']],
            body: tableData,
            startY: 30,
        });

        const pdfOutput = doc.output('datauristring');
        // Return base64 part of the data URI
        return { pdf: pdfOutput.split(',')[1] };
    } catch (error: any) {
        console.error('PDF generation failed:', error);
        return { error: error.message || 'Failed to generate PDF.' };
    }
}
