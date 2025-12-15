
'use server';
/**
 * @fileoverview This file is used to register AI flows and tools with Genkit.
 *
 * It is not meant to be used in production, and should only be used for development.
 *
 * This file will be removed when the app is deployed to production.
 */

import {configureGenkit} from 'genkit';
import {generateTestPaperFlow} from './flows/generate-test-paper-flow';
import {generateWelcomeNotificationFlow} from './flows/generate-welcome-notification-flow';
import {testApiKeyFlow} from './flows/test-api-key-flow';
import {googleAI} from '@genkit-ai/google-genai';
import { resolveScheduleConflictsFlow } from './flows/resolve-schedule-conflicts-flow';

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
  generateTestPaperFlow,
  generateWelcomeNotificationFlow,
  testApiKeyFlow,
  resolveScheduleConflictsFlow,
];

    