
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
    
    const existing: { userId: string, password?: string } | undefined = db.prepare('SELECT userId, password FROM user_credentials WHERE email = ?').get(credential.email) as any;

    const oldCredentialForUser: {email: string} | undefined = db.prepare('SELECT email FROM user_credentials WHERE userId = ?').get(credential.userId) as any;

    // This handles email changes for existing users
    if (oldCredentialForUser && oldCredentialForUser.email !== credential.email) {
        db.prepare('DELETE FROM user_credentials WHERE userId = ?').run(credential.userId);
    }

    // This handles password updates or creating new credentials
    const passwordToSet = credential.password || existing?.password;
    if (!passwordToSet) {
        // This case should ideally not be hit if we always provide a password for new users.
        // It's a fallback.
        throw new Error("Cannot create or update credential without a password.");
    }
    
    const stmt = db.prepare('INSERT OR REPLACE INTO user_credentials (userId, email, password, role) VALUES (?, ?, ?, ?)');
    stmt.run(credential.userId, credential.email, passwordToSet, credential.role);
}
