
'use server';

import { revalidatePath } from 'next/cache';
import { leaveRequests as initialLeaveRequests } from '@/lib/placeholder-data';
import type { LeaveRequest } from '@/lib/types';
import { addNotification } from './notifications';

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
    leaveRequests.unshift(newRequest);
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(newRequest);
}

export async function updateLeaveRequestStatus(id: string, status: 'approved' | 'rejected') {
    const index = leaveRequests.findIndex(req => req.id === id);
    if (index !== -1) {
        const request = leaveRequests[index];
        request.status = status;
        
        await addNotification({
            userId: request.facultyId,
            message: `Your leave request from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} has been ${status}.`
        });
    }
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(leaveRequests.find(req => req.id === id));
}
