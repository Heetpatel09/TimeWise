
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { Faculty } from '@/lib/types';
import { authService } from './auth';


function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
}

export async function getFaculty(): Promise<Faculty[]> {
  const stmt = db.prepare('SELECT * FROM faculty');
  return stmt.all() as Faculty[];
}

export async function addFaculty(item: Omit<Faculty, 'id' | 'streak'> & { streak?: number }) {
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
    await authService.addUser({
      id: newItem.id,
      email: newItem.email,
      password: initialPassword,
      role: 'faculty',
    });

    revalidateAll();
    return Promise.resolve({ ...newItem, initialPassword });
}

export async function updateFaculty(updatedItem: Faculty): Promise<Faculty> {
    const oldFaculty: Faculty | undefined = db.prepare('SELECT * FROM faculty WHERE id = ?').get(updatedItem.id) as any;
    
    if (oldFaculty && oldFaculty.email !== updatedItem.email) {
        await authService.updateUserEmail(oldFaculty.email, updatedItem.email);
    }
    
    const stmt = db.prepare('UPDATE faculty SET name = ?, email = ?, department = ?, streak = ?, avatar = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.email, updatedItem.department, updatedItem.streak, updatedItem.avatar, updatedItem.id);
    
    revalidateAll();
    return updatedItem;
}

export async function deleteFaculty(id: string) {
    const stmt = db.prepare('DELETE FROM faculty WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}
