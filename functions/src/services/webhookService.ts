import { Request, Response } from 'express';
import { firestore } from 'firebase-admin';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { findBestRate } from './loanService';
import { bilingualMessage } from '../utils/i18n';

const COLLECTION = 'webhook_subscriptions';

const db = () => firestore();

export const registerWebhook = async (req: Request, res: Response) => {
  const { url, secret } = req.body;
  if (!url) {
    res.status(400).json({
      message: 'Webhook URL is required',
      ...bilingualMessage('Webhook URL is required', 'Vefkrókstengill er nauðsynlegur')
    });
    return;
  }
  try {
    const doc = await db()
      .collection(COLLECTION)
      .add({
        url,
        secret,
        event: 'rate-change',
        createdAt: firestore.FieldValue.serverTimestamp()
      });
    res.status(201).json({
      id: doc.id,
      ...bilingualMessage('Webhook registered', 'Vefkrókur skráður')
    });
  } catch (error) {
    logger.error({ error }, 'Failed to register webhook');
    res.status(500).json({
      message: 'Failed to register webhook',
      ...bilingualMessage('Failed to register webhook', 'Tókst ekki að skrá vefkrók')
    });
  }
};

const signPayload = (payload: string, secret?: string) => {
  if (!secret) {
    return undefined;
  }
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

export const triggerRateChange = async (_req: Request, res: Response) => {
  try {
    const snapshot = await db().collection(COLLECTION).get();
    const bestIndexed = await findBestRate('indexed');
    const bestNonIndexed = await findBestRate('non-indexed');

    const payload = JSON.stringify({
      event: 'rate-change',
      bestIndexed,
      bestNonIndexed,
      timestamp: new Date().toISOString()
    });

    await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data() as { url: string; secret?: string };
        try {
          await axios.post(data.url, payload, {
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signPayload(payload, data.secret)
            },
            timeout: 5000
          });
        } catch (error) {
          logger.error({ error, url: data.url }, 'Failed to deliver webhook');
        }
      })
    );

    res.json({
      delivered: snapshot.size,
      ...bilingualMessage('Webhook delivery attempted', 'Reynt var að senda vefkrók')
    });
  } catch (error) {
    logger.error({ error }, 'Failed to trigger webhook');
    res.status(500).json({
      message: 'Failed to trigger webhook',
      ...bilingualMessage('Failed to trigger webhook', 'Tókst ekki að ræsa vefkrók')
    });
  }
};
