import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { VolunteerService } from '../services/volunteer.service';
import { EventAttendanceSyncService } from '../services/eventAttendanceSync.service';
import { EventCategory as PrismaEventCategory } from '@prisma/client';
import { formatCalendarEvent } from './yearPlan.controller';

export class CalendarController {
  /**
   * GET /api/v1/calendar (FR-12.1)
   * Retrieves calendar events filtered by date range, stage, and category.
   */
  static async getCalendarEvents(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { startDate, endDate, stageId, category } = req.query;

      const whereClause: any = {};

      // Date filtering
      if (startDate || endDate) {
        whereClause.startDate = {};
        if (startDate) {
          whereClause.startDate.gte = new Date(String(startDate));
        }
        if (endDate) {
          whereClause.startDate.lte = new Date(String(endDate));
        }
      }

      // Category filter & Secretary Council firewall (level >= 3 only)
      if (user.roleLevel < 3) {
        if (category === 'SECRETARIES_COUNCIL') {
          return res.status(200).json({
            success: true,
            data: [],
            timestamp: new Date().toISOString(),
          });
        }
        whereClause.category = category ? (category as PrismaEventCategory) : { not: 'SECRETARIES_COUNCIL' };
      } else if (category) {
        whereClause.category = category as PrismaEventCategory;
      }

      // Scope-driven filtering:
      // An event is visible if:
      // 1. It is church-wide (stageId === null && sectorId === null)
      // 2. OR matches caller's stageIds
      // 3. OR matches caller's sectorIds
      // 4. OR the caller is registered as volunteer for it
      // 5. If caller is General Secretary (Level 5), can view all
      if (user.roleLevel < 5) {
        const orConditions: any[] = [
          { stageId: null, sectorId: null }, // Church-wide
        ];

        if (user.stageIds.length > 0) {
          orConditions.push({ stageId: { in: user.stageIds } });
        }

        if (user.sectorIds.length > 0) {
          orConditions.push({ sectorId: { in: user.sectorIds } });
        }

        orConditions.push({
          volunteers: { some: { userId: user.userId } },
        });

        whereClause.OR = orConditions;
      }

      // If specific stageId is explicitly requested and caller has access
      if (stageId) {
        whereClause.stageId = String(stageId);
      }

      const events = await prisma.calendarEvent.findMany({
        where: whereClause,
        include: {
          stage: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true } },
          volunteers: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phoneNumber: true,
                  role: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
          eventAttendances: {
            select: { id: true, userId: true, confirmedAt: true },
          },
        },
        orderBy: { startDate: 'asc' },
      });

      const visibleEvents = user.roleLevel < 3
        ? events.filter((e) => e.category !== 'SECRETARIES_COUNCIL')
        : events;

      return res.status(200).json({
        success: true,
        data: visibleEvents.map(formatCalendarEvent),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error fetching calendar events:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/events/:id
   */
  static async getEventById(req: Request, res: Response) {
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
      const event = await prisma.calendarEvent.findUnique({
        where: { id },
        include: {
          stage: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
          volunteers: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phoneNumber: true,
                  role: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
          eventAttendances: {
            include: {
              user: { select: { id: true, fullName: true } },
              confirmedBy: { select: { id: true, fullName: true } },
            },
          },
        },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Event not found' },
          timestamp: new Date().toISOString(),
        });
      }

      if (event.category === 'SECRETARIES_COUNCIL' && user.roleLevel < 3) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'عفواً، تفاصيل اجتماع الأمناء مقتصرة حصرياً على أمناء الخدمة فما فوق' },
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(200).json({
        success: true,
        data: formatCalendarEvent(event),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error fetching event detail:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/events/:id/volunteer (FR-7.2)
   * Servant opts in to volunteer for a calendar event.
   */
  static async volunteerForEvent(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { id: eventId } = req.params;
      const { roleInEvent } = req.body;

      const volunteer = await VolunteerService.optIn(eventId, user.userId, roleInEvent);

      return res.status(201).json({
        success: true,
        data: volunteer,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err.code === 'ERR_VOLUNTEER_CAPACITY_REACHED') {
        return res.status(409).json({
          success: false,
          error: { code: err.code, message: err.message },
          timestamp: new Date().toISOString(),
        });
      }
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: err.message },
          timestamp: new Date().toISOString(),
        });
      }

      console.error('Error volunteering for event:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * DELETE /api/v1/events/:id/volunteer (FR-7.2)
   * Servant withdraws their volunteer commitment.
   */
  static async withdrawVolunteer(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { id: eventId } = req.params;
      await VolunteerService.withdraw(eventId, user.userId);

      return res.status(200).json({
        success: true,
        message: 'تم إلغاء التطوع بنجاح',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: err.message },
          timestamp: new Date().toISOString(),
        });
      }

      console.error('Error withdrawing volunteer:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/events/:id/confirm-attendance (FR-12.2)
   * Secretary confirms servant attendance on a calendar event and bridges directly into ServantAttendance.
   */
  static async confirmAttendance(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      // Check secretary authority: roleLevel >= 2
      if (user.roleLevel < 2) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'تأكيد الحضور مقتصر على مساعدي وأمناء الخدمة (Level 2+)',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { id: eventId } = req.params;
      const { servantUserId, servantUserIds } = req.body;

      const userIdsToConfirm: string[] = [];
      if (servantUserId) userIdsToConfirm.push(servantUserId);
      if (Array.isArray(servantUserIds)) userIdsToConfirm.push(...servantUserIds);

      if (userIdsToConfirm.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ERR_VALIDATION',
            message: 'servantUserId or servantUserIds array is required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const results = [];
      for (const sId of userIdsToConfirm) {
        const resObj = await EventAttendanceSyncService.confirmServantAttendance(
          eventId,
          sId,
          user.userId
        );
        results.push(resObj);
      }

      return res.status(200).json({
        success: true,
        message: `تم تأكيد الحضور لـ ${results.length} خادم وتسجيله في جدول المتابعة بنجاح`,
        data: results,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error confirming event attendance:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/events/:id/enroll-all
   * Enrolls all active servants in the stage to attend this event.
   */
  static async enrollAllServants(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      if (user.roleLevel < 3) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'صلاحية إلزام الخدام بالحضور مقتصرة على أمناء الخدمة والمشرفين',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { id: eventId } = req.params;
      const event = await prisma.calendarEvent.findUnique({
        where: { id: eventId },
        include: { yearPlan: true },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Event not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const stageId = event.stageId || event.yearPlan?.stageId || (user.stageIds && user.stageIds[0]);
      if (!stageId) {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_STAGE_REQUIRED', message: 'المرحلة غير محددة لهذه الفعالية' },
          timestamp: new Date().toISOString(),
        });
      }

      const stageAssignments = await prisma.scopeAssignment.findMany({
        where: { stageId },
        include: { user: true },
      });

      let enrolledCount = 0;
      for (const sa of stageAssignments) {
        if (sa.user && sa.user.status === 'ACTIVE') {
          await prisma.eventVolunteer.upsert({
            where: {
              eventId_userId: {
                eventId: event.id,
                userId: sa.user.id,
              },
            },
            create: {
              eventId: event.id,
              userId: sa.user.id,
              roleInEvent: 'حضور إلزامي لجميع الخدام',
            },
            update: {
              roleInEvent: 'حضور إلزامي لجميع الخدام',
            },
          });
          enrolledCount++;
        }
      }

      // Also ensure requiresAllServants is marked in description
      let currentDesc = event.description || '';
      let descObj: any = { overview: currentDesc };
      if (currentDesc.trim().startsWith('{')) {
        try {
          descObj = JSON.parse(currentDesc);
        } catch {}
      }
      descObj.requiresAllServants = true;
      await prisma.calendarEvent.update({
        where: { id: event.id },
        data: { description: JSON.stringify(descObj) },
      });

      // Return updated event
      const updatedEvent = await prisma.calendarEvent.findUnique({
        where: { id: event.id },
        include: {
          stage: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true } },
          volunteers: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phoneNumber: true,
                  role: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: `تم إلزام وتسجيل جميع خدام المرحلة (${enrolledCount} خادم) بالحضور بنجاح`,
        data: {
          enrolledCount,
          event: formatCalendarEvent(updatedEvent),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error enrolling all servants:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
