import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { PlanScopeType as PrismaPlanScopeType } from '@prisma/client';

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

      const plan = await prisma.yearPlan.create({
        data: {
          organizationId: user.organizationId || 'org-1',
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

      // Servant posts strictly isolated by user stage (FR-7.4)
      const servantPosts = await prisma.yearPlanServantPost.findMany({
        where: {
          yearPlanId: plan.id,
          stageId: { in: user.stageIds },
        },
        include: {
          author: { select: { id: true, fullName: true } },
          stage: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        success: true,
        data: {
          ...plan,
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
        stageId = plan.stageId,
        sectorId = plan.sectorId,
      } = req.body;

      if (!title || !category || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_VALIDATION', message: 'title, category, startDate and endDate are required' },
          timestamp: new Date().toISOString(),
        });
      }

      const event = await prisma.calendarEvent.create({
        data: {
          yearPlanId,
          stageId: stageId || null,
          sectorId: sectorId || null,
          title,
          description: description || null,
          category: category as any,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
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
        data: event,
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
}
