
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
    return result;
  }
);

    
