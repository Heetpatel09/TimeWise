'use server';

import { revalidatePath } from 'next/cache';
import { faculty as initialFaculty } from '@/lib/placeholder-data';
import type { Faculty } from '@/lib/types';

// This is a server-side in-memory store.
// In a real application, you would use a database.
let faculty: Faculty[] = [...initialFaculty];

function revalidateAll() {
    revalidatePath('/admin');
}

export async function getFaculty() {
  return Promise.resolve(faculty);
}

export async function addFaculty(item: Omit<Faculty, 'id'>) {
    const newItem: Faculty = {
        ...item,
        id: `FAC${Date.now()}`,
        streak: item.streak || 0,
    };
    faculty = [...faculty, newItem];
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateFaculty(updatedItem: Faculty) {
    faculty = faculty.map(item => 
        item.id === updatedItem.id ? updatedItem : item
    );
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteFaculty(id: string) {
    faculty = faculty.filter(item => item.id !== id);
    revalidateAll();
    return Promise.resolve(id);
}
