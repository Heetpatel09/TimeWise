'use server';

/**
 * @fileoverview A flow to resolve conflicts in a university timetable.
 * - resolveScheduleConflicts: Analyzes a schedule with conflicts and returns a resolved timetable.
 */

import { z } from "genkit";
import { ai } from "@/ai/genkit";

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

const ClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  semester: z.number(),
});

const SubjectSchema = z.object({
  name: z.string(),
  code: z.string(),
  isSpecial: z.boolean().describe("Whether the subject is a fixed special slot"),
  type: z.enum(["theory", "lab"]),
  semester: z.number(),
});

const FacultySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  streak: z.number(),
  avatar: z.string().optional(),
  profileCompleted: z.number(),
});

const ClassroomSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["classroom", "lab"]),
});

const StudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  classId: z.string(),
  semester: z.number(),
  streak: z.number(),
  avatar: z.string().optional(),
});

const ResolveConflictsInputSchema = z.object({
    schedule: z.array(ScheduleSchema),
    classes: z.array(ClassSchema),
    subjects: z.array(SubjectSchema),
    faculty: z.array(FacultySchema),
    classrooms: z.array(ClassroomSchema),
    students: z.array(StudentSchema),
});

export type ResolveConflictsInput = z.infer<typeof ResolveConflictsInputSchema>;

const ResolveConflictsOutputSchema = z.object({
    summary: z.string().describe("A brief summary of the changes made to resolve the conflicts."),
    resolvedSchedule: z.array(ScheduleSchema).describe("The full, corrected timetable with no conflicts."),
    notifications: z.array(z.object({
        userId: z.string().describe("The ID of the user (student or faculty) to notify."),
        message: z.string().describe("The notification message detailing the change."),
    })).describe("A list of notifications to be sent to users affected by the changes."),
});
export type ResolveConflictsOutput = z.infer<typeof ResolveConflictsOutputSchema>;


const conflictResolutionPrompt = ai.definePrompt({
    name: 'conflictResolutionPrompt',
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
    *   You have access to all available entities (classes, subjects, faculty, classrooms). Use this information to make valid assignments.
    *   Ensure that the classroom type matches the subject type (e.g., 'lab' subjects must be in 'lab' classrooms).

3.  **Output Requirements**:
    *   **summary**: Provide a concise, human-readable summary of the changes you made. For example: "Moved CS101 for TE COMP to Room 102. Rescheduled PH201 for SE COMP to Tuesday at 2 PM."
    *   **resolvedSchedule**: Return the entire, final, conflict-free schedule as a JSON array.
    *   **notifications**: For every single change you make, generate a clear notification for the affected faculty and for all students in the affected class.

Here is the data for the current schedule and available resources:
-   **Full Schedule with Conflicts**: {{{json schedule}}}
-   **Available Classes**: {{{json classes}}}
-   **Available Subjects**: {{{json subjects}}}
-   **Available Faculty**: {{{json faculty}}}
-   **Available Classrooms**: {{{json classrooms}}}
-   **Students List (for notifications)**: {{{json students}}}

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
