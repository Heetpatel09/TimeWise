
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

    if (credentialEntry && credentialEntry.password === password) {
        let details: any;
        if (credentialEntry.role === 'admin') {
            details = {
                id: credentialEntry.userId,
                name: 'Admin',
                email: credentialEntry.email,
                avatar: `https://avatar.vercel.sh/${credentialEntry.email}.png`,
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
            email: details.email, // Use the primary email from the profile table
            avatar: details.avatar || `https://avatar.vercel.sh/${details.email}.png`,
            role: credentialEntry.role,
        };
        return user;
    } else {
        throw new Error('Invalid email or password.');
    }
}

export async function updateAdmin(updatedDetails: { id: string; name: string, email: string, avatar: string }): Promise<User> {
    // Admin details are not stored in a separate profile table, so we just return the user object.
    // The email and password will be handled by the updateCredential function.
    const user: User = {
        id: 'admin-user',
        name: updatedDetails.name,
        email: updatedDetails.email,
        avatar: updatedDetails.avatar,
        role: 'admin',
    };
    return user;
}
  
export async function addCredential(credential: {userId: string, email: string, password?: string, role: 'admin' | 'faculty' | 'student'}): Promise<void> {
    const db = getDb();
    const existing: { email: string } | undefined = db.prepare('SELECT email FROM user_credentials WHERE userId = ? AND email = ?').get(credential.userId, credential.email) as any;
    
    if (existing) {
        // If email exists for this user, just update the password if provided.
        if (credential.password) {
            const stmt = db.prepare('UPDATE user_credentials SET password = ? WHERE userId = ? AND email = ?');
            stmt.run(credential.password, credential.userId, credential.email);
        }
    } else {
        // If email doesn't exist for this user, insert a new credential.
        const stmt = db.prepare('INSERT INTO user_credentials (userId, email, password, role) VALUES (?, ?, ?, ?)');
        stmt.run(credential.userId, credential.email, credential.password, credential.role);
    }
}

    