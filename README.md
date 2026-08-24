# ⚡ AutoRevive AI

> **AI-Powered Payment Failure Diagnosis and Revenue Recovery Platform for the Razorpay AI Buildathon**

AutoRevive AI transforms payment drop-offs into recovered revenue. Designed to integrate seamlessly with the **Razorpay ecosystem**, AutoRevive AI intercepts `payment.failed` webhooks, classifies root causes using a hybrid AI decision engine, schedules optimal retries using exponential backoff with jitter and banking window alignment, and triggers multi-channel customer recovery campaigns.

---

## 🌟 Key Features

1. **AI Failure Taxonomy Engine**: Automatically classifies payment errors into 6 core categories:
   - `INSUFFICIENT_FUNDS`
   - `BANK_TIMEOUT`
   - `GATEWAY_TIMEOUT`
   - `EXPIRED_CARD`
   - `NETWORK_ERROR`
   - `SUSPECTED_FRAUD`
2. **Smart Recovery Decisions**:
   - `RETRY_NOW`: Immediate 2-minute backoff retry for transient network/gateway glitches.
   - `RETRY_LATER`: Smart backoff retry aligned with banking settlement hours (10 AM - 4 PM) and salary dates.
   - `CUSTOMER_ACTION`: Dispatch interactive recovery payment link via Email, SMS, and WhatsApp.
   - `STOP_RETRY`: Immediate halt on stolen cards or hard fraud flags.
   - `MANUAL_REVIEW`: Escalation for high-value suspicious transactions.
3. **Smart Retry Scheduling Engine**:
   - Exponential backoff with random jitter: \( t_{\text{next}} = t_{\text{base}} \times 2^{\text{attempt} - 1} \pm \text{jitter} \)
   - Banking window optimization: Shifting retries out of bank maintenance hours (00:00 - 03:00) into high-success settlement windows (10:00 AM - 16:00 PM).
   - Time decay factor: Probability score decays appropriately across retries.
4. **Razorpay Webhook Integration**:
   - Secure endpoint handling `payment.failed`, `payment.captured`, and `subscription.charged`.
   - HMAC SHA256 signature verification (`x-razorpay-signature`).
   - DB-backed idempotency guard using `WebhookEvent` table.
5. **Multi-Channel Notification Simulation**:
   - Simulated Email, SMS, WhatsApp, and In-App recovery alerts with one-click payment links.
6. **Fintech AI Glassmorphism Dashboard**:
   - Real-time KPI metrics: Revenue at Risk, Recovered Revenue, Recovery Rate %, Active Workflows.
   - Interactive Chart.js graphs for Failure Taxonomy and Recovery Strategy distributions.
   - Live Transaction Audit Log with filter/search and "AI Diagnosis Explanation" panels.
   - **Interactive Hackathon Live Sandbox**: Trigger instant failure webhooks and run smart retry ticks live!

---

## 🛠️ Tech Stack

- **Backend**: Node.js, TypeScript, Express.js
- **ORM & Database**: Prisma ORM, SQLite (Default zero-config), MySQL (Production ready)
- **Security & Reliability**: HMAC SHA256 Signature Verification, Helmet, Express Rate Limit, Idempotency Guard
- **Frontend UI**: HTML5, Tailwind CSS, FontAwesome, Chart.js, Glassmorphism CSS Design

---

## 🚀 Quick Start (Step-by-Step)

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/autorevive-ai.git
cd "AutoRevive AI"
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Setup Database & Seed Demo Data
```bash
npm run db:setup
```
*This command executes `prisma db push` and seeds realistic transactions, customers, workflows, and logs into `dev.db`.*

### 4. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Running Automated Tests

AutoRevive AI includes a unit test suite covering AI diagnosis, backoff calculation, and HMAC webhook verification:

```bash
npm test
```

---

## 📡 API Reference

### 1. Razorpay Webhook Endpoint
- **URL**: `POST /api/v1/webhooks/razorpay`
- **Headers**: `x-razorpay-signature: <HMAC_SHA256_HEX_SIGNATURE>`
- **Events Supported**: `payment.failed`, `payment.captured`, `subscription.charged`

### 2. AI Payment Failure Diagnosis
- **URL**: `POST /api/v1/diagnose`
- **Body**:
```json
{
  "amount": 5000,
  "currency": "INR",
  "paymentMethod": "CARD",
  "failureCode": "INSUFFICIENT_BAL",
  "failureReason": "Insufficient funds in bank account"
}
```

### 3. Trigger Manual AI Recovery
- **URL**: `POST /api/v1/recovery/trigger`
- **Body**: `{ "transactionId": "<TRANSACTION_UUID>" }`

### 4. Dashboard Metrics API
- **URL**: `GET /api/v1/analytics/dashboard`

### 5. Transactions Audit Log API
- **URL**: `GET /api/v1/transactions?limit=50&status=FAILED`

### 6. Demo Simulation APIs
- `POST /api/v1/demo/simulate-failure` (Body: `{ "category": "INSUFFICIENT_FUNDS" }`)
- `POST /api/v1/demo/execute-retry` (Executes pending smart retries)
- `POST /api/v1/demo/reset` (Resets database state)

---

## 🐳 Docker Setup

Run AutoRevive AI using Docker:

```bash
docker build -t autorevive-ai .
docker run -p 3000:3000 autorevive-ai
```

Or using Docker Compose:

```bash
docker-compose up -d
```

---

## 📜 License

MIT License &copy; 2026 AutoRevive AI Team - Prepared for Razorpay AI Buildathon.
