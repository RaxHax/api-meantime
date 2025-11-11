import { LoanProvider, LoanProviderResponse } from './types';

const csvEscape = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = typeof value === 'string' ? value : String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

type ExportableProvider = LoanProvider | LoanProviderResponse;

const normalizeTimestamp = (provider: ExportableProvider): string => {
  const value = provider.lastUpdated as unknown;
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate().toISOString();
  }
  return new Date().toISOString();
};

export const toCsv = (providers: ExportableProvider[]): string => {
  const headers = [
    'id',
    'name',
    'logoUrl',
    'year',
    'ltvPercentage',
    'originationFee',
    'nonIndexedVariableMin',
    'nonIndexedVariableMax',
    'nonIndexedFixed3yr',
    'nonIndexedFixed5yr',
    'indexedVariableMin',
    'indexedVariableMax',
    'indexedFixed',
    'prepaymentFee',
    'loanType',
    'isFirstBuyer',
    'lastUpdated'
  ];

  const rows = providers.map((provider) => [
    provider.id,
    provider.name,
    provider.logoUrl,
    provider.year,
    provider.ltvPercentage,
    provider.originationFee,
    provider.rates.nonIndexedVariable?.min ?? '',
    provider.rates.nonIndexedVariable?.max ?? '',
    provider.rates.nonIndexedFixed3yr ?? '',
    provider.rates.nonIndexedFixed5yr ?? '',
    provider.rates.indexedVariable?.min ?? '',
    provider.rates.indexedVariable?.max ?? '',
    provider.rates.indexedFixed ?? '',
    provider.prepaymentFee ?? '',
    provider.loanType,
    provider.isFirstBuyer,
    normalizeTimestamp(provider)
  ]);

  return [headers.join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n');
};
