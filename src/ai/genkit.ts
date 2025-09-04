
import {genkit} from 'genkit';
import {vertexAI} from '@genkit-ai/vertexai';

export const ai = genkit({
  plugins: [vertexAI({apiKey: process.env.GEMINI_API_KEY})],
  model: 'vertexai/gemini-1.5-flash-preview-0514',
});
