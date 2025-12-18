

'use server';

import { db as getDb } from '@/lib/db';
import type { User, Admin } from '@/lib/types';
import { updateAdmin as updateAdminInDb } from './admins';

type CredentialEntry = {
    userId: string;
    password?: string;
    role: 'admin' | 'faculty' | 'student';
    email: string;
    requiresPasswordChange?: boolean;
};

export async function login(email: string, password: string): Promise<User> {
    const db = getDb();
    
    const credentialEntry: CredentialEntry | undefined = db.prepare('SELECT * FROM user_credentials WHERE email = ?').get(email) as any;
    
    if (!credentialEntry || credentialEntry.password !== password) {
        throw new Error('Invalid email or password.');
    }
    
    let details: any;
    let tableName: string;
    
    switch (credentialEntry.role) {
        case 'admin':
            tableName = 'admins';
            break;
        case 'faculty':
            tableName = 'faculty';
            break;
        case 'student':
            tableName = 'students';
            break;
        default:
             throw new Error('User role is invalid.');
    }

    details = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(credentialEntry.userId);
    
    if (!details) {
        throw new Error('User details not found.');
    }

    const user: User = {
        id: details.id,
        name: details.name,
        email: details.email,
        avatar: details.avatar || `https://avatar.vercel.sh/${details.email}.png`,
        role: credentialEntry.role, // Base role
        requiresPasswordChange: !!credentialEntry.requiresPasswordChange,
    };

    // If the user is an admin/manager, embed the specific role and permissions
    if (credentialEntry.role === 'admin') {
      const adminDetails: Admin = details as Admin;
      // This is the key fix: correctly assign the specific role and parse permissions
      (user as Admin).role = adminDetails.role;
      (user as Admin).permissions = adminDetails.permissions ? JSON.parse(adminDetails.permissions as any) : [];
    }
    
    return user;
}

export async function updateAdmin(updatedDetails: { id: string; name: string, email: string, avatar: string }): Promise<User> {
    const db = getDb();
    
    const updatedAdmin = await updateAdminInDb({
        id: updatedDetails.id,
        name: updatedDetails.name,
        email: updatedDetails.email,
        avatar: updatedDetails.avatar,
    });
    
    const user: User = {
        ...updatedAdmin,
        role: updatedAdmin.role,
        permissions: updatedAdmin.permissions
    };
    return Promise.resolve(user);
}
  
export async function addCredential(credential: {userId: string, email: string, password?: string, role: 'admin' | 'faculty' | 'student', requiresPasswordChange?: boolean}): Promise<void> {
    const db = getDb();

    // Find any existing credential for the userId to check for email changes.
    const existingForUser: { email: string } | undefined = db.prepare('SELECT email FROM user_credentials WHERE userId = ?').get(credential.userId) as any;

    // Find any existing credential for the new email.
    const existingForEmail: { userId: string, password?: string, requiresPasswordChange?: number } | undefined = db.prepare('SELECT * FROM user_credentials WHERE email = ?').get(credential.email) as any;
    
    // If the new email is already taken by a *different* user, throw an error.
    if (existingForEmail && existingForEmail.userId !== credential.userId) {
        throw new Error(`Email ${credential.email} is already in use by another user.`);
    }

    // If the user is changing their email, we must delete the old credential entry.
    if (existingForUser && existingForUser.email !== credential.email) {
        db.prepare('DELETE FROM user_credentials WHERE email = ?').run(existingForUser.email);
    }
    
    // Determine the final password. Use new one if provided, otherwise fall back to existing.
    const passwordToSet = credential.password || existingForEmail?.password;
    if (!passwordToSet) {
       // This can happen if it's a new user with an auto-generated password that wasn't passed.
       // However, the addAdmin/addStudent functions should always pass one.
       // We'll throw an error for safety.
       throw new Error(`Password not found for user ${credential.email}. A password must be provided for new users.`);
    }
    
    // Determine the 'requiresPasswordChange' flag.
    const requiresChange = credential.requiresPasswordChange === undefined 
        ? (existingForEmail?.requiresPasswordChange ? 1 : 0) 
        : (credential.requiresPasswordChange ? 1 : 0);

    const stmt = db.prepare('INSERT OR REPLACE INTO user_credentials (userId, email, password, role, requiresPasswordChange) VALUES (?, ?, ?, ?, ?)');
    stmt.run(credential.userId, credential.email, passwordToSet, credential.role, requiresChange);
}
