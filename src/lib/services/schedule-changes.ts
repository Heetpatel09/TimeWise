'use server';

import { revalidatePath } from 'next/cache';
import { scheduleChangeRequests as initialRequests } from '@/lib/placeholder-data';
import type { ScheduleChangeRequest } from '@/lib/types';

// This is a server-side in-memory store.
// In a real application, you would use a database.
// We use a global variable to simulate persistence across requests in a dev environment.
if (!(global as any).scheduleChangeRequests) {
  (global as any).scheduleChangeRequests = [...initialRequests];
}
let requests: ScheduleChangeRequest[] = (global as any).scheduleChangeRequests;


export async function getScheduleChangeRequests() {
  return Promise.resolve(requests);
}

export async function addScheduleChangeRequest(request: Omit<ScheduleChangeRequest, 'id' | 'status'>) {
    const newRequest: ScheduleChangeRequest = {
        ...request,
        id: `SCR${Date.now()}`,
        status: 'pending',
    };
    requests.push(newRequest);
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(newRequest);
}

export async function updateScheduleChangeRequestStatus(id: string, status: 'resolved') {
    const index = requests.findIndex(req => req.id === id);
    if (index !== -1) {
        requests[index] = { ...requests[index], status };
    }
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(requests.find(req => req.id === id));
}
