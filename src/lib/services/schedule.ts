'use server';

import { revalidatePath } from 'next/cache';
import { schedule as initialSchedule } from '@/lib/placeholder-data';
import type { Schedule } from '@/lib/types';

// This is a server-side in-memory store.
// In a real application, you would use a database.
// We use a global variable to simulate persistence across requests in a dev environment.
if (!(global as any).schedule) {
  (global as any).schedule = [...initialSchedule];
}
let schedule: Schedule[] = (global as any).schedule;

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getSchedule() {
  return Promise.resolve(schedule);
}

export async function addSchedule(item: Omit<Schedule, 'id'>) {
    const newItem: Schedule = {
        ...item,
        id: `SCH${Date.now()}`,
    };
    schedule.push(newItem);
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSchedule(updatedItem: Schedule) {
    const index = schedule.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
        schedule[index] = updatedItem;
    } else {
        schedule.push(updatedItem); // If it's a new item from AI, add it
    }
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteSchedule(id: string) {
    schedule = schedule.filter(item => item.id !== id);
    (global as any).schedule = schedule;
    revalidateAll();
    return Promise.resolve(id);
}
