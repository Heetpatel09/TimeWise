'use server';

import { revalidatePath } from 'next/cache';
import { subjects as initialSubjects } from '@/lib/placeholder-data';
import type { Subject } from '@/lib/types';

// This is a server-side in-memory store.
// In a real application, you would use a database.
let subjects: Subject[] = [...initialSubjects];

function revalidateAll() {
    revalidatePath('/admin');
}

export async function getSubjects() {
  return Promise.resolve(subjects);
}

export async function addSubject(item: Omit<Subject, 'id'>) {
    const newItem: Subject = {
        ...item,
        id: `SUB${Date.now()}`,
    };
    subjects = [...subjects, newItem];
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSubject(updatedItem: Subject) {
    subjects = subjects.map(item => 
        item.id === updatedItem.id ? updatedItem : item
    );
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteSubject(id: string) {
    subjects = subjects.filter(item => item.id !== id);
    revalidateAll();
    return Promise.resolve(id);
}
