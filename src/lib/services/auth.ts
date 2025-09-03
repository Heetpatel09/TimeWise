
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
                // The admin user doesn't have a separate profile table, so we need to get avatar from somewhere.
                // Let's assume there's a convention or a default. For now, we'll use a placeholder that can be updated in context.
                // The actual avatar will be stored in localStorage via the AuthContext. This is a bit of a workaround for admin.
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
            email: details.email,
            avatar: details.avatar || `https://avatar.vercel.sh/${details.email}.png`,
            role: credentialEntry.role,
        };
        return user;
    } else {
        throw new Error('Invalid email or password.');
    }
}

export async function updateAdmin(updatedDetails: { id: string; name: string, email: string, avatar: string }): Promise<User> {
    // Admin details are not stored in a separate profile table, so we just return the user object
    // to be stored in the client-side AuthContext. The password would be handled by addCredential.
    // This is primarily for updating the user object in the auth context.
    const user: User = {
        id: updatedDetails.id,
        name: updatedDetails.name,
        email: updatedDetails.email,
        avatar: updatedDetails.avatar,
        role: 'admin',
    };
    // No database write for admin details besides credentials.
    return Promise.resolve(user);
}
  
export async function addCredential(credential: {userId: string, email: string, password?: string, role: 'admin' | 'faculty' | 'student'}): Promise<void> {
    const db = getDb();
    
    // Check if the user already has a credential with this email.
    const existing: { userId: string } | undefined = db.prepare('SELECT userId FROM user_credentials WHERE email = ?').get(credential.email) as any;

    if (existing && existing.userId === credential.userId) {
        // If the email exists and belongs to the same user, update the password if provided.
        if (credential.password) {
            const stmt = db.prepare('UPDATE user_credentials SET password = ? WHERE userId = ? AND email = ?');
            stmt.run(credential.password, credential.userId, credential.email);
        }
    } else if (existing && existing.userId !== credential.userId) {
        // If email is taken by another user, throw an error.
        throw new Error("Email is already in use by another account.");
    }
    else {
        // If the user is changing their email or it's a new credential set for the same user
        const stmt = db.prepare('INSERT INTO user_credentials (userId, email, password, role) VALUES (?, ?, ?, ?)');
        stmt.run(credential.userId, credential.email, credential.password, credential.role);
    }
}
