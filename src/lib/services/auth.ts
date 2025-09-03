
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
            // Admin details are a combination of credentials table and maybe a (hypothetical) admin profile table.
            // For this app, the "admin" user is a singleton concept. We'll get their details from the db.
             details = db.prepare('SELECT * FROM faculty WHERE id = ?').get(credentialEntry.userId);
             if (!details) {
                // This case happens if the admin user isn't in the faculty table (which is our placeholder for user profiles)
                // This is a bit of a hack for this specific app structure.
                 details = {
                    id: credentialEntry.userId,
                    name: 'Admin', // Default name
                    email: credentialEntry.email,
                    avatar: `https://avatar.vercel.sh/${credentialEntry.email}.png`
                };
                // Let's check if there's an entry in faculty table we can use as a profile
                const adminProfile = db.prepare('SELECT * FROM faculty WHERE id = ?').get('admin-user');
                if(adminProfile) details = adminProfile;

             }
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
    const db = getDb();
    
    // For this app, we're storing the admin's profile *in the faculty table* as a workaround.
    const stmt = db.prepare('UPDATE faculty SET name = ?, email = ?, avatar = ? WHERE id = ?');
    stmt.run(updatedDetails.name, updatedDetails.email, updatedDetails.avatar, updatedDetails.id);

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
        // This handles a user changing their email. We should remove the old one.
        db.prepare('DELETE FROM user_credentials WHERE userId = ?').run(credential.userId);

        // If the user is changing their email or it's a new credential set for the same user
        const stmt = db.prepare('INSERT INTO user_credentials (userId, email, password, role) VALUES (?, ?, ?, ?)');
        stmt.run(credential.userId, credential.email, credential.password, credential.role);
    }
}
