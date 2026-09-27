import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { NotificationQueueService } from '../services/notificationQueue.service';

export class NotificationController {
  /**
   * GET /api/v1/notifications/preferences (FR-11.4)
   * Retrieves user notification preferences.
   */
  static async getPreferences(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      let pref = await prisma.userNotificationPreference.findUnique({
        where: { userId: user.userId },
      });

      if (!pref) {
        pref = {
          id: 'default',
          userId: user.userId,
          enablePush: true,
          enableSms: true,
          enableEmail: false,
          pushSubscription: null,
        } as any;
      }

      return res.status(200).json({
        success: true,
        data: pref,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error fetching notification preferences:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * PUT /api/v1/notifications/preferences (FR-11.4)
   * Updates user notification preferences (Push, SMS, Email, VAPID subscription).
   */
  static async updatePreferences(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { enablePush, enableSms, enableEmail, pushSubscription } = req.body;

      const dataToUpdate: any = {};
      if (typeof enablePush === 'boolean') dataToUpdate.enablePush = enablePush;
      if (typeof enableSms === 'boolean') dataToUpdate.enableSms = enableSms;
      if (typeof enableEmail === 'boolean') dataToUpdate.enableEmail = enableEmail;
      if (pushSubscription !== undefined) dataToUpdate.pushSubscription = pushSubscription;

      const pref = await prisma.userNotificationPreference.upsert({
        where: { userId: user.userId },
        create: {
          userId: user.userId,
          enablePush: enablePush ?? true,
          enableSms: enableSms ?? true,
          enableEmail: enableEmail ?? false,
          pushSubscription: pushSubscription ?? null,
        },
        update: dataToUpdate,
      });

      return res.status(200).json({
        success: true,
        data: pref,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error updating notification preferences:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/notifications/logs
   * Returns recent notification deliveries for the current user.
   */
  static async getLogs(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const channel = req.query.channel as string | undefined;

      const where: any = { userId: user.userId };
      if (channel) {
        where.channel = channel;
      }

      const logs = await prisma.notificationLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: limit,
      });

      return res.status(200).json({
        success: true,
        data: logs,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error fetching notification logs:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/notifications/absence-alert (FR-11.1)
   * Dispatches urgent consecutive absence notification to a servant.
   */
  static async dispatchAbsenceAlert(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { servantUserId, memberName, consecutiveCount } = req.body;
      if (!servantUserId || !memberName || !consecutiveCount) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ERR_VALIDATION',
            message: 'servantUserId, memberName, and consecutiveCount are required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const logs = await NotificationQueueService.notifyAbsenceAlert(
        servantUserId,
        memberName,
        consecutiveCount
      );

      return res.status(201).json({
        success: true,
        data: logs,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error dispatching absence alert:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
