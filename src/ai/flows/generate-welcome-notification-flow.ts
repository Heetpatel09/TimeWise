'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const WelcomeNotificationInputSchema = z.object({
  name: z.string(),
  role: z.enum(['student', 'faculty']),
  context: z.string().describe('The class or department the user is joining.'),
});

export type WelcomeNotificationInput = z.infer<
  typeof WelcomeNotificationInputSchema
>;

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
      model: 'googleai/gemini-1.5-flash-preview',
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
