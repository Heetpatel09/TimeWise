
'use server';
/**
 * @fileOverview A Genkit flow for generating a weekly class timetable using an AI model.
 */

import { ai } from '@/ai/genkit';
import { GenerateTimetableInputSchema, GenerateTimetableOutputSchema, type GenerateTimetableInput, type GenerateTimetableOutput } from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';

const generateTimetable = ai.defineFlow(
  {
    name: 'generateTimetableFlow',
    inputSchema: GenerateTimetableInputSchema,
    outputSchema: GenerateTimetableOutputSchema,
  },
  async (input) => {
    const isSingleClass = input.classes.length === 1;
    const prompt = `
        You are TimeWise, an AI-powered automatic timetable generation engine. Your job is to generate a weekly timetable.

        ${isSingleClass ? 
        `You are generating a schedule for ONE specific class: ${input.classes[0].name}. You MUST NOT alter the existing schedule for other classes. The new slots for ${input.classes[0].name} must be conflict-free with the provided existing schedule.` :
        `You are generating a weekly timetable for ALL provided class sections.`
        }

        CORE CONSTRAINTS (HARD RULES):
        1. No faculty member can be assigned to more than one class in the same time slot. This applies to both the new schedule and the existing one.
        2. No classroom can be used by more than one section in the same time slot, including conflicts with the existing schedule.
        3. For the class(es) you are generating for, every subject must be scheduled for exactly the required number of hours per week.
        4. A faculty member’s maximum weekly workload must never be exceeded (consider their load from the existing schedule as well).
        5. Each class section can have only one subject in a single time slot.

        OPTIMIZATION FEATURES (SOFT RULES):
        6. Distribute subject hours evenly across the week.
        7. Avoid idle gaps in a section’s timetable.
        8. Balance faculty schedules.
        9. Prefer morning slots for theory subjects.

        INPUT DATA:
        - Working Days: ${JSON.stringify(input.days)}
        - Time Slots per day: ${JSON.stringify(input.timeSlots)}
        - Class(es) to schedule for: ${JSON.stringify(input.classes)}
        - Available Classrooms: ${JSON.stringify(input.classrooms)}
        - Faculty Details: ${JSON.stringify(input.faculty)}
        - Subject Requirements per class: ${JSON.stringify(input.subjects)}
        ${isSingleClass && input.existingSchedule ? `- Existing Schedule (for conflict checking): ${JSON.stringify(input.existingSchedule)}` : ''}

        OUTPUT FORMAT:
        - Generate a schedule containing all required slots for the specified class(es).
        - The 'generatedSchedule' array MUST contain objects with 'classId', 'subjectId', 'facultyId', 'classroomId', 'day', and 'time'.
        - Ensure the final output has ZERO conflicts based on the hard rules.
        - Provide a concise 'summary' of the generated timetable (e.g., "Generated schedule for SE COMP A with 20 slots, ensuring no conflicts with the existing university timetable.").
        - Include the selected 'codeChefDay' in the output.

        FAILURE HANDLING:
        - If it is impossible to generate a valid timetable, clearly explain the reason for the failure in the 'summary' field and leave the 'generatedSchedule' array empty.
    `;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: googleAI.model('gemini-2.5-flash'),
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
