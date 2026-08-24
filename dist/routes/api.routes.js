"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhooks_controller_1 = require("../controllers/webhooks.controller");
const diagnose_controller_1 = require("../controllers/diagnose.controller");
const recovery_controller_1 = require("../controllers/recovery.controller");
const transactions_controller_1 = require("../controllers/transactions.controller");
const analytics_controller_1 = require("../controllers/analytics.controller");
const demo_controller_1 = require("../controllers/demo.controller");
const hmac_1 = require("../middleware/hmac");
const router = (0, express_1.Router)();
// Webhook Route
router.post('/webhooks/razorpay', hmac_1.razorpayHmacMiddleware, webhooks_controller_1.handleRazorpayWebhook);
// AI Diagnosis & Recovery Workflow Routes
router.post('/diagnose', diagnose_controller_1.diagnosePaymentFailure);
router.post('/recovery/trigger', recovery_controller_1.triggerManualRecovery);
router.get('/workflows', recovery_controller_1.getActiveWorkflows);
// Transactions & Audit Logs
router.get('/transactions', transactions_controller_1.getAllTransactions);
router.get('/transactions/:id', transactions_controller_1.getTransactionById);
// Analytics & Dashboard Metrics
router.get('/analytics/dashboard', analytics_controller_1.getDashboardMetrics);
// Hackathon Demo Simulation Controls
router.post('/demo/simulate-failure', demo_controller_1.simulatePaymentFailure);
router.post('/demo/execute-retry', demo_controller_1.executePendingRetries);
router.post('/demo/reset', demo_controller_1.resetDemoData);
exports.default = router;
