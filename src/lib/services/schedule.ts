'use server';

import { revalidatePath } from 'next/cache';
import { schedule as initialSchedule } from '@/lib/placeholder-data';
import type { Schedule } from '@/lib/types';

// This is a server-side in-memory store.
// In a real application, you would use a database.
let schedule: Schedule[] = [...initialSchedule];

function revalidateAll() {
    revalidatePath('/admin/schedule');
    revalidatePath('/faculty');
    revalidatePath('/student');
}

export async function getSchedule() {
  return Promise.resolve(schedule);
}

export async function addSchedule(item: Omit<Schedule, 'id'>) {
    const newItem: Schedule = {
        ...item,
        id: `SCH${Date.now()}`,
    };
    schedule = [...schedule, newItem];
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSchedule(updatedItem: Schedule) {
    schedule = schedule.map(item => 
        item.id === updatedItem.id ? updatedItem : item
    );
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteSchedule(id: string) {
    schedule = schedule.filter(item => item.id !== id);
    revalidateAll();
    return Promise.resolve(id);
}
