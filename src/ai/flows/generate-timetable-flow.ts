
'use server';
/**
 * @fileOverview A Genkit flow for generating a weekly class timetable using a deterministic engine.
 */

import { ai } from '@/ai/genkit';
import { GenerateTimetableInputSchema, GenerateTimetableOutputSchema, type GenerateTimetableInput, type GenerateTimetableOutput } from '@/lib/types';
import { runGA } from '@/lib/ga-engine';

const generateTimetable = ai.defineFlow(
  {
    name: 'generateTimetableFlow',
    inputSchema: GenerateTimetableInputSchema,
    outputSchema: GenerateTimetableOutputSchema,
  },
  async (input) => {
    const result = await runGA(input);

    if (result.success && result.bestTimetable) {
      return {
        summary: result.message || "Timetable generated successfully.",
        generatedSchedule: result.bestTimetable,
        codeChefDay: result.codeChefDay,
      };
    } else {
      // If the engine fails, return a structured error response that matches the schema.
      // This prevents the "unexpected response" on the client.
      return {
        summary: result.message || "Failed to generate a valid timetable. The constraints might be too restrictive.",
        generatedSchedule: [],
        codeChefDay: undefined,
      };
    }
  }
);


export async function generateTimetableFlow(input: GenerateTimetableInput): Promise<GenerateTimetableOutput> {
    return generateTimetable(input);
}
