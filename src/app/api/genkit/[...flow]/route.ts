/**
 * @fileoverview This file is the entry point for Genkit flows in production.
 */

import { createNextApiHandler } from '@genkit-ai/google-genai';

// Import flows directly for production builds.
// This decouples the production API from the development-only `dev.ts` file.
import { generateTestPaperFlow } from '@/ai/flows/generate-test-paper-flow';
import { generateWelcomeNotificationFlow } from '@/ai/flows/generate-welcome-notification-flow';
import { testApiKeyFlow } from '@/ai/flows/test-api-key-flow';
import { resolveScheduleConflictsFlow } from '@/ai/flows/resolve-schedule-conflicts-flow';
import { generateExamScheduleFlow } from '@/ai/flows/generate-exam-schedule-flow';
import { generateSeatingArrangementFlow } from '@/ai/flows/generate-seating-arrangement-flow';
import { generateTimetableFlow } from '@/ai/flows/generate-timetable-flow';

// This export is necessary for Genkit to discover and serve the flows.
export const POST = createNextApiHandler({
  flows: [
    generateTestPaperFlow,
    generateWelcomeNotificationFlow,
    testApiKeyFlow,
    resolveScheduleConflictsFlow,
    generateExamScheduleFlow,
    generateSeatingArrangementFlow,
    generateTimetableFlow,
  ],
});
