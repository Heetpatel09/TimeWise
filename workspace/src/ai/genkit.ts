/**
 * @fileoverview This file is the central point for initializing the Genkit AI object.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// When running locally, this will look for a GEMINI_API_KEY in the .env file.
// When deployed to a Google Cloud environment (like App Hosting),
// the googleAI() plugin without any arguments will automatically use the
// service account credentials of the runtime.

// TODO: PASTE YOUR GEMINI API KEY HERE
const GEMINI_API_KEY = "PASTE_YOUR_API_KEY_HERE";

export const ai = genkit({
  plugins: [googleAI({ apiKey: GEMINI_API_KEY })],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
