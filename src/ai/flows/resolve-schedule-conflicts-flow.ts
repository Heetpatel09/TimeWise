
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
        You are a university timetable administrator. Your task is to resolve schedule conflicts.

        **Input Data:**
        1.  **Current Schedule**: A list of all scheduled classes, some with conflicts.
        2.  **Detected Conflicts**: A list of specific conflicts (e.g., double-bookings).
        3.  **Available Faculty**: A list of all faculty members, including their ID, name, department, and crucially, an 'allottedSubjects' array of subject IDs they are qualified to teach.
        4.  **Available Classrooms**: A list of all classrooms with their properties.

        **Your Task:**
        Modify the schedule to resolve all detected conflicts. You must follow these rules precisely:

        **Rule 1: Permitted Changes**
        You can ONLY change the 'facultyId', 'facultyName', 'classroomId', and 'classroomName' for a conflicting slot. You MUST NOT change the 'day', 'time', 'classId', or 'subjectId'.

        **Rule 2: Resource Availability**
        When re-assigning, the new faculty or classroom MUST be available at that specific day and time. A resource is available if they are not part of any other entry in the *original* schedule at that exact day and time.

        **Rule 3: QUALIFICATION (NON-NEGOTIABLE)**
        When re-assigning a faculty member, the substitute faculty's 'allottedSubjects' array MUST contain the 'subjectId' of the conflicting class slot. This is a strict, mandatory requirement.

        **Rule 4: Output Structure**
        1.  **resolvedSchedule**: Your output must contain the ENTIRE schedule, including both the modified and unmodified slots. It must be a complete and valid schedule with all original slots present. The fields MUST be spelled correctly: "id", "classId", "className", "subjectId", "subjectName", "facultyId", "facultyName", "classroomId", "classroomName", "day", "time".
        2.  **summary**: Create a concise, human-readable summary of the changes you made. (e.g., "Resolved 2 conflicts. Re-assigned Dr. Smith's CS101 class to Prof. Davis. Moved Dr. Jones's lecture to Room 102.")
        3.  **notifications**: For each change, create a notification object.
            - If a faculty member's class is moved to a new classroom, the notification 'userId' should be that faculty member's ID.
            - If a faculty member is substituted, a notification should be sent to BOTH the original faculty member and the substitute faculty member.
            - The message should be clear and informative (e.g., "Your CS101 class on Monday at 10:00 AM has been moved to Room 102." or "You have been assigned to teach CS101 on Monday at 10:00 AM in Room 101.").
            - If no notifications are necessary, return an empty array.

        Current Schedule (with conflicts):
        ${JSON.stringify(input.schedule, null, 2)}

        Detected Conflicts:
        ${JSON.stringify(input.conflicts, null, 2)}
        
        Available Resources:
        - Faculty: ${JSON.stringify(input.faculty, null, 2)}
        - Classrooms: ${JSON.stringify(input.classrooms, null, 2)}
    `;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: googleAI.model('gemini-2.5-flash'),
      output: {
        schema: ResolveConflictsOutputSchema,
      },
      config: {
        temperature: 0.2,
      },
    });

    return llmResponse.output!;
  }
);
    
export async function resolveScheduleConflictsFlow(input: ResolveConflictsInput): Promise<ResolveConflictsOutput> {
    return resolveConflicts(input);
}

    