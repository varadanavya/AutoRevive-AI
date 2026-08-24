"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerManualRecovery = triggerManualRecovery;
exports.getActiveWorkflows = getActiveWorkflows;
const db_1 = require("../models/db");
const aiEngine_service_1 = require("../services/aiEngine.service");
const notification_service_1 = require("../services/notification.service");
const logger_1 = require("../utils/logger");
async function triggerManualRecovery(req, res, next) {
    try {
        const { transactionId, overrideDecision } = req.body;
        if (!transactionId) {
            return res.status(400).json({ error: 'BAD_REQUEST', message: 'transactionId is required.' });
        }
        const transaction = await db_1.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { customer: true, failureLogs: true, workflows: true },
        });
        if (!transaction) {
            return res.status(404).json({ error: 'NOT_FOUND', message: 'Transaction not found.' });
        }
        logger_1.logger.info(`[Recovery Controller] Manual recovery triggered for transaction ${transaction.razorpayPaymentId}`);
        // Run AI Diagnosis or use override decision
        const diagnosis = aiEngine_service_1.aiDecisionEngine.diagnose({
            paymentId: transaction.razorpayPaymentId,
            amount: transaction.amount,
            currency: transaction.currency,
            paymentMethod: transaction.paymentMethod,
            failureCode: transaction.failureCode || undefined,
            failureReason: transaction.failureReason || undefined,
        });
        const finalDecision = overrideDecision || diagnosis.decision;
        // Close existing workflows
        await db_1.prisma.recoveryWorkflow.updateMany({
            where: { transactionId: transaction.id },
            data: { status: 'CANCELLED' },
        });
        // Create new workflow
        const workflow = await db_1.prisma.recoveryWorkflow.create({
            data: {
                transactionId: transaction.id,
                status: 'ACTIVE',
                decision: finalDecision,
                totalRetries: 0,
                maxRetries: 3,
                confidenceScore: diagnosis.recoveryProbability,
                recoveryStrategy: `Manual Trigger Override: ${finalDecision} (${diagnosis.recommendedActionText})`,
            },
        });
        // Schedule instant retry attempt
        const scheduledRetry = await db_1.prisma.retryAttempt.create({
            data: {
                transactionId: transaction.id,
                workflowId: workflow.id,
                attemptNumber: 1,
                scheduledAt: new Date(Date.now() + 1000), // 1 sec delay
                status: 'SCHEDULED',
            },
        });
        // Send notification to customer
        await notification_service_1.notificationService.sendNotification({
            customerId: transaction.customerId,
            transactionId: transaction.id,
            channel: 'EMAIL',
            type: 'FAILURE_ALERT',
            recipient: transaction.customer.email,
            customerName: transaction.customer.name,
            amount: transaction.amount,
            paymentId: transaction.razorpayPaymentId,
        });
        // Update transaction status
        await db_1.prisma.transaction.update({
            where: { id: transaction.id },
            data: { recoveryStatus: 'IN_RECOVERY' },
        });
        return res.status(200).json({
            success: true,
            message: 'AI Recovery workflow manually triggered.',
            data: {
                transactionId: transaction.id,
                workflow,
                scheduledRetry,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function getActiveWorkflows(req, res, next) {
    try {
        const workflows = await db_1.prisma.recoveryWorkflow.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                transaction: {
                    include: { customer: true },
                },
                retryAttempts: true,
            },
        });
        return res.status(200).json({
            success: true,
            count: workflows.length,
            data: workflows,
        });
    }
    catch (error) {
        next(error);
    }
}
