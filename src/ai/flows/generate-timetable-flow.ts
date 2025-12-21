
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
    // Determine if we are generating for a single class or all classes
    const isSingleClass = input.classes.length === 1;
    
    const prompt = `
        You are TimeWise, an AI-powered automatic timetable generation engine. Your job is to generate a weekly timetable for a 5-day week (Monday to Friday).

        ${isSingleClass ? 
        `You are generating a schedule for ONE specific class: ${input.classes[0].name}. You MUST NOT alter the existing schedule for other classes. The new slots for ${input.classes[0].name} must be conflict-free with the provided existing schedule.` :
        `You are generating a weekly timetable for ALL provided class sections.`
        }

        CORE CONSTRAINTS (HARD RULES):
        1. No faculty member can be assigned to more than one class in the same time slot. This applies to both the new schedule and the existing one.
        2. No classroom can be used by more than one section in the same time slot, including conflicts with the existing schedule.
        3. For the class(es) you are generating for, every subject must be scheduled for a reasonable number of hours per week, based on its importance (e.g., core subjects more often than elective/PGPD subjects). Aim for 3-4 hours per week for core subjects.
        4. A faculty member’s maximum weekly workload must never be exceeded (consider their load from the existing schedule as well).
        5. Each class section can have only one subject in a single time slot.
        6. The provided time slots are fixed. You must use these exact time slots. Recess times should be left empty.

        OPTIMIZATION FEATURES (SOFT RULES):
        7. Distribute subject hours evenly across the week. Avoid scheduling the same subject back-to-back on the same day if possible.
        8. Avoid idle gaps in a section’s timetable (lectures should be contiguous).
        9. Balance faculty schedules.
        10. Prefer morning slots for core theory subjects. Labs can be in the afternoon.

        INPUT DATA:
        - Working Days: ${JSON.stringify(input.days)}
        - Time Slots per day (including recess): ${JSON.stringify(input.timeSlots)}
        - Class(es) to schedule for: ${JSON.stringify(input.classes)}
        - Available Subjects for the department: ${JSON.stringify(input.subjects)}
        - Available Faculty for the department: ${JSON.stringify(input.faculty)}
        - Available Classrooms: ${JSON.stringify(input.classrooms)}
        ${isSingleClass && input.existingSchedule ? `- Existing Schedule (for conflict checking): ${JSON.stringify(input.existingSchedule)}` : ''}

        OUTPUT FORMAT:
        - Generate a schedule containing all required slots for the specified class(es) for all 5 days.
        - The 'generatedSchedule' array MUST contain objects with 'classId', 'subjectId', 'facultyId', 'classroomId', 'day', and 'time'.
        - Ensure the final output has ZERO conflicts based on the hard rules.
        - Provide a concise 'summary' of the generated timetable (e.g., "Generated a full 5-day schedule for AIDS-1 with 25 slots, ensuring no conflicts and balanced subject distribution.").

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
        temperature: 0.2,
      },
    });

    return llmResponse.output!;
  }
);


export async function generateTimetableFlow(input: GenerateTimetableInput): Promise<GenerateTimetableOutput> {
    return generateTimetable(input);
}
