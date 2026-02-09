
'use server';

import { db as getDb } from '@/lib/db';
import type { User, Admin } from '@/lib/types';
import { updateAdmin as updateAdminInDb } from './admins';
import { randomBytes } from 'crypto';

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
    
    // Base user object
    const user: User = {
        id: details.id,
        name: details.name,
        email: details.email,
        avatar: details.avatar || `https://avatar.vercel.sh/${details.email}.png`,
        role: credentialEntry.role, // This sets the base role (e.g., 'admin' for both admin/manager)
        requiresPasswordChange: !!credentialEntry.requiresPasswordChange,
    };

    // If the user is from the 'admins' table, correctly fetch their specific role (admin/manager) and permissions
    if (credentialEntry.role === 'admin') {
      const adminDetails: Admin = details as Admin;
      // Overwrite the base role 'admin' with the more specific 'admin' or 'manager'
      user.role = adminDetails.role;
      (user as Admin).permissions = adminDetails.permissions ? JSON.parse(adminDetails.permissions as any) : [];
    }
    
    return user;
}

export async function registerAdmin(name: string, email: string, password: string): Promise<User> {
    const db = getDb();

    // Check if user already exists in any table
    const existingAdmin = db.prepare('SELECT id FROM admins WHERE email = ?').get(email);
    const existingFaculty = db.prepare('SELECT id FROM faculty WHERE email = ?').get(email);
    const existingStudent = db.prepare('SELECT id FROM students WHERE email = ?').get(email);

    if (existingAdmin || existingFaculty || existingStudent) {
        throw new Error('An account with this email already exists.');
    }

    const id = `ADM${Date.now()}`;
    const newUser: Admin = {
        id,
        name,
        email,
        role: 'admin', // New users get full admin rights as requested
        permissions: ['*'],
        avatar: `https://avatar.vercel.sh/${email}.png`,
    };

    // Add to admins table
    const stmt = db.prepare('INSERT INTO admins (id, name, email, avatar, role, permissions) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, newUser.name, newUser.email, newUser.avatar, newUser.role, JSON.stringify(newUser.permissions));

    // Add to credentials table
    await addCredential({
      userId: newUser.id,
      email: newUser.email,
      password: password,
      role: 'admin',
      requiresPasswordChange: false,
    });

    const user: User = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar!,
        role: 'admin',
        permissions: ['*'],
        requiresPasswordChange: false,
    };
    
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
    const passwordToSet = credential.password || existingForEmail?.password || randomBytes(8).toString('hex');
    
    // Determine the 'requiresPasswordChange' flag.
    const requiresChange = credential.requiresPasswordChange === undefined 
        ? (existingForEmail?.requiresPasswordChange ? 1 : 0) 
        : (credential.requiresPasswordChange ? 1 : 0);

    const stmt = db.prepare('INSERT OR REPLACE INTO user_credentials (userId, email, password, role, requiresPasswordChange) VALUES (?, ?, ?, ?, ?)');
    stmt.run(credential.userId, credential.email, passwordToSet, credential.role, requiresChange);
}
