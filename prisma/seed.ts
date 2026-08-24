import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting AutoRevive AI Database Seeding...');

  // Clean existing data
  await prisma.revenueRecovery.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.retryAttempt.deleteMany();
  await prisma.recoveryWorkflow.deleteMany();
  await prisma.failureLog.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.customer.deleteMany();

  // 1. Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      razorpayCustomerId: 'cust_IND_001',
      name: 'Priya Sharma',
      email: 'priya.sharma@techcorp.in',
      phone: '+919812345678',
      status: 'ACTIVE',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      razorpayCustomerId: 'cust_IND_002',
      name: 'Rahul Verma',
      email: 'rahul.verma@fintech.io',
      phone: '+919876543211',
      status: 'ACTIVE',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      razorpayCustomerId: 'cust_IND_003',
      name: 'Ananya Patel',
      email: 'ananya.p@designstudio.co',
      phone: '+919988776655',
      status: 'ACTIVE',
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      razorpayCustomerId: 'cust_IND_004',
      name: 'Rajesh Kumar',
      email: 'rajesh.k@logistics.com',
      phone: '+919711223344',
      status: 'ACTIVE',
    },
  });

  const customer5 = await prisma.customer.create({
    data: {
      razorpayCustomerId: 'cust_IND_005',
      name: 'Sneha Reddy',
      email: 'sneha.reddy@cloudscale.ai',
      phone: '+919655443322',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created 5 Customers');

  // 2. Create Transactions, FailureLogs, Workflows & Recoveries

  // Transaction 1: Recovered UPI Payment (Insufficient Funds)
  const tx1 = await prisma.transaction.create({
    data: {
      razorpayPaymentId: 'pay_REC_101',
      razorpayOrderId: 'order_101',
      customerId: customer1.id,
      amount: 4500,
      currency: 'INR',
      status: 'CAPTURED',
      paymentMethod: 'UPI',
      failureReason: 'UPI limit / Insufficient daily balance',
      failureCode: 'INSUFFICIENT_BAL',
      failureCategory: 'INSUFFICIENT_FUNDS',
      recoveryStatus: 'RECOVERED',
    },
  });

  await prisma.failureLog.create({
    data: {
      transactionId: tx1.id,
      rawError: '{"code": "INSUFFICIENT_BAL", "description": "Daily balance cap hit"}',
      errorCode: 'INSUFFICIENT_BAL',
      errorMessage: 'Daily balance cap hit',
      aiDiagnosis: 'Temporary UPI limit reached. Recommended backoff retry during morning banking hours.',
      recoveryProbability: 78.5,
      riskScore: 12.0,
      category: 'INSUFFICIENT_FUNDS',
    },
  });

  const wf1 = await prisma.recoveryWorkflow.create({
    data: {
      transactionId: tx1.id,
      status: 'COMPLETED',
      decision: 'RETRY_LATER',
      totalRetries: 1,
      maxRetries: 3,
      confidenceScore: 78.5,
      recoveryStrategy: 'Attempt 1/3 scheduled in 240m with banking window alignment.',
    },
  });

  await prisma.retryAttempt.create({
    data: {
      transactionId: tx1.id,
      workflowId: wf1.id,
      attemptNumber: 1,
      scheduledAt: new Date(Date.now() - 3600000 * 2),
      executedAt: new Date(Date.now() - 3600000),
      status: 'SUCCESS',
      responseCode: '200_OK',
      responseMessage: 'Payment captured on smart retry',
      outcome: 'SUCCESS',
    },
  });

  await prisma.revenueRecovery.create({
    data: {
      transactionId: tx1.id,
      originalAmount: 4500,
      recoveredAmount: 4500,
      recoveredAt: new Date(Date.now() - 3600000),
      recoveryMethod: 'SMART_RETRY',
      costSaved: 4410,
    },
  });

  // Transaction 2: Recovered Card Payment (Bank Timeout)
  const tx2 = await prisma.transaction.create({
    data: {
      razorpayPaymentId: 'pay_REC_102',
      razorpayOrderId: 'order_102',
      customerId: customer2.id,
      amount: 12800,
      currency: 'INR',
      status: 'CAPTURED',
      paymentMethod: 'CARD',
      failureReason: 'HDFC Bank CBS offline during maintenance',
      failureCode: 'BANK_OFFLINE',
      failureCategory: 'BANK_TIMEOUT',
      recoveryStatus: 'RECOVERED',
    },
  });

  await prisma.failureLog.create({
    data: {
      transactionId: tx2.id,
      rawError: '{"code": "BANK_OFFLINE", "description": "HDFC Core Banking offline"}',
      errorCode: 'BANK_OFFLINE',
      errorMessage: 'HDFC Core Banking offline',
      aiDiagnosis: 'Bank node outage detected. Scheduled retry after maintenance window.',
      recoveryProbability: 82.0,
      riskScore: 8.0,
      category: 'BANK_TIMEOUT',
    },
  });

  const wf2 = await prisma.recoveryWorkflow.create({
    data: {
      transactionId: tx2.id,
      status: 'COMPLETED',
      decision: 'RETRY_LATER',
      totalRetries: 1,
      maxRetries: 3,
      confidenceScore: 82.0,
      recoveryStrategy: 'Attempt 1/3 scheduled after 60m bank maintenance.',
    },
  });

  await prisma.retryAttempt.create({
    data: {
      transactionId: tx2.id,
      workflowId: wf2.id,
      attemptNumber: 1,
      scheduledAt: new Date(Date.now() - 3600000 * 5),
      executedAt: new Date(Date.now() - 3600000 * 4),
      status: 'SUCCESS',
      responseCode: '200_OK',
      responseMessage: 'Payment captured on smart retry',
      outcome: 'SUCCESS',
    },
  });

  await prisma.revenueRecovery.create({
    data: {
      transactionId: tx2.id,
      originalAmount: 12800,
      recoveredAmount: 12800,
      recoveredAt: new Date(Date.now() - 3600000 * 4),
      recoveryMethod: 'SMART_RETRY',
      costSaved: 12544,
    },
  });

  // Transaction 3: Active Recovery (Gateway Timeout)
  const tx3 = await prisma.transaction.create({
    data: {
      razorpayPaymentId: 'pay_FAIL_201',
      razorpayOrderId: 'order_201',
      customerId: customer3.id,
      amount: 15000,
      currency: 'INR',
      status: 'FAILED',
      paymentMethod: 'NETBANKING',
      failureReason: 'ICICI gateway timeout 504',
      failureCode: 'GATEWAY_TIMEOUT',
      failureCategory: 'GATEWAY_TIMEOUT',
      recoveryStatus: 'IN_RECOVERY',
    },
  });

  await prisma.failureLog.create({
    data: {
      transactionId: tx3.id,
      rawError: '{"code": "GATEWAY_TIMEOUT", "description": "ICICI gateway 504"}',
      errorCode: 'GATEWAY_TIMEOUT',
      errorMessage: 'ICICI gateway timeout 504',
      aiDiagnosis: 'Transient network / gateway timeout. No risk flags on account.',
      recoveryProbability: 88.5,
      riskScore: 5.0,
      category: 'GATEWAY_TIMEOUT',
    },
  });

  await prisma.recoveryWorkflow.create({
    data: {
      transactionId: tx3.id,
      status: 'ACTIVE',
      decision: 'RETRY_NOW',
      totalRetries: 0,
      maxRetries: 3,
      nextRetryAt: new Date(Date.now() + 120000), // in 2 mins
      confidenceScore: 88.5,
      recoveryStrategy: 'Auto-retry immediately with 2-minute exponential backoff.',
    },
  });

  // Transaction 4: Active Recovery (Insufficient Funds)
  const tx4 = await prisma.transaction.create({
    data: {
      razorpayPaymentId: 'pay_FAIL_202',
      razorpayOrderId: 'order_202',
      customerId: customer4.id,
      amount: 8200,
      currency: 'INR',
      status: 'FAILED',
      paymentMethod: 'UPI',
      failureReason: 'Insufficient account balance',
      failureCode: 'BAD_REQUEST_PAYMENT_FAILED',
      failureCategory: 'INSUFFICIENT_FUNDS',
      recoveryStatus: 'IN_RECOVERY',
    },
  });

  await prisma.failureLog.create({
    data: {
      transactionId: tx4.id,
      rawError: '{"code": "BAD_REQUEST_PAYMENT_FAILED", "description": "Insufficient balance"}',
      errorCode: 'BAD_REQUEST_PAYMENT_FAILED',
      errorMessage: 'Insufficient balance',
      aiDiagnosis: 'Account balance low. Retrying during salary window (10 AM weekdays).',
      recoveryProbability: 64.0,
      riskScore: 18.0,
      category: 'INSUFFICIENT_FUNDS',
    },
  });

  await prisma.recoveryWorkflow.create({
    data: {
      transactionId: tx4.id,
      status: 'ACTIVE',
      decision: 'RETRY_LATER',
      totalRetries: 0,
      maxRetries: 3,
      nextRetryAt: new Date(Date.now() + 14400000), // in 4 hours
      confidenceScore: 64.0,
      recoveryStrategy: 'Schedule multi-day backoff with banking window alignment.',
    },
  });

  // Transaction 5: Customer Action (Expired Card)
  const tx5 = await prisma.transaction.create({
    data: {
      razorpayPaymentId: 'pay_FAIL_203',
      razorpayOrderId: 'order_203',
      customerId: customer5.id,
      amount: 5500,
      currency: 'INR',
      status: 'FAILED',
      paymentMethod: 'CARD',
      failureReason: 'Card expiration date 04/24 is in the past',
      failureCode: 'EXPIRED_CARD',
      failureCategory: 'EXPIRED_CARD',
      recoveryStatus: 'IN_RECOVERY',
    },
  });

  await prisma.failureLog.create({
    data: {
      transactionId: tx5.id,
      rawError: '{"code": "EXPIRED_CARD", "description": "Card expired"}',
      errorCode: 'EXPIRED_CARD',
      errorMessage: 'Card expired',
      aiDiagnosis: 'Card expired. Retries stopped. Automated recovery campaign launched.',
      recoveryProbability: 82.0,
      riskScore: 10.0,
      category: 'EXPIRED_CARD',
    },
  });

  await prisma.recoveryWorkflow.create({
    data: {
      transactionId: tx5.id,
      status: 'ACTIVE',
      decision: 'CUSTOMER_ACTION',
      totalRetries: 0,
      maxRetries: 0,
      confidenceScore: 82.0,
      recoveryStrategy: 'Dispatch interactive payment link via Email, SMS & WhatsApp.',
    },
  });

  // Dispatch simulated notifications for Customer Action
  await prisma.notificationLog.createMany({
    data: [
      {
        customerId: customer5.id,
        transactionId: tx5.id,
        channel: 'EMAIL',
        type: 'RECOVERY_ACTION_LINK',
        status: 'SENT',
        recipient: customer5.email,
        messageBody: `[AutoRevive Recovery Link] Hi ${customer5.name}, your payment of ₹5,500 failed due to card expiry. Click to update card details: http://localhost:3000/#recover-pay_FAIL_203`,
      },
      {
        customerId: customer5.id,
        transactionId: tx5.id,
        channel: 'WHATSAPP',
        type: 'RECOVERY_ACTION_LINK',
        status: 'SENT',
        recipient: customer5.phone,
        messageBody: `[AutoRevive WhatsApp] Hi ${customer5.name}, your card for payment pay_FAIL_203 has expired. Click here to update details: http://localhost:3000/#recover-pay_FAIL_203`,
      },
      {
        customerId: customer5.id,
        transactionId: tx5.id,
        channel: 'SMS',
        type: 'RECOVERY_ACTION_LINK',
        status: 'SENT',
        recipient: customer5.phone,
        messageBody: `AutoRevive: Payment ₹5,500 failed. Update card details: http://localhost:3000/#recover-pay_FAIL_203`,
      },
    ],
  });

  // Transaction 6: Stopped / Suspected Fraud
  const tx6 = await prisma.transaction.create({
    data: {
      razorpayPaymentId: 'pay_FAIL_204',
      razorpayOrderId: 'order_204',
      customerId: customer2.id,
      amount: 75000,
      currency: 'INR',
      status: 'FAILED',
      paymentMethod: 'CARD',
      failureReason: 'Stolen card flag / high risk score (94/100)',
      failureCode: 'SUSPECTED_FRAUD',
      failureCategory: 'SUSPECTED_FRAUD',
      recoveryStatus: 'STOPPED',
    },
  });

  await prisma.failureLog.create({
    data: {
      transactionId: tx6.id,
      rawError: '{"code": "SUSPECTED_FRAUD", "description": "Stolen card velocity trigger"}',
      errorCode: 'SUSPECTED_FRAUD',
      errorMessage: 'Stolen card velocity trigger',
      aiDiagnosis: 'High fraud risk score (94/100). All automated recovery retries halted.',
      recoveryProbability: 4.0,
      riskScore: 94.0,
      category: 'SUSPECTED_FRAUD',
    },
  });

  await prisma.recoveryWorkflow.create({
    data: {
      transactionId: tx6.id,
      status: 'FAILED',
      decision: 'STOP_RETRY',
      totalRetries: 0,
      maxRetries: 0,
      confidenceScore: 4.0,
      recoveryStrategy: 'Halt all retry attempts and flag customer record.',
    },
  });

  // 3. WebhookEvents Audit Store
  await prisma.webhookEvent.createMany({
    data: [
      {
        eventId: 'evt_seed_1',
        eventType: 'payment.failed',
        payload: JSON.stringify({ paymentId: 'pay_FAIL_201', amount: 1500000 }),
        status: 'PROCESSED',
      },
      {
        eventId: 'evt_seed_2',
        eventType: 'payment.failed',
        payload: JSON.stringify({ paymentId: 'pay_FAIL_202', amount: 820000 }),
        status: 'PROCESSED',
      },
      {
        eventId: 'evt_seed_3',
        eventType: 'payment.captured',
        payload: JSON.stringify({ paymentId: 'pay_REC_101', amount: 450000 }),
        status: 'PROCESSED',
      },
    ],
  });

  console.log('✅ Created Transactions, Failure Logs, Workflows, Notifications & Webhook Events');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
