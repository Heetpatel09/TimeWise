
'use server';
/**
 * @fileOverview A Genkit flow for resolving schedule conflicts.
 */

import {ai} from '@/ai/genkit';
import { ResolveConflictsInputSchema, ResolveConflictsOutputSchema, type ResolveConflictsInput, type ResolveConflictsOutput } from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';

const resolveConflicts = ai.defineFlow(
  {
    name: 'resolveScheduleConflictsFlow',
    inputSchema: ResolveConflictsInputSchema,
    outputSchema: ResolveConflictsOutputSchema,
  },
  async (input) => {
    const prompt = `
        You are a university timetable administrator. You have been given a schedule with several conflicts and a list of available resources. Your task is to resolve these conflicts by re-assigning faculty or classrooms to create a valid schedule.

        Current Schedule (with conflicts):
        ${JSON.stringify(input.schedule, null, 2)}

        Detected Conflicts:
        ${JSON.stringify(input.conflicts, null, 2)}
        
        Available Resources:
        - Faculty: ${JSON.stringify(input.faculty, null, 2)}
        - Classrooms: ${JSON.stringify(input.classrooms, null, 2)}

        Instructions:
        1. Analyze the conflicts. The most common conflicts are double-bookings for faculty or classrooms at the same time slot.
        2. Modify the schedule to resolve all conflicts. You can only change the 'facultyId', 'facultyName', 'classroomId', and 'classroomName' for a conflicting slot. DO NOT change the day, time, class, or subject.
        3. For a given conflicting slot, find an available faculty member or classroom for that specific day and time. A resource is available if they are not part of any other schedule entry at that exact day and time.
        4. Crucially, when re-assigning a faculty member, you MUST choose a substitute who is qualified to teach the subject of the conflicting slot. The 'allottedSubjects' property in the 'faculty' data lists the IDs of subjects each faculty member can teach.
        5. After ensuring subject qualification, prefer a faculty from the same department if possible.
        6. The output 'resolvedSchedule' must contain the ENTIRE schedule, including both the modified and unmodified slots. It must be a complete and valid schedule.
        7. Create a concise 'summary' of the changes you made. For example: "Resolved 2 conflicts. Re-assigned Dr. Smith's class to Room 102 and moved Dr. Jones's lecture to Prof. Davis."
        8. For each change, create a 'notification' object. 
           - If a faculty member's class is moved, the notification should be for that 'userId'.
           - If a whole class's classroom is changed, the notification should be for that 'classId'.
           - The message should be clear and informative, e.g., "Your CS101 class on Monday at 10:00 AM has been moved to Room 102."
        9. If no changes are made or no notifications are necessary, return an empty array for the 'notifications' field.
    `;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: googleAI.model('gemini-2.5-flash'),
      output: {
        schema: ResolveConflictsOutputSchema,
      },
      config: {
        temperature: 0.3,
      },
    });

    return llmResponse.output!;
  }
);
    
export async function resolveScheduleConflictsFlow(input: ResolveConflictsInput): Promise<ResolveConflictsOutput> {
    return resolveConflicts(input);
}
