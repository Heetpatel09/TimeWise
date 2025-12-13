
'use server';

/**
 * @fileOverview Implements a flow to generate an optimized exam schedule.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schemas
const SubjectInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  semester: z.number(),
});

const ClassInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  semester: z.number(),
});

const ClassroomInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const GenerateExamScheduleInputSchema = z.object({
  subjects: z.array(SubjectInfoSchema),
  classes: z.array(ClassInfoSchema),
  classrooms: z.array(ClassroomInfoSchema),
  startDate: z.string().describe('The start date for the exam period in YYYY-MM-DD format.'),
  endDate: z.string().describe('The end date for the exam period in YYYY-MM-DD format.'),
  timeSlots: z.array(z.string()).describe('Array of available time slots, e.g., ["10:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"]'),
});
type GenerateExamScheduleInput = z.infer<typeof GenerateExamScheduleInputSchema>;

// Output Schemas
const GeneratedExamSchema = z.object({
  subjectId: z.string(),
  classId: z.string(),
  classroomId: z.string(),
  date: z.string().describe('The date of the exam in YYYY-MM-DD format.'),
  time: z.string(),
});

const GenerateExamScheduleOutputSchema = z.object({
  summary: z.string().describe('A brief summary of the generated exam schedule.'),
  generatedSchedule: z.array(GeneratedExamSchema).describe('The full, conflict-free exam schedule.'),
});
export type GenerateExamScheduleOutput = z.infer<typeof GenerateExamScheduleOutputSchema>;

export async function generateExamSchedule(input: GenerateExamScheduleInput): Promise<GenerateExamScheduleOutput> {
  return generateExamScheduleFlow(input);
}

const scheduleGenerationPrompt = ai.definePrompt({
  name: 'examScheduleGenerationPrompt',
  input: { schema: GenerateExamScheduleInputSchema },
  output: { schema: GenerateExamScheduleOutputSchema },
  model: ai.model('googleai/gemini-1.5-flash'),
  prompt: `You are an expert university exam administrator. Your task is to create a conflict-free exam schedule for multiple semesters.

Follow these rules precisely:
1.  **One Exam Per Day:** Each class can have only ONE exam on any given day.
2.  **No Overlapping Semesters:** Do not schedule exams for two different semesters (e.g., Semester 3 and Semester 5) on the same day. Finish all exams for one semester before starting the next.
3.  **Assign Classrooms:** Assign a unique classroom for each exam.
4.  **Date & Time:** The schedule must be within the provided start and end dates and use the specified time slots.
5.  **Chronological Order:** Schedule exams for lower semesters first (e.g., finish all semester 3 exams before starting semester 5).

Here is the data:
-   **Subjects**: {{{json subjects}}}
-   **Classes**: {{{json classes}}}
-   **Classrooms**: {{{json classrooms}}}
-   **Exam Period Start**: {{{startDate}}}
-   **Exam Period End**: {{{endDate}}}
-   **Available Time Slots**: {{{json timeSlots}}}

Generate the complete, conflict-free schedule and provide a brief summary.
`,
});

const generateExamScheduleFlow = ai.defineFlow(
  {
    name: 'generateExamScheduleFlow',
    inputSchema: GenerateExamScheduleInputSchema,
    outputSchema: GenerateExamScheduleOutputSchema,
  },
  async (input) => {
    const { output } = await scheduleGenerationPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate an exam schedule.');
    }
    return output;
  }
);
