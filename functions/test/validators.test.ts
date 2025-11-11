import { describe, expect, it } from 'vitest';
import { bestRateQuerySchema, compareQuerySchema } from '../src/utils/validators';

describe('compareQuerySchema', () => {
  it('parses comma separated banks', () => {
    const result = compareQuerySchema.parse({ banks: 'Banki1,Banki2', metric: 'indexed' });
    expect(result.banks).toEqual(['Banki1', 'Banki2']);
    expect(result.metric).toBe('indexed');
  });
});

describe('bestRateQuerySchema', () => {
  it('rejects invalid type', () => {
    const result = bestRateQuerySchema.safeParse({ type: 'other' });
    expect(result.success).toBe(false);
  });
});
