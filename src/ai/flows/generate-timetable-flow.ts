
'use server';
/**
 * @fileOverview A Genkit flow for generating a weekly class timetable.
 */

import {ai} from '@/ai/genkit';
import { GenerateTimetableInputSchema, GenerateTimetableOutputSchema, type GenerateTimetableInput, type GenerateTimetableOutput } from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';


const generateTimetable = ai.defineFlow(
  {
    name: 'generateTimetableFlow',
    inputSchema: GenerateTimetableInputSchema,
    outputSchema: GenerateTimetableOutputSchema,
  },
  async (input) => {
    const prompt = `
        You are TimeWise, an AI-powered automatic timetable generation engine. Your job is to generate a weekly timetable for multiple class sections using the provided data.

        CORE CONSTRAINTS (HARD RULES):
        1. No faculty member can be assigned to more than one class in the same time slot.
        2. No classroom can be used by more than one section in the same time slot.
        3. Every subject must be scheduled for exactly the required number of hours per week.
        4. A faculty member’s maximum weekly workload must never be exceeded.
        5. Each class section can have only one subject in a single time slot.

        OPTIMIZATION FEATURES (SOFT RULES):
        6. Distribute subject hours evenly across the week (avoid repeating the same subject multiple times in one day if possible).
        7. Avoid idle gaps in a section’s timetable unless unavoidable.
        8. Balance faculty schedules so their workload is spread across days.
        9. Prefer morning slots for theory subjects.

        INPUT DATA:
        - Working Days: ${JSON.stringify(input.days)}
        - Time Slots per day: ${JSON.stringify(input.timeSlots)}
        - Classes/Sections: ${JSON.stringify(input.classes)}
        - Available Classrooms: ${JSON.stringify(input.classrooms)}
        - Faculty Details: ${JSON.stringify(input.faculty)}
        - Subject Requirements per class: ${JSON.stringify(input.subjects)}

        OUTPUT FORMAT:
        - Generate a single, unified schedule containing all slots for all classes.
        - The 'generatedSchedule' array MUST contain objects with 'classId', 'subjectId', 'facultyId', 'classroomId', 'day', and 'time'.
        - Ensure the final output has ZERO conflicts based on the hard rules.
        - Provide a concise 'summary' of the generated timetable (e.g., "Generated a schedule for 8 classes with 240 total slots, ensuring all constraints are met.").

        FAILURE HANDLING:
        - If it is impossible to generate a valid timetable, clearly explain the reason for the failure in the 'summary' field and leave the 'generatedSchedule' array empty.
    `;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: googleAI.model('gemini-pro'),
      output: {
        schema: GenerateTimetableOutputSchema,
      },
      config: {
        temperature: 0.1,
      },
    });

    return llmResponse.output!;
  }
);


export async function generateTimetableFlow(input: GenerateTimetableInput): Promise<GenerateTimetableOutput> {
    return generateTimetable(input);
}
