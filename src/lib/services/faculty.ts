
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
      allottedSubjects: JSON.parse(f.allottedSubjects || '[]'),
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
    };
    
    const stmt = db.prepare('INSERT INTO faculty (id, name, email, code, department, designation, employmentType, roles, streak, avatar, profileCompleted, points, allottedSubjects, maxWeeklyHours, designatedYear) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, newItem.email, newItem.code, newItem.department, newItem.designation, newItem.employmentType, JSON.stringify(newItem.roles), newItem.streak, newItem.avatar, newItem.profileCompleted, newItem.points, JSON.stringify(newItem.allottedSubjects), newItem.maxWeeklyHours, newItem.designatedYear);

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
    
    db.transaction(() => {
        const oldFaculty: any = db.prepare('SELECT * FROM faculty WHERE id = ?').get(updatedItem.id);
        if (!oldFaculty) {
            throw new Error("Faculty member not found.");
        }

        const oldSubjects: string[] = JSON.parse(oldFaculty.allottedSubjects || '[]');
        const newSubjects = updatedItem.allottedSubjects || [];

        // Subjects that are newly assigned to this faculty member
        const subjectsToBeAssigned = newSubjects.filter(s => !oldSubjects.includes(s));

        // If there are any subjects newly assigned, we must un-assign them from anyone else.
        if (subjectsToBeAssigned.length > 0) {
            const allOtherFaculty: any[] = db.prepare('SELECT id, allottedSubjects FROM faculty WHERE id != ?').all(updatedItem.id);
            
            for (const otherFac of allOtherFaculty) {
                const otherFacSubjects: string[] = JSON.parse(otherFac.allottedSubjects || '[]');
                
                const subjectsToKeep = otherFacSubjects.filter(subId => !subjectsToBeAssigned.includes(subId));

                // If subjects were removed, update that faculty member
                if (subjectsToKeep.length < otherFacSubjects.length) {
                    db.prepare('UPDATE faculty SET allottedSubjects = ? WHERE id = ?').run(JSON.stringify(subjectsToKeep), otherFac.id);
                }
            }
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
            allottedSubjects: updatedItem.allottedSubjects || oldSubjects,
        };

        const stmt = db.prepare('UPDATE faculty SET name = ?, email = ?, code = ?, department = ?, designation = ?, employmentType = ?, roles = ?, streak = ?, avatar = ?, profileCompleted = ?, points = ?, allottedSubjects = ?, maxWeeklyHours = ?, designatedYear = ? WHERE id = ?');
        stmt.run(mergedItem.name, mergedItem.email, mergedItem.code, mergedItem.department, mergedItem.designation, mergedItem.employmentType, JSON.stringify(mergedItem.roles), mergedItem.streak, mergedItem.avatar, mergedItem.profileCompleted, mergedItem.points, JSON.stringify(mergedItem.allottedSubjects), mergedItem.maxWeeklyHours, mergedItem.designatedYear, mergedItem.id);

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
