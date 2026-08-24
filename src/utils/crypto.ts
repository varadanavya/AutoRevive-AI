import crypto from 'crypto';

/**
 * Verify Razorpay HMAC SHA256 Signature
 * Signature is computed over raw request body using razorpay webhook secret
 */
export function verifyRazorpaySignature(
  rawBody: string,
  receivedSignature: string,
  secret: string
): boolean {
  if (!rawBody || !receivedSignature || !secret) {
    return false;
  }
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature)
  );
}

/**
 * Generate HMAC SHA256 signature string for testing/demo purpose
 */
export function generateRazorpaySignature(rawBody: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
}
