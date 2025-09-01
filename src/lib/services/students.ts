
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { Student } from '@/lib/types';
import { authService } from './auth';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getStudents(): Promise<Student[]> {
  const stmt = db.prepare('SELECT * FROM students');
  return stmt.all() as Student[];
}

export async function addStudent(item: Omit<Student, 'id' | 'streak'> & { streak?: number }) {
    const id = `STU${Date.now()}`;
    const newItem: Student = {
        ...item,
        id,
        streak: item.streak || 0,
        avatar: item.avatar || `https://avatar.vercel.sh/${item.email}.png`
    };

    const stmt = db.prepare('INSERT INTO students (id, name, email, classId, streak, avatar) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, newItem.email, newItem.classId, newItem.streak, newItem.avatar);

    await authService.addUser({
      id: newItem.id,
      email: newItem.email,
      password: 'student123',
      role: 'student',
    });
    
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateStudent(updatedItem: Student): Promise<Student> {
    const oldStudent: Student | undefined = db.prepare('SELECT * FROM students WHERE id = ?').get(updatedItem.id) as any;

    if (oldStudent && oldStudent.email !== updatedItem.email) {
        await authService.updateUserEmail(oldStudent.email, updatedItem.email);
    }
    
    const stmt = db.prepare('UPDATE students SET name = ?, email = ?, classId = ?, streak = ?, avatar = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.email, updatedItem.classId, updatedItem.streak, updatedItem.avatar, updatedItem.id);
    
    revalidateAll();
    return updatedItem;
}

export async function deleteStudent(id: string) {
    const stmt = db.prepare('DELETE FROM students WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}
