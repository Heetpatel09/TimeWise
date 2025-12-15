
'use server';
/**
 * @fileoverview A simple flow to test the API key.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const testApiKey = ai.defineFlow(
  {
    name: 'testApiKeyFlow',
    inputSchema: z.void(),
    outputSchema: z.object({
      success: z.boolean(),
      error: z.string().optional(),
    }),
  },
  async () => {
    try {
      const llmResponse = await ai.generate({
        prompt: 'Give me a two-word "hello world" response.',
        model: 'googleai/gemini-2.0-flash',
        config: {
          temperature: 0.5,
        },
      });

      const responseText = llmResponse.text;
      if (responseText && responseText.trim() !== '') {
        return {success: true};
      } else {
        return {success: false, error: 'Received an empty response.'};
      }
    } catch (e: any) {
      console.error(e);
      // Clean up the error message to be more user-friendly
      let errorMessage = 'An unknown error occurred.';
      if (e.message) {
        if (e.message.includes('API key not valid')) {
          errorMessage =
            'Authentication failed. Please check if your API key is correct and has the required permissions.';
        } else if (e.message.includes('429')) {
          errorMessage =
            'API rate limit exceeded. Please wait and try again later.';
        } else {
          errorMessage = e.message;
        }
      }
      return {success: false, error: errorMessage};
    }
  }
);

export async function testApiKeyFlow(): Promise<{success: boolean, error?: string}> {
  return testApiKey();
}
