import { LoanProviderResponse } from '../utils/types';

type ComparisonMetric = 'indexed' | 'nonIndexed' | 'originationFee';

const getIndexedScore = (provider: LoanProviderResponse) => {
  const range = provider.rates.indexedVariable;
  const fixed = provider.rates.indexedFixed;
  return range ? range.min : fixed ?? Number.POSITIVE_INFINITY;
};

const getNonIndexedScore = (provider: LoanProviderResponse) => {
  const range = provider.rates.nonIndexedVariable;
  const fixed = provider.rates.nonIndexedFixed3yr;
  return range ? range.min : fixed ?? Number.POSITIVE_INFINITY;
};

const metricGetters: Record<ComparisonMetric, (provider: LoanProviderResponse) => number> = {
  indexed: getIndexedScore,
  nonIndexed: getNonIndexedScore,
  originationFee: (provider) => provider.originationFee
};

export const rankProviders = (providers: LoanProviderResponse[], metric: ComparisonMetric) => {
  const getter = metricGetters[metric];
  return [...providers].sort((a, b) => getter(a) - getter(b));
};
