'use server';

import { revalidatePath } from 'next/cache';
import { students as initialStudents } from '@/lib/placeholder-data';
import type { Student } from '@/lib/types';

// This is a server-side in-memory store.
// In a real application, you would use a database.
let students: Student[] = [...initialStudents];

function revalidateAll() {
    revalidatePath('/admin');
}

export async function getStudents() {
  return Promise.resolve(students);
}

export async function addStudent(item: Omit<Student, 'id'>) {
    const newItem: Student = {
        ...item,
        id: `STU${Date.now()}`,
        streak: item.streak || 0,
    };
    students = [...students, newItem];
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateStudent(updatedItem: Student) {
    students = students.map(item => 
        item.id === updatedItem.id ? updatedItem : item
    );
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteStudent(id: string) {
    students = students.filter(item => item.id !== id);
    revalidateAll();
    return Promise.resolve(id);
}
