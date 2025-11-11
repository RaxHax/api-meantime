import NodeCache from 'node-cache';
import { firestore } from 'firebase-admin';
import { LoanProvider } from '../utils/types';
import { logger } from '../utils/logger';

const TTL_SECONDS = 15 * 60;
const cache = new NodeCache({ stdTTL: TTL_SECONDS });

const db = () => firestore();
const COLLECTION_NAME = 'loans_cache';

interface CacheRecord {
  key: string;
  data: LoanProvider[];
  lastUpdated: firestore.Timestamp;
}

export const getCachedLoans = async (key: string): Promise<CacheRecord | null> => {
  const inMemory = cache.get<CacheRecord>(key);
  if (inMemory) {
    return inMemory;
  }
  try {
    const doc = await db().collection(COLLECTION_NAME).doc(key).get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data() as CacheRecord;
    cache.set(key, data);
    return data;
  } catch (error) {
    logger.error({ error }, 'Failed to fetch cache from Firestore');
    return null;
  }
};

export const setCachedLoans = async (key: string, data: LoanProvider[]): Promise<void> => {
  const record: CacheRecord = {
    key,
    data,
    lastUpdated: firestore.Timestamp.now()
  };
  cache.set(key, record);
  try {
    await db().collection(COLLECTION_NAME).doc(key).set(record, { merge: true });
  } catch (error) {
    logger.error({ error }, 'Failed to persist cache to Firestore');
  }
};

export const invalidateCache = async (key: string): Promise<void> => {
  cache.del(key);
  try {
    await db().collection(COLLECTION_NAME).doc(key).delete();
  } catch (error) {
    logger.error({ error }, 'Failed to delete cache from Firestore');
  }
};

export const CACHE_KEYS = {
  ALL: 'all-loans',
  FIRST_BUYER: 'first-buyer-loans'
};
