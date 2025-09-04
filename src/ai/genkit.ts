
import {genkit} from 'genkit';
import {vertexAI} from '@genkit-ai/vertexai';

export const ai = genkit({
  plugins: [
    vertexAI({
      apiKey: process.env.GEMINI_API_KEY,
      location: 'us-central1',
    }),
  ],
  model: 'gemini-1.5-flash-preview-0514',
});
