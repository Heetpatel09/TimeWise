
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { NewSlotRequest } from '@/lib/types';
import { addNotification } from './notifications';
import { addSchedule } from './schedule';
import { adminUser } from '../placeholder-data';
import { getFaculty } from './faculty';

export async function getNewSlotRequests(): Promise<NewSlotRequest[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM new_slot_requests');
  return stmt.all() as NewSlotRequest[];
}

export async function addSlotRequest(request: Omit<NewSlotRequest, 'id' | 'status'>) {
    const db = getDb();
    const id = `NSR${Date.now()}`;
    const status = 'pending';
    const stmt = db.prepare('INSERT INTO new_slot_requests (id, facultyId, classId, subjectId, classroomId, day, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, request.facultyId, request.classId, request.subjectId, request.classroomId, request.day, request.time, status);

    const faculty = (await getFaculty()).find(f => f.id === request.facultyId);
    if (faculty) {
      await addNotification({
        userId: adminUser.id,
        message: `${faculty.name} has requested a new class slot.`,
        category: 'requests'
      });
    }

    const newRequest: NewSlotRequest = { ...request, id, status };
    revalidatePath('/admin/layout');
    revalidatePath('/faculty/layout');
    return Promise.resolve(newRequest);
}

export async function updateNewSlotRequestStatus(id: string, status: 'approved' | 'rejected') {
    const db = getDb();
    
    const request = db.prepare('SELECT * FROM new_slot_requests WHERE id = ?').get(id) as NewSlotRequest | undefined;
    if (!request) {
        throw new Error("Request not found");
    }

    if (status === 'approved') {
        // When approving, we simply add the slot. Conflicts will be highlighted on the schedule.
        await addSchedule({
            classId: request.classId,
            subjectId: request.subjectId,
            facultyId: request.facultyId,
            classroomId: request.classroomId,
            day: request.day as any,
            time: request.time
        });
    }
    
    const stmt = db.prepare('UPDATE new_slot_requests SET status = ? WHERE id = ?');
    stmt.run(status, id);

    let message = `Your new slot request for ${request.day} at ${request.time} has been ${status}.`;
    if (status === 'approved') {
        message += " The slot has been added to the main schedule.";
    }
    await addNotification({
        userId: request.facultyId,
        message: message,
        category: 'requests'
    });

    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(request);
}
