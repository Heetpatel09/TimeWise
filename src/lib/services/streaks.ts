'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Student, Faculty, Schedule } from '@/lib/types';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/faculty', 'layout');
    revalidatePath('/student', 'layout');
}

/**
 * Calculates a streak based on recent, distinct day activity.
 * This provides a more accurate "streak" than a simple count.
 */
function calculateStreak(schedule: Pick<Schedule, 'day'>[]): number {
    const today = new Date().getDay(); // Sunday - 0, Monday - 1, ...
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const scheduledDays = new Set(schedule.map(s => s.day));
    let streak = 0;
    
    // Check backwards from yesterday for 5 days (Monday-Friday)
    for (let i = 1; i <= 5; i++) {
        const dayIndex = (today - i + 7) % 7;
        // Skip weekend days for streak calculation
        if (dayIndex === 0 || dayIndex === 6) continue;
        
        const dayName = dayMap[dayIndex];
        if (scheduledDays.has(dayName as any)) {
            streak++;
        } else {
            // Break the streak if a weekday is missed
            break;
        }
    }
    return streak;
}


export async function updateAllStreaks() {
    const db = getDb();
    
    // Update faculty streaks
    const allFaculty: Faculty[] = db.prepare('SELECT * FROM faculty').all() as any[];
    const facultyUpdateStmt = db.prepare('UPDATE faculty SET streak = ? WHERE id = ?');

    allFaculty.forEach(faculty => {
        const facultySchedule = db.prepare(
            'SELECT day FROM schedule WHERE facultyId = ?'
        ).all(faculty.id) as Pick<Schedule, 'day'>[];
        const streak = calculateStreak(facultySchedule);
        facultyUpdateStmt.run(streak, faculty.id);
    });

    // Update student streaks
    const allStudents: Student[] = db.prepare('SELECT * FROM students').all() as any[];
    const studentUpdateStmt = db.prepare('UPDATE students SET streak = ? WHERE id = ?');

    allStudents.forEach(student => {
        const studentSchedule = db.prepare(
            'SELECT day FROM schedule WHERE classId = ?'
        ).all(student.classId) as Pick<Schedule, 'day'>[];
        const streak = calculateStreak(studentSchedule);
        studentUpdateStmt.run(streak, student.id);
    });

    revalidateAll();
    return Promise.resolve({ success: true });
}
