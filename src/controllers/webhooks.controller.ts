import { Request, Response, NextFunction } from 'express';
import { webhookService } from '../services/webhook.service';
import { logger } from '../utils/logger';

export async function handleRazorpayWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body;
    const eventType = payload.event || 'payment.failed';
    const eventId = payload.event_id || `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    logger.info(`[Webhook Controller] Received webhook event ${eventId} (${eventType})`);

    const result = await webhookService.processWebhook(eventId, eventType, payload);

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
}
