
/**
 * @fileoverview This file initializes the Genkit AI instance.
 */

import {genkit} from 'genkit';
import {GoogleGenAI} from '@google/genai';

export const ai = genkit({
  plugins: [
    GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
