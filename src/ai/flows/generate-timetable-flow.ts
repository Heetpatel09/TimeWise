
'use server';

import { ai } from '@/ai/genkit';
import {
  GenerateTimetableInputSchema,
  GenerateTimetableOutputSchema,
  type GenerateTimetableInput,
  type GenerateTimetableOutput,
} from '@/lib/types';
import { runGA } from '@/lib/ga-engine';

export const generateTimetableFlow = ai.defineFlow(
  {
    name: 'generateTimetableFlow',
    inputSchema: GenerateTimetableInputSchema,
    outputSchema: GenerateTimetableOutputSchema,
  },
  async (input: GenerateTimetableInput): Promise<GenerateTimetableOutput> => {
    const result = await runGA(input);

    if (result.success && result.bestTimetable && result.bestTimetable.length > 0) {
      return {
        summary: result.message ?? 'Timetable generated successfully.',
        generatedSchedule: result.bestTimetable,
        codeChefDay: result.codeChefDay,
        error: undefined, // Explicitly clear error on success
      };
    }

    // Engine failed, return a structured error response
    return {
      summary: 'Timetable generation failed.',
      generatedSchedule: [],
      codeChefDay: undefined,
      error: result.message || 'An unknown engine error occurred. This could be due to overly restrictive constraints (e.g., not enough classrooms or available faculty hours).',
    };
  }
);
