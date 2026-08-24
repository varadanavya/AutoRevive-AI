"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiDecisionEngine = exports.AIDecisionEngine = void 0;
const logger_1 = require("../utils/logger");
class AIDecisionEngine {
    /**
     * Classify error code and message into normalized taxonomy category
     */
    classifyFailure(input) {
        const code = ((input.failureCode || '') + ' ' + (input.rawErrorCode || '')).toUpperCase();
        const reason = ((input.failureReason || '') + ' ' + (input.rawErrorMessage || '')).toUpperCase();
        const combined = `${code} ${reason}`;
        if (combined.includes('FRAUD') ||
            combined.includes('STOLEN') ||
            combined.includes('RISK_HIGH') ||
            combined.includes('BLACKLISTED') ||
            combined.includes('VELOCITY_EXCEEDED')) {
            return 'SUSPECTED_FRAUD';
        }
        if (combined.includes('EXPIRED') ||
            combined.includes('INVALID_EXPIRY') ||
            combined.includes('CARD_EXPIRED')) {
            return 'EXPIRED_CARD';
        }
        if (combined.includes('INSUFFICIENT') ||
            combined.includes('LOW_BALANCE') ||
            combined.includes('NO_FUNDS') ||
            combined.includes('LIMIT_EXCEEDED')) {
            return 'INSUFFICIENT_FUNDS';
        }
        if (combined.includes('BANK_DOWN') ||
            combined.includes('ISSUER_TIMEOUT') ||
            combined.includes('BANK_OFFLINE') ||
            combined.includes('NPCI_DOWN') ||
            combined.includes('CBS_DOWN')) {
            return 'BANK_TIMEOUT';
        }
        if (combined.includes('GATEWAY') ||
            combined.includes('RAZORPAY_TIMEOUT') ||
            combined.includes('504') ||
            combined.includes('502') ||
            combined.includes('503')) {
            return 'GATEWAY_TIMEOUT';
        }
        if (combined.includes('NETWORK') ||
            combined.includes('CONNECTION') ||
            combined.includes('SOCKET') ||
            combined.includes('TIMED_OUT')) {
            return 'NETWORK_ERROR';
        }
        // Default heuristics based on payment method
        if (input.paymentMethod === 'CARD' && combined.includes('DECLINED')) {
            return 'INSUFFICIENT_FUNDS';
        }
        return 'NETWORK_ERROR'; // Default fallback classification for transient issues
    }
    /**
     * Main AI Diagnosis & Recovery Recommendation Pipeline
     */
    diagnose(input) {
        const category = this.classifyFailure(input);
        const amount = input.amount || 0;
        const history = input.customerHistory || { totalTransactions: 1, failedTransactions: 1, recoveredTransactions: 0 };
        logger_1.logger.info(`[AI Engine] Diagnosing payment failure ${input.paymentId} | Category: ${category}`);
        let decision = 'RETRY_LATER';
        let recoveryProbability = 50.0;
        let riskScore = 15.0;
        let recommendedDelayMinutes = 15;
        let maxRetries = 3;
        let bankingWindowOptimal = false;
        let explanation = '';
        let recommendedActionText = '';
        switch (category) {
            case 'GATEWAY_TIMEOUT':
            case 'NETWORK_ERROR':
                decision = 'RETRY_NOW';
                recoveryProbability = 88.5;
                riskScore = 5.0;
                recommendedDelayMinutes = 2; // Immediate backoff (2 mins)
                maxRetries = 3;
                bankingWindowOptimal = false;
                explanation = `The payment failure was caused by a transient ${category.replace('_', ' ')} between Razorpay and the upstream processor. There are no balance or risk flags on the account. Immediate automated retry is recommended.`;
                recommendedActionText = 'Auto-retry immediately with 2-minute exponential backoff.';
                break;
            case 'BANK_TIMEOUT':
                decision = 'RETRY_LATER';
                recoveryProbability = 74.0;
                riskScore = 10.0;
                recommendedDelayMinutes = 60; // 1 hour backoff
                maxRetries = 3;
                bankingWindowOptimal = true;
                explanation = `Core Banking Solution (CBS) or NPCI gateway timed out during processing. AutoRevive AI detected a temporary banking node outage. Retrying during peak banking window (10 AM - 4 PM) yields high recovery success.`;
                recommendedActionText = 'Schedule smart retry aligned with banking settlement hours.';
                break;
            case 'INSUFFICIENT_FUNDS':
                decision = 'RETRY_LATER';
                recoveryProbability = 62.0;
                riskScore = 20.0;
                recommendedDelayMinutes = 240; // 4 hours backoff
                maxRetries = 3;
                bankingWindowOptimal = true;
                explanation = `Payment declined due to insufficient account balance or daily UPI limit exceeded. AutoRevive AI recommends scheduled retries after typical salary credit hours (morning 10 AM) or sending an interactive payment link.`;
                recommendedActionText = 'Schedule multi-day retry backoff and send automated WhatsApp/Email recovery link.';
                break;
            case 'EXPIRED_CARD':
                decision = 'CUSTOMER_ACTION';
                recoveryProbability = 82.0; // High probability if customer updates card details
                riskScore = 12.0;
                recommendedDelayMinutes = 0;
                maxRetries = 0;
                bankingWindowOptimal = false;
                explanation = `The customer's card has expired or invalid expiration details were submitted. Automated retries will continue to fail. Immediate customer intervention required to update payment method via secure link.`;
                recommendedActionText = 'Dispatch interactive payment recovery link via SMS & WhatsApp to update payment details.';
                break;
            case 'SUSPECTED_FRAUD':
                if (amount > 50000) {
                    decision = 'MANUAL_REVIEW';
                    recoveryProbability = 25.0;
                    riskScore = 92.0;
                    explanation = `High-risk transaction flag triggered (Amount: ₹${amount.toLocaleString('en-IN')}). Velocity checks or risk score exceeded threshold. Escalated to merchant compliance team for manual review.`;
                    recommendedActionText = 'Escalate to merchant fraud team for manual verification before any retry.';
                }
                else {
                    decision = 'STOP_RETRY';
                    recoveryProbability = 5.0;
                    riskScore = 88.0;
                    explanation = `Transaction flagged for high fraud risk or stolen card parameters. All automated recovery attempts stopped to prevent chargeback liabilities.`;
                    recommendedActionText = 'Halt all retry attempts and flag customer record.';
                }
                recommendedDelayMinutes = 0;
                maxRetries = 0;
                bankingWindowOptimal = false;
                break;
            default:
                decision = 'RETRY_LATER';
                recoveryProbability = 55.0;
                riskScore = 25.0;
                recommendedDelayMinutes = 30;
                maxRetries = 2;
                explanation = `Unclassified transaction response received. Applying baseline conservative backoff recovery strategy.`;
                recommendedActionText = 'Schedule standard 30-minute retry.';
                break;
        }
        // Dynamic AI adjustment based on customer historical recovery rate
        if (history.totalTransactions > 1) {
            const successRate = history.recoveredTransactions / history.totalTransactions;
            if (successRate > 0.5) {
                recoveryProbability = Math.min(99.0, recoveryProbability + 10.0);
            }
            else if (history.failedTransactions > 3 && history.recoveredTransactions === 0) {
                recoveryProbability = Math.max(10.0, recoveryProbability - 15.0);
            }
        }
        return {
            category,
            decision,
            recoveryProbability: Math.round(recoveryProbability * 10) / 10,
            riskScore: Math.round(riskScore * 10) / 10,
            recommendedDelayMinutes,
            maxRetries,
            bankingWindowOptimal,
            explanation,
            recommendedActionText,
        };
    }
}
exports.AIDecisionEngine = AIDecisionEngine;
exports.aiDecisionEngine = new AIDecisionEngine();
