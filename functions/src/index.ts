import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServer } from '@apollo/server';
import bodyParser from 'body-parser';
import { cacheMiddleware } from './middleware/cache';
import { requestLimiter } from './middleware/rateLimit';
import {
  compareLoanProviders,
  getAllLoans,
  getBestRate,
  exportLoans,
  getFirstBuyerLoans,
  getHealth,
  getLastUpdate,
  getLoansByBank,
  getHistoryTimeline
} from './controllers/loanController';
import { logger } from './utils/logger';
import { resolvers, typeDefs } from './graphql/schema';
import { registerWebhook, triggerRateChange } from './services/webhookService';
import { scheduleScrape } from './services/scheduler';

admin.initializeApp();

const app = express();
app.use(helmet());
app.use(compression());
app.use(cors({ origin: true }));
app.use(bodyParser.json());
app.use(requestLimiter);

app.get('/api/health', getHealth);
app.get('/api/last-update', getLastUpdate);
app.get('/api/v1/loans/all', cacheMiddleware, getAllLoans);
app.get('/api/v1/loans/first-buyer', cacheMiddleware, getFirstBuyerLoans);
app.get('/api/v1/loans/bank/:bankName', getLoansByBank);
app.get('/api/v1/loans/compare', compareLoanProviders);
app.get('/api/v1/loans/best-rate', getBestRate);
app.get('/api/v1/loans/export', exportLoans);
app.get('/api/v1/loans/history', getHistoryTimeline);

app.post('/api/v1/webhooks', registerWebhook);
app.post('/api/v1/webhooks/test', triggerRateChange);

const server = new ApolloServer({
  typeDefs,
  resolvers
});

const startServer = server.start();
app.use('/api/v1/graphql', async (req, res, next) => {
  await startServer;
  return expressMiddleware(server)(req, res, next);
});

export const api = functions.https.onRequest(app);
export const scheduledScrape = scheduleScrape();

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection captured');
});
