import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export class ServantPostController {
  /**
   * POST /api/v1/year-plans/:id/servant-posts (FR-7.4)
   * Servant posts a stage-specific note. Does NOT mutate official ecclesiastical plan.
   */
  static async createPost(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { id: yearPlanId } = req.params;
      const { title, content, stageId } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: { code: 'ERR_VALIDATION', message: 'Title and content are required' },
          timestamp: new Date().toISOString(),
        });
      }

      // Resolve stage: must be assigned to caller
      const targetStageId = stageId || user.stageIds[0];
      if (!targetStageId || !user.stageIds.includes(targetStageId)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ERR_UNAUTHORIZED_STAGE_POST',
            message: 'لا يمكنك نشر تنويه إلا لمرحلتك المسندة إليك فقط',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Verify YearPlan exists
      const plan = await prisma.yearPlan.findUnique({ where: { id: yearPlanId } });
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Year plan not found' },
          timestamp: new Date().toISOString(),
        });
      }

      // Create isolated servant post
      const post = await prisma.yearPlanServantPost.create({
        data: {
          yearPlanId,
          stageId: targetStageId,
          authorId: user.userId,
          title,
          content,
        },
        include: {
          author: { select: { id: true, fullName: true } },
          stage: { select: { id: true, name: true } },
        },
      });

      return res.status(201).json({
        success: true,
        data: post,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error creating servant post:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/year-plans/:id/servant-posts (FR-7.4)
   * Returns servant posts strictly isolated to caller's assigned stage.
   */
  static async listPosts(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { id: yearPlanId } = req.params;

      // Stage Isolation: Servant in Prep Boys only sees Prep Boys posts (with supervisory oversight)
      const postsWhere: any = { yearPlanId };
      if (user.roleLevel < 5) {
        if (user.roleLevel === 4 && user.sectorIds && user.sectorIds.length > 0) {
          postsWhere.OR = [
            { stageId: { in: user.stageIds } },
            { stage: { sectorId: { in: user.sectorIds } } },
          ];
        } else {
          if (!user.stageIds || user.stageIds.length === 0) {
            return res.status(200).json({
              success: true,
              data: [],
              timestamp: new Date().toISOString(),
            });
          }
          postsWhere.stageId = { in: user.stageIds };
        }
      }

      const posts = await prisma.yearPlanServantPost.findMany({
        where: postsWhere,
        include: {
          author: { select: { id: true, fullName: true } },
          stage: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        success: true,
        data: posts,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error listing servant posts:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
