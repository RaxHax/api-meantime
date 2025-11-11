import { Timestamp } from 'firebase-admin/firestore';
import { LoanProvider, LoanRates, RateRange } from './types';

const toNumber = (value: string | null): number | null => {
  if (!value) {
    return null;
  }
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/[^0-9,.,-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(/,/g, '.')
    .trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const toRange = (value: string | null): RateRange | null => {
  if (!value) {
    return null;
  }
  const parts = value.split(/-|–|—/).map((part) => toNumber(part));
  if (parts.length === 1) {
    return parts[0] !== null ? { min: parts[0], max: parts[0] } : null;
  }
  if (parts.length >= 2 && parts[0] !== null && parts[1] !== null) {
    return { min: parts[0], max: parts[1] };
  }
  return null;
};

interface RawLoanRow {
  id: string;
  name: string;
  logoUrl: string;
  year: string | null;
  ltvPercentage: string | null;
  originationFee: string | null;
  nonIndexedVariable: string | null;
  nonIndexedFixed3yr: string | null;
  nonIndexedFixed5yr: string | null;
  indexedVariable: string | null;
  indexedFixed: string | null;
  prepaymentFee: string | null;
  loanType: string | null;
  isFirstBuyer: boolean;
}

const normalizeLoanType = (value: string | null): RawLoanRow['loanType'] => {
  if (!value) {
    return 'Flesta';
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('suma')) {
    return 'Suma';
  }
  if (normalized.includes('alla')) {
    return 'Alla';
  }
  return 'Flesta';
};

const buildRates = (row: RawLoanRow): LoanRates => ({
  nonIndexedVariable: toRange(row.nonIndexedVariable),
  nonIndexedFixed3yr: toNumber(row.nonIndexedFixed3yr),
  nonIndexedFixed5yr: toNumber(row.nonIndexedFixed5yr),
  indexedVariable: toRange(row.indexedVariable),
  indexedFixed: toNumber(row.indexedFixed)
});

export const parseLoanProviders = (rows: RawLoanRow[], scrapedAt: Date): LoanProvider[] =>
  rows.map((row) => ({
    id: row.id,
    name: row.name.trim(),
    logoUrl: row.logoUrl,
    year: Number(row.year ?? scrapedAt.getFullYear()),
    ltvPercentage: toNumber(row.ltvPercentage) ?? 0,
    originationFee: toNumber(row.originationFee) ?? 0,
    rates: buildRates(row),
    prepaymentFee: toNumber(row.prepaymentFee),
    loanType: normalizeLoanType(row.loanType) as LoanProvider['loanType'],
    isFirstBuyer: row.isFirstBuyer,
    lastUpdated: Timestamp.fromDate(scrapedAt)
  }));

export type { RawLoanRow };
