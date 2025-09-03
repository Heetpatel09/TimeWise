
'use server';

import { db as getDb } from '@/lib/db';
import type { User } from '@/lib/types';

type UserStoreEntry = {
    id: string;
    password?: string;
    role: 'admin' | 'faculty' | 'student';
    email: string;
};

export async function login(email: string, password: string): Promise<User> {
    const db = getDb();
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const userEntry: UserStoreEntry | undefined = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

            if (userEntry && userEntry.password === password) {
                let details: any;
                if (userEntry.role === 'admin') {
                    details = {
                        id: 'admin',
                        name: 'Admin User',
                        email: 'admin@timewise.app',
                        avatar: `https://avatar.vercel.sh/admin@timewise.app.png`,
                    };
                } else if (userEntry.role === 'faculty') {
                    details = db.prepare('SELECT * FROM faculty WHERE id = ?').get(userEntry.id);
                } else {
                    details = db.prepare('SELECT * FROM students WHERE id = ?').get(userEntry.id);
                }

                if (!details) {
                    return reject(new Error('User details not found.'));
                }

                const user: User = {
                    id: details.id,
                    name: details.name,
                    email: details.email,
                    avatar: details.avatar || `https://avatar.vercel.sh/${details.email}.png`,
                    role: userEntry.role,
                };
                resolve(user);
            } else {
                reject(new Error('Invalid email or password.'));
            }
        }, 500); // Simulate network delay
    });
}

export async function updateAdmin(updatedDetails: { id: string; name: string, email: string, avatar: string }): Promise<User> {
    const db = getDb();
    
    const oldEntry: UserStoreEntry | undefined = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(updatedDetails.id, 'admin') as any;
    if (!oldEntry) throw new Error('Admin user not found');

    if (oldEntry.email !== updatedDetails.email) {
        await updateUserEmail(oldEntry.email, updatedDetails.email);
    }

    const user: User = {
        id: 'admin',
        name: updatedDetails.name,
        email: updatedDetails.email,
        avatar: updatedDetails.avatar,
        role: 'admin',
    };
    return user;
}
  
export async function updatePassword(email: string, newPassword: string): Promise<void> {
    const db = getDb();
    const result = db.prepare('UPDATE users SET password = ? WHERE email = ?').run(newPassword, email);
    if (result.changes > 0) {
        return;
    } else {
        throw new Error('User not found when trying to update password.');
    }
}
  
export async function updateUserEmail(oldEmail: string, newEmail: string): Promise<void> {
    const db = getDb();
    if (oldEmail === newEmail) return;

    const newEmailExists: { count: number } | undefined = db.prepare('SELECT count(*) as count FROM users WHERE email = ?').get(newEmail) as any;
    if (newEmailExists && newEmailExists.count > 0) {
        throw new Error('New email is already taken.');
    }
    
    const result = db.prepare('UPDATE users SET email = ? WHERE email = ?').run(newEmail, oldEmail);
    if (result.changes > 0) {
        return;
    } else {
        throw new Error('User not found when trying to update email.');
    }
}
  
export async function addUser(user: {id: string, email: string, password?: string, role: 'faculty' | 'student'}): Promise<void> {
    const db = getDb();
    const existingUser: { count: number } | undefined = db.prepare('SELECT count(*) as count FROM users WHERE email = ?').get(user.email) as any;
    if (existingUser && existingUser.count > 0) {
        throw new Error("User with this email already exists.");
    }
    db.prepare('INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)').run(user.id, user.email, user.password, user.role);
}
