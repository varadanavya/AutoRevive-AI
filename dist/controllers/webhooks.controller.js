"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRazorpayWebhook = handleRazorpayWebhook;
const webhook_service_1 = require("../services/webhook.service");
const logger_1 = require("../utils/logger");
async function handleRazorpayWebhook(req, res, next) {
    try {
        const payload = req.body;
        const eventType = payload.event || 'payment.failed';
        const eventId = payload.event_id || `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        logger_1.logger.info(`[Webhook Controller] Received webhook event ${eventId} (${eventType})`);
        const result = await webhook_service_1.webhookService.processWebhook(eventId, eventType, payload);
        return res.status(200).json({
            success: true,
            result,
        });
    }
    catch (error) {
        next(error);
    }
}
