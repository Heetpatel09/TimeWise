
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
    input: { schema: ResolveConflictsInputSchema },
    output: { schema: ResolveConflictsOutputSchema },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert university schedule administrator. Your task is to resolve all conflicts in a given weekly timetable. You must do this in a single attempt, ensuring the final schedule is completely conflict-free.

Here is your conflict resolution playbook. Follow it precisely.

### Step 1: Identify All Conflicts

Analyze the entire schedule and identify all instances of the following three conflict types:

1.  **Class Conflict (Same Time Slot, Different Subjects)**: A single class (e.g., TE COMP) is scheduled for two or more different subjects at the same time on the same day.
2.  **Classroom Conflict (Same Time Slot, Same Classroom)**: Two different classes are assigned to the same classroom at the same time.
3.  **Faculty Conflict (Faculty Double Booking)**: A single faculty member is assigned to two or more different classes at the same time.

### Step 2: Resolve Conflicts Iteratively and Verify

Resolve the identified conflicts one by one using the following strategies. After each resolution, you **must re-evaluate the entire schedule** to ensure your fix has not created a new conflict. Repeat this process until no conflicts of any type remain.

*   **For a Class Conflict**:
    *   Keep one of the scheduled subjects in the original time slot.
    *   Move the second subject to another available (free) time slot **on the same day**.
    *   This change must not affect any other faculty or classes.
    *   Generate a notification for the students (using \`classId\`) and the faculty member for the moved subject.

*   **For a Classroom Conflict**:
    *   Keep one class in the original classroom.
    *   Re-assign the second class to another available classroom.
    *   The new classroom's type (e.g., 'lab', 'classroom') must be compatible with the subject's type ('lab', 'theory').
    *   Generate notifications for the students (using \`classId\`) and faculty of the re-assigned class.

*   **For a Faculty Conflict**:
    *   Keep one of the faculty's classes in its original slot.
    *   Shift the other class to a free time slot, prioritizing the same day first. If no slots are available on the same day, find a free slot on another day.
    *   This change must not affect any other faculty or classes.
    *   Generate notifications for the students of the shifted class (using \`classId\`) and the double-booked faculty member.

### Step 3: Final Verification and Output

Before providing the final output, perform one last, thorough check of the entire proposed \`resolvedSchedule\`. Confirm that absolutely no conflicts of any type remain. The final schedule must be perfect.

Once verified, provide the output in the required format:

*   **summary**: Provide a concise, human-readable summary of all the changes you made. (e.g., "Resolved faculty conflict for Dr. Turing by moving CS101 to 10 AM. Fixed classroom conflict for Room 101 by reassigning SE COMP to Room 102.")
*   **resolvedSchedule**: Return the entire, final, conflict-free schedule. This schedule must be perfect.
*   **notifications**: For every single change you make, generate a clear notification. For student notifications, specify the \`classId\`. For faculty, specify their individual \`userId\`.

Here is the data for the current schedule and available resources:
-   **Full Schedule with Conflicts**: {{{json schedule}}}
-   **Available Time Slots per Day**: {{{json timeSlots}}}
-   **Involved Classes**: {{{json classInfo}}}
-   **Involved Subjects**: {{{json subjectInfo}}}
-   **Involved Faculty**: {{{json facultyInfo}}}
-   **Involved Classrooms**: {{{json classroomInfo}}}

Please begin your work. Analyze, resolve iteratively, verify, and return the perfect, conflict-free schedule.
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
