
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Hostel, Room, EnrichedRoom } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
}

// Hostel services
export async function getHostels(): Promise<Hostel[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM hostels');
  return stmt.all() as Hostel[];
}

export async function addHostel(item: Omit<Hostel, 'id'>) {
    const db = getDb();
    const id = `HOS${Date.now()}`;
    const stmt = db.prepare('INSERT INTO hostels (id, name, blocks) VALUES (?, ?, ?)');
    stmt.run(id, item.name, item.blocks);
    revalidateAll();
    const newItem: Hostel = { ...item, id };
    return Promise.resolve(newItem);
}

export async function updateHostel(updatedItem: Hostel) {
    const db = getDb();
    const stmt = db.prepare('UPDATE hostels SET name = ?, blocks = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.blocks, updatedItem.id);
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteHostel(id: string) {
    const db = getDb();
    const roomCheck = db.prepare('SELECT 1 FROM rooms WHERE hostelId = ? LIMIT 1').get(id);
    if (roomCheck) {
        throw new Error("Cannot delete hostel with rooms. Please delete or re-assign rooms first.");
    }
    const stmt = db.prepare('DELETE FROM hostels WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}

// Room services
export async function getRooms(): Promise<EnrichedRoom[]> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
        r.id,
        r.hostelId,
        r.roomNumber,
        r.block,
        r.studentId,
        s.name as studentName,
        h.name as hostelName
    FROM rooms r
    JOIN hostels h ON r.hostelId = h.id
    LEFT JOIN students s ON r.studentId = s.id
  `);
  return stmt.all() as EnrichedRoom[];
}

export async function addRoom(item: Omit<Room, 'id'>) {
    const db = getDb();
    const id = `ROOM${Date.now()}`;
    const stmt = db.prepare('INSERT INTO rooms (id, hostelId, roomNumber, block, studentId) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, item.hostelId, item.roomNumber, item.block, item.studentId);
    revalidateAll();
    const newItem: Room = { ...item, id };
    return Promise.resolve(newItem);
}

export async function updateRoom(updatedItem: Room) {
    const db = getDb();
    const stmt = db.prepare('UPDATE rooms SET hostelId = ?, roomNumber = ?, block = ?, studentId = ? WHERE id = ?');
    stmt.run(updatedItem.hostelId, updatedItem.roomNumber, updatedItem.block, updatedItem.studentId, updatedItem.id);
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteRoom(id: string) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM rooms WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    return Promise.resolve(id);
}
