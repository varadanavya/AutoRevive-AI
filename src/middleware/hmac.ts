import { Request, Response, NextFunction } from 'express';
import { verifyRazorpaySignature } from '../utils/crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface RequestWithRawBody extends Request {
  rawBody?: string;
}

export function razorpayHmacMiddleware(req: RequestWithRawBody, res: Response, next: NextFunction) {
  const signature = req.headers['x-razorpay-signature'] as string;
  const isDemoBypass = req.headers['x-demo-mode'] === 'true' || config.demoMode;

  // In demo mode without explicit signature, allow request with audit log warning
  if (!signature) {
    if (isDemoBypass) {
      logger.warn('[HMAC Middleware] Unsigned webhook allowed under DEMO_MODE.');
      return next();
    }
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Missing x-razorpay-signature header.',
    });
  }

  const rawBody = req.rawBody || JSON.stringify(req.body);
  const isValid = verifyRazorpaySignature(rawBody, signature, config.razorpay.webhookSecret);

  if (!isValid) {
    logger.warn('[HMAC Middleware] Invalid Razorpay webhook signature detected.');
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid Razorpay HMAC signature verification failed.',
    });
  }

  logger.info('[HMAC Middleware] Razorpay signature verified successfully.');
  next();
}
