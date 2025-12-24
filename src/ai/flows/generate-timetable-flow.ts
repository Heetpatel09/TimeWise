
'use server';
/**
 * @fileOverview A Genkit flow for generating a weekly class timetable using an AI model.
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
    
    const { success, message, bestTimetable, generations, fitness, codeChefDay } = await runGA(input);
    
    if (success && bestTimetable) {
        const schedule = bestTimetable
            .filter(gene => !gene.isCodeChef)
            .map(gene => ({
                classId: gene.classId,
                subjectId: gene.subjectId,
                facultyId: gene.facultyId,
                classroomId: gene.classroomId,
                day: gene.day,
                time: gene.time,
            }));
        
        return {
            summary: message || `Generated schedule after ${generations} generations with fitness ${fitness}.`,
            generatedSchedule: schedule,
            codeChefDay: codeChefDay,
        };
    } else {
        return {
            summary: message || "Failed to generate a valid timetable.",
            generatedSchedule: [],
        };
    }
  }
);


export async function generateTimetableFlow(input: GenerateTimetableInput): Promise<GenerateTimetableOutput> {
    return generateTimetable(input);
}
