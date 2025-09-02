'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { ScheduleChangeRequest } from '@/lib/types';

export async function getScheduleChangeRequests(): Promise<ScheduleChangeRequest[]> {
  const stmt = db.prepare('SELECT * FROM schedule_change_requests');
  return stmt.all() as ScheduleChangeRequest[];
}

export async function addScheduleChangeRequest(request: Omit<ScheduleChangeRequest, 'id' | 'status'>) {
    const id = `SCR${Date.now()}`;
    const status = 'pending';
    const stmt = db.prepare('INSERT INTO schedule_change_requests (id, scheduleId, facultyId, reason, status, requestedClassroomId) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, request.scheduleId, request.facultyId, request.reason, status, request.requestedClassroomId || null);

    const newRequest: ScheduleChangeRequest = { ...request, id, status };
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(newRequest);
}

export async function updateScheduleChangeRequestStatus(id: string, status: 'resolved') {
    const stmt = db.prepare('UPDATE schedule_change_requests SET status = ? WHERE id = ?');
    stmt.run(status, id);
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    const request = db.prepare('SELECT * FROM schedule_change_requests WHERE id = ?').get(id) as ScheduleChangeRequest | undefined;
    return Promise.resolve(request);
}
