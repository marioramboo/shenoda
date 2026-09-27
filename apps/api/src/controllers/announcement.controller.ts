import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AnnouncementAudienceService } from '../services/announcementAudience.service';
import { NotificationQueueService } from '../services/notificationQueue.service';
import { NotificationType, TargetScopeLevel } from '@shenoda/shared';
import { TargetScopeLevel as PrismaTargetScopeLevel } from '@prisma/client';

export class AnnouncementController {
  /**
   * POST /api/v1/announcements (FR-10.1, FR-10.2)
   * Creates an announcement, enforces upward-addressing ban, links recipients, and dispatches notifications.
   */
  static async createAnnouncement(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const {
        title,
        content,
        targetScopeType = TargetScopeLevel.STAGE_ALL,
        targetStageId,
        targetSectorId,
        specificUserIds,
        isPinned = false,
        expiresAt,
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_VALIDATION', message: 'Title and content are required' },
          timestamp: new Date().toISOString(),
        });
      }

      // 1. Resolve recipients & enforce the Upward-Addressing Ban (FR-10.2 & Assumption A5)
      const recipientUserIds = await AnnouncementAudienceService.validateAndResolveAudience(
        user,
        {
          targetScopeType,
          targetStageId,
          targetSectorId,
          specificUserIds,
        }
      );

      // 2. Create the Announcement record
      const announcement = await prisma.announcement.create({
        data: {
          authorUserId: user.userId,
          title,
          content,
          targetScopeType: targetScopeType as PrismaTargetScopeLevel,
          targetStageId: targetStageId || null,
          targetSectorId: targetSectorId || null,
          isPinned: isPinned ?? false,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        include: {
          author: { select: { id: true, fullName: true, role: { select: { name: true, level: true } } } },
          targetStage: { select: { id: true, name: true } },
          targetSector: { select: { id: true, name: true } },
        },
      });

      // 3. Create AnnouncementRecipient records
      if (recipientUserIds.length > 0) {
        await prisma.announcementRecipient.createMany({
          data: recipientUserIds.map((uId) => ({
            announcementId: announcement.id,
            userId: uId,
            isRead: uId === user.userId, // Read if author is also in recipients
            readAt: uId === user.userId ? new Date() : null,
          })),
          skipDuplicates: true,
        });

        // 4. Multi-channel notification dispatch
        await NotificationQueueService.sendBatchNotifications(
          recipientUserIds.filter((id) => id !== user.userId),
          NotificationType.NEW_ANNOUNCEMENT,
          `إعلان كنسي: ${title}`,
          content.substring(0, 120),
          { announcementId: announcement.id }
        );
      }

      return res.status(201).json({
        success: true,
        data: {
          ...announcement,
          recipientsCount: recipientUserIds.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err.code === 'ERR_UPWARD_ADDRESSING_PROHIBITED' || err.code === 'ERR_UNAUTHORIZED_ANNOUNCER' || err.code === 'ERR_SCOPE_MISMATCH') {
        return res.status(err.status || 403).json({
          success: false,
          error: { code: err.code, message: err.message },
          timestamp: new Date().toISOString(),
        });
      }

      console.error('Error creating announcement:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/announcements (FR-10.3)
   * Lists announcements delivered to the caller.
   */
  static async listAnnouncements(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { unreadOnly } = req.query;

      // Caller sees announcements where they are a linked recipient or the author
      const announcements = await prisma.announcement.findMany({
        where: {
          OR: [
            { recipients: { some: { userId: user.userId } } },
            { authorUserId: user.userId },
          ],
        },
        include: {
          author: { select: { id: true, fullName: true, role: { select: { name: true, level: true } } } },
          targetStage: { select: { id: true, name: true } },
          recipients: {
            where: { userId: user.userId },
            select: { isRead: true, readAt: true },
          },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      });

      let results = announcements.map((a) => {
        const myRec = a.recipients[0];
        return {
          id: a.id,
          title: a.title,
          content: a.content,
          targetScopeType: a.targetScopeType,
          isPinned: a.isPinned,
          expiresAt: a.expiresAt,
          createdAt: a.createdAt,
          author: a.author,
          targetStage: a.targetStage,
          isRead: myRec ? myRec.isRead : a.authorUserId === user.userId,
          readAt: myRec ? myRec.readAt : null,
        };
      });

      if (unreadOnly === 'true') {
        results = results.filter((a) => !a.isRead);
      }

      return res.status(200).json({
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error listing announcements:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * PATCH /api/v1/announcements/:id/read
   * Marks announcement as read for the calling user.
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { id } = req.params;

      const recipient = await prisma.announcementRecipient.findUnique({
        where: {
          announcementId_userId: {
            announcementId: id,
            userId: user.userId,
          },
        },
      });

      if (!recipient) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Recipient record not found for this user' },
          timestamp: new Date().toISOString(),
        });
      }

      await prisma.announcementRecipient.update({
        where: { id: recipient.id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return res.status(200).json({
        success: true,
        message: 'تم تعيين الإعلان كمقروء',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error marking announcement as read:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
