
'use server';
/**
 * @fileoverview This file is used to register AI flows and tools with Genkit.
 *
 * It is not meant to be used in production, and should only be used for development.
 *
 * This file will be removed when the app is deployed to production.
 */

import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { generateTestPaperFlow } from './flows/generate-test-paper-flow';
import { generateWelcomeNotificationFlow } from './flows/generate-welcome-notification-flow';
import { testApiKeyFlow } from './flows/test-api-key-flow';
import { resolveScheduleConflictsFlow } from './flows/resolve-schedule-conflicts-flow';
import { generateExamScheduleFlow } from './flows/generate-exam-schedule-flow';
import { generateSeatingArrangementFlow } from './flows/generate-seating-arrangement-flow';

configureGenkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const flows = [
  generateTestPaperFlow,
  generateWelcomeNotificationFlow,
  testApiKeyFlow,
  resolveScheduleConflictsFlow,
  generateExamScheduleFlow,
  generateSeatingArrangementFlow,
];
