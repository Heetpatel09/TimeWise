

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Student } from '@/lib/types';
import { addCredential } from './auth';
import { generateWelcomeNotification } from '@/ai/flows/generate-welcome-notification-flow';
import { addNotification } from './notifications';
import { getClasses } from './classes';
import { randomBytes } from 'crypto';

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

export async function addStudent(
    item: Omit<Student, 'id' | 'streak' | 'profileCompleted'> & { streak?: number, profileCompleted?: number },
    password?: string
) {
    const db = getDb();
    const id = `STU${Date.now()}`;
    const newItem: Student = {
        ...item,
        id,
        streak: item.streak || 0,
        avatar: item.avatar || `https://avatar.vercel.sh/${item.email}.png`,
        profileCompleted: item.profileCompleted || 0,
    };

    const stmt = db.prepare('INSERT INTO students (id, name, email, classId, streak, avatar, profileCompleted) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, newItem.email, newItem.classId, newItem.streak, newItem.avatar, newItem.profileCompleted);

    // When adding a student via the admin UI, an initial password is required.
    const initialPassword = password || randomBytes(8).toString('hex');
    await addCredential({
      userId: newItem.id,
      email: newItem.email,
      password: initialPassword,
      role: 'student',
      requiresPasswordChange: true
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
    }

    revalidateAll();
    return Promise.resolve({ ...newItem, initialPassword: password ? undefined : initialPassword });
}

export async function updateStudent(updatedItem: Student): Promise<Student> {
    const db = getDb();
    const oldStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(updatedItem.id) as Student | undefined;

    if (!oldStudent) {
        throw new Error("Student not found.");
    }
    
    const stmt = db.prepare('UPDATE students SET name = ?, email = ?, classId = ?, streak = ?, avatar = ?, profileCompleted = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.email, updatedItem.classId, updatedItem.streak, updatedItem.avatar, updatedItem.profileCompleted, updatedItem.id);
    
    if (oldStudent.email !== updatedItem.email) {
         await addCredential({
            userId: updatedItem.id,
            email: updatedItem.email,
            role: 'student',
        });
    }

    revalidateAll();
    const finalStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(updatedItem.id) as Student;
    return Promise.resolve(finalStudent);
}

export async function deleteStudent(id: string) {
    const db = getDb();
    
    const credStmt = db.prepare('DELETE FROM user_credentials WHERE userId = ?');
    credStmt.run(id);

    const stmt = db.prepare('DELETE FROM students WHERE id = ?');
    stmt.run(id);

    revalidateAll();
    return Promise.resolve(id);
}

    