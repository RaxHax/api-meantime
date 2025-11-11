import { describe, expect, it } from 'vitest';
import { parseLoanProviders } from '../src/utils/dataParser';

const scrapedAt = new Date('2024-01-01T00:00:00.000Z');

describe('parseLoanProviders', () => {
  it('parses numeric values correctly', () => {
    const rows = [
      {
        id: '1',
        name: 'Banki',
        logoUrl: 'logo.png',
        year: '2025',
        ltvPercentage: '80%',
        originationFee: '50.000 kr',
        nonIndexedVariable: '5,5% - 6,0%',
        nonIndexedFixed3yr: '5,2%',
        nonIndexedFixed5yr: '5,4%',
        indexedVariable: '3,1% - 3,6%',
        indexedFixed: '3,2%',
        prepaymentFee: '0 kr',
        loanType: 'Flesta',
        isFirstBuyer: false
      }
    ];

    const providers = parseLoanProviders(rows as any, scrapedAt);
    expect(providers[0].rates.nonIndexedVariable?.min).toBeCloseTo(5.5);
    expect(providers[0].rates.indexedFixed).toBeCloseTo(3.2);
  });
});
