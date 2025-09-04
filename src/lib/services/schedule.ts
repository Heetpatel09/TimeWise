

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Schedule, EnrichedSchedule, Faculty } from '@/lib/types';
import { getClasses } from './classes';
import { getSubjects } from './subjects';
import { getClassrooms } from './classrooms';
import { getFaculty } from './faculty';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getSchedule(): Promise<Schedule[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM schedule');
  const results = stmt.all() as Schedule[];
  // Ensure plain objects are returned
  return JSON.parse(JSON.stringify(results));
}

export async function addSchedule(item: Omit<Schedule, 'id'>) {
    const db = getDb();
    
    const id = `SCH${Date.now()}`;
    const newItem: Schedule = { ...item, id };
    const stmt = db.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, classroomId, day, time) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, item.classId, item.subjectId, item.facultyId, item.classroomId, item.day, item.time);
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateSchedule(updatedItem: Schedule) {
    const db = getDb();
    const existingItem: Schedule | undefined = db.prepare('SELECT * FROM schedule WHERE id = ?').get(updatedItem.id) as any;

    if (!existingItem) {
        throw new Error("Schedule slot not found.");
    }
    
    const stmt = db.prepare('UPDATE schedule SET classId = ?, subjectId = ?, facultyId = ?, classroomId = ?, day = ?, time = ? WHERE id = ?');
    stmt.run(updatedItem.classId, updatedItem.subjectId, updatedItem.facultyId, updatedItem.classroomId, updatedItem.day, updatedItem.time, updatedItem.id);
    
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
        // Clear the existing schedule and related requests
        dbInstance.prepare('DELETE FROM schedule').run();

        const insertStmt = dbInstance.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, classroomId, day, time) VALUES (?, ?, ?, ?, ?, ?, ?)');

        for (const item of schedule) {
            const id = item.id || `SCH${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
            insertStmt.run(id, item.classId, item.subjectId, item.facultyId, item.classroomId, item.day, item.time);
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

    // Get IDs of all faculty who are busy at the specified time
    const busyFacultyIds = db.prepare(`
        SELECT facultyId FROM schedule
        WHERE day = ? AND time = ?
    `).all(day, time).map((row: any) => row.facultyId);
    
    // Get all faculty
    const allFaculty = await getFaculty();

    // Filter out the busy ones
    if (busyFacultyIds.length > 0) {
        const busyIdsSet = new Set(busyFacultyIds);
        return allFaculty.filter(f => !busyIdsSet.has(f.id));
    }

    return allFaculty;
}

export async function getAvailableClassroomsForSlot(day: string, time: string, type: 'classroom' | 'lab'): Promise<Faculty[]> {
    const db = getDb();

    // Get IDs of all classrooms that are busy at the specified time
    const busyClassroomIds = db.prepare(`
        SELECT classroomId FROM schedule
        WHERE day = ? AND time = ?
    `).all(day, time).map((row: any) => row.classroomId);
    
    // Get all classrooms
    const allClassrooms = await getClassrooms();

    // Filter out the busy ones and by type
    const busyIdsSet = new Set(busyClassroomIds);
    return allClassrooms.filter(c => !busyIdsSet.has(c.id) && c.type === type);
}
