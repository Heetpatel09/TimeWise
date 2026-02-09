
'use server';

import { db as getDb } from '@/lib/db';
import type { Admin } from '@/lib/types';
import { revalidatePath } from 'next/cache';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
}

export async function upgradeSubscription(adminId: string, tier: 'pro30' | 'pro50' | 'pro100') {
    const db = getDb();
    let creditsToAdd = 0;
    switch (tier) {
        case 'pro30': creditsToAdd = 30; break;
        case 'pro50': creditsToAdd = 50; break;
        case 'pro100': creditsToAdd = 100; break;
    }

    const stmt = db.prepare(`
        UPDATE admins 
        SET subscriptionTier = ?, generationCredits = generationCredits + ? 
        WHERE id = ?
    `);
    stmt.run(tier, creditsToAdd, adminId);
    revalidateAll();
    return { success: true, tier, newCredits: creditsToAdd };
}

export async function checkAndDecrementCredits(adminId: string) {
    const db = getDb();
    const admin: Admin | undefined = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId) as any;

    if (!admin) {
        throw new Error('Admin user not found.');
    }
    
    const credits = admin.generationCredits ?? 0;

    if (credits <= 0) {
        throw new Error('You have run out of timetable generation credits. Please upgrade your plan to continue.');
    }

    const stmt = db.prepare('UPDATE admins SET generationCredits = generationCredits - 1 WHERE id = ?');
    stmt.run(adminId);
    revalidateAll();
    return { success: true, remainingCredits: credits - 1 };
}
