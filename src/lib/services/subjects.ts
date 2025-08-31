'use server';

import { revalidatePath } from 'next/cache';
import { subjects as initialSubjects } from '@/lib/placeholder-data';
import type { Subject } from '@/lib/types';

// This is a server-side in-memory store.
// In a real application, you would use a database.
// We use a global variable to simulate persistence across requests in a dev environment.
if (!(global as any).subjects) {
  (global as any).subjects = [...initialSubjects];
}
let subjects: Subject[] = (global as any).subjects;


function revalidateAll() {
    revalidatePath('/admin', 'layout');
}

export async function getSubjects() {
  return Promise.resolve(subjects);
}

export async function addSubject(item: Omit<Subject, 'id'>) {
    const newItem: Subject = {
        ...item,
        id: `SUB${Date.now()}`,
    };
    subjects.push(newItem);
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSubject(updatedItem: Subject) {
    const index = subjects.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
        subjects[index] = updatedItem;
    }
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteSubject(id: string) {
    subjects = subjects.filter(item => item.id !== id);
    (global as any).subjects = subjects;
    revalidateAll();
    return Promise.resolve(id);
}
