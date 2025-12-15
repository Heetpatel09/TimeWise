
'use server';

import {ai} from '@/ai/genkit';
import { WelcomeNotificationInputSchema, type WelcomeNotificationInput } from '@/lib/types';
import { z } from 'zod';


const generateWelcomeNotification = ai.defineFlow(
  {
    name: 'generateWelcomeNotificationFlow',
    inputSchema: WelcomeNotificationInputSchema,
    outputSchema: z.string(),
  },
  async ({name, role, context}) => {
    const prompt = `Generate a short, friendly, and welcoming notification message for a new ${role} named ${name} who has just been added to the system. The ${role} is joining ${context}. The message should be encouraging and brief.`;

    const llmResponse = await ai.generate({
      prompt,
      model: 'gemini-1.5-flash',
      config: {
        temperature: 0.7,
      },
    });

    return llmResponse.text;
  }
);

export async function generateWelcomeNotificationFlow(input: WelcomeNotificationInput): Promise<string> {
    return generateWelcomeNotification(input);
}
