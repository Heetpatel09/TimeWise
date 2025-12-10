
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Fee, EnrichedFee } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
}

export async function getFees(): Promise<EnrichedFee[]> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
        f.id,
        f.studentId,
        f.amount,
        f.dueDate,
        f.status,
        s.name as studentName,
        c.name as className
    FROM fees f
    JOIN students s ON f.studentId = s.id
    JOIN classes c ON s.classId = c.id
  `);
  return stmt.all() as EnrichedFee[];
}

export async function addFee(item: Omit<Fee, 'id'>) {
    const db = getDb();
    const id = `FEE${Date.now()}`;
    const stmt = db.prepare('INSERT INTO fees (id, studentId, amount, dueDate, status) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, item.studentId, item.amount, item.dueDate, item.status);
    revalidateAll();
    const newItem: Fee = { ...item, id };
    return Promise.resolve(newItem);
}

export async function updateFee(updatedItem: Fee) {
    const db = getDb();
    const stmt = db.prepare('UPDATE fees SET studentId = ?, amount = ?, dueDate = ?, status = ? WHERE id = ?');
    stmt.run(updatedItem.studentId, updatedItem.amount, updatedItem.dueDate, updatedItem.status, updatedItem.id);
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteFee(id: string) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM fees WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}
