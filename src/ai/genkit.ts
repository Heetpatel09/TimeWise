/**
 * @fileoverview This file is the central point for initializing the Genkit AI object.
 */

import { genkit, Plugin } from 'genkit';
import { googleAI, GoogleAIGenerateRequest } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
