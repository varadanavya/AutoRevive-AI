"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpaySignature = verifyRazorpaySignature;
exports.generateRazorpaySignature = generateRazorpaySignature;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Verify Razorpay HMAC SHA256 Signature
 * Signature is computed over raw request body using razorpay webhook secret
 */
function verifyRazorpaySignature(rawBody, receivedSignature, secret) {
    if (!rawBody || !receivedSignature || !secret) {
        return false;
    }
    const expectedSignature = crypto_1.default
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
    return crypto_1.default.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(receivedSignature));
}
/**
 * Generate HMAC SHA256 signature string for testing/demo purpose
 */
function generateRazorpaySignature(rawBody, secret) {
    return crypto_1.default
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
}
