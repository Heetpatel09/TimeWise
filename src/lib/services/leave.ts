
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { LeaveRequest } from '@/lib/types';
import { addNotification } from './notifications';

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
    const stmt = db.prepare('SELECT * FROM leave_requests ORDER BY startDate DESC');
    return stmt.all() as LeaveRequest[];
}

export async function addLeaveRequest(request: Omit<LeaveRequest, 'id' | 'status'>) {
    const id = `LR${Date.now()}`;
    const status = 'pending';
    const stmt = db.prepare('INSERT INTO leave_requests (id, requesterId, requesterName, requesterRole, startDate, endDate, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, request.requesterId, request.requesterName, request.requesterRole, request.startDate, request.endDate, request.reason, status);

    const newRequest: LeaveRequest = { ...request, id, status };
    revalidatePath('/admin', 'layout');
    revalidatePath(`/${request.requesterRole}`, 'layout');
    return Promise.resolve(newRequest);
}

export async function updateLeaveRequestStatus(id: string, status: 'approved' | 'rejected') {
    const stmt = db.prepare('UPDATE leave_requests SET status = ? WHERE id = ?');
    stmt.run(status, id);
    
    const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id) as LeaveRequest | undefined;

    if (request) {
        await addNotification({
            userId: request.requesterId,
            message: `Your leave request from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} has been ${status}.`
        });
    }

    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
    return Promise.resolve(request);
}

export async function deleteResolvedLeaveRequests() {
    const stmt = db.prepare("DELETE FROM leave_requests WHERE status != 'pending'");
    stmt.run();
    revalidatePath('/admin', 'layout');
    return Promise.resolve();
}
