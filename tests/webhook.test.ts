import { generateRazorpaySignature, verifyRazorpaySignature } from '../src/utils/crypto';

export function runWebhookTests(): boolean {
  console.log('🧪 [Test Suite] Running Razorpay Webhook & HMAC Signature Tests...');
  let passed = true;

  const secret = 'razorpay_secret_key_12345';
  const rawBody = JSON.stringify({
    event: 'payment.failed',
    payload: { payment: { entity: { id: 'pay_test_999', amount: 50000 } } },
  });

  // Test 1: Generate & Verify valid signature
  const signature = generateRazorpaySignature(rawBody, secret);
  const isValid = verifyRazorpaySignature(rawBody, signature, secret);

  if (!isValid) {
    console.error('❌ Webhook Test 1 Failed: Valid HMAC signature failed verification');
    passed = false;
  } else {
    console.log('  ✅ Webhook Test 1 Passed: HMAC SHA256 signature generated & verified successfully');
  }

  // Test 2: Tampered payload verification failure
  const tamperedBody = rawBody.replace('50000', '90000');
  const isTamperedValid = verifyRazorpaySignature(tamperedBody, signature, secret);

  if (isTamperedValid) {
    console.error('❌ Webhook Test 2 Failed: Tampered payload passed signature check!');
    passed = false;
  } else {
    console.log('  ✅ Webhook Test 2 Passed: Tampered payload correctly rejected');
  }

  return passed;
}
