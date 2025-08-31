'use server';

import { revalidatePath } from 'next/cache';
import { leaveRequests as initialLeaveRequests } from '@/lib/placeholder-data';
import type { LeaveRequest } from '@/lib/types';

// This is a server-side in-memory store.
// In a real application, you would use a database.
// We use a global variable to simulate persistence across requests in a dev environment.
if (!(global as any).leaveRequests) {
  (global as any).leaveRequests = [...initialLeaveRequests];
}
let leaveRequests: LeaveRequest[] = (global as any).leaveRequests;


export async function getLeaveRequests() {
  return Promise.resolve(leaveRequests);
}

export async function addLeaveRequest(request: Omit<LeaveRequest, 'id' | 'status'>) {
    const newRequest: LeaveRequest = {
        ...request,
        id: `LR${Date.now()}`,
        status: 'pending',
    };
    leaveRequests.push(newRequest);
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(newRequest);
}

export async function updateLeaveRequestStatus(id: string, status: 'approved' | 'rejected') {
    const index = leaveRequests.findIndex(req => req.id === id);
    if (index !== -1) {
        leaveRequests[index] = { ...leaveRequests[index], status };
    }
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(leaveRequests.find(req => req.id === id));
}
