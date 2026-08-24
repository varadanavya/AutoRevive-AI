import { prisma } from '../models/db';
import { logger } from '../utils/logger';
import { config } from '../config';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';
export type NotificationType = 'FAILURE_ALERT' | 'RECOVERY_ACTION_LINK' | 'SUCCESS_RECEIPT';

export interface SendNotificationPayload {
  customerId: string;
  transactionId: string;
  channel: NotificationChannel;
  type: NotificationType;
  recipient: string;
  customerName: string;
  amount: number;
  currency?: string;
  failureReason?: string;
  paymentId: string;
}

export class NotificationService {
  /**
   * Dispatch simulated multi-channel recovery alert and log to DB
   */
  public async sendNotification(payload: SendNotificationPayload): Promise<any> {
    const currencySymbol = payload.currency === 'INR' || !payload.currency ? '₹' : payload.currency;
    const amountStr = `${currencySymbol}${payload.amount.toLocaleString('en-IN')}`;
    const recoveryLink = `http://localhost:${config.port}/#recover-${payload.paymentId}`;

    let messageBody = '';

    switch (payload.type) {
      case 'RECOVERY_ACTION_LINK':
        messageBody = `[AutoRevive Recovery Link] Hi ${payload.customerName}, your payment of ${amountStr} for order ${payload.paymentId} was unsuccessful (${payload.failureReason || 'Action Required'}). Click here to complete your transaction securely: ${recoveryLink}`;
        break;
      case 'FAILURE_ALERT':
        messageBody = `[AutoRevive Alert] Hi ${payload.customerName}, your payment of ${amountStr} failed. AutoRevive AI is automatically managing your recovery workflow. No manual action needed.`;
        break;
      case 'SUCCESS_RECEIPT':
        messageBody = `[AutoRevive Success] Great news ${payload.customerName}! Your payment of ${amountStr} for ${payload.paymentId} has been successfully recovered. Receipt ID: REC-${Date.now().toString().slice(-6)}`;
        break;
      default:
        messageBody = `[AutoRevive Notification] Payment update for transaction ${payload.paymentId}.`;
    }

    logger.info(`[Notification Service] Dispatching ${payload.channel} (${payload.type}) to ${payload.recipient}: "${messageBody}"`);

    // Log dispatch event to Prisma database
    const notification = await prisma.notificationLog.create({
      data: {
        customerId: payload.customerId,
        transactionId: payload.transactionId,
        channel: payload.channel,
        type: payload.type,
        status: 'SENT',
        recipient: payload.recipient,
        messageBody,
        sentAt: new Date(),
      },
    });

    return notification;
  }

  /**
   * Dispatch multi-channel recovery campaign for customer action (Email + SMS + WhatsApp)
   */
  public async triggerCustomerActionCampaign(params: {
    customerId: string;
    transactionId: string;
    customerName: string;
    email: string;
    phone: string;
    amount: number;
    paymentId: string;
    failureReason: string;
  }) {
    logger.info(`[Notification Service] Launching Multi-Channel Customer Recovery Campaign for ${params.customerName}`);

    const emailNotif = await this.sendNotification({
      customerId: params.customerId,
      transactionId: params.transactionId,
      channel: 'EMAIL',
      type: 'RECOVERY_ACTION_LINK',
      recipient: params.email,
      customerName: params.customerName,
      amount: params.amount,
      paymentId: params.paymentId,
      failureReason: params.failureReason,
    });

    const whatsappNotif = await this.sendNotification({
      customerId: params.customerId,
      transactionId: params.transactionId,
      channel: 'WHATSAPP',
      type: 'RECOVERY_ACTION_LINK',
      recipient: params.phone,
      customerName: params.customerName,
      amount: params.amount,
      paymentId: params.paymentId,
      failureReason: params.failureReason,
    });

    const smsNotif = await this.sendNotification({
      customerId: params.customerId,
      transactionId: params.transactionId,
      channel: 'SMS',
      type: 'RECOVERY_ACTION_LINK',
      recipient: params.phone,
      customerName: params.customerName,
      amount: params.amount,
      paymentId: params.paymentId,
      failureReason: params.failureReason,
    });

    return [emailNotif, whatsappNotif, smsNotif];
  }
}

export const notificationService = new NotificationService();
