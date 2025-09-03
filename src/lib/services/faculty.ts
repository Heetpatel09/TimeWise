

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Faculty } from '@/lib/types';
import { addCredential } from './auth';
import { generateWelcomeNotification } from '@/ai/flows/generate-welcome-notification-flow';
import { addNotification } from './notifications';
import { randomBytes } from 'crypto';


function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
}

export async function getFaculty(): Promise<Faculty[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM faculty');
  const results = stmt.all() as any[];
  // Ensure plain objects are returned
  return JSON.parse(JSON.stringify(results.map(f => ({ ...f, avatar: f.avatar || `https://avatar.vercel.sh/${f.email}.png` }))));
}

export async function addFaculty(
    item: Omit<Faculty, 'id' | 'streak' | 'profileCompleted'> & { streak?: number, profileCompleted?: number },
    password?: string
) {
    const db = getDb();
    const id = `FAC${Date.now()}`;
    const newItem: Faculty = {
        ...item,
        id,
        streak: item.streak || 0,
        avatar: item.avatar || `https://avatar.vercel.sh/${item.email}.png`,
        profileCompleted: item.profileCompleted || 0
    };
    
    const stmt = db.prepare('INSERT INTO faculty (id, name, email, department, streak, avatar, profileCompleted) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, newItem.email, newItem.department, newItem.streak, newItem.avatar, newItem.profileCompleted);

    const initialPassword = password || randomBytes(8).toString('hex');
    await addCredential({
      userId: newItem.id,
      email: newItem.email,
      password: initialPassword,
      role: 'faculty',
      requiresPasswordChange: true,
    });

    // Generate welcome notification
    try {
        const notificationResult = await generateWelcomeNotification({
            name: newItem.name,
            role: 'faculty',
            context: newItem.department
        });
        await addNotification({
            userId: newItem.id,
            message: notificationResult.message
        });
    } catch (e: any) {
        console.error("Failed to generate welcome notification for faculty:", e.message);
        // Don't block user creation if notification fails
    }


    revalidateAll();
    return Promise.resolve({ ...newItem, initialPassword: password ? undefined : initialPassword });
}

export async function updateFaculty(updatedItem: Faculty): Promise<Faculty> {
    const db = getDb();
    const oldFaculty = db.prepare('SELECT * FROM faculty WHERE id = ?').get(updatedItem.id) as Faculty | undefined;
    if (!oldFaculty) {
        throw new Error("Faculty member not found.");
    }
    
    const stmt = db.prepare('UPDATE faculty SET name = ?, email = ?, department = ?, streak = ?, avatar = ?, profileCompleted = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.email, updatedItem.department, updatedItem.streak, updatedItem.avatar, updatedItem.profileCompleted, updatedItem.id);

    if (oldFaculty.email !== updatedItem.email) {
        await addCredential({
            userId: updatedItem.id,
            email: updatedItem.email,
            role: 'faculty',
        });
    }
    
    revalidateAll();
    const finalFaculty = db.prepare('SELECT * FROM faculty WHERE id = ?').get(updatedItem.id) as Faculty;
    return Promise.resolve(finalFaculty);
}

export async function deleteFaculty(id: string) {
    const db = getDb();

    // Check if faculty is in use
    const inUse = db.prepare('SELECT 1 FROM schedule WHERE facultyId = ? LIMIT 1').get(id);
    if (inUse) {
        throw new Error("Cannot delete faculty that is currently assigned to a schedule. Please re-assign their classes first.");
    }
    
    // Also delete from user_credentials
    db.prepare('DELETE FROM user_credentials WHERE userId = ?').run(id);

    const stmt = db.prepare('DELETE FROM faculty WHERE id = ?');
    stmt.run(id);

    revalidateAll();
    return Promise.resolve(id);
}

    