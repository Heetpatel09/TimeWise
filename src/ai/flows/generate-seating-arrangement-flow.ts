
'use server';
/**
 * @fileOverview A Genkit flow for generating an exam seating arrangement.
 */

import {ai} from '@/ai/genkit';
import { GenerateSeatingArrangementInputSchema, GenerateSeatingArrangementOutputSchema, type GenerateSeatingArrangementInput, type GenerateSeatingArrangementOutput } from '@/lib/types';


const generateSeatingArrangement = ai.defineFlow(
  {
    name: 'generateSeatingArrangementFlow',
    inputSchema: GenerateSeatingArrangementInputSchema,
    outputSchema: GenerateSeatingArrangementOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an exam invigilator. Your task is to create a seating arrangement for an exam.

      Available Data:
      - Classroom: ${JSON.stringify(input.classroom, null, 2)}
      - Students: ${JSON.stringify(input.students, null, 2)}
      
      Instructions:
      1. Assign each student a unique seat number, starting from 1 up to the capacity of the classroom.
      2. The 'seatingArrangement' array should contain an object for each student with their assigned 'seatNumber', 'studentId', and 'studentName'.
      3. Do not exceed the classroom's capacity. If there are more students than seats, only assign seats up to the capacity.
    `;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-2.0-flash',
      output: {
        schema: GenerateSeatingArrangementOutputSchema,
      },
      config: {
        temperature: 0.1,
      },
    });

    return llmResponse.output!;
  }
);


export async function generateSeatingArrangementFlow(input: GenerateSeatingArrangementInput): Promise<GenerateSeatingArrangementOutput> {
    return generateSeatingArrangement(input);
}
