'use server';

import { revalidatePath } from 'next/cache';
import { classes as initialClasses } from '@/lib/placeholder-data';
import type { Class } from '@/lib/types';

// This is a server-side in-memory store.
// In a real application, you would use a database.
let classes: Class[] = [...initialClasses];

function revalidateAll() {
    revalidatePath('/admin');
}

export async function getClasses() {
  return Promise.resolve(classes);
}

export async function addClass(item: Omit<Class, 'id'>) {
    const newItem: Class = {
        ...item,
        id: `CLS${Date.now()}`,
    };
    classes = [...classes, newItem];
    revalidateAll();
    return Promise.resolve(newItem);
}

export async function updateClass(updatedItem: Class) {
    classes = classes.map(item => 
        item.id === updatedItem.id ? updatedItem : item
    );
    revalidateAll();
    return Promise.resolve(updatedItem);
}

export async function deleteClass(id: string) {
    classes = classes.filter(item => item.id !== id);
    revalidateAll();
    return Promise.resolve(id);
}
