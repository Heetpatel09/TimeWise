'use server';

import { resolveScheduleConflicts } from '@/ai/flows/resolve-schedule-conflicts';
import { getClasses } from '@/lib/services/classes';
import { getFaculty } from '@/lib/services/faculty';
import { getSubjects } from '@/lib/services/subjects';
import type { ResolveScheduleConflictsInput, ResolveScheduleConflictsOutput } from '@/ai/flows/resolve-schedule-conflicts';

export async function handleResolveConflicts(schedules: string): Promise<ResolveScheduleConflictsOutput> {
  try {
    const [classes, subjects, faculty] = await Promise.all([
        getClasses(),
        getSubjects(),
        getFaculty(),
    ]);

    const parameters = JSON.stringify({ classes, subjects, faculty });

    const result = await resolveScheduleConflicts({schedules, parameters});
    return result;
  } catch (e: any) {
    console.error('Error resolving schedule conflicts:', e);
    // Return a structured error
    return {
      hasConflicts: true,
      resolvedSchedules: schedules, // return original on error
      conflictDetails: JSON.stringify({
        error: "An unexpected error occurred while analyzing the schedule.",
        message: e.message || 'Unknown error',
      }),
    };
  }
}
