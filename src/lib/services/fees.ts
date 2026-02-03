

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Fee, EnrichedFee } from '@/lib/types';
import { addNotification } from './notifications';
import { adminUser } from '../placeholder-data';
import { randomBytes } from 'crypto';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getFees(): Promise<EnrichedFee[]> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
        f.id,
        f.studentId,
        f.semester,
        f.feeType,
        f.amount,
        f.dueDate,
        f.status,
        f.transactionId,
        f.paymentDate,
        s.name as studentName,
        s.enrollmentNumber as studentEnrollmentNumber
    FROM fees f
    JOIN students s ON f.studentId = s.id
  `);
  return stmt.all() as EnrichedFee[];
}

export async function addFee(item: Omit<Fee, 'id'>) {
    const db = getDb();
    const id = `FEE${Date.now()}`;
    const stmt = db.prepare('INSERT INTO fees (id, studentId, semester, feeType, amount, dueDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, item.studentId, item.semester, item.feeType, item.amount, item.dueDate, item.status);
    revalidateAll();
    const newItem: Fee = { ...item, id };
    return Promise.resolve(newItem);
}

export async function updateFee(updatedItem: Fee) {
    const db = getDb();
    const stmt = db.prepare('UPDATE fees SET studentId = ?, semester = ?, feeType = ?, amount = ?, dueDate = ?, status = ?, transactionId = ?, paymentDate = ? WHERE id = ?');
    stmt.run(updatedItem.studentId, updatedItem.semester, updatedItem.feeType, updatedItem.amount, updatedItem.dueDate, updatedItem.status, updatedItem.transactionId, updatedItem.paymentDate, updatedItem.id);
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

export async function payFee(feeId: string, studentId: string): Promise<Fee> {
    const db = getDb();
    const fee: Fee | undefined = db.prepare('SELECT * FROM fees WHERE id = ? AND studentId = ?').get(feeId, studentId) as any;

    if (!fee) {
        throw new Error('Fee record not found or does not belong to this student.');
    }
    if (fee.status !== 'unpaid') {
        throw new Error('This fee is already paid or covered by scholarship.');
    }

    const transactionId = `TXN-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
    const paymentDate = new Date().toISOString();

    const updatedFee: Fee = {
        ...fee,
        status: 'paid',
        transactionId,
        paymentDate,
    };
    
    await updateFee(updatedFee);

    await addNotification({
        userId: studentId,
        message: `Your payment of $${fee.amount.toFixed(2)} for ${fee.feeType} fee was successful.`,
        category: 'general'
    });
     await addNotification({
        userId: adminUser.id,
        message: `A fee payment of $${fee.amount.toFixed(2)} was received from a student.`,
        category: 'general'
    });

    return Promise.resolve(updatedFee);
}
