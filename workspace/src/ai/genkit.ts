/**
 * @fileoverview This file is the central point for initializing the Genkit AI object.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// When running in a Google Cloud environment (like App Hosting),
// the googleAI() plugin without any arguments will automatically use the
// service account credentials of the runtime.
// For local development, it will look for a GEMINI_API_KEY in the .env file.

export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY})],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
