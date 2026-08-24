import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import apiRoutes from './routes/api.routes';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimit';
import { RequestWithRawBody } from './middleware/hmac';
import { logger } from './utils/logger';

const app = express();

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP to permit Tailwind CDN & Chart.js in demo dashboard UI
  })
);

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Express JSON parser with Raw Body retention for HMAC verification
app.use(
  express.json({
    verify: (req: RequestWithRawBody, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

app.use(express.urlencoded({ extended: true }));

// Apply rate limiter to API routes
app.use('/api', apiRateLimiter);

// Serve static frontend dashboard assets
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    platform: 'AutoRevive AI',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API V1 Routes
app.use('/api/v1', apiRoutes);

// Fallback to Dashboard HTML for SPA routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
