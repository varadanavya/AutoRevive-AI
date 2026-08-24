import { smartRetryEngine } from '../src/services/retryEngine.service';

export function runRetryEngineTests(): boolean {
  console.log('🧪 [Test Suite] Running Smart Retry Engine Tests...');
  let passed = true;

  // Test 1: Exponential Backoff calculation for Attempt 1
  const sched1 = smartRetryEngine.calculateNextRetry({
    attemptNumber: 0,
    baseDelayMinutes: 15,
    maxRetries: 3,
    initialProbability: 80.0,
    bankingWindowOptimal: false,
  });

  if (!sched1 || sched1.attemptNumber !== 1 || sched1.delayMinutes < 10 || sched1.delayMinutes > 20) {
    console.error(`❌ Retry Test 1 Failed: Invalid attempt 1 output`, sched1);
    passed = false;
  } else {
    console.log(`  ✅ Retry Test 1 Passed: Scheduled attempt 1 delay: ${sched1.delayMinutes}m`);
  }

  // Test 2: Max Retries Cap Enforced
  const schedCap = smartRetryEngine.calculateNextRetry({
    attemptNumber: 3,
    baseDelayMinutes: 15,
    maxRetries: 3,
    initialProbability: 80.0,
  });

  if (schedCap !== null) {
    console.error(`❌ Retry Test 2 Failed: Should return null when max retries hit`);
    passed = false;
  } else {
    console.log('  ✅ Retry Test 2 Passed: Max retry cap strictly enforced');
  }

  return passed;
}
