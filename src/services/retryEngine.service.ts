import { logger } from '../utils/logger';

export interface RetryScheduleInput {
  attemptNumber: number;
  baseDelayMinutes: number;
  maxRetries: number;
  initialProbability: number;
  bankingWindowOptimal?: boolean;
}

export interface ScheduledRetryOutput {
  nextRetryAt: Date;
  attemptNumber: number;
  delayMinutes: number;
  decayedProbability: number;
  appliedBankingWindowAdjustment: boolean;
  strategyDescription: string;
}

export class SmartRetryEngine {
  /**
   * Calculate next retry execution time using Exponential Backoff + Jitter + Banking Windows
   */
  public calculateNextRetry(input: RetryScheduleInput): ScheduledRetryOutput | null {
    if (input.attemptNumber >= input.maxRetries) {
      logger.info(`[Retry Engine] Max retries reached (${input.attemptNumber}/${input.maxRetries}). Stopping retry workflow.`);
      return null;
    }

    const attempt = input.attemptNumber + 1;

    // 1. Exponential Backoff: base * 2^(attempt - 1)
    const expFactor = Math.pow(2, attempt - 1);
    let rawDelayMinutes = input.baseDelayMinutes * expFactor;

    // 2. Add Jitter (±15% random variation to avoid thundering herd)
    const jitterPercent = (Math.random() * 0.3) - 0.15; // -0.15 to +0.15
    const delayWithJitter = Math.max(1, Math.round(rawDelayMinutes * (1 + jitterPercent)));

    let targetDate = new Date(Date.now() + delayWithJitter * 60 * 1000);
    let appliedBankingWindowAdjustment = false;

    // 3. Banking Window Optimization (Avoid 00:00 - 03:00 AM maintenance, target 10:00 AM - 16:00 PM)
    if (input.bankingWindowOptimal) {
      const targetHours = targetDate.getHours();

      // Check if inside bank maintenance window (00:00 to 03:59 AM)
      if (targetHours >= 0 && targetHours < 4) {
        // Shift to 10:15 AM today
        targetDate.setHours(10, 15, 0, 0);
        appliedBankingWindowAdjustment = true;
      }
      // Check if late night (after 20:00 PM)
      else if (targetHours >= 20) {
        // Shift to 10:15 AM next morning
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(10, 15, 0, 0);
        appliedBankingWindowAdjustment = true;
      }
    }

    // 4. Time Decay Factor: Probability decays by 15% each subsequent attempt
    const decayFactor = Math.pow(0.85, attempt - 1);
    const decayedProbability = Math.max(5.0, Math.round(input.initialProbability * decayFactor * 10) / 10);

    const actualDelayMinutes = Math.round((targetDate.getTime() - Date.now()) / (60 * 1000));

    const strategyDescription = `Attempt ${attempt}/${input.maxRetries} scheduled in ${actualDelayMinutes}m using exponential backoff (base: ${input.baseDelayMinutes}m) with ±15% jitter${appliedBankingWindowAdjustment ? ' & banking window optimization (10 AM peak window)' : ''}. Decayed recovery probability: ${decayedProbability}%.`;

    logger.info(`[Retry Engine] Scheduled attempt ${attempt} at ${targetDate.toISOString()} (${strategyDescription})`);

    return {
      nextRetryAt: targetDate,
      attemptNumber: attempt,
      delayMinutes: actualDelayMinutes,
      decayedProbability,
      appliedBankingWindowAdjustment,
      strategyDescription,
    };
  }
}

export const smartRetryEngine = new SmartRetryEngine();
