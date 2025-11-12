import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServer } from '@apollo/server';
import { cacheMiddleware } from '../middleware/cache';
import { requestLimiter } from '../middleware/rateLimit';
import {
  compareLoanProviders,
  exportLoans,
  getAllLoans,
  getBestRate,
  getFirstBuyerLoans,
  getHealth,
  getHistoryTimeline,
  getLastUpdate,
  getLoansByBank
} from '../controllers/loanController';
import { resolvers, typeDefs } from '../graphql/schema';
import { registerWebhook, triggerRateChange } from '../services/webhookService';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: true
    })
  );
  app.use(bodyParser.json());
  app.use(requestLimiter);

  app.get('/', (_req, res) => {
    res.json({
      service: 'Icelandic Mortgage Comparison API',
      version: '2.0.0',
      documentation: 'https://github.com/your-org/api-meantime#readme'
    });
  });

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

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers
  });
  const startGraphQl = apolloServer.start();

  app.use('/api/v1/graphql', async (req, res, next) => {
    await startGraphQl;
    return expressMiddleware(apolloServer)(req, res, next);
  });

  return app;
};
