import * as functions from 'firebase-functions';
import { fetchLoans } from './loanService';
import { logger } from '../utils/logger';

export const scheduleScrape = () =>
  functions.pubsub.schedule('every 15 minutes').onRun(async () => {
    logger.info('Running scheduled mortgage scrape');
    await Promise.all([fetchLoans(false), fetchLoans(true)]);
    logger.info('Scheduled mortgage scrape finished');
  });
