import { aiDecisionEngine } from '../src/services/aiEngine.service';

export function runAIEngineTests(): boolean {
  console.log('🧪 [Test Suite] Running AI Decision Engine Tests...');
  let passed = true;

  // Test 1: Classify Insufficient Funds
  const diag1 = aiDecisionEngine.diagnose({
    paymentId: 'pay_test_001',
    amount: 5000,
    failureCode: 'INSUFFICIENT_BAL',
    failureReason: 'Customer account balance is insufficient',
  });

  if (diag1.category !== 'INSUFFICIENT_FUNDS') {
    console.error(`❌ Test 1 Failed: Expected INSUFFICIENT_FUNDS, got ${diag1.category}`);
    passed = false;
  } else {
    console.log('  ✅ Test 1 Passed: Correctly classified INSUFFICIENT_FUNDS');
  }

  // Test 2: Classify Bank Timeout & Banking Window Recommendation
  const diag2 = aiDecisionEngine.diagnose({
    paymentId: 'pay_test_002',
    amount: 12000,
    failureCode: 'BANK_OFFLINE',
    failureReason: 'Core banking system timed out',
  });

  if (diag2.category !== 'BANK_TIMEOUT' || !diag2.bankingWindowOptimal) {
    console.error(`❌ Test 2 Failed: Expected BANK_TIMEOUT with bankingWindowOptimal=true`);
    passed = false;
  } else {
    console.log('  ✅ Test 2 Passed: Correctly classified BANK_TIMEOUT & Banking Window optimization');
  }

  // Test 3: Classify Expired Card -> Customer Action
  const diag3 = aiDecisionEngine.diagnose({
    paymentId: 'pay_test_003',
    amount: 2500,
    failureCode: 'EXPIRED_CARD',
    failureReason: 'Card expiry date passed',
  });

  if (diag3.decision !== 'CUSTOMER_ACTION') {
    console.error(`❌ Test 3 Failed: Expected CUSTOMER_ACTION, got ${diag3.decision}`);
    passed = false;
  } else {
    console.log('  ✅ Test 3 Passed: Correctly recommended CUSTOMER_ACTION for Expired Card');
  }

  // Test 4: Suspected Fraud -> STOP_RETRY
  const diag4 = aiDecisionEngine.diagnose({
    paymentId: 'pay_test_004',
    amount: 15000,
    failureCode: 'STOLEN_CARD',
    failureReason: 'High risk velocity fraud alert',
  });

  if (diag4.decision !== 'STOP_RETRY') {
    console.error(`❌ Test 4 Failed: Expected STOP_RETRY, got ${diag4.decision}`);
    passed = false;
  } else {
    console.log('  ✅ Test 4 Passed: Correctly recommended STOP_RETRY for Suspected Fraud');
  }

  return passed;
}
