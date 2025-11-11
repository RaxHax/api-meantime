import { firestore } from 'firebase-admin';
import { CACHE_KEYS, getCachedLoans, setCachedLoans } from './cacheService';
import { scrapeLoans } from '../scrapers/mortgageScraper';
import { LoanProvider, LoanProviderResponse } from '../utils/types';
import { logger } from '../utils/logger';

const SCRAPE_HISTORY = 'scrape_history';
const ERROR_LOGS = 'error_logs';

const db = () => firestore();

const persistScrapeHistory = async (providers: LoanProvider[], firstBuyer: boolean) => {
  try {
    await db()
      .collection(SCRAPE_HISTORY)
      .add({
        data: providers,
        firstBuyer,
        names: providers.map((provider) => provider.name),
        createdAt: firestore.FieldValue.serverTimestamp()
      });
  } catch (error) {
    logger.error({ error }, 'Failed to persist scrape history');
  }
};

const logError = async (error: unknown, context: Record<string, unknown>) => {
  try {
    await db()
      .collection(ERROR_LOGS)
      .add({
        error: error instanceof Error ? error.message : 'unknown',
        context,
        createdAt: firestore.FieldValue.serverTimestamp()
      });
  } catch (err) {
    logger.error({ err }, 'Failed to write error log');
  }
};

const fallbackToHistory = async (firstBuyer: boolean): Promise<LoanProvider[] | null> => {
  try {
    const snapshot = await db()
      .collection(SCRAPE_HISTORY)
      .where('firstBuyer', '==', firstBuyer)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    return snapshot.docs[0].data().data as LoanProvider[];
  } catch (error) {
    logger.error({ error }, 'Failed to get fallback history');
    return null;
  }
};

const serializeProviders = (providers: LoanProvider[]): LoanProviderResponse[] =>
  providers.map((provider) => ({
    ...provider,
    lastUpdated: provider.lastUpdated.toDate().toISOString()
  }));

export const fetchLoans = async (
  firstBuyer: boolean
): Promise<{ data: LoanProviderResponse[]; lastUpdated: Date }> => {
  const cacheKey = firstBuyer ? CACHE_KEYS.FIRST_BUYER : CACHE_KEYS.ALL;
  const cached = await getCachedLoans(cacheKey);
  if (cached) {
    return { data: serializeProviders(cached.data), lastUpdated: cached.lastUpdated.toDate() };
  }

  try {
    const scrapeResult = await scrapeLoans({ firstBuyer });
    await setCachedLoans(cacheKey, scrapeResult.providers);
    await persistScrapeHistory(scrapeResult.providers, firstBuyer);
    return { data: serializeProviders(scrapeResult.providers), lastUpdated: scrapeResult.scrapedAt };
  } catch (error) {
    logger.error({ error }, 'Failed to scrape loans, using fallback if available');
    await logError(error, { firstBuyer });
    const fallback = await fallbackToHistory(firstBuyer);
    if (fallback) {
      return { data: serializeProviders(fallback), lastUpdated: new Date() };
    }
    throw error;
  }
};

export const getBankLoans = async (bankName: string, firstBuyer: boolean | null = null) => {
  const { data } = await fetchLoans(false);
  const firstBuyerData = firstBuyer === null ? await fetchLoans(true) : null;
  const normalizedBank = bankName.toLowerCase();

  const filterByBank = (providers: LoanProviderResponse[]) =>
    providers.filter((provider) => provider.name.toLowerCase().includes(normalizedBank));

  let results: LoanProviderResponse[] = filterByBank(data);
  if (firstBuyerData) {
    results = results.concat(filterByBank(firstBuyerData.data));
  }

  if (firstBuyer !== null) {
    results = results.filter((provider) => provider.isFirstBuyer === firstBuyer);
  }

  return results;
};

export const compareBanks = async (banks: string[]) => {
  const datasets = await Promise.all([fetchLoans(false), fetchLoans(true)]);
  const merged = [...datasets[0].data, ...datasets[1].data];
  const normalized = banks.map((bank) => bank.toLowerCase());
  return merged.filter((provider) =>
    normalized.some((bank) => provider.name.toLowerCase().includes(bank))
  );
};

export const findBestRate = async (type: 'indexed' | 'non-indexed') => {
  const datasets = await Promise.all([fetchLoans(false), fetchLoans(true)]);
  const merged = [...datasets[0].data, ...datasets[1].data];

  if (type === 'indexed') {
    return merged.reduce((best, current) => {
      const currentRange = current.rates.indexedVariable;
      const currentFixed = current.rates.indexedFixed;
      const currentMin = currentRange ? currentRange.min : currentFixed ?? Infinity;
      const bestRange = best?.rates.indexedVariable;
      const bestFixed = best?.rates.indexedFixed;
      const bestMin = bestRange ? bestRange.min : bestFixed ?? Infinity;
      if (!best || currentMin < bestMin) {
        return current;
      }
      return best;
    }, null as LoanProviderResponse | null);
  }

  return merged.reduce((best, current) => {
    const currentRange = current.rates.nonIndexedVariable;
    const currentFixed = current.rates.nonIndexedFixed3yr;
    const currentMin = currentRange ? currentRange.min : currentFixed ?? Infinity;
    const bestRange = best?.rates.nonIndexedVariable;
    const bestFixed = best?.rates.nonIndexedFixed3yr;
    const bestMin = bestRange ? bestRange.min : bestFixed ?? Infinity;
    if (!best || currentMin < bestMin) {
      return current;
    }
    return best;
  }, null as LoanProviderResponse | null);
};

export const getHistory = async (bankName?: string, limit = 20) => {
  try {
    const query = db().collection(SCRAPE_HISTORY).orderBy('createdAt', 'desc').limit(limit);
    const snapshot = await query.get();
    return snapshot.docs
      .map((doc) => doc.data() as Record<string, unknown>)
      .filter((record) => {
        if (!bankName) {
          return true;
        }
        const names = (record.names as string[] | undefined) ?? [];
        return names.some((name) => name.toLowerCase().includes(bankName.toLowerCase()));
      })
      .map((record) => ({
        ...record,
        data: serializeProviders((record.data as LoanProvider[]) ?? []),
        createdAt: (record.createdAt as firestore.Timestamp | undefined)?.toDate().toISOString()
      }));
  } catch (error) {
    logger.error({ error }, 'Failed to fetch history');
    return [];
  }
};
