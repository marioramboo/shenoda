import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AlertStatus } from '@shenoda/shared';

export class AlertController {
  /**
   * GET /api/v1/attendance/alerts (FR-4.3)
   * Lists absence alerts scoped to the user's role and assignments.
   */
  static async listAlerts(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const stageId = req.query.stageId as string | undefined;
    const status = (req.query.status as AlertStatus) || 'ACTIVE';

    const whereClause: any = {};
    if (status) whereClause.alertStatus = status;

    // Scoping:
    // Level 1: Only alerts assigned to this servant or where member is assigned to this servant
    if (user.roleLevel === 1) {
      whereClause.OR = [
        { assignedFollowUpId: user.userId },
        {
          member: {
            servantAssignments: {
              some: { servantUserId: user.userId },
            },
          },
        },
      ];
    } else if (user.roleLevel >= 2 && user.roleLevel <= 3) {
      // Scoped to user's stage(s)
      if (stageId && user.stageIds.includes(stageId)) {
        whereClause.stageId = stageId;
      } else {
        whereClause.stageId = { in: user.stageIds };
      }
    } else if (user.roleLevel === 4) {
      // Scoped to stages within sector
      if (stageId) {
        whereClause.stageId = stageId;
      } else {
        whereClause.stage = { sectorId: { in: user.sectorIds } };
      }
    }
    // Level 5: Org-wide

    const alerts = await prisma.absenceAlert.findMany({
      where: whereClause,
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            educationalGrade: true,
          },
        },
        servantUser: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
          },
        },
        assignedFollowUp: {
          select: {
            id: true,
            fullName: true,
          },
        },
        stage: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ consecutiveCount: 'desc' }, { createdAt: 'desc' }],
    });

    return res.status(200).json({
      success: true,
      data: alerts,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * PATCH /api/v1/attendance/alerts/:id/resolve
   * Resolves an alert with follow-up outcome notes.
   */
  static async resolveAlert(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const alertId = req.params.id;
    const { resolutionNotes } = req.body;

    const alert = await prisma.absenceAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: { code: 'ALERT_NOT_FOUND', message: 'Absence alert not found' },
        timestamp: new Date().toISOString(),
      });
    }

    const updated = await prisma.absenceAlert.update({
      where: { id: alertId },
      data: {
        alertStatus: 'RESOLVED',
        resolvedAt: new Date(),
        resolutionNotes: resolutionNotes || 'تم الافتقاد وحل التنبيه',
      },
      include: {
        member: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * PATCH /api/v1/attendance/alerts/:id/dismiss
   * Dismisses an alert.
   */
  static async dismissAlert(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const alertId = req.params.id;
    const { reason } = req.body;

    const alert = await prisma.absenceAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: { code: 'ALERT_NOT_FOUND', message: 'Absence alert not found' },
        timestamp: new Date().toISOString(),
      });
    }

    const updated = await prisma.absenceAlert.update({
      where: { id: alertId },
      data: {
        alertStatus: 'DISMISSED',
        resolutionNotes: reason || 'تم التجاهل بواسطة المشرف',
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  }
}
