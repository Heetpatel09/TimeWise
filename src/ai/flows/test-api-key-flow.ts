
'use server';
/**
 * @fileoverview A simple flow to test the API key.
 */

import {ai} from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
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
        model: googleAI.model('gemini-2.5-flash'),
        config: {
          temperature: 0.5,
        },
      });

      const responseText = llmResponse.text;
      if (responseText && responseText.trim() !== '') {
        return {success: true};
      } else {
        return {success: false, error: 'Received an empty response from the API.'};
      }
    } catch (e: any) {
      console.error('API Key Test Error:', e);
      let errorMessage = 'An unknown error occurred.';
      if (e.message) {
        if (e.message.includes('API key not valid') || (e.cause as any)?.code?.includes('PERMISSION_DENIED')) {
          errorMessage =
            'Authentication failed. Please check if your API key is correct and has the required permissions for the Gemini API.';
        } else if (e.message.includes('429') || e.message.includes('resource has been exhausted')) {
          errorMessage =
            'API rate limit exceeded. Please wait and try again later, or check your billing status.';
        } else if (e.message.toLowerCase().includes('model not found')) {
           errorMessage = `The model 'gemini-1.5-flash' was not found. This is often an authentication issue. Please verify your API key and ensure it is enabled for the 'Generative Language API'.`;
        }
         else {
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
