
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
    // The runGA engine now directly returns an object that should match
    // the output schema, or an object with an error property if it fails.
    const result = await runGA(input);

    // If the engine itself caught a fatal error or failed validation,
    // it will return an 'error' property. We must create a valid
    // response object that satisfies the schema.
    if (result.error) {
      return {
        summary: 'Timetable generation failed.',
        facultyWorkload: [], // Provide empty array to satisfy schema
        semesterTimetables: [], // Provide empty array to satisfy schema
        codeChefDay: result.codeChefDay || 'N/A',
        error: result.error,
      };
    }

    // If generation was successful, the result from runGA should be valid.
    // We just pass it through. The schema validation will catch any issues.
    return {
        summary: result.summary,
        facultyWorkload: result.facultyWorkload,
        semesterTimetables: result.semesterTimetables,
        codeChefDay: result.codeChefDay,
        error: undefined, // Ensure no error is passed on success
    };
  }
);
