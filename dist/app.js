"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const api_routes_1 = __importDefault(require("./routes/api.routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimit_1 = require("./middleware/rateLimit");
const app = (0, express_1.default)();
// Security Headers with Helmet
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Disable CSP to permit Tailwind CDN & Chart.js in demo dashboard UI
}));
// Enable Cross-Origin Resource Sharing
app.use((0, cors_1.default)());
// Express JSON parser with Raw Body retention for HMAC verification
app.use(express_1.default.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    },
}));
app.use(express_1.default.urlencoded({ extended: true }));
// Apply rate limiter to API routes
app.use('/api', rateLimit_1.apiRateLimiter);
// Serve static frontend dashboard assets
const publicPath = path_1.default.join(__dirname, 'public');
app.use(express_1.default.static(publicPath));
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        platform: 'AutoRevive AI',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
// API V1 Routes
app.use('/api/v1', api_routes_1.default);
// Fallback to Dashboard HTML for SPA routes
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(publicPath, 'index.html'));
});
// Centralized Error Handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
