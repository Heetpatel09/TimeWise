
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
    // the output schema. It is designed to never fail and always return a
    // complete (though potentially conflicted) timetable.
    const result = await runGA(input);

    // The 'error' field is kept for schema compatibility but the new engine
    // logic aims to avoid using it, preferring to return a complete schedule
    // with warnings if necessary.
    if (result.error) {
      return {
        summary: 'Timetable generation encountered issues.',
        facultyWorkload: [],
        semesterTimetables: [],
        codeChefDay: result.codeChefDay || 'N/A',
        error: result.error,
      };
    }

    // Pass the successful result directly through.
    return result;
  }
);
