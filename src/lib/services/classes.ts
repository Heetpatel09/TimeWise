'use server';

import { revalidatePath } from 'next/cache';
import { classes as initialClasses } from '@/lib/placeholder-data';
import type { Class } from '@/lib/types';

// This is a server-side in-memory store.
// In a real application, you would use a database.
// We use a global variable to simulate persistence across requests in a dev environment.
if (!(global as any).classes) {
  (global as any).classes = [...initialClasses];
}
let classes: Class[] = (global as any).classes;


function revalidateAll() {
    revalidatePath('/admin', 'layout');
}

export async function getClasses() {
  return Promise.resolve(classes);
}

export async function addClass(item: Omit<Class, 'id'>) {
    const newItem: Class = {
        ...item,
        id: `CLS${Date.now()}`,
    };
    classes.push(newItem);
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateClass(updatedItem: Class) {
    const index = classes.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
        classes[index] = updatedItem;
    }
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteClass(id: string) {
    classes = classes.filter(item => item.id !== id);
    (global as any).classes = classes;
    revalidateAll();
    return Promise.resolve(id);
}
