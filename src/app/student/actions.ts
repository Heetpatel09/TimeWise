

'use server';

import { db as getDb } from '@/lib/db';
import type { Student, EnrichedSchedule, Subject, EnrichedResult, Event, LeaveRequest, Fee, EnrichedFee, Exam, EnrichedExam, EnrichedAttendance } from '@/lib/types';

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

    const schedule: EnrichedSchedule[] = (db.prepare(`
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
    `).all(student.classId) as any[]).map(s => ({...s, subjectIsSpecial: !!s.subjectIsSpecial }));
    
    const events: Event[] = (db.prepare('SELECT * FROM events WHERE userId = ?').all(student.id) as any[]).map(e => ({...e, reminder: !!e.reminder}));
    const leaveRequests: LeaveRequest[] = db.prepare('SELECT * FROM leave_requests WHERE requesterId = ?').all(student.id) as LeaveRequest[];
    
    const results: EnrichedResult[] = (db.prepare(`
        SELECT r.*, s.name as subjectName, s.code as subjectCode 
        FROM results r JOIN subjects s ON r.subjectId = s.id WHERE r.studentId = ?
    `).all(student.id) as any[]).map(r => ({ ...r, studentName: student.name }));
    
    const fees: EnrichedFee[] = (db.prepare(`
        SELECT * FROM fees WHERE studentId = ?
    `).all(student.id) as any[]).map(f => ({ ...f, studentName: student.name, studentEnrollmentNumber: student.enrollmentNumber }));
    
    const exams: EnrichedExam[] = (db.prepare(`
        SELECT e.*, s.name as subjectName, c.name as className, cr.name as classroomName
        FROM exams e
        JOIN subjects s ON e.subjectId = s.id
        JOIN classes c ON e.classId = c.id
        LEFT JOIN classrooms cr ON e.classroomId = cr.id
        WHERE e.classId = ?
    `).all(student.classId) as any[]);

    const attendance: EnrichedAttendance[] = (db.prepare(`
        SELECT 
            a.*,
            s.name as studentName,
            sch.day,
            sch.time,
            sub.name as subjectName,
            c.name as className,
            f.name as facultyName
        FROM attendance a
        JOIN students s ON a.studentId = s.id
        JOIN schedule sch ON a.scheduleId = sch.id
        JOIN subjects sub ON sch.subjectId = sub.id
        JOIN classes c ON sch.classId = c.id
        JOIN faculty f ON sch.facultyId = f.id
        WHERE a.studentId = ? 
        ORDER BY a.date DESC, a.timestamp DESC
    `).all(studentId) as any[]).map(r => ({ ...r, isLocked: !!r.isLocked }));

    return { 
        student, 
        schedule,
        events,
        leaveRequests,
        results,
        fees,
        exams,
        attendance,
    };
}

export async function getClassLeaderboard(classId: string) {
    const db = getDb();
    const studentsInClass: Student[] = db.prepare('SELECT id, name, cgpa, avatar FROM students WHERE classId = ?').all(classId) as any[];

    const allAttendance: { studentId: string, status: 'present' | 'absent' }[] = db.prepare(`
        SELECT studentId, status 
        FROM attendance 
        WHERE studentId IN (SELECT id FROM students WHERE classId = ?)
    `).all(classId) as any[];

    const attendanceStats = studentsInClass.map(student => {
        const studentRecords = allAttendance.filter(rec => rec.studentId === student.id);
        const presentCount = studentRecords.filter(rec => rec.status === 'present').length;
        const totalCount = studentRecords.length;
        const percentage = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
        return {
            id: student.id,
            name: student.name,
            avatar: student.avatar,
            attendancePercentage: percentage,
        };
    });

    const cgpaLeaderboard = [...studentsInClass].sort((a, b) => b.cgpa - a.cgpa);
    const attendanceLeaderboard = attendanceStats.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
    
    return { cgpaLeaderboard, attendanceLeaderboard };
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

    const schedule: EnrichedSchedule[] = (db.prepare(`
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
    `).all(student.classId) as any[]).map(s => ({...s, subjectIsSpecial: !!s.subjectIsSpecial}));

    return { student, schedule };
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
    student: Student & { className: string },
    results: EnrichedResult[],
    semester: number
): Promise<{ pdf?: string, error?: string }> {
    try {
        const doc = new (await import('jspdf')).default();
        (await import('jspdf-autotable')).default;

        doc.text(`Result for ${student.name} - Semester ${semester}`, 14, 16);
        doc.text(`Class: ${student.className}`, 14, 22);
        doc.text(`CGPA: ${student.cgpa.toFixed(2)} | SGPA: ${student.sgpa.toFixed(2)}`, 14, 28);


        const tableData = results.map(res => {
            const internalMarks = res.examType === 'internal' ? `${res.marks ?? '-'} / ${res.totalMarks ?? '-'}` : '-';
            const externalGrade = res.examType === 'external' ? res.grade : '-';
            return [res.subjectName, internalMarks, externalGrade, res.grade];
        });
        
        const subjectMap = new Map<string, { subjectName: string, subjectCode: string, internal: string, external: string, finalGrade: string }>();

        results.forEach(res => {
            if (!subjectMap.has(res.subjectId)) {
                subjectMap.set(res.subjectId, {
                    subjectName: res.subjectName,
                    subjectCode: res.subjectCode,
                    internal: '-',
                    external: '-',
                    finalGrade: '-'
                });
            }
            const entry = subjectMap.get(res.subjectId)!;
            if (res.examType === 'internal') {
                entry.internal = `${res.marks ?? '-'} / ${res.totalMarks ?? '-'}`;
                // Assuming internal marks contribute to final grade if external is not present
                if (!entry.finalGrade || entry.finalGrade === '-') {
                    entry.finalGrade = res.grade || '-';
                }
            } else {
                entry.external = res.grade || '-';
                entry.finalGrade = res.grade || '-'; 
            }
        });


        const finalTableData = Array.from(subjectMap.values()).map(item => [
            item.subjectName,
            item.subjectCode,
            item.internal,
            item.external,
            item.finalGrade
        ]);

        (doc as any).autoTable({
            head: [['Subject', 'Code', 'Internal Marks', 'External Grade', 'Final Grade']],
            body: finalTableData,
            startY: 35,
        });

        const pdfOutput = doc.output('datauristring');
        return { pdf: pdfOutput.split(',')[1] };
    } catch (error: any) {
        console.error('PDF generation failed:', error);
        return { error: error.message || 'Failed to generate PDF.' };
    }
}


export async function exportFeeReceiptToPDF(
    fee: EnrichedFee,
): Promise<{ pdf?: string, error?: string }> {
     try {
        const doc = new (await import('jspdf')).default();
        (await import('jspdf-autotable')).default;

        // Header
        doc.setFontSize(22);
        doc.text("Fee Receipt", 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text("TimeWise University", 105, 28, { align: 'center' });
        
        // Receipt Info
        doc.setFontSize(10);
        doc.text(`Receipt No: ${fee.transactionId}`, 14, 40);
        doc.text(`Payment Date: ${fee.paymentDate ? new Date(fee.paymentDate).toLocaleDateString() : 'N/A'}`, 170, 40, { align: 'right' });
        
        doc.line(14, 45, 196, 45); // separator

        // Student Details
        doc.setFontSize(12);
        doc.text("Student Details", 14, 55);
        doc.setFontSize(10);
        (doc as any).autoTable({
            body: [
                ['Name', fee.studentName],
                ['Enrollment No.', fee.studentEnrollmentNumber],
                ['Semester', fee.semester.toString()],
            ],
            startY: 60,
            theme: 'plain',
            styles: { fontSize: 10 },
        });

        // Payment Details
        const finalY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(12);
        doc.text("Payment Details", 14, finalY + 15);
        (doc as any).autoTable({
            head: [['Description', 'Amount']],
            body: [
                [`${fee.feeType.charAt(0).toUpperCase() + fee.feeType.slice(1)} Fee`, `$${fee.amount.toFixed(2)}`],
            ],
            startY: finalY + 20,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
        });
        
        // Total
        const finalY2 = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Paid:', 140, finalY2 + 10);
        doc.text(`$${fee.amount.toFixed(2)}`, 196, finalY2 + 10, { align: 'right' });

        // Footer
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text("This is a computer-generated receipt and does not require a signature.", 105, 280, { align: 'center' });


        const pdfOutput = doc.output('datauristring');
        return { pdf: pdfOutput.split(',')[1] };

     } catch (error: any) {
        console.error('PDF generation failed:', error);
        return { error: error.message || 'Failed to generate PDF.' };
     }
}
