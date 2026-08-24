import { Router } from 'express';
import { handleRazorpayWebhook } from '../controllers/webhooks.controller';
import { diagnosePaymentFailure } from '../controllers/diagnose.controller';
import { triggerManualRecovery, getActiveWorkflows } from '../controllers/recovery.controller';
import { getAllTransactions, getTransactionById } from '../controllers/transactions.controller';
import { getDashboardMetrics } from '../controllers/analytics.controller';
import { simulatePaymentFailure, executePendingRetries, resetDemoData } from '../controllers/demo.controller';
import { razorpayHmacMiddleware } from '../middleware/hmac';

const router = Router();

// Webhook Route
router.post('/webhooks/razorpay', razorpayHmacMiddleware, handleRazorpayWebhook);

// AI Diagnosis & Recovery Workflow Routes
router.post('/diagnose', diagnosePaymentFailure);
router.post('/recovery/trigger', triggerManualRecovery);
router.get('/workflows', getActiveWorkflows);

// Transactions & Audit Logs
router.get('/transactions', getAllTransactions);
router.get('/transactions/:id', getTransactionById);

// Analytics & Dashboard Metrics
router.get('/analytics/dashboard', getDashboardMetrics);

// Hackathon Demo Simulation Controls
router.post('/demo/simulate-failure', simulatePaymentFailure);
router.post('/demo/execute-retry', executePendingRetries);
router.post('/demo/reset', resetDemoData);

export default router;
