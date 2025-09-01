
'use server';

import { revalidatePath } from 'next/cache';
import { students as initialStudents } from '@/lib/placeholder-data';
import type { Student } from '@/lib/types';
import { authService } from './auth';

// This is a server-side in-memory store.
// In a real application, you would use a database.
// We use a global variable to simulate persistence across requests in a dev environment.
if (!(global as any).students) {
  (global as any).students = [...initialStudents];
}
let students: Student[] = (global as any).students;


function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getStudents() {
  return Promise.resolve(students);
}

export async function addStudent(item: Omit<Student, 'id' | 'streak'> & { streak?: number }) {
    const newItem: Student = {
        ...item,
        id: `STU${Date.now()}`,
        streak: item.streak || 0,
        avatar: item.avatar || `https://avatar.vercel.sh/${item.email}.png`
    };

    // Add to auth system
    await authService.addUser({
      id: newItem.id,
      email: newItem.email,
      password: 'student123', // Set a default password for new students
      role: 'student',
      details: newItem
    });
    
    students.push(newItem);
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateStudent(updatedItem: Student) {
    const index = students.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
        students[index] = updatedItem;
    }
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteStudent(id: string) {
    students = students.filter(item => item.id !== id);
    (global as any).students = students;
    revalidateAll();
    return Promise.resolve(id);
}
