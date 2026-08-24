"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const db_1 = require("./models/db");
async function startServer() {
    try {
        // Verify database connection
        await db_1.prisma.$connect();
        logger_1.logger.info('[Database] Prisma connected successfully.');
        app_1.default.listen(config_1.config.port, () => {
            logger_1.logger.info(`🚀 AutoRevive AI Server running on http://localhost:${config_1.config.port}`);
            logger_1.logger.info(`📊 Fintech AI Dashboard live at http://localhost:${config_1.config.port}`);
            logger_1.logger.info(`⚡ Razorpay Webhook Endpoint: http://localhost:${config_1.config.port}/api/v1/webhooks/razorpay`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
