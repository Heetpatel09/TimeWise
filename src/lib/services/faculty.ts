
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Faculty, Department } from '@/lib/types';
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
  // REMOVED the JOIN to prevent inconsistent data shapes.
  const stmt = db.prepare('SELECT * FROM faculty');
  const results = stmt.all() as any[];

  return JSON.parse(JSON.stringify(results.map(f => ({
      ...f,
      avatar: f.avatar || `https://avatar.vercel.sh/${f.email}.png`,
      roles: JSON.parse(f.roles || '[]'),
      allottedSubjects: JSON.parse(f.allottedSubjects || '[]'),
      dateOfJoining: f.dateOfJoining || '2022-01-01T00:00:00.000Z', // Add fallback
    }))));
}


export async function addFaculty(
    item: Omit<Faculty, 'id' | 'streak' | 'profileCompleted' | 'roles' | 'points' | 'allottedSubjects'> & {
        streak?: number,
        profileCompleted?: number,
        roles?: string[] | string,
        points?: number,
        allottedSubjects?: string[],
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
        allottedSubjects: item.allottedSubjects || [],
        dateOfJoining: item.dateOfJoining || new Date().toISOString(),
    };

    const stmt = db.prepare('INSERT INTO faculty (id, name, email, code, departmentId, designation, employmentType, roles, streak, avatar, profileCompleted, points, allottedSubjects, maxWeeklyHours, designatedYear, dateOfJoining) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, newItem.email, newItem.code, newItem.departmentId, newItem.designation, newItem.employmentType, JSON.stringify(newItem.roles), newItem.streak, newItem.avatar, newItem.profileCompleted, newItem.points, JSON.stringify(newItem.allottedSubjects), newItem.maxWeeklyHours, newItem.designatedYear, newItem.dateOfJoining);

    const initialPassword = password || randomBytes(8).toString('hex');
    await addCredential({
      userId: newItem.id,
      email: newItem.email,
      password: initialPassword,
      role: 'faculty',
      requiresPasswordChange: !password,
    });

    try {
        const department = db.prepare('SELECT name FROM departments WHERE id = ?').get(newItem.departmentId) as Department | undefined;
        const notificationResult = await generateWelcomeNotification({
            name: newItem.name,
            role: 'faculty',
            context: department?.name || 'the university'
        });
        await addNotification({
            userId: newItem.id,
            message: notificationResult,
            category: 'general'
        });
    } catch (e: any) {
        console.error("Failed to generate welcome notification for faculty:", e.message);
    }


    revalidateAll();
    return Promise.resolve({ ...newItem, initialPassword: password ? undefined : initialPassword });
}

export async function updateFaculty(updatedItem: Partial<Faculty> & { id: string }): Promise<Faculty> {
    const db = getDb();

    db.transaction(() => {
        const oldFaculty: any = db.prepare('SELECT * FROM faculty WHERE id = ?').get(updatedItem.id);
        if (!oldFaculty) {
            throw new Error("Faculty member not found.");
        }

        let newRoles: string[];
        if (typeof updatedItem.roles === 'string') {
            newRoles = updatedItem.roles.split(',').map(r => r.trim()).filter(Boolean);
        } else {
            newRoles = updatedItem.roles || JSON.parse(oldFaculty.roles || '[]');
        }

        const mergedItem = {
            ...oldFaculty,
            ...updatedItem,
            roles: newRoles,
            allottedSubjects: JSON.stringify(updatedItem.allottedSubjects || JSON.parse(oldFaculty.allottedSubjects || '[]')),
            dateOfJoining: updatedItem.dateOfJoining || oldFaculty.dateOfJoining || new Date().toISOString(),
        };

        const stmt = db.prepare('UPDATE faculty SET name = ?, email = ?, code = ?, departmentId = ?, designation = ?, employmentType = ?, roles = ?, streak = ?, avatar = ?, profileCompleted = ?, points = ?, allottedSubjects = ?, maxWeeklyHours = ?, designatedYear = ?, dateOfJoining = ? WHERE id = ?');
        stmt.run(mergedItem.name, mergedItem.email, mergedItem.code, mergedItem.departmentId, mergedItem.designation, mergedItem.employmentType, JSON.stringify(mergedItem.roles), mergedItem.streak, mergedItem.avatar, mergedItem.profileCompleted, mergedItem.points, mergedItem.allottedSubjects, mergedItem.maxWeeklyHours, mergedItem.designatedYear, mergedItem.dateOfJoining, mergedItem.id);

        if (oldFaculty.email !== mergedItem.email) {
            addCredential({
                userId: mergedItem.id,
                email: mergedItem.email,
                role: 'faculty',
            });
        }
    })();

    revalidateAll();

    const finalFaculty: any = db.prepare('SELECT * FROM faculty WHERE id = ?').get(updatedItem.id);
    finalFaculty.roles = JSON.parse(finalFaculty.roles || '[]');
    finalFaculty.allottedSubjects = JSON.parse(finalFaculty.allottedSubjects || '[]');
    return Promise.resolve(finalFaculty as Faculty);
}

export async function deleteFaculty(id: string) {
    const db = getDb();

    const inUse = db.prepare('SELECT 1 FROM schedule WHERE facultyId = ? LIMIT 1').get(id);
    if (inUse) {
        throw new Error("Cannot delete faculty that is currently assigned to a schedule. Please re-assign their classes first.");
    }

    db.prepare('DELETE FROM user_credentials WHERE userId = ?').run(id);
    const stmt = db.prepare('DELETE FROM faculty WHERE id = ?');
    stmt.run(id);

    revalidateAll();
    return Promise.resolve(id);
}
