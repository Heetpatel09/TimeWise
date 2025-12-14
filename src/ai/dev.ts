
'use server';
/**
 * @fileoverview This file is used to register AI flows and tools with Genkit.
 *
 * It is not meant to be used in production, and should only be used for development.
 *
 * This file will be removed when the app is deployed to production.
 */

import {configureGenkit} from 'genkit';
import * as z from 'zod';
import {generateExamScheduleFlow} from './flows/generate-exam-schedule-flow';
import {generateSeatingArrangementFlow} from './flows/generate-seating-arrangement-flow';
import {generateTestPaperFlow} from './flows/generate-test-paper-flow';
import {resolveScheduleConflictsFlow} from './flows/resolve-schedule-conflicts-flow';
import {generateWelcomeNotificationFlow} from './flows/generate-welcome-notification-flow';
import {testApiKeyFlow} from './flows/test-api-key-flow';
import {googleAI} from '@genkit-ai/google-genai';

configureGenkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const flows = [
  generateExamScheduleFlow,
  generateSeatingArrangementFlow,
  generateTestPaperFlow,
  resolveScheduleConflictsFlow,
  generateWelcomeNotificationFlow,
  testApiKeyFlow,
];
