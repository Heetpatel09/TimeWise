'use server';

import { resolveScheduleConflicts } from '@/ai/flows/resolve-schedule-conflicts';
import { getClasses } from '@/lib/services/classes';
import { getFaculty } from '@/lib/services/faculty';
import { getSubjects } from '@/lib/services/subjects';
import { getClassrooms } from '@/lib/services/classrooms';
import type { ResolveScheduleConflictsInput, ResolveScheduleConflictsOutput } from '@/ai/flows/resolve-schedule-conflicts';
import { getSchedule } from '@/lib/services/schedule';

export async function handleResolveConflicts(currentSchedule: any): Promise<ResolveScheduleConflictsOutput> {
  try {
    const [classes, subjects, faculty, classrooms, scheduleData] = await Promise.all([
        getClasses(),
        getSubjects(),
        getFaculty(),
        getClassrooms(),
        getSchedule() // Use live schedule data
    ]);

    const schedules = JSON.stringify(scheduleData);
    
    const parameters = JSON.stringify({ 
      classes, 
      subjects, 
      faculty,
      classrooms,
      constraints: {
        faculty: { max_classes_per_day: 4, max_classes_per_week: 10 },
        class: { max_classes_per_day: 5 },
      }
    });

    const result = await resolveScheduleConflicts({schedules, parameters});
    return result;
  } catch (e: any) {
    console.error('Error resolving schedule conflicts:', e);
    // Return a structured error
    return {
      hasConflicts: true,
      resolvedSchedules: JSON.stringify(currentSchedule), // return original on error
      conflictDetails: JSON.stringify({
        error: "An unexpected error occurred while analyzing the schedule.",
        message: e.message || 'Unknown error',
      }),
    };
  }
}
