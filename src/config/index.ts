import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  razorpay: {
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'razorpay_secret_key_12345',
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_samplekey123',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'sample_secret_key_456',
  },
  demoMode: process.env.DEMO_MODE === 'true' || true,
  enableSimulatedNotifications: process.env.ENABLE_SIMULATED_NOTIFICATIONS !== 'false',
};
