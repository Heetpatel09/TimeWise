
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
import type { Schedule, Class, Subject, Faculty, Classroom } from '@/lib/types';

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
  isSpecial: z.boolean().optional(),
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

// Define the input schema for the flow
const ResolveConflictsInputSchema = z.object({
  schedule: z.array(ScheduleSchema).describe("The current, conflicted schedule."),
  classes: z.array(ClassSchema).describe("List of all available classes."),
  subjects: z.array(SubjectSchema).describe("List of all available subjects."),
  faculty: z.array(FacultySchema).describe("List of all available faculty members."),
  classrooms: z.array(ClassroomSchema).describe("List of all available classrooms."),
});
export type ResolveConflictsInput = z.infer<typeof ResolveConflictsInputSchema>;


// Define the output schema for the flow - a resolved schedule
const ResolveConflictsOutputSchema = z.object({
  resolvedSchedule: z.array(ScheduleSchema).describe("The new, conflict-free schedule. It must contain the exact same number of schedule slots as the input schedule."),
});
export type ResolveConflictsOutput = z.infer<typeof ResolveConflictsOutputSchema>;


export async function resolveScheduleConflicts(input: ResolveConflictsInput): Promise<ResolveConflictsOutput> {
  return resolveScheduleConflictsFlow(input);
}


const resolvePrompt = ai.definePrompt({
    name: 'resolveScheduleConflictsPrompt',
    input: { schema: ResolveConflictsInputSchema },
    output: { schema: ResolveConflictsOutputSchema },
    prompt: `You are an expert university timetable scheduler. Your task is to resolve all conflicts in a given schedule.

You will be provided with the current schedule, which contains one or more conflicts, and lists of all available classes, subjects, faculty, and classrooms.

A conflict occurs if at the same time and day:
1. A faculty member is assigned to more than one class.
2. A classroom is booked for more than one class.
3. A class is scheduled for more than one subject.

Your goal is to produce a new, conflict-free schedule. 

Here are the rules you must follow:
- The resolved schedule MUST contain the exact same number of total lecture slots as the original schedule. Do not add or remove any lectures.
- For each original schedule slot, you must try to keep as many original properties (class, subject, faculty, day, time, classroom) as possible.
- You can reassign a faculty member, a classroom, or change the time/day of a lecture to resolve a conflict.
- When re-assigning, ensure the new faculty/classroom is available at that time.
- Ensure that a subject's type (theory/lab) matches the classroom type (classroom/lab).
- Do not modify any slots that are marked as 'isSpecial' in the subjects list. These are fixed and cannot be changed.
- Prioritize resolving conflicts by changing faculty or classroom first. Only change the time or day of a lecture if necessary.

Analyze the provided schedule and resources, and return a complete, updated, and conflict-free schedule in the 'resolvedSchedule' field.

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
    if (!output || !output.resolvedSchedule) {
      throw new Error("AI failed to generate a resolved schedule.");
    }
    return output;
  }
);
