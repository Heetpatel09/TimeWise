/**
 * @fileoverview This file is the entry point for Genkit flows in production.
 */

import { ai } from '@/ai/genkit';
import { nextHandler } from '@genkit-ai/next';
import { flows } from '@/ai/dev';

// This export is necessary for Genkit to discover and serve the flows.
export const POST = nextHandler({ flows });
