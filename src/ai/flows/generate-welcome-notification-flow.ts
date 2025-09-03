
'use server';
import { config } from 'dotenv';
config();

/**
 * @fileOverview Implements a flow to generate a personalized welcome notification.
 *
 * - generateWelcomeNotification - A function that generates a welcome message.
 * - WelcomeNotificationInput - The input type for the function.
 * - WelcomeNotificationOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WelcomeNotificationInputSchema = z.object({
  name: z.string().describe("The name of the new user."),
  role: z.enum(['student', 'faculty']).describe("The role of the new user."),
  context: z.string().describe("Additional context, such as the user's class or department."),
});
export type WelcomeNotificationInput = z.infer<typeof WelcomeNotificationInputSchema>;

const WelcomeNotificationOutputSchema = z.object({
  message: z.string().describe("The generated personalized welcome message."),
});
export type WelcomeNotificationOutput = z.infer<typeof WelcomeNotificationOutputSchema>;


export async function generateWelcomeNotification(input: WelcomeNotificationInput): Promise<WelcomeNotificationOutput> {
  return generateWelcomeNotificationFlow(input);
}

const welcomePrompt = ai.definePrompt({
    name: 'welcomePrompt',
    input: { schema: WelcomeNotificationInputSchema },
    output: { schema: WelcomeNotificationOutputSchema },
    prompt: `You are a helpful university administrative assistant. Your task is to generate a short, friendly, and welcoming notification message for a new user who has just been added to the university portal.

User's Name: {{{name}}}
User's Role: {{{role}}}
Context (Class/Department): {{{context}}}

Generate a single sentence message. Be warm and welcoming. Mention their context (class or department).

Example for a student: "Welcome to the portal, Jane Doe! We're excited to have you join the Computer Science department."
Example for a faculty: "Welcome aboard, Dr. Smith! We're thrilled to have you with the Physics department."
`,
});


const generateWelcomeNotificationFlow = ai.defineFlow(
  {
    name: 'generateWelcomeNotificationFlow',
    inputSchema: WelcomeNotificationInputSchema,
    outputSchema: WelcomeNotificationOutputSchema,
  },
  async (input) => {
    const { output } = await welcomePrompt(input);
    if (!output) {
      throw new Error("AI failed to generate a welcome message.");
    }
    return output;
  }
);
