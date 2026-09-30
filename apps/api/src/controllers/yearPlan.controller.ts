import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { PlanScopeType as PrismaPlanScopeType } from '@prisma/client';

export function formatCalendarEvent(event: any) {
  if (!event) return event;
  let bibleVerse = null;
  let references = null;
  let overview = event.description;

  if (event.description && typeof event.description === 'string' && event.description.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(event.description);
      bibleVerse = parsed.bibleVerse || null;
      references = parsed.references || null;
      overview = parsed.overview || '';
    } catch {
      // plain text fallback
    }
  }

  return {
    ...event,
    bibleVerse,
    references,
    overview,
  };
}

export class YearPlanController {
  /**
   * POST /api/v1/year-plans (FR-7.1)
   * Creates an official Year Plan scoped by role hierarchy.
   */
  static async createYearPlan(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      // Hierarchy rule: roleLevel >= 3 (امين الخدمة or higher)
      if (user.roleLevel < 3) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ERR_UNAUTHORIZED_PLAN_CREATION',
            message: 'صلاحية تدبير السنة مقتصرة على أمناء الخدمة والمشرفين (Level 3+)',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const {
        title,
        academicYear,
        scopeType = 'STAGE',
        stageId,
        sectorId,
        isPublished = false,
      } = req.body;

      if (!title || !academicYear) {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_VALIDATION', message: 'Title and academicYear are required' },
          timestamp: new Date().toISOString(),
        });
      }

      // Scope validation
      if (scopeType === 'STAGE') {
        if (!stageId) {
          return res.status(400).json({
            success: false,
            error: { code: 'ERR_VALIDATION', message: 'stageId is required for STAGE scope' },
            timestamp: new Date().toISOString(),
          });
        }

        // Level 3 Stage Secretary can author ONLY for assigned stage
        if (user.roleLevel === 3) {
          const hasStage = user.stageIds.includes(stageId);
          if (!hasStage) {
            return res.status(403).json({
              success: false,
              error: {
                code: 'ERR_SCOPE_MISMATCH',
                message: 'لا يمكنك تدبير خطة لمرحلة غير مسندة إليك إدارياً',
              },
              timestamp: new Date().toISOString(),
            });
          }
        }
      } else if (scopeType === 'SECTOR') {
        if (user.roleLevel < 4) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ERR_SCOPE_MISMATCH',
              message: 'تدبير خطط القطاعات مقتصر على أمناء القطاعات والأمين العام',
            },
            timestamp: new Date().toISOString(),
          });
        }
        if (user.roleLevel === 4 && sectorId && !user.sectorIds.includes(sectorId)) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ERR_SCOPE_MISMATCH',
              message: 'لا يمكنك تدبير خطة لقطاع آخر غير مسند إليك',
            },
            timestamp: new Date().toISOString(),
          });
        }
      } else if (scopeType === 'ORGANIZATION') {
        if (user.roleLevel < 5) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ERR_SCOPE_MISMATCH',
              message: 'تدبير الخطة العامة للكنيسة مقتصر على الأمين العام (Level 5)',
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      let orgId = user.organizationId;
      if (!orgId) {
        const org = await prisma.organization.findFirst({ select: { id: true } });
        orgId = org?.id || 'org-1';
      }

      const plan = await prisma.yearPlan.create({
        data: {
          organizationId: orgId,
          title,
          academicYear,
          scopeType: scopeType as PrismaPlanScopeType,
          stageId: stageId || null,
          sectorId: sectorId || null,
          publishedById: user.userId,
          isPublished: isPublished ?? false,
        },
        include: {
          stage: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true } },
          publishedBy: { select: { id: true, fullName: true } },
        },
      });

      return res.status(201).json({
        success: true,
        data: plan,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error creating YearPlan:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/year-plans (FR-7.2)
   * Lists year plans within caller's scope.
   */
  static async listYearPlans(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { academicYear, stageId } = req.query;

      const whereClause: any = {};
      if (academicYear) {
        whereClause.academicYear = String(academicYear);
      }

      // Hierarchy-driven visibility
      if (user.roleLevel < 5) {
        const orConditions: any[] = [
          { scopeType: 'ORGANIZATION', isPublished: true },
        ];

        if (user.sectorIds.length > 0) {
          orConditions.push({
            scopeType: 'SECTOR',
            sectorId: { in: user.sectorIds },
            OR: [{ isPublished: true }, { publishedById: user.userId }],
          });
        }

        if (user.stageIds.length > 0) {
          orConditions.push({
            scopeType: 'STAGE',
            stageId: { in: user.stageIds },
            OR: [{ isPublished: true }, { publishedById: user.userId }],
          });
        }

        whereClause.OR = orConditions;
      }

      if (stageId) {
        whereClause.stageId = String(stageId);
      }

      const plans = await prisma.yearPlan.findMany({
        where: whereClause,
        include: {
          stage: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true } },
          publishedBy: { select: { id: true, fullName: true } },
          _count: {
            select: { events: true, servantPosts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        success: true,
        data: plans,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error listing YearPlans:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/year-plans/:id
   * Details of a year plan, with events and stage-isolated servant posts.
   */
  static async getYearPlanById(req: Request, res: Response) {
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

      const plan = await prisma.yearPlan.findUnique({
        where: { id },
        include: {
          stage: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true } },
          publishedBy: { select: { id: true, fullName: true } },
          events: {
            include: {
              volunteers: {
                include: {
                  user: { select: { id: true, fullName: true, phoneNumber: true } },
                },
              },
            },
            orderBy: { startDate: 'asc' },
          },
        },
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Year plan not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Servant posts strictly isolated by user stage (FR-7.4) with supervisory oversight
      const postWhere: any = { yearPlanId: plan.id };
      if (user.roleLevel < 5) {
        if (user.roleLevel === 4 && user.sectorIds && user.sectorIds.length > 0) {
          postWhere.OR = [
            { stageId: { in: user.stageIds } },
            { stage: { sectorId: { in: user.sectorIds } } },
          ];
        } else {
          postWhere.stageId = { in: user.stageIds };
        }
      }

      const servantPosts = await prisma.yearPlanServantPost.findMany({
        where: postWhere,
        include: {
          author: { select: { id: true, fullName: true } },
          stage: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formattedEvents = (plan.events || []).map(formatCalendarEvent);

      return res.status(200).json({
        success: true,
        data: {
          ...plan,
          events: formattedEvents,
          servantPosts,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error fetching YearPlan:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/v1/year-plans/:id/events
   * Adds an event to a Year Plan.
   */
  static async addEventToPlan(req: Request, res: Response) {
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
          error: { code: 'FORBIDDEN', message: 'إضافة أحداث للخطة السنوية مقتصرة على أمناء الخدمة' },
          timestamp: new Date().toISOString(),
        });
      }

      const { id: yearPlanId } = req.params;
      const plan = await prisma.yearPlan.findUnique({ where: { id: yearPlanId } });

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Year plan not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Verify scope
      if (user.roleLevel === 3 && plan.stageId && !user.stageIds.includes(plan.stageId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'غير مصرح بتعديل خطة مرحلة أخرى' },
          timestamp: new Date().toISOString(),
        });
      }

      const {
        title,
        description,
        category,
        startDate,
        endDate,
        location,
        maxVolunteers,
        bibleVerse,
        references,
        isLessonPlanCreation,
        stageId = plan.stageId,
        sectorId = plan.sectorId,
      } = req.body;

      const resolvedEndDate = endDate || startDate;

      if (!title || !category || !startDate) {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_VALIDATION', message: 'title, category and startDate are required' },
          timestamp: new Date().toISOString(),
        });
      }

      // Business Rule: Servants' Meetings (SERVICE_MEETING & SECRETARIES_COUNCIL) are managed EXCLUSIVELY by General Secretary (الأمين العام)
      const isServantMeeting = category === 'SERVICE_MEETING' || category === 'SECRETARIES_COUNCIL';
      if (isServantMeeting && user.roleLevel < 5 && user.roleCode !== 'GENERAL_SECRETARY') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_GENERAL_SECRETARY_ONLY',
            message: 'عفواً، تدبير وإضافة مواعيد اجتماعات الخدام مقتصرة حصرياً على الأمين العام',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // If created as a curriculum lesson, validate references is provided as required by business rules
      if (category === 'SPIRITUAL_LESSON' && isLessonPlanCreation && !references) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ERR_REFERENCES_REQUIRED',
            message: 'المراجع الكنسية إجبارية عند تدبير درس جديد للمنهج',
          },
          timestamp: new Date().toISOString(),
        });
      }

      let resolvedDescription = description || null;
      if (category === 'SPIRITUAL_LESSON' && (bibleVerse || references)) {
        resolvedDescription = JSON.stringify({
          overview: description || '',
          bibleVerse: bibleVerse || '',
          references: references || '',
        });
      }

      const event = await prisma.calendarEvent.create({
        data: {
          yearPlanId,
          stageId: stageId || null,
          sectorId: sectorId || null,
          title,
          description: resolvedDescription,
          category: category as any,
          startDate: new Date(startDate),
          endDate: new Date(resolvedEndDate),
          location: location || null,
          maxVolunteers: maxVolunteers ? Number(maxVolunteers) : null,
          createdById: user.userId,
        },
        include: {
          stage: { select: { id: true, name: true } },
        },
      });

      return res.status(201).json({
        success: true,
        data: formatCalendarEvent(event),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error adding event to plan:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * PATCH /api/v1/year-plans/:id/events/:eventId
   * Updates an existing event in a Year Plan.
   */
  static async updateEventInPlan(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const targetEventId = req.params.eventId || req.params.id;
      const event = await prisma.calendarEvent.findUnique({
        where: { id: targetEventId },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Event not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const isCurrentMeeting = event.category === 'SERVICE_MEETING' || event.category === 'SECRETARIES_COUNCIL';
      const isTargetMeeting = req.body.category && (req.body.category === 'SERVICE_MEETING' || req.body.category === 'SECRETARIES_COUNCIL');

      // Servants' Meetings (SERVICE_MEETING & SECRETARIES_COUNCIL) are editable EXCLUSIVELY by General Secretary
      if ((isCurrentMeeting || isTargetMeeting) && user.roleLevel < 5 && user.roleCode !== 'GENERAL_SECRETARY') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_GENERAL_SECRETARY_ONLY',
            message: 'عفواً، تعديل مواعيد اجتماعات الخدام مقتصر حصرياً على الأمين العام',
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (user.roleLevel < 3) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'غير مصرح بتعديل الأحداث' },
          timestamp: new Date().toISOString(),
        });
      }

      if (user.roleLevel === 3 && event.stageId && !user.stageIds.includes(event.stageId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'غير مصرح بتعديل حدث لمرحلة أخرى' },
          timestamp: new Date().toISOString(),
        });
      }

      const {
        title,
        description,
        category,
        startDate,
        endDate,
        location,
        maxVolunteers,
        bibleVerse,
        references,
      } = req.body;

      const updatedCategory = category || event.category;
      let resolvedDescription = description !== undefined ? description : event.description;

      if (updatedCategory === 'SPIRITUAL_LESSON' && (bibleVerse || references)) {
        resolvedDescription = JSON.stringify({
          overview: description !== undefined ? description : (formatCalendarEvent(event).overview || ''),
          bibleVerse: bibleVerse || '',
          references: references || '',
        });
      }

      const updatedEvent = await prisma.calendarEvent.update({
        where: { id: targetEventId },
        data: {
          title: title !== undefined ? title : event.title,
          description: resolvedDescription,
          category: updatedCategory as any,
          startDate: startDate ? new Date(startDate) : event.startDate,
          endDate: endDate ? new Date(endDate) : (startDate ? new Date(startDate) : event.endDate),
          location: location !== undefined ? location : event.location,
          maxVolunteers: maxVolunteers !== undefined ? (maxVolunteers ? Number(maxVolunteers) : null) : event.maxVolunteers,
        },
        include: {
          stage: { select: { id: true, name: true } },
        },
      });

      return res.status(200).json({
        success: true,
        data: formatCalendarEvent(updatedEvent),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error updating event:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * DELETE /api/v1/year-plans/:id/events/:eventId
   * Deletes an event from a Year Plan.
   */
  static async deleteEventFromPlan(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const targetEventId = req.params.eventId || req.params.id;
      const event = await prisma.calendarEvent.findUnique({
        where: { id: targetEventId },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Event not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const isMeeting = event.category === 'SERVICE_MEETING' || event.category === 'SECRETARIES_COUNCIL';
      if (isMeeting && user.roleLevel < 5 && user.roleCode !== 'GENERAL_SECRETARY') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_GENERAL_SECRETARY_ONLY',
            message: 'عفواً، حذف مواعيد اجتماعات الخدام مقتصر حصرياً على الأمين العام',
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (user.roleLevel < 3) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'غير مصرح بحذف الأحداث' },
          timestamp: new Date().toISOString(),
        });
      }

      if (user.roleLevel === 3 && event.stageId && !user.stageIds.includes(event.stageId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'غير مصرح بحذف حدث لمرحلة أخرى' },
          timestamp: new Date().toISOString(),
        });
      }

      await prisma.calendarEvent.delete({
        where: { id: targetEventId },
      });

      return res.status(200).json({
        success: true,
        message: 'تم حذف الحدث بنجاح',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error deleting event:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
