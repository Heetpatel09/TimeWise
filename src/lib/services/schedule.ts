

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Schedule, EnrichedSchedule, Faculty, Notification } from '@/lib/types';
import { getClasses } from './classes';
import { getSubjects } from './subjects';
import { getClassrooms } from './classrooms';
import { getFaculty } from './faculty';
import { addNotification } from './notifications';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

function checkForConflict(item: Omit<Schedule, 'id'>, existingId?: string) {
    const db = getDb();
    const conflicts = db.prepare(`
        SELECT id FROM schedule 
        WHERE day = ? 
        AND time = ? 
        AND (facultyId = ? OR classroomId = ? OR classId = ?)
        AND id != ?
    `).all(item.day, item.time, item.facultyId, item.classroomId, item.classId, existingId || '') as { id: string }[];
    
    if (conflicts.length > 0) {
        throw new Error('This time slot creates a conflict with an existing class for the same faculty, classroom, or class.');
    }
}

export async function getSchedule(): Promise<Schedule[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM schedule');
  const results = stmt.all() as any[];
  // Ensure plain objects are returned and booleans are correct
  return JSON.parse(JSON.stringify(results));
}

export async function addSchedule(item: Omit<Schedule, 'id'>) {
    const db = getDb();
    
    // Check for conflicts before adding
    // checkForConflict(item);
    
    const id = `SCH${Date.now()}`;
    const newItem: Schedule = { ...item, id };
    const stmt = db.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, classroomId, day, time, batch) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, item.classId, item.subjectId, item.facultyId, item.classroomId, item.day, item.time, item.batch || null);
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSchedule(updatedItem: Schedule) {
    const db = getDb();
    const existingItem: Schedule | undefined = db.prepare('SELECT * FROM schedule WHERE id = ?').get(updatedItem.id) as any;

    if (!existingItem) {
        throw new Error("Schedule slot not found.");
    }
    
    // Check for conflicts before updating
    // checkForConflict(updatedItem, updatedItem.id);

    const stmt = db.prepare('UPDATE schedule SET classId = ?, subjectId = ?, facultyId = ?, classroomId = ?, day = ?, time = ?, batch = ? WHERE id = ?');
    stmt.run(updatedItem.classId, updatedItem.subjectId, updatedItem.facultyId, updatedItem.classroomId, updatedItem.day, updatedItem.time, updatedItem.batch || null, updatedItem.id);
    
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteSchedule(id: string) {
    const db = getDb();
    const itemToDelete: Schedule | undefined = db.prepare('SELECT * FROM schedule WHERE id = ?').get(id) as any;

    if (!itemToDelete) {
        throw new Error("Schedule slot not found.");
    }
    
    const stmt = db.prepare('DELETE FROM schedule WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}

export async function replaceSchedule(schedule: Schedule[]) {
    const dbInstance = getDb();
    
    const transaction = dbInstance.transaction(() => {
        // Clear the existing schedule
        dbInstance.prepare('DELETE FROM schedule').run();

        const insertStmt = dbInstance.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, classroomId, day, time, batch) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

        for (const item of schedule) {
            // Use existing ID or generate a new one if it's missing
            const id = item.id || `SCH${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
            insertStmt.run(id, item.classId, item.subjectId, item.facultyId, item.classroomId, item.day, item.time, item.batch || null);
        }
    });

    transaction();
    
    revalidateAll();
    return Promise.resolve({ success: true });
}

export async function getScheduleForFacultyInRange(facultyId: string, startDate: string, endDate: string): Promise<EnrichedSchedule[]> {
    const db = getDb();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysToFetch = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        daysToFetch.push(dayMap[d.getDay()]);
    }
    const uniqueDays = [...new Set(daysToFetch)];

    if (uniqueDays.length === 0) return [];
    
    const placeholders = uniqueDays.map(() => '?').join(',');
    const query = `
        SELECT *
        FROM schedule 
        WHERE facultyId = ? AND day IN (${placeholders})
    `;

    const scheduledSlots = db.prepare(query).all(facultyId, ...uniqueDays) as Schedule[];

    const [classes, subjects, classrooms, faculty] = await Promise.all([
        getClasses(), getSubjects(), getClassrooms(), getFaculty()
    ]);
    
    const classMap = new Map(classes.map(c => [c.id, c.name]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const classroomMap = new Map(classrooms.map(c => [c.id, c.name]));
    const facultyMap = new Map(faculty.map(f => [f.id, f.name]));
    
    return scheduledSlots.map(s => ({
        ...s,
        className: classMap.get(s.classId) || 'N/A',
        subjectName: subjectMap.get(s.subjectId)?.name || 'N/A',
        subjectIsSpecial: subjectMap.get(s.subjectId)?.isSpecial || false,
        classroomName: classroomMap.get(s.classroomId) || 'N/A',
        classroomType: classrooms.find(cr => cr.id === s.classroomId)?.type || 'classroom',
        facultyName: facultyMap.get(s.facultyId) || 'N/A',
    }));
}

export async function getAvailableFacultyForSlot(day: string, time: string): Promise<Faculty[]> {
    const db = getDb();
    const allFaculty = await getFaculty();
    
    const busyFacultyIds = db.prepare(`
        SELECT DISTINCT facultyId 
        FROM schedule 
        WHERE day = ? AND time = ?
    `).all(day, time).map((row: any) => row.facultyId);

    const busyFacultySet = new Set(busyFacultyIds);

    return allFaculty.filter(f => !busyFacultySet.has(f.id));
}


export async function approveAndReassign(notifications: Omit<Notification, 'id' | 'isRead' | 'createdAt'>[]) {
    const db = getDb();

    const transaction = db.transaction(() => {
        for (const notif of notifications) {
             const id = `NOT${Date.now()}${Math.random()}`;
            const isRead = false;
            const createdAt = new Date().toISOString();
            const category = notif.category || 'general';
            const stmt = db.prepare('INSERT INTO notifications (id, userId, message, isRead, createdAt, category) VALUES (?, ?, ?, ?, ?, ?)');
            stmt.run(id, notif.userId, notif.message, isRead ? 1 : 0, createdAt, category);
        }
    });

    transaction();
    revalidateAll();
}

    
