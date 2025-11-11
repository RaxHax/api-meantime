import { Request, Response } from 'express';
import {
  compareBanks,
  fetchLoans,
  findBestRate,
  getBankLoans,
  getHistory
} from '../services/loanService';
import { bestRateQuerySchema, compareQuerySchema } from '../utils/validators';
import { toCsv } from '../utils/exporter';
import { bilingualMessage } from '../utils/i18n';
import { rankProviders } from '../services/comparisonService';
import { logger } from '../utils/logger';

export const getAllLoans = async (req: Request, res: Response) => {
  const result = await fetchLoans(false);
  res.json(result);
};

export const getFirstBuyerLoans = async (req: Request, res: Response) => {
  const result = await fetchLoans(true);
  res.json(result);
};

export const getLoansByBank = async (req: Request, res: Response) => {
  const bankName = req.params.bankName;
  const firstBuyer = req.query.firstBuyer ? req.query.firstBuyer === 'true' : null;
  const loans = await getBankLoans(bankName, firstBuyer);
  res.json({ data: loans });
};

export const compareLoanProviders = async (req: Request, res: Response) => {
  const validation = compareQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json({
      errors: validation.error.flatten(),
      ...bilingualMessage('Invalid query parameters', 'Ógild fyrirspurnargögn')
    });
    return;
  }
  const loans = await compareBanks(validation.data.banks);
  const ranked = validation.data.metric ? rankProviders(loans, validation.data.metric) : loans;
  res.json({ data: ranked });
};

export const getBestRate = async (req: Request, res: Response) => {
  const validation = bestRateQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json({
      errors: validation.error.flatten(),
      ...bilingualMessage('Invalid rate type', 'Ógild tegund vaxta')
    });
    return;
  }
  const best = await findBestRate(validation.data.type);
  res.json({ data: best });
};

export const exportLoans = async (req: Request, res: Response) => {
  const format = (req.query.format as string | undefined) ?? 'json';
  const firstBuyer = req.query.firstBuyer === 'true';
  const { data, lastUpdated } = await fetchLoans(firstBuyer);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="loans-${firstBuyer ? 'first-buyer' : 'standard'}.csv"`
    );
    res.send(toCsv(data));
    return;
  }

  res.json({ data, lastUpdated });
};

export const getHistoryTimeline = async (req: Request, res: Response) => {
  const bank = req.query.bank as string | undefined;
  const limit = Number(req.query.limit ?? '20');
  const history = await getHistory(bank, limit);
  res.json({ data: history });
};

export const getHealth = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ...bilingualMessage('Service is healthy', 'Þjónustan er í lagi')
  });
};

export const getLastUpdate = async (_req: Request, res: Response) => {
  try {
    const [standard, firstBuyer] = await Promise.all([fetchLoans(false), fetchLoans(true)]);
    res.json({
      standard: standard.lastUpdated,
      firstBuyer: firstBuyer.lastUpdated
    });
  } catch (error) {
    logger.error({ error }, 'Failed to resolve last update times');
    res.status(500).json({
      message: 'Failed to compute last update times',
      ...bilingualMessage('Failed to compute last update times', 'Tókst ekki að reikna síðustu uppfærslu')
    });
  }
};
