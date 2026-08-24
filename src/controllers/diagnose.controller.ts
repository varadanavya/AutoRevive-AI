import { Request, Response, NextFunction } from 'express';
import { aiDecisionEngine } from '../services/aiEngine.service';
import { z } from 'zod';

const diagnoseSchema = z.object({
  paymentId: z.string().default(() => `pay_diag_${Date.now()}`),
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().default('INR'),
  paymentMethod: z.string().default('CARD'),
  failureCode: z.string().optional(),
  failureReason: z.string().optional(),
  rawErrorCode: z.string().optional(),
  rawErrorMessage: z.string().optional(),
});

export async function diagnosePaymentFailure(req: Request, res: Response, next: NextFunction) {
  try {
    const input = diagnoseSchema.parse(req.body);
    const diagnosis = aiDecisionEngine.diagnose(input);

    return res.status(200).json({
      success: true,
      data: {
        input,
        diagnosis,
      },
    });
  } catch (error) {
    next(error);
  }
}
