
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
  return JSON.parse(JSON.stringify(results.map(a => ({ 
      ...a,
      avatar: a.avatar || `https://avatar.vercel.sh/${a.email}.png`,
      permissions: a.permissions ? JSON.parse(a.permissions) : [],
    }))));
}

export async function addAdmin(item: Omit<Admin, 'id'>, password?: string): Promise<{ id: string, name: string, email: string, initialPassword?: string }> {
    const db = getDb();
    
    const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(item.email);
    if (existing) {
        throw new Error('An admin with this email already exists.');
    }

    const id = `ADM${Date.now()}`;
    const newItem: Admin = {
        ...item,
        id,
        avatar: item.avatar || `https://avatar.vercel.sh/${item.email}.png`,
        role: item.role || 'manager',
        permissions: item.role === 'admin' ? ['*'] : item.permissions || [],
    };
    
    const stmt = db.prepare('INSERT INTO admins (id, name, email, avatar, role, permissions) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, newItem.email, newItem.avatar, newItem.role, JSON.stringify(newItem.permissions));

    const initialPassword = password || randomBytes(8).toString('hex');
    await addCredential({
      userId: newItem.id,
      email: newItem.email,
      password: initialPassword,
      role: 'admin', // ALWAYS use 'admin' for the credential table role to ensure lookup in the 'admins' table.
      requiresPasswordChange: !password, // require change if password was auto-generated
    });

    revalidateAll();
    
    return Promise.resolve({ id: newItem.id, name: newItem.name, email: newItem.email, initialPassword: password ? undefined : initialPassword });
}

export async function updateAdmin(updatedItem: Partial<Admin> & { id: string }): Promise<Admin> {
    const db = getDb();
    const oldAdmin = db.prepare('SELECT * FROM admins WHERE id = ?').get(updatedItem.id) as Admin | undefined;
    if (!oldAdmin) {
        throw new Error("Admin not found.");
    }
    
    const mergedItem = { ...oldAdmin, ...updatedItem };
     // Ensure permissions are correctly set for admins
    if (mergedItem.role === 'admin') {
        mergedItem.permissions = ['*'];
    }


    const stmt = db.prepare('UPDATE admins SET name = ?, email = ?, avatar = ?, role = ?, permissions = ? WHERE id = ?');
    stmt.run(
        mergedItem.name, 
        mergedItem.email, 
        mergedItem.avatar,
        mergedItem.role,
        JSON.stringify(mergedItem.permissions || []),
        mergedItem.id
    );

    if (oldAdmin.email !== mergedItem.email) {
        await addCredential({
            userId: mergedItem.id,
            email: mergedItem.email,
            role: 'admin',
        });
    }
    
    revalidateAll();
    const finalAdmin: Admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(updatedItem.id) as any;
    return Promise.resolve({
        ...finalAdmin,
        permissions: finalAdmin.permissions ? JSON.parse(finalAdmin.permissions as any) : []
    });
}

export async function deleteAdmin(id: string) {
    const db = getDb();
    
    const admins = await getAdmins();
    if (admins.length <= 1) {
        throw new Error("Cannot delete the last admin.");
    }

    db.prepare('DELETE FROM user_credentials WHERE userId = ?').run(id);
    db.prepare('DELETE FROM admins WHERE id = ?').run(id);

    revalidateAll();
    return Promise.resolve(id);
}
