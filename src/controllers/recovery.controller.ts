import { Request, Response, NextFunction } from 'express';
import { prisma } from '../models/db';
import { aiDecisionEngine } from '../services/aiEngine.service';
import { smartRetryEngine } from '../services/retryEngine.service';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

export async function triggerManualRecovery(req: Request, res: Response, next: NextFunction) {
  try {
    const { transactionId, overrideDecision } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'transactionId is required.' });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { customer: true, failureLogs: true, workflows: true },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Transaction not found.' });
    }

    logger.info(`[Recovery Controller] Manual recovery triggered for transaction ${transaction.razorpayPaymentId}`);

    // Run AI Diagnosis or use override decision
    const diagnosis = aiDecisionEngine.diagnose({
      paymentId: transaction.razorpayPaymentId,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      failureCode: transaction.failureCode || undefined,
      failureReason: transaction.failureReason || undefined,
    });

    const finalDecision = overrideDecision || diagnosis.decision;

    // Close existing workflows
    await prisma.recoveryWorkflow.updateMany({
      where: { transactionId: transaction.id },
      data: { status: 'CANCELLED' },
    });

    // Create new workflow
    const workflow = await prisma.recoveryWorkflow.create({
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
    const scheduledRetry = await prisma.retryAttempt.create({
      data: {
        transactionId: transaction.id,
        workflowId: workflow.id,
        attemptNumber: 1,
        scheduledAt: new Date(Date.now() + 1000), // 1 sec delay
        status: 'SCHEDULED',
      },
    });

    // Send notification to customer
    await notificationService.sendNotification({
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
    await prisma.transaction.update({
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
  } catch (error) {
    next(error);
  }
}

export async function getActiveWorkflows(req: Request, res: Response, next: NextFunction) {
  try {
    const workflows = await prisma.recoveryWorkflow.findMany({
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
  } catch (error) {
    next(error);
  }
}
