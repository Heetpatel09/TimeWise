
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { EnrichedRoom, GatePass, LeaveRequest } from '@/lib/types';
import { addNotification } from './notifications';
import { adminUser } from '../placeholder-data';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/student', 'layout');
}

export async function getStudentHostelDetails(studentId: string): Promise<EnrichedRoom | null> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
        r.id,
        r.hostelId,
        r.roomNumber,
        r.block,
        r.floor,
        r.studentId,
        s.name as studentName,
        h.name as hostelName
    FROM rooms r
    JOIN hostels h ON r.hostelId = h.id
    LEFT JOIN students s ON r.studentId = s.id
    WHERE r.studentId = ?
  `);
  const result = stmt.get(studentId) as EnrichedRoom | undefined;
  return result || null;
}

export async function getStudentGatePasses(studentId: string): Promise<GatePass[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM gate_passes WHERE studentId = ? ORDER BY requestDate DESC');
  return stmt.all(studentId) as GatePass[];
}

export async function requestGatePass(pass: Omit<GatePass, 'id' | 'status' | 'requestDate'>) {
    const db = getDb();
    const id = `GP${Date.now()}`;
    const requestDate = new Date().toISOString().split('T')[0];
    const stmt = db.prepare('INSERT INTO gate_passes (id, studentId, requestDate, departureDate, arrivalDate, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, pass.studentId, requestDate, pass.departureDate, pass.arrivalDate, pass.reason, 'pending');

    await addNotification({
      userId: adminUser.id,
      message: `New gate pass request from a student needs your approval.`,
      category: 'requests'
    });

    revalidateAll();
    const newPass: GatePass = { ...pass, id, status: 'pending', requestDate };
    return Promise.resolve(newPass);
}

export async function getStudentHostelLeaveRequests(studentId: string): Promise<LeaveRequest[]> {
    const db = getDb();
    const stmt = db.prepare("SELECT * FROM leave_requests WHERE requesterId = ? AND type = 'hostel' ORDER BY startDate DESC");
    return stmt.all(studentId) as LeaveRequest[];
}
