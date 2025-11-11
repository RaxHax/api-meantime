import { Request, Response, NextFunction } from 'express';
import { CACHE_KEYS, getCachedLoans } from '../services/cacheService';

const mapPathToCacheKey = (path: string): string | null => {
  if (path.endsWith('/loans/all')) {
    return CACHE_KEYS.ALL;
  }
  if (path.endsWith('/loans/first-buyer')) {
    return CACHE_KEYS.FIRST_BUYER;
  }
  return null;
};

export const cacheMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const key = mapPathToCacheKey(req.path);
  if (!key) {
    next();
    return;
  }
  const cacheRecord = await getCachedLoans(key);
  if (!cacheRecord) {
    next();
    return;
  }
  res.setHeader('X-Cache-Hit', '1');
  res.json({
    data: cacheRecord.data,
    lastUpdated: cacheRecord.lastUpdated.toDate()
  });
};
