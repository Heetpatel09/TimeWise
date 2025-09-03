'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Classroom } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
}

export async function getClassrooms(): Promise<Classroom[]> {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT * FROM classrooms');
    return stmt.all() as Classroom[];
  } catch (error) {
    console.error("Failed to get classrooms", error)
    return [];
  }
}

export async function addClassroom(item: Omit<Classroom, 'id'>) {
    const db = getDb();
    const id = `CR${Date.now()}`;
    const stmt = db.prepare('INSERT INTO classrooms (id, name, type) VALUES (?, ?, ?)');
    stmt.run(id, item.name, item.type);
    revalidateAll();
    const newItem: Classroom = { ...item, id };
    return Promise.resolve(newItem);
}

export async function updateClassroom(updatedItem: Classroom) {
    const db = getDb();
    const stmt = db.prepare('UPDATE classrooms SET name = ?, type = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.type, updatedItem.id);
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteClassroom(id: string) {
    const db = getDb();
    // Check if classroom is in use
    const inUse = db.prepare('SELECT 1 FROM schedule WHERE classroomId = ? LIMIT 1').get(id);
    if (inUse) {
        throw new Error("Cannot delete classroom that is currently in use in the schedule.");
    }
    const stmt = db.prepare('DELETE FROM classrooms WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}
