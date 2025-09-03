
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Admin } from '@/lib/types';
import { addCredential } from './auth';
import { randomBytes } from 'crypto';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
}

export async function getAdmins(): Promise<Admin[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM admins');
  const results = stmt.all() as any[];
  return JSON.parse(JSON.stringify(results.map(a => ({ ...a, avatar: a.avatar || `https://avatar.vercel.sh/${a.email}.png` }))));
}

export async function addAdmin(item: Omit<Admin, 'id'>) {
    const db = getDb();
    const id = `ADM${Date.now()}`;
    const newItem: Admin = {
        ...item,
        id,
        avatar: item.avatar || `https://avatar.vercel.sh/${item.email}.png`,
    };
    
    const stmt = db.prepare('INSERT INTO admins (id, name, email, avatar) VALUES (?, ?, ?, ?)');
    stmt.run(id, newItem.name, newItem.email, newItem.avatar);

    const initialPassword = randomBytes(8).toString('hex');
    await addCredential({
      userId: newItem.id,
      email: newItem.email,
      password: initialPassword,
      role: 'admin',
      requiresPasswordChange: true,
    });

    revalidateAll();
    return Promise.resolve({ ...newItem, initialPassword });
}

export async function updateAdmin(updatedItem: Admin): Promise<Admin> {
    const db = getDb();
    const oldAdmin = db.prepare('SELECT * FROM admins WHERE id = ?').get(updatedItem.id) as Admin | undefined;
    if (!oldAdmin) {
        throw new Error("Admin not found.");
    }
    
    const stmt = db.prepare('UPDATE admins SET name = ?, email = ?, avatar = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.email, updatedItem.avatar, updatedItem.id);

    if (oldAdmin.email !== updatedItem.email) {
        await addCredential({
            userId: updatedItem.id,
            email: updatedItem.email,
            role: 'admin',
        });
    }
    
    revalidateAll();
    const finalAdmin = db.prepare('SELECT * FROM admins WHERE id = ?').get(updatedItem.id) as Admin;
    return Promise.resolve(finalAdmin);
}

export async function deleteAdmin(id: string) {
    const db = getDb();
    
    const admins = getAdmins();
    if ((await admins).length <= 1) {
        throw new Error("Cannot delete the last admin.");
    }

    db.prepare('DELETE FROM user_credentials WHERE userId = ?').run(id);
    db.prepare('DELETE FROM admins WHERE id = ?').run(id);

    revalidateAll();
    return Promise.resolve(id);
}
