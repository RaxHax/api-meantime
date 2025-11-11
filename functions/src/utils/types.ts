import { Timestamp } from 'firebase-admin/firestore';

export type LoanType = 'Flesta' | 'Suma' | 'Alla';

export interface RateRange {
  min: number;
  max: number;
}

export interface LoanRates {
  nonIndexedVariable: RateRange | null;
  nonIndexedFixed3yr: number | null;
  nonIndexedFixed5yr: number | null;
  indexedVariable: RateRange | null;
  indexedFixed: number | null;
}

export interface LoanProvider {
  id: string;
  name: string;
  logoUrl: string;
  year: number;
  ltvPercentage: number;
  originationFee: number;
  rates: LoanRates;
  prepaymentFee: number | null;
  loanType: LoanType;
  isFirstBuyer: boolean;
  lastUpdated: Timestamp;
}

export interface LoanProviderResponse
  extends Omit<LoanProvider, 'lastUpdated'> {
  lastUpdated: string;
}

export interface ScrapeResult {
  providers: LoanProvider[];
  scrapedAt: Date;
}

export interface CachedLoanResponse {
  data: LoanProvider[];
  lastUpdated: Date;
}

export interface CompareQuery {
  banks: string[];
}

export interface BestRateQuery {
  type: 'indexed' | 'non-indexed';
}

export interface WebhookSubscription {
  id: string;
  url: string;
  event: 'rate-change';
  secret?: string;
  createdAt: Timestamp;
}
