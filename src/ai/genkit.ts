/**
 * @fileoverview This file is the central point for initializing the Genkit AI object.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const plugins = [];
if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI({ apiKey: process.env.GEMINI_API_KEY }));
} else {
  // In a deployed environment like Firebase App Hosting, the plugin will automatically
  // use the project's service account for authentication.
  plugins.push(googleAI());
}

export const ai = genkit({
  plugins,
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
