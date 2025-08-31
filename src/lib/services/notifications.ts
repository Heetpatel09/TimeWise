
'use server';

import { revalidatePath } from 'next/cache';
import { notifications as initialNotifications } from '@/lib/placeholder-data';
import type { Notification } from '@/lib/types';

if (!(global as any).notifications) {
  (global as any).notifications = [...initialNotifications];
}
let notifications: Notification[] = (global as any).notifications;

function revalidateAll() {
    revalidatePath('/', 'layout');
}

export async function getNotificationsForUser(userId: string) {
    return Promise.resolve(notifications.filter(n => n.userId === userId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
}

export async function addNotification(notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) {
    const newNotification: Notification = {
        ...notification,
        id: `NOT${Date.now()}`,
        isRead: false,
        createdAt: new Date().toISOString(),
    };
    notifications.unshift(newNotification);
    revalidateAll();
    return Promise.resolve(newNotification);
}

export async function markNotificationAsRead(id: string) {
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
        notifications[index].isRead = true;
        revalidateAll();
        return Promise.resolve(notifications[index]);
    }
    return Promise.resolve(null);
}
