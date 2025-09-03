
'use server';

import { db as getDb } from '@/lib/db';
import type { User } from '@/lib/types';

type CredentialEntry = {
    userId: string;
    password?: string;
    role: 'admin' | 'faculty' | 'student';
    email: string;
};

export async function login(email: string, password: string): Promise<User> {
    const db = getDb();
    
    const credentialEntry: CredentialEntry | undefined = db.prepare('SELECT * FROM user_credentials WHERE email = ?').get(email) as any;

    if (!credentialEntry || credentialEntry.password !== password) {
        throw new Error('Invalid email or password.');
    }
    
    let details: any;
    if (credentialEntry.role === 'admin') {
        details = {
            id: credentialEntry.userId,
            name: 'Admin', 
            email: credentialEntry.email,
            avatar: `https://avatar.vercel.sh/${credentialEntry.email}.png`
        };
    } else if (credentialEntry.role === 'faculty') {
        details = db.prepare('SELECT * FROM faculty WHERE id = ?').get(credentialEntry.userId);
    } else {
        details = db.prepare('SELECT * FROM students WHERE id = ?').get(credentialEntry.userId);
    }

    if (!details) {
        throw new Error('User details not found.');
    }

    const user: User = {
        id: details.id,
        name: details.name,
        email: details.email,
        avatar: details.avatar || `https://avatar.vercel.sh/${details.email}.png`,
        role: credentialEntry.role,
    };
    
    return user;
}

export async function updateAdmin(updatedDetails: { id: string; name: string, email: string, avatar: string }): Promise<User> {
    const db = getDb();
    
    // The admin user does not exist in the faculty table, so this update is not possible.
    // We can simulate it by returning the expected user object.
    // In a real application, you might have a separate 'admins' table.

    const user: User = {
        id: updatedDetails.id,
        name: updatedDetails.name,
        email: updatedDetails.email,
        avatar: updatedDetails.avatar,
        role: 'admin',
    };
    return Promise.resolve(user);
}
  
export async function addCredential(credential: {userId: string, email: string, password?: string, role: 'admin' | 'faculty' | 'student'}): Promise<void> {
    const db = getDb();
    
    const existing: { userId: string } | undefined = db.prepare('SELECT userId FROM user_credentials WHERE email = ?').get(credential.email) as any;

    if (existing && existing.userId === credential.userId) {
        if (credential.password) {
            const stmt = db.prepare('UPDATE user_credentials SET password = ? WHERE userId = ? AND email = ?');
            stmt.run(credential.password, credential.userId, credential.email);
        }
    } else if (existing && existing.userId !== credential.userId) {
        throw new Error("Email is already in use by another account.");
    }
    else {
        // A previous credential for this user might exist with an old email.
        db.prepare('DELETE FROM user_credentials WHERE userId = ?').run(credential.userId);

        const stmt = db.prepare('INSERT INTO user_credentials (userId, email, password, role) VALUES (?, ?, ?, ?)');
        stmt.run(credential.userId, credential.email, credential.password || 'placeholder', credential.role);
    }
}
