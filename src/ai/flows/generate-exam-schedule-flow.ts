
'use server';
/**
 * @fileOverview A Genkit flow for generating an exam schedule.
 */

import {ai} from '@/ai/genkit';
import { GenerateExamScheduleInputSchema, GenerateExamScheduleOutputSchema, type GenerateExamScheduleInput, type GenerateExamScheduleOutput } from '@/lib/types';


const generateExamSchedule = ai.defineFlow(
  {
    name: 'generateExamScheduleFlow',
    inputSchema: GenerateExamScheduleInputSchema,
    outputSchema: GenerateExamScheduleOutputSchema,
  },
  async (input) => {
    const prompt = `
        You are a university exam scheduler. Your task is to create a conflict-free exam schedule.

        Constraints & Rules:
        - Exams can only be scheduled on weekdays (Monday to Friday).
        - There are two time slots available each day: ${input.examTimeSlots.join(' and ')}.
        - A class cannot have more than one exam on the same day.
        - Two different classes can have exams at the same time, provided they are in different classrooms.
        - Assign one classroom per exam. Prioritize classrooms with type 'classroom' over 'lab'. Ensure classroom capacity is sufficient for the class size if that data is available.
        - Ensure there is at least a one-day gap between exams for the same class. For example, if a class has an exam on Monday, their next exam cannot be on Tuesday.
        - The schedule should be spread out as much as possible. Avoid scheduling all exams for a single class back-to-back.

        Available Data:
        - Subjects: ${JSON.stringify(input.subjects, null, 2)}
        - Classes: ${JSON.stringify(input.classes, null, 2)}
        - Classrooms: ${JSON.stringify(input.classrooms, null, 2)}

        Instructions:
        1.  Create a schedule for all relevant subjects for the classes provided.
        2.  The output 'generatedSchedule' must be a complete and valid schedule in an array of JSON objects.
        3.  Each object in the array represents one exam and must include 'subjectId', 'classId', 'date', 'time', and 'classroomId'. The date format must be 'YYYY-MM-DD'.
        4.  Create a concise 'summary' of the generated schedule. For example: "Generated a schedule for 5 exams across 3 classes, ensuring no conflicts and a one-day gap between papers for each class."
    `;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-pro',
      output: {
        schema: GenerateExamScheduleOutputSchema,
      },
      config: {
        temperature: 0.2,
      },
    });

    return llmResponse.output!;
  }
);


export async function generateExamScheduleFlow(input: GenerateExamScheduleInput): Promise<GenerateExamScheduleOutput> {
    return generateExamSchedule(input);
}
