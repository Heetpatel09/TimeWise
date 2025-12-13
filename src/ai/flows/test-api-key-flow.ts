'use server';

/**
 * @fileOverview A simple flow to test if the Gemini API key is configured correctly.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export async function testApiKey(): Promise<{ success: boolean; message: string }> {
  return testApiKeyFlow();
}

const testApiKeyFlow = ai.defineFlow(
  {
    name: 'testApiKeyFlow',
    inputSchema: z.void(),
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async () => {
    try {
      const { text } = await ai.generate({
        prompt: 'Say "Hello"',
        config: {
          // Use a very low temperature for a predictable, low-cost response
          temperature: 0.1,
        },
      });

      if (text) {
        return { success: true, message: 'API key is valid and working.' };
      } else {
        throw new Error('API call returned an empty response.');
      }
    } catch (error: any) {
      // Catch potential errors, like authentication failure
      console.error('API Key Test Failed:', error);
      throw new Error(`API key test failed: ${error.message}`);
    }
  }
);
