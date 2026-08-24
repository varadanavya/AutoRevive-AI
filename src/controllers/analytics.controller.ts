import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';

export async function getDashboardMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const metrics = await analyticsService.getDashboardMetrics();
    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
}
