"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../utils/logger");
function errorHandler(err, req, res, next) {
    logger_1.logger.error(`[Unhandled Error] ${err.message || err}`, { stack: err.stack });
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        error: err.name || 'SERVER_ERROR',
        message,
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
}
