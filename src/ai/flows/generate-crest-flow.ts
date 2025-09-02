
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
    const prompt = `Generate a university-style crest emblem for ${input.name}. 
    They are a ${input.role} being celebrated for: '${input.achievement}'.
    The crest should be dignified, academic, and visually impressive. 
    It should incorporate thematic elements related to their role and achievement, like books, laurels, or a flame of knowledge.
    The style should be a modern emblem with a clean design.
    Do not include any text or letters in the image.`;

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
