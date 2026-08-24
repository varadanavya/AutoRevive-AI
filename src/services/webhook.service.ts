import { prisma } from '../models/db';
import { logger } from '../utils/logger';
import { aiDecisionEngine } from './aiEngine.service';
import { smartRetryEngine } from './retryEngine.service';
import { notificationService } from './notification.service';

export class WebhookService {
  /**
   * Process Razorpay Webhook Event with Idempotency Guard
   */
  public async processWebhook(eventId: string, eventType: string, payload: any): Promise<{ status: string; message: string; data?: any }> {
    // 1. Idempotency Guard: Check if event was already processed
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      logger.info(`[Webhook Service] Idempotent skip: Event ${eventId} (${eventType}) already processed.`);
      return {
        status: 'SKIPPED',
        message: `Event ${eventId} already processed at ${existingEvent.processedAt.toISOString()}`,
      };
    }

    logger.info(`[Webhook Service] Processing Razorpay event ${eventId} | Type: ${eventType}`);

    let responseData: any = null;

    try {
      switch (eventType) {
        case 'payment.failed':
          responseData = await this.handlePaymentFailed(payload);
          break;

        case 'payment.captured':
          responseData = await this.handlePaymentCaptured(payload);
          break;

        case 'subscription.charged':
          responseData = await this.handleSubscriptionCharged(payload);
          break;

        default:
          logger.info(`[Webhook Service] Unhandled event type ${eventType}, stored for audit.`);
          break;
      }

      // Record idempotent event in DB
      await prisma.webhookEvent.create({
        data: {
          eventId,
          eventType,
          payload: JSON.stringify(payload),
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      return {
        status: 'SUCCESS',
        message: `Event ${eventId} processed successfully.`,
        data: responseData,
      };
    } catch (error: any) {
      logger.error(`[Webhook Service] Error processing event ${eventId}:`, error);

      await prisma.webhookEvent.create({
        data: {
          eventId,
          eventType,
          payload: JSON.stringify(payload),
          status: 'FAILED',
          processedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Handle payment.failed event: Run AI Diagnosis, create Workflow & Retry Schedule
   */
  private async handlePaymentFailed(payload: any) {
    const entity = payload?.payment?.entity || payload?.entity || payload;
    const paymentId = entity.id || `pay_${Date.now()}`;
    const orderId = entity.order_id || `order_${Date.now()}`;
    const amount = (entity.amount || 100000) / 100; // Razorpay amounts in paise
    const currency = entity.currency || 'INR';
    const method = (entity.method || 'CARD').toUpperCase();
    const rawErrorCode = entity.error_code || entity.errorCode || 'BAD_REQUEST_PAYMENT_FAILED';
    const rawErrorMessage = entity.error_description || entity.errorMessage || 'Payment failed at bank gateway';
    const failureReason = entity.error_reason || 'payment_failed';

    // Find or create customer
    const custId = entity.customer_id || `cust_${Date.now().toString().slice(-6)}`;
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { razorpayCustomerId: custId },
          { email: entity.email || `customer_${custId}@example.com` }
        ]
      }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          razorpayCustomerId: custId,
          name: entity.contact_name || entity.notes?.customer_name || 'Valued Customer',
          email: entity.email || `customer_${custId}@example.com`,
          phone: entity.contact || '+919876543210',
          status: 'ACTIVE',
        },
      });
    }

    // Customer history for AI scoring
    const pastTxCount = await prisma.transaction.count({ where: { customerId: customer.id } });
    const pastRecoveredCount = await prisma.revenueRecovery.count({
      where: { transaction: { customerId: customer.id } },
    });

    // Run AI Diagnosis Engine
    const diagnosis = aiDecisionEngine.diagnose({
      paymentId,
      amount,
      currency,
      paymentMethod: method,
      failureCode: rawErrorCode,
      failureReason,
      rawErrorCode,
      rawErrorMessage,
      customerHistory: {
        totalTransactions: pastTxCount,
        failedTransactions: pastTxCount,
        recoveredTransactions: pastRecoveredCount,
      },
    });

    // Create or update Transaction
    let transaction = await prisma.transaction.findUnique({
      where: { razorpayPaymentId: paymentId },
    });

    if (!transaction) {
      transaction = await prisma.transaction.create({
        data: {
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          customerId: customer.id,
          amount,
          currency,
          status: 'FAILED',
          paymentMethod: method,
          failureReason: rawErrorMessage,
          failureCode: rawErrorCode,
          failureCategory: diagnosis.category,
          recoveryStatus: diagnosis.decision === 'STOP_RETRY' ? 'FAILED_RECOVERY' : 'IN_RECOVERY',
        },
      });
    } else {
      transaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          failureCategory: diagnosis.category,
          recoveryStatus: diagnosis.decision === 'STOP_RETRY' ? 'FAILED_RECOVERY' : 'IN_RECOVERY',
        },
      });
    }

    // Create FailureLog record
    const failureLog = await prisma.failureLog.create({
      data: {
        transactionId: transaction.id,
        rawError: JSON.stringify(entity),
        errorCode: rawErrorCode,
        errorMessage: rawErrorMessage,
        aiDiagnosis: diagnosis.explanation,
        recoveryProbability: diagnosis.recoveryProbability,
        riskScore: diagnosis.riskScore,
        category: diagnosis.category,
      },
    });

    // Create RecoveryWorkflow
    const workflow = await prisma.recoveryWorkflow.create({
      data: {
        transactionId: transaction.id,
        status: diagnosis.decision === 'STOP_RETRY' ? 'FAILED' : 'ACTIVE',
        decision: diagnosis.decision,
        totalRetries: 0,
        maxRetries: diagnosis.maxRetries,
        confidenceScore: diagnosis.recoveryProbability,
        recoveryStrategy: diagnosis.recommendedActionText,
      },
    });

    // Schedule initial retry attempt if applicable
    let retryAttempt = null;
    if (diagnosis.decision === 'RETRY_NOW' || diagnosis.decision === 'RETRY_LATER') {
      const schedule = smartRetryEngine.calculateNextRetry({
        attemptNumber: 0,
        baseDelayMinutes: diagnosis.recommendedDelayMinutes,
        maxRetries: diagnosis.maxRetries,
        initialProbability: diagnosis.recoveryProbability,
        bankingWindowOptimal: diagnosis.bankingWindowOptimal,
      });

      if (schedule) {
        await prisma.recoveryWorkflow.update({
          where: { id: workflow.id },
          data: { nextRetryAt: schedule.nextRetryAt },
        });

        retryAttempt = await prisma.retryAttempt.create({
          data: {
            transactionId: transaction.id,
            workflowId: workflow.id,
            attemptNumber: 1,
            scheduledAt: schedule.nextRetryAt,
            status: 'SCHEDULED',
          },
        });
      }
    }

    // Dispatch notifications if CUSTOMER_ACTION
    if (diagnosis.decision === 'CUSTOMER_ACTION') {
      await notificationService.triggerCustomerActionCampaign({
        customerId: customer.id,
        transactionId: transaction.id,
        customerName: customer.name,
        email: customer.email,
        phone: customer.phone,
        amount,
        paymentId,
        failureReason: rawErrorMessage,
      });
    }

    return {
      transactionId: transaction.id,
      paymentId,
      diagnosis,
      workflowId: workflow.id,
      scheduledRetryAt: workflow.nextRetryAt,
    };
  }

  /**
   * Handle payment.captured event: Mark transaction recovered, calculate revenue recovery
   */
  private async handlePaymentCaptured(payload: any) {
    const entity = payload?.payment?.entity || payload?.entity || payload;
    const paymentId = entity.id;
    const amount = (entity.amount || 0) / 100;

    let transaction = await prisma.transaction.findUnique({
      where: { razorpayPaymentId: paymentId },
      include: { customer: true, workflows: true },
    });

    if (transaction) {
      // Update transaction status
      const isRecovered = transaction.recoveryStatus === 'IN_RECOVERY' || transaction.status === 'FAILED';

      transaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'CAPTURED',
          recoveryStatus: isRecovered ? 'RECOVERED' : 'NOT_STARTED',
        },
        include: { customer: true, workflows: true },
      });

      // Close active workflows
      await prisma.recoveryWorkflow.updateMany({
        where: { transactionId: transaction.id, status: 'ACTIVE' },
        data: { status: 'COMPLETED' },
      });

      // Record RevenueRecovery financial log
      let revenueRecovery = null;
      if (isRecovered) {
        revenueRecovery = await prisma.revenueRecovery.create({
          data: {
            transactionId: transaction.id,
            originalAmount: amount,
            recoveredAmount: amount,
            recoveredAt: new Date(),
            recoveryMethod: 'SMART_RETRY',
            costSaved: amount * 0.98, // Estimated net value saved
          },
        });

        // Send success notification
        await notificationService.sendNotification({
          customerId: transaction.customerId,
          transactionId: transaction.id,
          channel: 'EMAIL',
          type: 'SUCCESS_RECEIPT',
          recipient: transaction.customer.email,
          customerName: transaction.customer.name,
          amount,
          paymentId: transaction.razorpayPaymentId,
        });
      }

      return {
        transactionId: transaction.id,
        status: 'CAPTURED',
        recovered: isRecovered,
        revenueRecovery,
      };
    }

    return { message: 'Transaction record captured directly.' };
  }

  /**
   * Handle subscription.charged event
   */
  private async handleSubscriptionCharged(payload: any) {
    const entity = payload?.subscription?.entity || payload?.entity || payload;
    logger.info(`[Webhook Service] Subscription charged event for ${entity.id}`);
    return { subscriptionId: entity.id, status: 'CHARGED' };
  }
}

export const webhookService = new WebhookService();
