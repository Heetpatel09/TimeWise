
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Faculty } from '@/lib/types';
import { addUser, updateUserEmail } from './auth';
import { generateWelcomeNotification } from '@/ai/flows/generate-welcome-notification-flow';
import { addNotification } from './notifications';


function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
}

export async function getFaculty(): Promise<Faculty[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT id, name, email, department, streak, avatar FROM faculty');
  const results = stmt.all() as any[];
  return results;
}

export async function addFaculty(item: Omit<Faculty, 'id' | 'streak'> & { streak?: number }) {
    const db = getDb();
    const id = `FAC${Date.now()}`;
    const newItem: Faculty = {
        ...item,
        id,
        streak: item.streak || 0,
        avatar: item.avatar || `https://avatar.vercel.sh/${item.email}.png`
    };
    
    const stmt = db.prepare('INSERT INTO faculty (id, name, email, department, streak, avatar) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, newItem.email, newItem.department, newItem.streak, newItem.avatar);

    const initialPassword = 'faculty123';
    await addUser({
      id: newItem.id,
      email: newItem.email,
      password: initialPassword,
      role: 'faculty',
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
    return Promise.resolve({ ...newItem, initialPassword });
}

export async function updateFaculty(updatedItem: Faculty): Promise<Faculty> {
    const db = getDb();
    const oldFaculty: Faculty | undefined = db.prepare('SELECT * FROM faculty WHERE id = ?').get(updatedItem.id) as any;
    
    if (oldFaculty && oldFaculty.email !== updatedItem.email) {
        await updateUserEmail(oldFaculty.email, updatedItem.email);
    }
    
    const stmt = db.prepare('UPDATE faculty SET name = ?, email = ?, department = ?, streak = ?, avatar = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.email, updatedItem.department, updatedItem.streak, updatedItem.avatar, updatedItem.id);
    
    revalidateAll();
    return updatedItem;
}

export async function deleteFaculty(id: string) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM faculty WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}
