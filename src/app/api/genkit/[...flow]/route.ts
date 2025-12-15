/**
 * @fileoverview This file is the entry point for Genkit flows in production.
 */

import { genkit } from 'genkit';
import { googleAI }from '@genkit-ai/googleai';
import { nextHandler } from '@genkit-ai/next';
import { flows } from '@/ai/dev';

genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const POST = nextHandler();
