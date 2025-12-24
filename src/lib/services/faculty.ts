
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Faculty } from '@/lib/types';
import { addCredential } from './auth';
import { generateWelcomeNotificationFlow as generateWelcomeNotification } from '@/ai/flows/generate-welcome-notification-flow';
import { addNotification } from './notifications';
import { randomBytes } from 'crypto';


function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
}

export async function getFaculty(): Promise<Faculty[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM faculty');
  const results = stmt.all() as any[];
  // Ensure plain objects are returned
  return JSON.parse(JSON.stringify(results.map(f => ({ 
      ...f, 
      avatar: f.avatar || `https://avatar.vercel.sh/${f.email}.png`, 
      roles: JSON.parse(f.roles || '[]'),
      allottedSubjects: f.allottedSubjects ? JSON.parse(f.allottedSubjects) : [],
    }))));
}

export async function addFaculty(
    item: Omit<Faculty, 'id' | 'streak' | 'profileCompleted' | 'roles' | 'points'> & { 
        streak?: number, 
        profileCompleted?: number, 
        roles?: string[] | string, 
        points?: number,
    },
    password?: string
) {
    const db = getDb();

    const existing = db.prepare('SELECT id FROM faculty WHERE email = ?').get(item.email);
    if (existing) {
        throw new Error('A faculty member with this email already exists.');
    }

    const id = `FAC${Date.now()}`;
    
    let roles: string[];
    if (typeof item.roles === 'string') {
        roles = item.roles.split(',').map(r => r.trim()).filter(Boolean);
    } else {
        roles = item.roles || [];
    }

    const newItem: Faculty = {
        ...item,
        id,
        roles,
        streak: item.streak || 0,
        avatar: item.avatar || `https://avatar.vercel.sh/${item.email}.png`,
        profileCompleted: item.profileCompleted || 0,
        points: item.points || 0,
    };
    
    const stmt = db.prepare('INSERT INTO faculty (id, name, email, code, department, designation, employmentType, roles, streak, avatar, profileCompleted, points, allottedSubjects, maxWeeklyHours, designatedYear) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, newItem.email, newItem.code, newItem.department, newItem.designation, newItem.employmentType, JSON.stringify(newItem.roles), newItem.streak, newItem.avatar, newItem.profileCompleted, newItem.points, JSON.stringify(newItem.allottedSubjects || []), newItem.maxWeeklyHours, newItem.designatedYear);

    const initialPassword = password || randomBytes(8).toString('hex');
    await addCredential({
      userId: newItem.id,
      email: newItem.email,
      password: initialPassword,
      role: 'faculty',
      requiresPasswordChange: !password,
    });

    // Generate welcome notification
    try {
        const notificationResult = await generateWelcomeNotification({
            name: newItem.name,
            role: 'faculty',
            context: newItem.department
        });
        await addNotification({
            userId: newItem.id,
            message: notificationResult,
            category: 'general'
        });
    } catch (e: any) {
        console.error("Failed to generate welcome notification for faculty:", e.message);
        // Don't block user creation if notification fails
    }


    revalidateAll();
    return Promise.resolve({ ...newItem, initialPassword: password ? undefined : initialPassword });
}

export async function updateFaculty(updatedItem: Partial<Faculty> & { id: string }): Promise<Faculty> {
    const db = getDb();
    const oldFaculty: Faculty | undefined = db.prepare('SELECT * FROM faculty WHERE id = ?').get(updatedItem.id) as any;

    if (!oldFaculty) {
        throw new Error("Faculty member not found.");
    }

    // Safely parse old roles
    let oldRoles: string[] = [];
    if (oldFaculty.roles && typeof oldFaculty.roles === 'string') {
        try { oldRoles = JSON.parse(oldFaculty.roles); } catch (e) { /* ignore parse error */ }
    } else if (Array.isArray(oldFaculty.roles)) {
        oldRoles = oldFaculty.roles;
    }

    // Determine new roles
    let newRoles: string[];
    if (typeof updatedItem.roles === 'string') {
        newRoles = updatedItem.roles.split(',').map(r => r.trim()).filter(Boolean);
    } else {
        newRoles = updatedItem.roles || oldRoles;
    }
    
    // Safely parse allotted subjects
    let oldSubjects: string[] = [];
     if (oldFaculty.allottedSubjects && typeof oldFaculty.allottedSubjects === 'string') {
        try { oldSubjects = JSON.parse(oldFaculty.allottedSubjects); } catch(e) {}
    } else if (Array.isArray(oldFaculty.allottedSubjects)) {
        oldSubjects = oldFaculty.allottedSubjects;
    }

    const mergedItem: Faculty = {
        ...oldFaculty,
        ...updatedItem,
        roles: newRoles,
        allottedSubjects: updatedItem.allottedSubjects || oldSubjects,
    };

    const stmt = db.prepare('UPDATE faculty SET name = ?, email = ?, code = ?, department = ?, designation = ?, employmentType = ?, roles = ?, streak = ?, avatar = ?, profileCompleted = ?, points = ?, allottedSubjects = ?, maxWeeklyHours = ?, designatedYear = ? WHERE id = ?');
    stmt.run(mergedItem.name, mergedItem.email, mergedItem.code, mergedItem.department, mergedItem.designation, mergedItem.employmentType, JSON.stringify(mergedItem.roles), mergedItem.streak, mergedItem.avatar, mergedItem.profileCompleted, mergedItem.points, JSON.stringify(mergedItem.allottedSubjects || []), mergedItem.maxWeeklyHours, mergedItem.designatedYear, mergedItem.id);

    if (oldFaculty.email !== mergedItem.email) {
        await addCredential({
            userId: mergedItem.id,
            email: mergedItem.email,
            role: 'faculty',
        });
    }
    
    revalidateAll();
    const finalFaculty: any = db.prepare('SELECT * FROM faculty WHERE id = ?').get(updatedItem.id);
    finalFaculty.roles = JSON.parse(finalFaculty.roles || '[]');
    finalFaculty.allottedSubjects = JSON.parse(finalFaculty.allottedSubjects || '[]');
    return Promise.resolve(finalFaculty);
}

export async function deleteFaculty(id: string) {
    const db = getDb();

    // Check if faculty is in use
    const inUse = db.prepare('SELECT 1 FROM schedule WHERE facultyId = ? LIMIT 1').get(id);
    if (inUse) {
        throw new Error("Cannot delete faculty that is currently assigned to a schedule. Please re-assign their classes first.");
    }
    
    // Also delete from user_credentials
    db.prepare('DELETE FROM user_credentials WHERE userId = ?').run(id);

    const stmt = db.prepare('DELETE FROM faculty WHERE id = ?');
    stmt.run(id);

    revalidateAll();
    return Promise.resolve(id);
}
