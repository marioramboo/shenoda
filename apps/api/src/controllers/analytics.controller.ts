import { Request, Response } from 'express';
import { DashboardAnalyticsService } from '../services/analytics/dashboardAnalytics.service';

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/dashboard (FR-13.1)
   * Retrieves tier-scoped metrics for Stage, Sector, or General Secretaries.
   */
  static async getDashboardAnalytics(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { stageId, sectorId, startDate, endDate } = req.query;

      const data = await DashboardAnalyticsService.getScopedAnalytics(user, {
        stageId: stageId as string | undefined,
        sectorId: sectorId as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      });

      return res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err.code === 'ERR_SCOPE_MISMATCH') {
        return res.status(err.status || 403).json({
          success: false,
          error: { code: err.code, message: err.message },
          timestamp: new Date().toISOString(),
        });
      }

      if (err.code === 'ERR_SPIRITUAL_DATA_FIREWALL') {
        console.error('FIREWALL BREACH DETECTED:', err);
        return res.status(500).json({
          success: false,
          error: { code: err.code, message: err.message },
          timestamp: new Date().toISOString(),
        });
      }

      console.error('Error fetching dashboard analytics:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
