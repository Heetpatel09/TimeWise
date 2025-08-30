'use server';

import { resolveScheduleConflicts } from '@/ai/flows/resolve-schedule-conflicts';
import type { ResolveScheduleConflictsInput, ResolveScheduleConflictsOutput } from '@/ai/flows/resolve-schedule-conflicts';

export async function handleResolveConflicts(input: ResolveScheduleConflictsInput): Promise<ResolveScheduleConflictsOutput> {
  try {
    const result = await resolveScheduleConflicts(input);
    return result;
  } catch (e: any) {
    console.error('Error resolving schedule conflicts:', e);
    // Return a structured error
    return {
      hasConflicts: true,
      resolvedSchedules: input.schedules, // return original on error
      conflictDetails: JSON.stringify({
        error: "An unexpected error occurred while analyzing the schedule.",
        message: e.message || 'Unknown error',
      }),
    };
  }
}
