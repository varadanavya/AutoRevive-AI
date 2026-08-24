"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardMetrics = getDashboardMetrics;
const analytics_service_1 = require("../services/analytics.service");
async function getDashboardMetrics(req, res, next) {
    try {
        const metrics = await analytics_service_1.analyticsService.getDashboardMetrics();
        return res.status(200).json({
            success: true,
            data: metrics,
        });
    }
    catch (error) {
        next(error);
    }
}
