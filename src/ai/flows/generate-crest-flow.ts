
'use server';

/**
 * @fileOverview Implements a flow to generate a unique crest for a user.
 *
 * - generateCrest - A function that handles the crest generation process.
 * - GenerateCrestInput - The input type for the generateCrest function.
 * - GenerateCrestOutput - The return type for the generateCrest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCrestInputSchema = z.object({
  name: z.string().describe("The name of the person for whom to generate the crest."),
  role: z.enum(['student', 'faculty']).describe("The role of the person."),
  achievement: z.string().describe("The achievement to celebrate (e.g., 'Top Attendance Streak')."),
});
export type GenerateCrestInput = z.infer<typeof GenerateCrestInputSchema>;

const GenerateCrestOutputSchema = z.object({
  crestDataUri: z.string().describe("The generated crest image as a data URI."),
});
export type GenerateCrestOutput = z.infer<typeof GenerateCrestOutputSchema>;


export async function generateCrest(input: GenerateCrestInput): Promise<GenerateCrestOutput> {
  return generateCrestFlow(input);
}

const generateCrestFlow = ai.defineFlow(
  {
    name: 'generateCrestFlow',
    inputSchema: GenerateCrestInputSchema,
    outputSchema: GenerateCrestOutputSchema,
  },
  async (input) => {
    // A simplified, more direct prompt for better image generation results.
    const prompt = `A university-style crest for a ${input.role} named ${input.name}, celebrating their achievement: ${input.achievement}. The design should be an elegant, academic emblem with clean lines, incorporating symbols like laurels, books, or a flame of knowledge. No text or letters.`;

    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: prompt,
    });

    if (!media) {
      throw new Error('Image generation failed to produce an output.');
    }
    
    return { crestDataUri: media.url };
  }
);
