

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Student, Class, Department } from '@/lib/types';
import { addCredential } from './auth';
import { generateWelcomeNotificationFlow as generateWelcomeNotification } from '@/ai/flows/generate-welcome-notification-flow';
import { addNotification } from './notifications';
import { getClasses } from './classes';
import { randomBytes } from 'crypto';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/student', 'layout');
    revalidatePath('/faculty', 'layout');
}

export async function getStudents(): Promise<(Student & { className: string })[]> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT s.*, c.name as className 
    FROM students s
    LEFT JOIN classes c ON s.classId = c.id
  `);
  const results = stmt.all() as any[];
  // Ensure plain objects are returned
  return JSON.parse(JSON.stringify(results.map(s => ({ ...s, avatar: s.avatar || `https://avatar.vercel.sh/${s.email}.png` }))));
}

export async function getStudentsByClass(classId: string): Promise<Student[]> {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM students WHERE classId = ?');
    const results = stmt.all(classId) as any[];
    return JSON.parse(JSON.stringify(results.map(s => ({ ...s, avatar: s.avatar || `https://avatar.vercel.sh/${s.email}.png` }))));
}

export async function addStudent(
    item: Omit<Student, 'id' | 'profileCompleted' | 'sgpa' | 'cgpa' | 'streak' | 'points'> & { profileCompleted?: number, sgpa?: number, cgpa?: number, streak?: number, points?: number },
    password?: string
) {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM students WHERE email = ?').get(item.email);
    if (existing) {
        throw new Error('A student with this email already exists.');
    }
    
    const id = `STU${Date.now()}`;
    const newItem: Student = {
        ...item,
        id,
        avatar: item.avatar || `https://avatar.vercel.sh/${item.email}.png`,
        profileCompleted: item.profileCompleted || 0,
        sgpa: item.sgpa || 0,
        cgpa: item.cgpa || 0,
        streak: item.streak || 0,
        points: item.points || 0,
    };

    const stmt = db.prepare('INSERT INTO students (id, name, email, enrollmentNumber, rollNumber, batch, phone, classId, avatar, profileCompleted, sgpa, cgpa, streak, points, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, newItem.email, newItem.enrollmentNumber, newItem.rollNumber, newItem.batch, newItem.phone, newItem.classId, newItem.avatar, newItem.profileCompleted, newItem.sgpa, newItem.cgpa, newItem.streak, newItem.points, newItem.category);

    const initialPassword = password || randomBytes(8).toString('hex');
    await addCredential({
      userId: newItem.id,
      email: newItem.email,
      password: initialPassword,
      role: 'student',
      requiresPasswordChange: !password
    });
    
    try {
        const classes: Class[] = await getClasses();
        const className = classes.find(c => c.id === newItem.classId)?.name || 'their new class';
        const notificationResult = await generateWelcomeNotification({
            name: newItem.name,
            role: 'student',
            context: className
        });
        await addNotification({
            userId: newItem.id,
            message: notificationResult,
            category: 'general'
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
    
    const stmt = db.prepare('UPDATE students SET name = ?, email = ?, enrollmentNumber = ?, rollNumber = ?, batch = ?, phone = ?, classId = ?, avatar = ?, profileCompleted = ?, sgpa = ?, cgpa = ?, streak = ?, points = ?, category = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.email, updatedItem.enrollmentNumber, updatedItem.rollNumber, updatedItem.batch, updatedItem.phone, updatedItem.classId, updatedItem.avatar, updatedItem.profileCompleted, updatedItem.sgpa, updatedItem.cgpa, updatedItem.streak, updatedItem.points, updatedItem.category, updatedItem.id);
    
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
