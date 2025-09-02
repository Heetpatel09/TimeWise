import { config } from 'dotenv';
config();

import '@/ai/flows/resolve-schedule-conflicts.ts';
import '@/ai/flows/generate-crest-flow.ts';
import '@/ai/flows/generate-welcome-notification-flow.ts';
