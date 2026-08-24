import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './models/db';

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info('[Database] Prisma connected successfully.');

    app.listen(config.port, () => {
      logger.info(`🚀 AutoRevive AI Server running on http://localhost:${config.port}`);
      logger.info(`📊 Fintech AI Dashboard live at http://localhost:${config.port}`);
      logger.info(`⚡ Razorpay Webhook Endpoint: http://localhost:${config.port}/api/v1/webhooks/razorpay`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
