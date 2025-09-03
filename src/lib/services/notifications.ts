
'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Notification } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/', 'layout');
}

export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
    const db = getDb();
    const stmt = db.prepare('SELECT *, isRead as isReadBool FROM notifications WHERE userId = ? ORDER BY createdAt DESC');
    const results = stmt.all(userId) as any[];
    return results.map(n => ({...n, isRead: !!n.isReadBool }));
}

export async function addNotification(notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) {
    const db = getDb();
    const id = `NOT${Date.now()}`;
    const isRead = false;
    const createdAt = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO notifications (id, userId, message, isRead, createdAt) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, notification.userId, notification.message, isRead ? 1 : 0, createdAt);
    
    const newNotification: Notification = { ...notification, id, isRead, createdAt };
    revalidateAll();
    return Promise.resolve(newNotification);
}

export async function markNotificationAsRead(id: string) {
    const db = getDb();
    const stmt = db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ?');
    stmt.run(id);
    revalidateAll();
    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as Notification | undefined;
    return Promise.resolve(notification || null);
}
