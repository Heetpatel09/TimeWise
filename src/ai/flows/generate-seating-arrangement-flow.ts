
'use server';

/**
 * @fileOverview Implements a flow to generate a seating arrangement for an exam.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';

// Input Schemas
const StudentInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const EnrichedExamInfoSchema = z.object({
  id: z.string(),
  subjectName: z.string(),
  className: z.string(),
  classroomName: z.string(),
  date: z.string(),
  time: z.string(),
});

const GenerateSeatingArrangementInputSchema = z.object({
  exam: EnrichedExamInfoSchema,
  students: z.array(StudentInfoSchema),
});
type GenerateSeatingArrangementInput = z.infer<typeof GenerateSeatingArrangementInputSchema>;

// Output Schemas
const SeatingAssignmentSchema = z.object({
  seatNumber: z.number(),
  studentId: z.string(),
  studentName: z.string(),
});

const GenerateSeatingArrangementOutputSchema = z.object({
  seatingArrangement: z.array(SeatingAssignmentSchema).describe('An array of seating assignments for each student.'),
});
export type GenerateSeatingArrangementOutput = z.infer<typeof GenerateSeatingArrangementOutputSchema>;


export async function generateSeatingArrangement(input: GenerateSeatingArrangementInput): Promise<GenerateSeatingArrangementOutput> {
  return generateSeatingArrangementFlow(input);
}

const seatingArrangementPrompt = ai.definePrompt({
  name: 'seatingArrangementPrompt',
  input: { schema: GenerateSeatingArrangementInputSchema },
  output: { schema: GenerateSeatingArrangementOutputSchema },
  model: googleAI.model('gemini-1.5-pro'),
  prompt: `You are an expert exam supervisor. Your task is to create a simple, sequential seating arrangement for an upcoming exam.

Here is the information for the exam:
-   **Exam**: {{{exam.subjectName}}} for class {{{exam.className}}}
-   **Classroom**: {{{exam.classroomName}}}
-   **Date & Time**: {{{exam.date}}} at {{{exam.time}}}
-   **Students to be seated**: {{{json students}}}

Your task is to assign each student a unique seat number, starting from 1 and incrementing sequentially.

Generate the seating arrangement in the required format.
`,
});

const generateSeatingArrangementFlow = ai.defineFlow(
  {
    name: 'generateSeatingArrangementFlow',
    inputSchema: GenerateSeatingArrangementInputSchema,
    outputSchema: GenerateSeatingArrangementOutputSchema,
  },
  async (input) => {
    const { output } = await seatingArrangementPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a seating arrangement.');
    }
    return output;
  }
);
