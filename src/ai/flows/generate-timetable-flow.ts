
'use server';
import { config } from 'dotenv';
config();

/**
 * @fileOverview A flow for generating a university timetable.
 *
 * - generateTimetable - Generates a full weekly timetable based on available resources.
 * - GenerateTimetableInput - The input type for the generation.
 * - GenerateTimetableOutput - The return type for the generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Class, Subject, Faculty, Classroom, Schedule } from '@/lib/types';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getFaculty } from '@/lib/services/faculty';
import { getClassrooms } from '@/lib/services/classrooms';

// Define Zod schemas for input data to ensure type safety in the prompt
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
    type: z.enum(['theory', 'lab']),
    semester: z.number(),
});

const FacultySchema = z.object({
    id: z.string(),
    name: z.string(),
    department: z.string(),
});

const ClassroomSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['classroom', 'lab']),
});

const GenerateTimetableInputSchema = z.object({
  classes: z.array(ClassSchema).describe("List of all classes."),
  subjects: z.array(SubjectSchema).describe("List of all subjects."),
  faculty: z.array(FacultySchema).describe("List of all available faculty members."),
  classrooms: z.array(ClassroomSchema).describe("List of all available classrooms and labs."),
});
export type GenerateTimetableInput = z.infer<typeof GenerateTimetableInputSchema>;

const ScheduleSlotSchema = z.object({
    classId: z.string(),
    subjectId: z.string(),
    facultyId: z.string(),
    classroomId: z.string(),
    day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
    time: z.string(),
});

const GenerateTimetableOutputSchema = z.object({
    timetable: z.array(ScheduleSlotSchema).describe("The generated list of schedule slots for the entire week."),
});
export type GenerateTimetableOutput = z.infer<typeof GenerateTimetableOutputSchema>;

// The main exported function that the UI will call
export async function generateTimetable(): Promise<GenerateTimetableOutput> {
  const [classes, subjects, faculty, classrooms] = await Promise.all([
    getClasses(),
    getSubjects(),
    getFaculty(),
    getClassrooms(),
  ]);

  const input: GenerateTimetableInput = { 
    classes, 
    subjects, 
    // Remove extra fields from faculty to simplify prompt
    faculty: faculty.map(({id, name, department}) => ({id, name, department})), 
    classrooms
  };
  
  return generateTimetableFlow(input);
}


const timetablePrompt = ai.definePrompt({
    name: 'timetablePrompt',
    input: { schema: GenerateTimetableInputSchema },
    output: { schema: GenerateTimetableOutputSchema },
    prompt: `You are an expert university schedule planner. Your task is to create a conflict-free weekly timetable for Monday to Friday.

Here are the available resources:
Classes:
{{{json classes}}}

Subjects:
{{{json subjects}}}

Faculty:
{{{json faculty}}}

Classrooms & Labs:
{{{json classrooms}}}

Follow these rules STRICTLY:
1.  Assign subjects to classes based on the semester. A class can only be taught subjects from its own semester.
2.  Assign a faculty member to each class. A faculty member can only teach one class at a time.
3.  Assign a classroom to each class. A classroom can only be used by one class at a time.
4.  Lab subjects (type: 'lab') MUST be assigned to a classroom of type 'lab'. Theory subjects (type: 'theory') MUST be assigned to a classroom of type 'classroom'.
5.  Time slots are: '07:30 AM - 08:30 AM', '08:30 AM - 09:30 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM'.
6.  The times '09:30 AM - 10:00 AM' and '12:00 PM - 01:00 PM' are break times. DO NOT schedule any classes during these times.
7.  Ensure there are no conflicts:
    - A class cannot have two subjects at the same time.
    - A faculty member cannot teach two classes at the same time.
    - A classroom cannot be occupied by two classes at the same time.
8.  Try to distribute classes evenly throughout the day and week for each class group. Avoid leaving large gaps in a class's schedule for a single day.
9.  Generate a full schedule for all classes for all 5 weekdays.

Produce a JSON output that is a list of schedule slots. Each slot must contain classId, subjectId, facultyId, classroomId, day, and time.
`,
});

const generateTimetableFlow = ai.defineFlow(
  {
    name: 'generateTimetableFlow',
    inputSchema: GenerateTimetableInputSchema,
    outputSchema: GenerateTimetableOutputSchema,
  },
  async (input) => {
    const { output } = await timetablePrompt(input);
    if (!output || !output.timetable) {
      throw new Error("AI failed to generate a timetable.");
    }
    return output;
  }
);
