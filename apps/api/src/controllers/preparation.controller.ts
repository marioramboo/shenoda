import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { PrepStatus as PrismaPrepStatus } from '@prisma/client';

export class PreparationController {
  /**
   * POST /api/v1/preparations (FR-5.1)
   * Servants write and submit weekly lesson preparations.
   */
  static async create(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const {
      stageId,
      lessonDate,
      title,
      scriptureRef,
      mainObjective,
      content,
      attachments,
      status,
    } = req.body;

    if (!stageId || !lessonDate || !title || !content) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'stageId, lessonDate, title, and content are required fields',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Verify servant is scoped to this stage (unless sector/general secretary)
    if (user.roleLevel <= 3 && !user.stageIds.includes(stageId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_STAGE_SCOPE',
          message: 'Cannot submit lesson preparation for an unassigned stage',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const parsedDate = new Date(lessonDate);

    const prep = await prisma.lessonPreparation.create({
      data: {
        authorUserId: user.userId,
        stageId,
        lessonDate: parsedDate,
        title,
        scriptureRef: scriptureRef || null,
        mainObjective: mainObjective || null,
        content,
        attachments: attachments || null,
        status: (status as PrismaPrepStatus) || 'SUBMITTED',
      },
      include: {
        stage: { select: { id: true, name: true } },
        author: { select: { id: true, fullName: true } },
      },
    });

    return res.status(201).json({
      success: true,
      data: prep,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/v1/preparations (FR-5.2)
   * Queries preparations with hierarchical scoping.
   */
  static async list(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const stageId = req.query.stageId as string | undefined;
    const scope = (req.query.scope as string) || (user.roleLevel === 1 ? 'mine' : 'stage');
    const status = req.query.status as PrismaPrepStatus | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const whereClause: any = {};

    if (status) whereClause.status = status;

    if (startDate || endDate) {
      whereClause.lessonDate = {};
      if (startDate) whereClause.lessonDate.gte = new Date(startDate);
      if (endDate) whereClause.lessonDate.lte = new Date(endDate);
    }

    // Scope Enforcement (FR-5.2)
    // 1. Level 1 Servant -> only own preparations
    if (user.roleLevel === 1 || scope === 'mine') {
      whereClause.authorUserId = user.userId;
      if (stageId) whereClause.stageId = stageId;
    }
    // 2. Level 2 & 3 (مساعد وأمين الخدمة) -> can review preps in assigned stage(s)
    else if (user.roleLevel >= 2 && user.roleLevel <= 3) {
      if (stageId) {
        if (!user.stageIds.includes(stageId)) {
          return res.status(403).json({
            success: false,
            error: { code: 'STAGE_SCOPE_MISMATCH', message: 'Forbidden' },
            timestamp: new Date().toISOString(),
          });
        }
        whereClause.stageId = stageId;
      } else {
        whereClause.stageId = { in: user.stageIds };
      }
    }
    // 3. Level 4 (امين قطاع) -> preps in sector stages
    else if (user.roleLevel === 4) {
      if (stageId) {
        whereClause.stageId = stageId;
      } else {
        whereClause.stage = { sectorId: { in: user.sectorIds } };
      }
    }
    // 4. Level 5 (امين عام) -> org-wide
    else if (stageId) {
      whereClause.stageId = stageId;
    }

    const preps = await prisma.lessonPreparation.findMany({
      where: whereClause,
      include: {
        author: { select: { id: true, fullName: true } },
        stage: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { lessonDate: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: preps,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/v1/preparations/:id
   * Get single preparation with full detail.
   */
  static async getById(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const prep = await prisma.lessonPreparation.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, fullName: true } },
        stage: { select: { id: true, name: true, sectorId: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!prep) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lesson preparation not found' },
        timestamp: new Date().toISOString(),
      });
    }

    // Permission check:
    // Author can always view
    if (prep.authorUserId === user.userId) {
      return res.status(200).json({ success: true, data: prep });
    }

    // Fellow servants cannot view drafts or other servants' preps unless Level 3+
    if (user.roleLevel < 3) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_SCOPE',
          message: 'Only supervisors can review preparations by other servants',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Level 3 must match stage
    if (user.roleLevel === 3 && !user.stageIds.includes(prep.stageId)) {
      return res.status(403).json({
        success: false,
        error: { code: 'STAGE_SCOPE_MISMATCH', message: 'Forbidden' },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: prep,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * PATCH /api/v1/preparations/:id
   * Author edits prep or supervisor reviews and adds feedback (FR-5.2).
   */
  static async update(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const prep = await prisma.lessonPreparation.findUnique({
      where: { id: req.params.id },
    });

    if (!prep) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lesson preparation not found' },
        timestamp: new Date().toISOString(),
      });
    }

    const isAuthor = prep.authorUserId === user.userId;
    const isSupervisor = user.roleLevel >= 3 && user.stageIds.includes(prep.stageId);

    if (!isAuthor && !isSupervisor && user.roleLevel < 4) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_UPDATE', message: 'Not authorized to update this preparation' },
        timestamp: new Date().toISOString(),
      });
    }

    const dataToUpdate: any = {};

    // Author edits
    if (isAuthor) {
      if (req.body.title !== undefined) dataToUpdate.title = req.body.title;
      if (req.body.scriptureRef !== undefined) dataToUpdate.scriptureRef = req.body.scriptureRef;
      if (req.body.mainObjective !== undefined) dataToUpdate.mainObjective = req.body.mainObjective;
      if (req.body.content !== undefined) dataToUpdate.content = req.body.content;
      if (req.body.attachments !== undefined) dataToUpdate.attachments = req.body.attachments;
      if (req.body.lessonDate !== undefined) dataToUpdate.lessonDate = new Date(req.body.lessonDate);
      if (req.body.status !== undefined) dataToUpdate.status = req.body.status as PrismaPrepStatus;
    }

    // Supervisor reviews
    if (isSupervisor || user.roleLevel >= 4) {
      if (req.body.reviewerNotes !== undefined) dataToUpdate.reviewerNotes = req.body.reviewerNotes;
      if (req.body.status !== undefined) dataToUpdate.status = req.body.status as PrismaPrepStatus;
      dataToUpdate.reviewedById = user.userId;
    }

    const updated = await prisma.lessonPreparation.update({
      where: { id: req.params.id },
      data: dataToUpdate,
      include: {
        author: { select: { id: true, fullName: true } },
        stage: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * DELETE /api/v1/preparations/:id
   */
  static async delete(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const prep = await prisma.lessonPreparation.findUnique({
      where: { id: req.params.id },
    });

    if (!prep) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Preparation not found' },
        timestamp: new Date().toISOString(),
      });
    }

    if (prep.authorUserId !== user.userId && user.roleLevel < 3) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot delete another servant preparation' },
        timestamp: new Date().toISOString(),
      });
    }

    await prisma.lessonPreparation.delete({
      where: { id: req.params.id },
    });

    return res.status(200).json({
      success: true,
      message: 'Lesson preparation deleted successfully',
      timestamp: new Date().toISOString(),
    });
  }
}
