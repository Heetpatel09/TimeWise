
'use server';

import { revalidatePath } from 'next/cache';
import { scheduleChangeRequests as initialRequests } from '@/lib/placeholder-data';
import type { ScheduleChangeRequest } from '@/lib/types';

// This is a server-side in-memory store.
// In a real application, you would use a database.
let requests: ScheduleChangeRequest[] = [...initialRequests];

export async function getScheduleChangeRequests() {
  return Promise.resolve(requests);
}

export async function addScheduleChangeRequest(request: Omit<ScheduleChangeRequest, 'id' | 'status'>) {
    const newRequest: ScheduleChangeRequest = {
        ...request,
        id: `SCR${Date.now()}`,
        status: 'pending',
    };
    requests = [...requests, newRequest];
    revalidatePath('/admin/schedule-requests');
    revalidatePath('/admin');
    return Promise.resolve(newRequest);
}

export async function updateScheduleChangeRequestStatus(id: string, status: 'resolved') {
    requests = requests.map(req => 
        req.id === id ? { ...req, status } : req
    );
    revalidatePath('/admin/schedule-requests');
    revalidatePath('/admin');
    return Promise.resolve(requests.find(req => req.id === id));
}
