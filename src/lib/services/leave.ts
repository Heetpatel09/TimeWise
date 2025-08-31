
'use server';

import { revalidatePath } from 'next/cache';
import { leaveRequests as initialLeaveRequests } from '@/lib/placeholder-data';
import type { LeaveRequest } from '@/lib/types';

// This is a server-side in-memory store.
// In a real application, you would use a database.
let leaveRequests: LeaveRequest[] = [...initialLeaveRequests];

export async function getLeaveRequests() {
  return Promise.resolve(leaveRequests);
}

export async function addLeaveRequest(request: Omit<LeaveRequest, 'id' | 'status'>) {
    const newRequest: LeaveRequest = {
        ...request,
        id: `LR${Date.now()}`,
        status: 'pending',
    };
    leaveRequests = [...leaveRequests, newRequest];
    revalidatePath('/admin/leave-requests');
    revalidatePath('/admin');
    return Promise.resolve(newRequest);
}

export async function updateLeaveRequestStatus(id: string, status: 'approved' | 'rejected') {
    leaveRequests = leaveRequests.map(req => 
        req.id === id ? { ...req, status } : req
    );
    revalidatePath('/admin/leave-requests');
    revalidatePath('/admin');
    return Promise.resolve(leaveRequests.find(req => req.id === id));
}
