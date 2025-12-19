/**
 * @fileoverview This file is the central point for initializing the Genkit AI object.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// When deployed to a Google Cloud environment (like App Hosting),
// the googleAI() plugin without any arguments will automatically use the
// service account credentials of the runtime. For local development,
// ensure you have authenticated with `gcloud auth application-default login`.
export const ai = genkit({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
