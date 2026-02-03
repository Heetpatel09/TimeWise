
'use server';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Schedule, Class, Subject, Faculty, Classroom } from '@/lib/types';

export async function exportScheduleToPDF(
    schedule: Schedule[],
    classes: Class[],
    subjects: Subject[],
    faculty: Faculty[],
    classrooms: Classroom[]
): Promise<{ pdf?: string, error?: string }> {
    try {
        const getRelationInfo = (id: string, type: 'class' | 'subject' | 'faculty' | 'classroom') => {
            switch (type) {
                case 'class': return classes.find(c => c.id === id);
                case 'subject': return subjects.find(s => s.id === id);
                case 'faculty': return faculty.find(f => f.id === id);
                case 'classroom': return classrooms.find(cr => cr.id === id);
                default: return undefined;
            }
        };

        const doc = new jsPDF();
        doc.text("Master Schedule", 14, 16);
        
        const tableData = schedule.map(slot => [
            slot.day,
            slot.time,
            getRelationInfo(slot.classId, 'class')?.name,
            getRelationInfo(slot.subjectId, 'subject')?.name,
            getRelationInfo(slot.facultyId, 'faculty')?.name,
            getRelationInfo(slot.classroomId, 'classroom')?.name,
        ]);

        (doc as any).autoTable({
            head: [['Day', 'Time', 'Class', 'Subject', 'Faculty', 'Classroom']],
            body: tableData,
            startY: 20,
        });

        const pdfOutput = doc.output('datauristring');
        // Return base64 part of the data URI
        return { pdf: pdfOutput.split(',')[1] };
    } catch (error: any) {
        console.error('PDF generation failed:', error);
        return { error: error.message || 'Failed to generate PDF.' };
    }
}
