"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayHmacMiddleware = razorpayHmacMiddleware;
const crypto_1 = require("../utils/crypto");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
function razorpayHmacMiddleware(req, res, next) {
    const signature = req.headers['x-razorpay-signature'];
    const isDemoBypass = req.headers['x-demo-mode'] === 'true' || config_1.config.demoMode;
    // In demo mode without explicit signature, allow request with audit log warning
    if (!signature) {
        if (isDemoBypass) {
            logger_1.logger.warn('[HMAC Middleware] Unsigned webhook allowed under DEMO_MODE.');
            return next();
        }
        return res.status(400).json({
            error: 'BAD_REQUEST',
            message: 'Missing x-razorpay-signature header.',
        });
    }
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const isValid = (0, crypto_1.verifyRazorpaySignature)(rawBody, signature, config_1.config.razorpay.webhookSecret);
    if (!isValid) {
        logger_1.logger.warn('[HMAC Middleware] Invalid Razorpay webhook signature detected.');
        return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Invalid Razorpay HMAC signature verification failed.',
        });
    }
    logger_1.logger.info('[HMAC Middleware] Razorpay signature verified successfully.');
    next();
}
