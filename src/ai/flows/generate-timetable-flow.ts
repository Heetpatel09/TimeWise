
'use server';
/**
 * @fileOverview A Genkit flow for generating a weekly class timetable using an AI model.
 */

import { ai } from '@/ai/genkit';
import { GenerateTimetableInputSchema, GenerateTimetableOutputSchema, type GenerateTimetableInput, type GenerateTimetableOutput } from '@/lib/types';
import { runGA } from '@/lib/ga-engine';

// This file is now a simple wrapper. The core logic is in ga-engine.ts
// and is called directly from the client for better reliability.
// This flow can be used for other integrations if needed.
const generateTimetable = ai.defineFlow(
  {
    name: 'generateTimetableFlow',
    inputSchema: GenerateTimetableInputSchema,
    outputSchema: GenerateTimetableOutputSchema,
  },
  async (input) => {
    
    const { success, message, bestTimetable, codeChefDay } = await runGA(input);
    
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
            summary: message || `Generated a valid schedule.`,
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

    