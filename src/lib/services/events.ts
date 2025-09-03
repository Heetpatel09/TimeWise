

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Event } from '@/lib/types';
import { addNotification } from './notifications';
import { format } from 'date-fns';


export async function getEventsForUser(userId: string): Promise<Event[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM events WHERE userId = ? ORDER BY date ASC');
  const results = stmt.all(userId) as any[];
  return results.map(r => ({...r, reminder: !!r.reminder}));
}

export async function addEvent(event: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
    const db = getDb();
    const id = `EVT${Date.now()}`;
    const createdAt = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO events (id, userId, date, title, reminder, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, event.userId, event.date, event.title, event.reminder ? 1: 0, createdAt);
    
    const newEvent: Event = { ...event, id, createdAt };
    revalidatePath('/student', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve(newEvent);
}

export async function deleteEvent(id: string): Promise<void> {
    const db = getDb();
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    revalidatePath('/student', 'layout');
    revalidatePath('/faculty', 'layout');
    return Promise.resolve();
}

// This function can be called on user login to check for reminders
export async function checkForEventReminders(userId: string) {
  const db = getDb();
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const todaysEvents = db.prepare('SELECT * FROM events WHERE userId = ? AND date = ? AND reminder = 1').all(userId, today) as Event[];

  for (const event of todaysEvents) {
    const notificationMessage = `Reminder: "${event.title}" is today!`;
    
    // To avoid duplicate reminders, check if a similar one was sent recently.
    const recentNotification = db.prepare(`
        SELECT 1 FROM notifications 
        WHERE userId = ? AND message = ? AND createdAt > ?
        LIMIT 1
    `).get(userId, notificationMessage, new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString());
    
    if (!recentNotification) {
      await addNotification({
        userId: userId,
        message: notificationMessage
      });
    }
  }
}
