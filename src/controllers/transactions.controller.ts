import { Request, Response, NextFunction } from 'express';
import { prisma } from '../models/db';

export async function getAllTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, category, search, limit = '50', page = '1' } = req.query;

    const take = parseInt(limit as string, 10);
    const skip = (parseInt(page as string, 10) - 1) * take;

    const where: any = {};

    if (status) {
      where.status = status as string;
    }

    if (category) {
      where.failureCategory = category as string;
    }

    if (search) {
      const q = search as string;
      where.OR = [
        { razorpayPaymentId: { contains: q } },
        { razorpayOrderId: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { email: { contains: q } } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
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
      prisma.transaction.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: parseInt(page as string, 10),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTransactionById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findFirst({
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
  } catch (error) {
    next(error);
  }
}
