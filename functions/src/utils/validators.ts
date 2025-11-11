import { z } from 'zod';

export const compareQuerySchema = z.object({
  banks: z
    .string()
    .transform((value) => value.split(',').map((bank) => bank.trim()).filter(Boolean))
    .refine((value) => value.length > 0, {
      message: 'At least one bank must be provided'
    }),
  metric: z.enum(['indexed', 'nonIndexed', 'originationFee']).optional()
});

export const bestRateQuerySchema = z.object({
  type: z.enum(['indexed', 'non-indexed'])
});

export const bankNameParamSchema = z.object({
  bankName: z.string().min(1)
});

export type CompareQueryInput = z.infer<typeof compareQuerySchema>;
export type BestRateQueryInput = z.infer<typeof bestRateQuerySchema>;
export type BankNameParamInput = z.infer<typeof bankNameParamSchema>;
