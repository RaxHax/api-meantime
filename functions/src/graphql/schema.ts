import { gql } from 'graphql-tag';
import { compareBanks, fetchLoans, findBestRate, getBankLoans } from '../services/loanService';

export const typeDefs = gql`
  type RateRange {
    min: Float
    max: Float
  }

  type LoanRates {
    nonIndexedVariable: RateRange
    nonIndexedFixed3yr: Float
    nonIndexedFixed5yr: Float
    indexedVariable: RateRange
    indexedFixed: Float
  }

  type LoanProvider {
    id: ID!
    name: String!
    logoUrl: String!
    year: Int!
    ltvPercentage: Float!
    originationFee: Float!
    rates: LoanRates!
    prepaymentFee: Float
    loanType: String!
    isFirstBuyer: Boolean!
    lastUpdated: String!
  }

  type Query {
    allLoans: [LoanProvider!]!
    firstBuyerLoans: [LoanProvider!]!
    bankLoans(bankName: String!, firstBuyer: Boolean): [LoanProvider!]!
    compareBanks(banks: [String!]!): [LoanProvider!]!
    bestRate(type: String!): LoanProvider
  }
`;

export const resolvers = {
  Query: {
    allLoans: async () => {
      const { data } = await fetchLoans(false);
      return data;
    },
    firstBuyerLoans: async () => {
      const { data } = await fetchLoans(true);
      return data;
    },
    bankLoans: async (_: unknown, args: { bankName: string; firstBuyer?: boolean | null }) =>
      getBankLoans(args.bankName, args.firstBuyer ?? null),
    compareBanks: async (_: unknown, args: { banks: string[] }) => compareBanks(args.banks),
    bestRate: async (_: unknown, args: { type: 'indexed' | 'non-indexed' }) =>
      findBestRate(args.type)
  }
};
