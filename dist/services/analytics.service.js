"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = exports.AnalyticsService = void 0;
const db_1 = require("../models/db");
class AnalyticsService {
    /**
     * Aggregate high-level fintech metrics for the AutoRevive dashboard
     */
    async getDashboardMetrics() {
        // 1. Revenue at Risk: Sum of amounts of transactions currently FAILED or IN_RECOVERY
        const failedTxSums = await db_1.prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                status: 'FAILED',
                recoveryStatus: { in: ['IN_RECOVERY', 'NOT_STARTED'] },
            },
        });
        const revenueAtRisk = failedTxSums._sum.amount || 0;
        // 2. Recovered Revenue: Sum of recoveredAmount from RevenueRecovery table
        const recoveredSums = await db_1.prisma.revenueRecovery.aggregate({
            _sum: { recoveredAmount: true },
        });
        const recoveredRevenue = recoveredSums._sum.recoveredAmount || 0;
        // 3. Total Failed Payments Count
        const totalFailedPayments = await db_1.prisma.transaction.count({
            where: { status: 'FAILED' },
        });
        // 4. Total Transactions Count
        const totalTransactions = await db_1.prisma.transaction.count();
        // 5. Active Recovery Workflows Count
        const activeWorkflows = await db_1.prisma.recoveryWorkflow.count({
            where: { status: 'ACTIVE' },
        });
        // 6. Recovery Rate Percentage
        const totalFailedHistorical = await db_1.prisma.transaction.count({
            where: {
                OR: [
                    { status: 'FAILED' },
                    { recoveryStatus: 'RECOVERED' }
                ]
            }
        });
        const recoveredCount = await db_1.prisma.transaction.count({
            where: { recoveryStatus: 'RECOVERED' },
        });
        const recoveryRatePercent = totalFailedHistorical > 0
            ? Math.round((recoveredCount / totalFailedHistorical) * 1000) / 10
            : 0;
        // 7. Failure Category Breakdown
        const failureLogs = await db_1.prisma.failureLog.groupBy({
            by: ['category'],
            _count: { id: true },
        });
        const categoryBreakdown = {
            INSUFFICIENT_FUNDS: 0,
            BANK_TIMEOUT: 0,
            GATEWAY_TIMEOUT: 0,
            EXPIRED_CARD: 0,
            NETWORK_ERROR: 0,
            SUSPECTED_FRAUD: 0,
        };
        failureLogs.forEach((item) => {
            categoryBreakdown[item.category] = item._count.id;
        });
        // 8. Recovery Workflow Decision Breakdown
        const workflows = await db_1.prisma.recoveryWorkflow.groupBy({
            by: ['decision'],
            _count: { id: true },
        });
        const decisionBreakdown = {
            RETRY_NOW: 0,
            RETRY_LATER: 0,
            CUSTOMER_ACTION: 0,
            STOP_RETRY: 0,
            MANUAL_REVIEW: 0,
        };
        workflows.forEach((item) => {
            decisionBreakdown[item.decision] = item._count.id;
        });
        // 9. Notification Channel Breakdown
        const notifications = await db_1.prisma.notificationLog.groupBy({
            by: ['channel'],
            _count: { id: true },
        });
        const channelBreakdown = {
            EMAIL: 0,
            SMS: 0,
            WHATSAPP: 0,
            IN_APP: 0,
        };
        notifications.forEach((item) => {
            channelBreakdown[item.channel] = item._count.id;
        });
        // 10. Recent Recoveries List
        const recentRecoveries = await db_1.prisma.revenueRecovery.findMany({
            take: 5,
            orderBy: { recoveredAt: 'desc' },
            include: {
                transaction: {
                    include: { customer: true },
                },
            },
        });
        return {
            revenueAtRisk: Math.round(revenueAtRisk),
            recoveredRevenue: Math.round(recoveredRevenue),
            recoveryRatePercent,
            activeWorkflows,
            totalFailedPayments,
            totalTransactions,
            categoryBreakdown,
            decisionBreakdown,
            channelBreakdown,
            recentRecoveries,
        };
    }
}
exports.AnalyticsService = AnalyticsService;
exports.analyticsService = new AnalyticsService();
