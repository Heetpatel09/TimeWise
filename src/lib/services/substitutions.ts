'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { SubstituteAssignment, EnrichedSubstituteAssignment, EnrichedSchedule } from '@/lib/types';
import { addNotification } from './notifications';

export async function getSubstituteAssignments(): Promise<SubstituteAssignment[]> {
  const stmt = db.prepare('SELECT * FROM substitute_assignments');
  return stmt.all() as SubstituteAssignment[];
}

export async function getEnrichedSubstituteAssignments(): Promise<EnrichedSubstituteAssignment[]> {
    const assignments = db.prepare('SELECT * FROM substitute_assignments').all() as SubstituteAssignment[];
    
    const enrichedAssignments = assignments.map(assignment => {
        const schedule: EnrichedSchedule | undefined = db.prepare(`
            SELECT 
                sch.*,
                sub.name as subjectName,
                fac.name as facultyName,
                cls.name as className,
                crm.name as classroomName
            FROM schedule sch
            JOIN subjects sub ON sch.subjectId = sub.id
            JOIN faculty fac ON sch.facultyId = fac.id
            JOIN classes cls ON sch.classId = cls.id
            JOIN classrooms crm ON sch.classroomId = crm.id
            WHERE sch.id = ?
        `).get(assignment.scheduleId) as any;

        const originalFaculty = db.prepare('SELECT name FROM faculty WHERE id = ?').get(assignment.originalFacultyId) as { name: string };
        const substituteFaculty = db.prepare('SELECT name FROM faculty WHERE id = ?').get(assignment.substituteFacultyId) as { name: string };

        return {
            ...assignment,
            schedule,
            originalFacultyName: originalFaculty?.name || 'N/A',
            substituteFacultyName: substituteFaculty?.name || 'N/A'
        };
    });

    return enrichedAssignments.filter(a => a.schedule); // Filter out any assignments where schedule might not be found
}

export async function getSubstituteAssignmentsForFaculty(facultyId: string): Promise<EnrichedSubstituteAssignment[]> {
    const assignments = db.prepare('SELECT * FROM substitute_assignments WHERE substituteFacultyId = ? AND status = ?').all(facultyId, 'approved') as SubstituteAssignment[];
    
    const enrichedAssignments = assignments.map(assignment => {
        const schedule: EnrichedSchedule | undefined = db.prepare(`
            SELECT 
                sch.*,
                sub.name as subjectName,
                fac.name as facultyName,
                cls.name as className,
                crm.name as classroomName
            FROM schedule sch
            JOIN subjects sub ON sch.subjectId = sub.id
            JOIN faculty fac ON sch.facultyId = fac.id
            JOIN classes cls ON sch.classId = cls.id
            JOIN classrooms crm ON sch.classroomId = crm.id
            WHERE sch.id = ?
        `).get(assignment.scheduleId) as any;

        const originalFaculty = db.prepare('SELECT name FROM faculty WHERE id = ?').get(assignment.originalFacultyId) as { name: string };

        return {
            ...assignment,
            schedule,
            originalFacultyName: originalFaculty?.name || 'N/A',
            substituteFacultyName: '' // Not needed here
        };
    });

    return enrichedAssignments.filter(a => a.schedule);
}

export async function addSubstituteAssignment(request: Omit<SubstituteAssignment, 'id' | 'status'>) {
    const id = `SUB_REQ_${Date.now()}`;
    const status = 'pending';
    const stmt = db.prepare('INSERT INTO substitute_assignments (id, scheduleId, originalFacultyId, substituteFacultyId, date, status) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, request.scheduleId, request.originalFacultyId, request.substituteFacultyId, request.date, status);

    const newRequest: SubstituteAssignment = { ...request, id, status };
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(newRequest);
}

export async function updateSubstituteAssignmentStatus(id: string, status: 'approved' | 'rejected') {
    const stmt = db.prepare('UPDATE substitute_assignments SET status = ? WHERE id = ?');
    stmt.run(status, id);
    
    const assignment = db.prepare('SELECT * FROM substitute_assignments WHERE id = ?').get(id) as SubstituteAssignment | undefined;

    if (assignment) {
        // Notify original faculty
        await addNotification({
            userId: assignment.originalFacultyId,
            message: `Your substitute request for ${assignment.date} has been ${status}.`
        });
        // Notify substitute faculty if approved
        if (status === 'approved') {
            await addNotification({
                userId: assignment.substituteFacultyId,
                message: `You have been approved to substitute a class on ${assignment.date}.`
            });
        }
    }

    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(assignment);
}
