
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Student } from '@/lib/types';
import { addUser, updateUserEmail } from './auth';
import { generateWelcomeNotification } from '@/ai/flows/generate-welcome-notification-flow';
import { addNotification } from './notifications';
import { getClasses } from './classes';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getStudents(): Promise<Student[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM students');
  const results = stmt.all() as any[];
  // Ensure plain objects are returned
  return JSON.parse(JSON.stringify(results.map(s => ({ ...s, avatar: s.avatar || `https://avatar.vercel.sh/${s.email}.png` }))));
}

export async function addStudent(item: Omit<Student, 'id' | 'streak'> & { streak?: number }) {
    const db = getDb();
    const id = `STU${Date.now()}`;
    const newItem: Student = {
        ...item,
        id,
        streak: item.streak || 0,
        avatar: item.avatar || `https://avatar.vercel.sh/${item.email}.png`
    };

    const stmt = db.prepare('INSERT INTO students (id, name, email, classId, streak, avatar) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, newItem.email, newItem.classId, newItem.streak, newItem.avatar);

    await addUser({
      id: newItem.id,
      email: newItem.email,
      password: 'student123',
      role: 'student',
    });
    
    // Generate welcome notification
    try {
        const classes = await getClasses();
        const className = classes.find(c => c.id === newItem.classId)?.name || 'their new class';
        const notificationResult = await generateWelcomeNotification({
            name: newItem.name,
            role: 'student',
            context: className
        });
        await addNotification({
            userId: newItem.id,
            message: notificationResult.message
        });
    } catch (e: any) {
        console.error("Failed to generate welcome notification for student:", e.message);
        // Don't block user creation if notification fails
    }

    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateStudent(updatedItem: Student): Promise<Student> {
    const db = getDb();
    const oldStudent: Student | undefined = db.prepare('SELECT * FROM students WHERE id = ?').get(updatedItem.id) as any;

    if (oldStudent && oldStudent.email !== updatedItem.email) {
        await updateUserEmail(oldStudent.email, updatedItem.email);
    }
    
    const stmt = db.prepare('UPDATE students SET name = ?, email = ?, classId = ?, streak = ?, avatar = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.email, updatedItem.classId, updatedItem.streak, updatedItem.avatar, updatedItem.id);
    
    revalidateAll();
    const updatedStudent = { ...updatedItem, avatar: updatedItem.avatar || `https://avatar.vercel.sh/${updatedItem.email}.png`};
    return updatedStudent;
}

export async function deleteStudent(id: string) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM students WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}
