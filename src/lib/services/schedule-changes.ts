'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { ScheduleChangeRequest } from '@/lib/types';
import { addNotification } from './notifications';

export async function getScheduleChangeRequests(): Promise<ScheduleChangeRequest[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM schedule_change_requests');
  return stmt.all() as ScheduleChangeRequest[];
}

export async function addScheduleChangeRequest(request: Omit<ScheduleChangeRequest, 'id' | 'status'>) {
    const db = getDb();
    const id = `SCR${Date.now()}`;
    const status = 'pending';
    const stmt = db.prepare('INSERT INTO schedule_change_requests (id, scheduleId, facultyId, reason, status, requestedClassroomId) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, request.scheduleId, request.facultyId, request.reason, status, request.requestedClassroomId || null);

    const newRequest: ScheduleChangeRequest = { ...request, id, status };
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(newRequest);
}

export async function updateScheduleChangeRequestStatus(id: string, status: 'resolved' | 'rejected') {
    const db = getDb();
    const stmt = db.prepare('UPDATE schedule_change_requests SET status = ? WHERE id = ?');
    stmt.run(status, id);
    
    const request = db.prepare('SELECT * FROM schedule_change_requests WHERE id = ?').get(id) as ScheduleChangeRequest | undefined;

    if (request) {
        let message = `Your schedule change request for slot ${request.scheduleId} has been ${status}.`;
        if (status === 'rejected') {
            message = `Your schedule change request has been rejected. Please contact administration for details.`
        }
        await addNotification({
            userId: request.facultyId,
            message: message,
        });
    }

    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(request);
}
