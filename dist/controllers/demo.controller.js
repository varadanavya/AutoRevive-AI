"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulatePaymentFailure = simulatePaymentFailure;
exports.executePendingRetries = executePendingRetries;
exports.resetDemoData = resetDemoData;
const db_1 = require("../models/db");
const webhook_service_1 = require("../services/webhook.service");
const logger_1 = require("../utils/logger");
const SAMPLE_FAILURES = [
    {
        category: 'INSUFFICIENT_FUNDS',
        code: 'BAD_REQUEST_PAYMENT_FAILED',
        description: 'Payment failed due to insufficient funds in customer bank account.',
        method: 'UPI',
        reason: 'insufficient_funds',
    },
    {
        category: 'BANK_TIMEOUT',
        code: 'GATEWAY_ERROR',
        description: 'HDFC Core Banking Solution timed out during 2FA authorization.',
        method: 'NETBANKING',
        reason: 'bank_timeout',
    },
    {
        category: 'GATEWAY_TIMEOUT',
        code: 'RAZORPAY_TIMEOUT_504',
        description: 'Razorpay upstream gateway gateway timeout (504).',
        method: 'CARD',
        reason: 'gateway_timeout',
    },
    {
        category: 'EXPIRED_CARD',
        code: 'BAD_REQUEST_CARD_EXPIRED',
        description: 'The card expiration date 05/22 is in the past.',
        method: 'CARD',
        reason: 'card_expired',
    },
    {
        category: 'SUSPECTED_FRAUD',
        code: 'RISK_CHECK_FAILED',
        description: 'High risk score (94/100) - velocity pattern detected from blacklisted IP range.',
        method: 'CARD',
        reason: 'suspected_fraud',
    },
];
async function simulatePaymentFailure(req, res, next) {
    try {
        const { category, amount, customerName, customerEmail } = req.body;
        const sample = SAMPLE_FAILURES.find(s => s.category === category) || SAMPLE_FAILURES[0];
        const targetAmount = amount || Math.floor(Math.random() * 8000) + 1000;
        const paymentId = `pay_demo_${Date.now().toString().slice(-8)}`;
        const custId = `cust_demo_${Date.now().toString().slice(-6)}`;
        const name = customerName || 'Vikram Malhotra';
        const email = customerEmail || `vikram.${Date.now().toString().slice(-4)}@example.com`;
        const payload = {
            event: 'payment.failed',
            event_id: `evt_demo_${Date.now()}`,
            created_at: Math.floor(Date.now() / 1000),
            payload: {
                payment: {
                    entity: {
                        id: paymentId,
                        entity: 'payment',
                        amount: targetAmount * 100, // paise
                        currency: 'INR',
                        status: 'failed',
                        order_id: `order_demo_${Date.now().toString().slice(-8)}`,
                        invoice_id: null,
                        international: false,
                        method: sample.method,
                        amount_refunded: 0,
                        refund_status: null,
                        captured: false,
                        description: 'Demo Subscription Payment',
                        card_id: null,
                        bank: 'HDFC',
                        wallet: null,
                        vpa: 'user@okhdfcbank',
                        email,
                        contact: '+919876543210',
                        contact_name: name,
                        notes: { customer_name: name },
                        customer_id: custId,
                        error_code: sample.code,
                        error_description: sample.description,
                        error_source: 'bank',
                        error_step: 'payment_authorization',
                        error_reason: sample.reason,
                    },
                },
            },
        };
        logger_1.logger.info(`[Demo Controller] Simulating payment failure for ${name} (${sample.category})`);
        const result = await webhook_service_1.webhookService.processWebhook(payload.event_id, payload.event, payload.payload);
        return res.status(200).json({
            success: true,
            message: `Simulated payment failure (${sample.category}) created successfully!`,
            data: {
                paymentId,
                amount: targetAmount,
                customerName: name,
                category: sample.category,
                webhookResult: result,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function executePendingRetries(req, res, next) {
    try {
        const { workflowId } = req.body;
        const whereClause = workflowId ? { id: workflowId } : { status: 'ACTIVE' };
        const activeWorkflows = await db_1.prisma.recoveryWorkflow.findMany({
            where: whereClause,
            include: {
                transaction: { include: { customer: true } },
                retryAttempts: true,
            },
        });
        if (activeWorkflows.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No active workflows pending retry.',
                executedCount: 0,
            });
        }
        const executedResults = [];
        for (const workflow of activeWorkflows) {
            // Execute attempt
            const attemptNumber = workflow.totalRetries + 1;
            // Update attempt
            await db_1.prisma.retryAttempt.create({
                data: {
                    transactionId: workflow.transactionId,
                    workflowId: workflow.id,
                    attemptNumber,
                    scheduledAt: new Date(),
                    executedAt: new Date(),
                    status: 'SUCCESS',
                    responseCode: '200_OK',
                    responseMessage: 'Payment recovered on smart retry.',
                    outcome: 'SUCCESS',
                },
            });
            // Update workflow
            await db_1.prisma.recoveryWorkflow.update({
                where: { id: workflow.id },
                data: {
                    status: 'COMPLETED',
                    totalRetries: attemptNumber,
                },
            });
            // Update transaction status to CAPTURED / RECOVERED
            await db_1.prisma.transaction.update({
                where: { id: workflow.transactionId },
                data: {
                    status: 'CAPTURED',
                    recoveryStatus: 'RECOVERED',
                },
            });
            // Record RevenueRecovery
            const recovery = await db_1.prisma.revenueRecovery.create({
                data: {
                    transactionId: workflow.transactionId,
                    originalAmount: workflow.transaction.amount,
                    recoveredAmount: workflow.transaction.amount,
                    recoveredAt: new Date(),
                    recoveryMethod: 'SMART_RETRY',
                    costSaved: workflow.transaction.amount * 0.98,
                },
            });
            executedResults.push({
                paymentId: workflow.transaction.razorpayPaymentId,
                amount: workflow.transaction.amount,
                customerName: workflow.transaction.customer.name,
                recovery,
            });
        }
        return res.status(200).json({
            success: true,
            message: `Executed ${executedResults.length} pending retries successfully! Revenue recovered!`,
            executedCount: executedResults.length,
            data: executedResults,
        });
    }
    catch (error) {
        next(error);
    }
}
async function resetDemoData(req, res, next) {
    try {
        logger_1.logger.info('[Demo Controller] Resetting database demo data...');
        await db_1.prisma.revenueRecovery.deleteMany();
        await db_1.prisma.notificationLog.deleteMany();
        await db_1.prisma.retryAttempt.deleteMany();
        await db_1.prisma.recoveryWorkflow.deleteMany();
        await db_1.prisma.failureLog.deleteMany();
        await db_1.prisma.webhookEvent.deleteMany();
        await db_1.prisma.transaction.deleteMany();
        await db_1.prisma.customer.deleteMany();
        return res.status(200).json({
            success: true,
            message: 'Demo database reset complete. Run /api/v1/demo/seed to populate sample data.',
        });
    }
    catch (error) {
        next(error);
    }
}
