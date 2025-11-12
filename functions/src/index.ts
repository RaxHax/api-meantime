import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import { createApp } from './http/app';
import { scheduleScrape } from './services/scheduler';
import { logger } from './utils/logger';
import { config } from './config';

type MemoryOption = '128MB' | '256MB' | '512MB' | '1GB' | '2GB' | '4GB' | '8GB';

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = createApp();
const runtimeMemory = (config.runtime.memory ?? '1GB') as MemoryOption;

export const api = functions
  .region(config.runtime.region)
  .runWith({
    timeoutSeconds: config.runtime.timeoutSeconds,
    memory: runtimeMemory
  })
  .https.onRequest(app);

export const scheduledScrape = scheduleScrape();

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection captured');
});
