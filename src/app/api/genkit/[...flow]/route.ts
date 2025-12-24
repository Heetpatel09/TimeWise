/**
 * @fileoverview This file is the entry point for Genkit flows in production.
 */

import { createNextApiHandler } from '@genkit-ai/google-genai';
import { flows } from '@/ai/dev';

// This export is necessary for Genkit to discover and serve the flows.
export const POST = createNextApiHandler({ flows });
