/**
 * @fileoverview This file is the central point for initializing the Genkit AI object.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const plugins = [];

// When deployed to a Google Cloud environment (like App Hosting),
// the googleAI() plugin without any arguments will automatically use the
// service account credentials of the runtime.
if (process.env.NODE_ENV === 'production') {
  plugins.push(googleAI());
} else {
  // For local development, an API key is required.
  if (process.env.GEMINI_API_KEY) {
    plugins.push(googleAI({ apiKey: process.env.GEMINI_API_KEY }));
  } else {
    console.warn(
      'GEMINI_API_KEY environment variable not set. AI features will not work.'
    );
  }
}

export const ai = genkit({
  plugins,
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
