
'use server';

/**
 * @fileoverview A flow to resolve conflicts in a university timetable.
 * - resolveScheduleConflicts: Analyzes a schedule with conflicts and returns a resolved timetable.
 */

import { z } from "genkit";
import { ai } from "@/ai/genkit";
import { googleAI } from '@genkit-ai/googleai';

// -------------------- SCHEMAS --------------------
const ScheduleSchema = z.object({
  id: z.string(),
  classId: z.string(),
  subjectId: z.string(),
  facultyId: z.string(),
  classroomId: z.string(),
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
  time: z.string(),
});

const EntityInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const SubjectInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    isSpecial: z.boolean(),
    type: z.enum(["theory", "lab"]),
});


const ResolveConflictsInputSchema = z.object({
    schedule: z.array(ScheduleSchema),
    classInfo: z.array(EntityInfoSchema),
    subjectInfo: z.array(SubjectInfoSchema),
    facultyInfo: z.array(EntityInfoSchema),
    classroomInfo: z.array(EntityInfoSchema),
    timeSlots: z.array(z.string()),
});

export type ResolveConflictsInput = z.infer<typeof ResolveConflictsInputSchema>;

const NotificationSchema = z.object({
    userId: z.string().describe("The ID of the user (faculty or student) to notify.").optional(),
    classId: z.string().describe("The ID of the class affected by the change. This will be used to notify all students in that class.").optional(),
    message: z.string().describe("The notification message detailing the change. This message will be sent to the specified user or all students in the class."),
});

const ResolveConflictsOutputSchema = z.object({
    summary: z.string().describe("A brief summary of the changes made to resolve the conflicts."),
    resolvedSchedule: z.array(ScheduleSchema).describe("The full, corrected timetable with no conflicts."),
    notifications: z.array(NotificationSchema).describe("A list of notifications to be generated for users affected by the changes. For student notifications, specify the classId."),
});
export type ResolveConflictsOutput = z.infer<typeof ResolveConflictsOutputSchema>;


const conflictResolutionPrompt = ai.definePrompt({
    name: 'conflictResolutionPrompt',
    model: googleAI.model('gemini-1.5-flash'),
    input: { schema: ResolveConflictsInputSchema },
    output: { schema: ResolveConflictsOutputSchema },
    prompt: `You are an expert university schedule administrator. Your task is to resolve all conflicts in a given weekly timetable.

Here are the rules and context:
1.  **Conflicts to Resolve**:
    *   A faculty member is assigned to two or more classes at the same time.
    *   A classroom is booked for two or more classes at the same time.
    *   A class (student group) is scheduled for two or more activities at the same time.

2.  **Resolution Strategy**:
    *   Your primary goal is to produce a valid, conflict-free schedule.
    *   You MUST NOT add or remove any classes from the original schedule. Every class must be present in the final output.
    *   You can change the 'day', 'time', 'classroomId', or 'facultyId' for a scheduled slot to resolve a conflict.
    *   Prioritize changing the classroom first. If that doesn't work, try changing the time slot. Changing the faculty should be a last resort.
    *   Use the provided 'timeSlots' to find an empty slot on the same day if you need to reschedule.
    *   You have access to all available entities. Use this information to make valid assignments.
    *   Ensure that the classroom type matches the subject type (e.g., 'lab' subjects must be in 'lab' classrooms).

3.  **Output Requirements**:
    *   **summary**: Provide a concise, human-readable summary of the changes you made. For example: "Moved CS101 for TE COMP to Room 102. Rescheduled PH201 for SE COMP to Tuesday at 2 PM."
    *   **resolvedSchedule**: Return the entire, final, conflict-free schedule as a JSON array.
    *   **notifications**: For every single change you make, generate a clear notification.
        *   For faculty, specify their individual 'userId'.
        *   For students, specify the 'classId' of the class that was changed. Do NOT list individual student userIds.
        *   The message should clearly explain the change (e.g., "Your CS101 class has been moved to Room 102.").

Here is the data for the current schedule and available resources:
-   **Full Schedule with Conflicts**: {{{json schedule}}}
-   **Available Time Slots per Day**: {{{json timeSlots}}}
-   **Involved Classes**: {{{json classInfo}}}
-   **Involved Subjects**: {{{json subjectInfo}}}
-   **Involved Faculty**: {{{json facultyInfo}}}
-   **Involved Classrooms**: {{{json classroomInfo}}}

Please analyze the schedule, resolve all conflicts according to the strategy, and provide the output in the required JSON format.
`,
});


const resolveScheduleConflictsFlow = ai.defineFlow(
  {
    name: 'resolveScheduleConflictsFlow',
    inputSchema: ResolveConflictsInputSchema,
    outputSchema: ResolveConflictsOutputSchema,
  },
  async (input) => {
    const { output } = await conflictResolutionPrompt(input);
    if (!output) {
      throw new Error("AI failed to generate a response.");
    }
    return output;
  }
);


export async function resolveScheduleConflicts(input: ResolveConflictsInput): Promise<ResolveConflictsOutput> {
  return await resolveScheduleConflictsFlow(input);
}
