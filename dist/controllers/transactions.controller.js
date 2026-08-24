"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTransactions = getAllTransactions;
exports.getTransactionById = getTransactionById;
const db_1 = require("../models/db");
async function getAllTransactions(req, res, next) {
    try {
        const { status, category, search, limit = '50', page = '1' } = req.query;
        const take = parseInt(limit, 10);
        const skip = (parseInt(page, 10) - 1) * take;
        const where = {};
        if (status) {
            where.status = status;
        }
        if (category) {
            where.failureCategory = category;
        }
        if (search) {
            const q = search;
            where.OR = [
                { razorpayPaymentId: { contains: q } },
                { razorpayOrderId: { contains: q } },
                { customer: { name: { contains: q } } },
                { customer: { email: { contains: q } } },
            ];
        }
        const [transactions, total] = await Promise.all([
            db_1.prisma.transaction.findMany({
                where,
                take,
                skip,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: true,
                    failureLogs: true,
                    workflows: {
                        include: { retryAttempts: true },
                    },
                    revenueRecoveries: true,
                },
            }),
            db_1.prisma.transaction.count({ where }),
        ]);
        return res.status(200).json({
            success: true,
            pagination: {
                total,
                page: parseInt(page, 10),
                limit: take,
                totalPages: Math.ceil(total / take),
            },
            data: transactions,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getTransactionById(req, res, next) {
    try {
        const { id } = req.params;
        const transaction = await db_1.prisma.transaction.findFirst({
            where: {
                OR: [
                    { id },
                    { razorpayPaymentId: id }
                ]
            },
            include: {
                customer: true,
                failureLogs: true,
                workflows: {
                    include: { retryAttempts: true },
                },
                notifications: true,
                revenueRecoveries: true,
            },
        });
        if (!transaction) {
            return res.status(404).json({ error: 'NOT_FOUND', message: 'Transaction not found.' });
        }
        return res.status(200).json({
            success: true,
            data: transaction,
        });
    }
    catch (error) {
        next(error);
    }
}
