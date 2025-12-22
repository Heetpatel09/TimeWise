
'use server';
/**
 * @fileOverview A Genkit flow for generating a weekly class timetable using a Genetic Algorithm.
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
    
    const result = runGA(input);

    if (!result.success) {
      return {
        summary: `Failed to generate a valid timetable. Reason: ${result.message}`,
        generatedSchedule: [],
      };
    }

    const schedule = result.bestTimetable!.map(gene => ({
        classId: gene.classId,
        subjectId: gene.subjectId,
        facultyId: gene.facultyId,
        classroomId: gene.classroomId,
        day: gene.day,
        time: gene.time,
    }));

    return {
      summary: `Successfully generated a conflict-free timetable after ${result.generations} generations. Final fitness score: ${result.fitness}.`,
      generatedSchedule: schedule,
    };
  }
);


export async function generateTimetableFlow(input: GenerateTimetableInput): Promise<GenerateTimetableOutput> {
    return generateTimetable(input);
}
