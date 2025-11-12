import * as functions from 'firebase-functions';
import { fetchLoans } from './loanService';
import { logger } from '../utils/logger';
import { config } from '../config';

export const scheduleScrape = () =>
  functions
    .region(config.runtime.region)
    .pubsub.schedule('every 15 minutes')
    .timeZone('Atlantic/Reykjavik')
    .onRun(async () => {
      logger.info('Running scheduled mortgage scrape');
      await Promise.all([fetchLoans(false), fetchLoans(true)]);
      logger.info('Scheduled mortgage scrape finished');
    });
