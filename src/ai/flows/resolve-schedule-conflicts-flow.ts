
'use server';

/**
 * @fileOverview A flow to resolve conflicts in a university timetable.
 * 
 * - resolveScheduleConflicts - Analyzes a schedule with conflicts and returns a resolved version.
 * - ResolveConflictsInput - The input type for the flow.
 * - ResolveConflictsOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Schedule, Class, Subject, Faculty, Classroom, Student } from '@/lib/types';

// Define Zod schemas for the types from lib/types
const ScheduleSchema = z.object({
  id: z.string(),
  classId: z.string(),
  subjectId: z.string(),
  facultyId: z.string(),
  classroomId: z.string(),
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
  time: z.string(),
});

const ClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  semester: z.number(),
  department: z.string(),
});

const SubjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  isSpecial: z.boolean().describe("Whether the subject is a special, fixed slot that cannot be rescheduled."),
  type: z.enum(['theory', 'lab']),
  semester: z.number(),
});

const FacultySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  department: z.string(),
  streak: z.number(),
  avatar: z.string().optional(),
  profileCompleted: z.number(),
});

const ClassroomSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['classroom', 'lab']),
});

const StudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  classId: z.string(),
  streak: z.number(),
  avatar: z.string().optional(),
  profileCompleted: z.number(),
});

// Define the input schema for the flow
const ResolveConflictsInputSchema = z.object({
  schedule: z.array(ScheduleSchema).describe("The current, conflicted schedule."),
  classes: z.array(ClassSchema).describe("List of all available classes."),
  subjects: z.array(SubjectSchema).describe("List of all available subjects."),
  faculty: z.array(FacultySchema).describe("List of all available faculty members."),
  classrooms: z.array(ClassroomSchema).describe("List of all available classrooms."),
  students: z.array(StudentSchema).describe("List of all students, used for sending notifications."),
});
export type ResolveConflictsInput = z.infer<typeof ResolveConflictsInputSchema>;


const NotificationSchema = z.object({
    userId: z.string().describe("The ID of the user (student or faculty) to receive the notification."),
    message: z.string().describe("The personalized notification message explaining the change."),
});

// Define the output schema for the flow
const ResolveConflictsOutputSchema = z.object({
  resolvedSchedule: z.array(ScheduleSchema).describe("The new, conflict-free schedule. It must contain the exact same number of schedule slots as the input schedule."),
  summary: z.string().describe("A brief, human-readable summary of the changes made to resolve the conflicts."),
  notifications: z.array(NotificationSchema).describe("A list of notifications for ALL users affected by the changes. This includes both the faculty member teaching the class and ALL students enrolled in that class."),
});
export type ResolveConflictsOutput = z.infer<typeof ResolveConflictsOutputSchema>;


export async function resolveScheduleConflicts(input: ResolveConflictsInput): Promise<ResolveConflictsOutput> {
  return resolveScheduleConflictsFlow(input);
}


const resolvePrompt = ai.definePrompt({
    name: 'resolveScheduleConflictsPrompt',
    input: { schema: ResolveConflictsInputSchema },
    output: { schema: ResolveConflictsOutputSchema },
    prompt: `You are an expert university timetable scheduler and a helpful assistant. Your task is to resolve all conflicts in a given schedule and prepare the necessary communications for all affected parties.

You will be provided with the current schedule, which contains one or more conflicts, and lists of all available classes, subjects, faculty, classrooms, and students.

A conflict occurs if at the same time and day:
1. A faculty member is assigned to more than one class.
2. A classroom is booked for more than one class.
3. A class is scheduled for more than one subject.

Your goal is to produce a new, conflict-free schedule and the corresponding notifications.

Here are the rules you must follow:
- The resolved schedule MUST contain the exact same number of total lecture slots as the original schedule. Do not add or remove any lectures.
- For each original schedule slot, you must try to keep as many original properties (class, subject, faculty, day, time, classroom) as possible.
- To resolve a conflict, you can reassign a faculty member, a classroom, or change the time/day of a lecture.
- When re-assigning, you must analyze the available resources. Ensure the new faculty/classroom is available at that time. If changing the time/day, ensure it is a free slot for the class, faculty, and classroom.
- Ensure that a subject's type (theory/lab) matches the classroom type (classroom/lab).
- Do not modify any slots that are for subjects marked as 'isSpecial'. These are fixed and cannot be changed.
- Prioritize resolving conflicts by changing faculty or classroom first. Only change the time or day of a lecture as a last resort.

After resolving the schedule, you must:
1.  **Generate a summary:** Write a short, clear summary of the changes you made. For example: "Resolved 2 conflicts by moving Dr. Turing's class to Room 102 and rescheduling Dr. Hopper's lab to Friday at 2 PM."
2.  **Generate notifications:** For EVERY change you make to a schedule slot, you must create notifications for ALL affected users. This is critical.
    - Create a notification for the **faculty member** assigned to that slot.
    - Find **ALL students** enrolled in the class for that slot and create a personalized notification for each one.
    - Notification messages should be friendly and clearly state the change. Example for faculty: "Hi Dr. Turing, your CS101 class on Monday at 9 AM has been moved to Room 102." Example for a student: "Hi Alice, your CS101 class on Monday at 9 AM has been moved to Room 102."

Analyze the provided data, and return the complete, conflict-free schedule, the summary, and the comprehensive list of notifications for both students and faculty.

Here is the data:
Current Schedule:
{{{json schedule}}}

Available Classes:
{{{json classes}}}

Available Subjects:
{{{json subjects}}}

Available Faculty:
{{{json faculty}}}

Available Classrooms:
{{{json classrooms}}}

All Students:
{{{json students}}}
`,
});

const resolveScheduleConflictsFlow = ai.defineFlow(
  {
    name: 'resolveScheduleConflictsFlow',
    inputSchema: ResolveConflictsInputSchema,
    outputSchema: ResolveConflictsOutputSchema,
  },
  async (input) => {
    const { output } = await resolvePrompt(input);
    if (!output || !output.resolvedSchedule || !output.summary || !output.notifications) {
      throw new Error("AI failed to generate a complete resolution. Please try again.");
    }
    return output;
  }
);
