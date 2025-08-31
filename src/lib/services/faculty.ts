
'use server';

import { revalidatePath } from 'next/cache';
import { faculty as initialFaculty } from '@/lib/placeholder-data';
import type { Faculty } from '@/lib/types';
import { authService } from './auth';

// This is a server-side in-memory store.
// In a real application, you would use a database.
// We use a global variable to simulate persistence across requests in a dev environment.
if (!(global as any).faculty) {
  (global as any).faculty = [...initialFaculty];
}
let faculty: Faculty[] = (global as any).faculty;


function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
}

export async function getFaculty() {
  return Promise.resolve(faculty);
}

export async function addFaculty(item: Omit<Faculty, 'id' | 'streak'> & { streak?: number }) {
    const newItem: Faculty = {
        ...item,
        id: `FAC${Date.now()}`,
        streak: item.streak || 0,
        avatar: item.avatar || `https://avatar.vercel.sh/${item.email}.png`
    };
    
    // Add to auth system
    const initialPassword = 'faculty123';
    await authService.addUser({
      id: newItem.id,
      email: newItem.email,
      password: initialPassword,
      role: 'faculty',
      details: newItem
    });

    faculty.push(newItem);
    revalidateAll();

    // Return the new item along with its initial password for the admin
    return Promise.resolve({ ...newItem, initialPassword });
}

export async function updateFaculty(updatedItem: Faculty) {
    const index = faculty.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
        faculty[index] = updatedItem;
    }
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteFaculty(id: string) {
    faculty = faculty.filter(item => item.id !== id);
    (global as any).faculty = faculty;
    revalidateAll();
    return Promise.resolve(id);
}
