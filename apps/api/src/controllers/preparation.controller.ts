import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { PrepStatus as PrismaPrepStatus } from '@prisma/client';

export function formatPreparation(prep: any) {
  if (!prep) return prep;
  let visualAid = null;
  let extraReferences = null;
  let elements = null;
  let servantReflection = null;
  let eventId = null;
  let submittedAt = prep.createdAt;

  if (prep.attachments && typeof prep.attachments === 'object' && !Array.isArray(prep.attachments)) {
    visualAid = (prep.attachments as any).visualAid || null;
    extraReferences = (prep.attachments as any).extraReferences || null;
    elements = (prep.attachments as any).elements || null;
    servantReflection = (prep.attachments as any).servantReflection || null;
    eventId = (prep.attachments as any).eventId || null;
    if ((prep.attachments as any).submittedAt) {
      submittedAt = (prep.attachments as any).submittedAt;
    }
  }

  const reviewedByName = prep.reviewedBy?.fullName || null;
  const reviewedByRole = prep.reviewedBy?.role?.name || null;
  const reviewedByLevel = prep.reviewedBy?.role?.level || null;
  const authorRole = prep.author?.role?.name || null;
  const authorLevel = prep.author?.role?.level || 1;

  return {
    ...prep,
    visualAid,
    extraReferences,
    elements,
    servantReflection,
    eventId,
    submittedAt,
    reviewedByName,
    reviewedByRole,
    reviewedByLevel,
    authorRole,
    authorLevel,
  };
}

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

    let {
      stageId,
      lessonDate,
      title,
      scriptureRef,
      mainObjective,
      content,
      attachments,
      status,
      eventId,
      visualAid,
      extraReferences,
      elements,
      servantReflection,
    } = req.body;

    // If linked to a plan lesson event, auto-resolve lesson properties from the event
    if (eventId) {
      const event = await prisma.calendarEvent.findUnique({
        where: { id: eventId },
      });
      if (event) {
        if (!stageId) stageId = event.stageId || (user.stageIds && user.stageIds[0]);
        if (!lessonDate) lessonDate = event.startDate;
        if (!title) title = event.title;
        if (!scriptureRef && event.description && event.description.startsWith('{')) {
          try {
            const parsed = JSON.parse(event.description);
            if (parsed.bibleVerse) scriptureRef = parsed.bibleVerse;
          } catch {}
        }
      }

      // Validate required preparation fields per business rules
      if (!mainObjective || !mainObjective.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'الهدف إجباري في التحضير' },
          timestamp: new Date().toISOString(),
        });
      }
      if (!visualAid || !visualAid.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'وسيلة الإيضاح إجبارية في التحضير' },
          timestamp: new Date().toISOString(),
        });
      }
      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'المقدمة والدرس والتدريب الروحي خانة إجبارية' },
          timestamp: new Date().toISOString(),
        });
      }
    }

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

    // Package structured fields into attachments
    const structuredAttachments = {
      ...(typeof attachments === 'object' && attachments !== null ? attachments : {}),
      eventId: eventId || null,
      visualAid: visualAid ? visualAid.trim() : null,
      extraReferences: extraReferences ? extraReferences.trim() : null,
      elements: elements ? String(elements).trim() : null,
      servantReflection: servantReflection ? servantReflection.trim() : null,
      submittedAt: new Date().toISOString(),
    };

    const prep = await prisma.lessonPreparation.create({
      data: {
        authorUserId: user.userId,
        stageId,
        lessonDate: parsedDate,
        title,
        scriptureRef: scriptureRef || null,
        mainObjective: mainObjective ? mainObjective.trim() : null,
        content: content.trim(),
        attachments: structuredAttachments,
        status: (status as PrismaPrepStatus) || 'SUBMITTED',
      },
      include: {
        stage: { select: { id: true, name: true } },
        author: { select: { id: true, fullName: true, role: { select: { id: true, name: true, level: true, code: true } } } },
      },
    });

    return res.status(201).json({
      success: true,
      data: formatPreparation(prep),
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
    // 3. Level 4 (امين قطاع) -> preps in sector stages only
    else if (user.roleLevel === 4) {
      whereClause.stage = { sectorId: { in: user.sectorIds } };
      if (stageId) {
        whereClause.stageId = stageId;
      }
    }
    // 4. Level 5 (امين عام) -> org-wide
    else if (stageId) {
      whereClause.stageId = stageId;
    }

    const preps = await prisma.lessonPreparation.findMany({
      where: whereClause,
      include: {
        author: { select: { id: true, fullName: true, role: { select: { id: true, name: true, level: true, code: true } } } },
        stage: { select: { id: true, name: true, sectorId: true } },
        reviewedBy: { select: { id: true, fullName: true, role: { select: { id: true, name: true, level: true, code: true } } } },
      },
      orderBy: { lessonDate: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: preps.map(formatPreparation),
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
        author: { select: { id: true, fullName: true, role: { select: { id: true, name: true, level: true, code: true } } } },
        stage: { select: { id: true, name: true, sectorId: true } },
        reviewedBy: { select: { id: true, fullName: true, role: { select: { id: true, name: true, level: true, code: true } } } },
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
      return res.status(200).json({ success: true, data: formatPreparation(prep) });
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

    // Level 4 must match sector
    if (user.roleLevel === 4 && prep.stage?.sectorId && !user.sectorIds.includes(prep.stage.sectorId)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_SECTOR_SCOPE', message: 'لا يمكنك الاطلاع على تحضيرات خارج نطاق قطاعك' },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: formatPreparation(prep),
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
      include: {
        stage: { select: { id: true, name: true, sectorId: true } },
        author: { select: { id: true, fullName: true, role: { select: { id: true, name: true, level: true, code: true } } } },
        reviewedBy: { select: { id: true, fullName: true, role: { select: { id: true, name: true, level: true, code: true } } } },
      },
    });

    if (!prep) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lesson preparation not found' },
        timestamp: new Date().toISOString(),
      });
    }

    const isAuthor = prep.authorUserId === user.userId;
    const isStageSupervisor = user.roleLevel === 3 && user.stageIds.includes(prep.stageId);
    const isSectorSupervisor = user.roleLevel === 4 && (!prep.stage?.sectorId || user.sectorIds.includes(prep.stage.sectorId));
    const isGeneralSupervisor = user.roleLevel >= 5;
    const isSupervisor = isStageSupervisor || isSectorSupervisor || isGeneralSupervisor;

    // Sector scope constraint for Sector Secretary (Level 4)
    if (user.roleLevel === 4 && prep.stage?.sectorId && !user.sectorIds.includes(prep.stage.sectorId)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_SECTOR_SCOPE', message: 'لا يمكنك مراجعة أو اعتماد تحضيرات خارج نطاق قطاعك' },
        timestamp: new Date().toISOString(),
      });
    }

    // Must be either author or authorized supervisor
    if (!isAuthor && !isSupervisor) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_UPDATE', message: 'Not authorized to update this preparation' },
        timestamp: new Date().toISOString(),
      });
    }

    const isReviewAction = req.body.status !== undefined || req.body.reviewerNotes !== undefined;

    // Rule 1: Self-Approval Prohibition (User Spec)
    // "بس أمين الخدمة ميقدرش يوافق على التحضير بتاعه"
    if (isAuthor && isReviewAction) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ERR_CANNOT_SELF_REVIEW',
          message: 'لا يمكنك مراجعة أو اعتماد تحضيرك الخاص؛ يجب اعتماده بواسطة أمين القطاع',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Rule 2: Irrevocable Override Ban (User Spec)
    // "لو أمين القطاع رفض او وافق على حاجة مينفعش أمين الخدمة يعدل عليه"
    const wasReviewedBySectorOrHigher = Boolean(
      prep.reviewedBy?.role?.level && prep.reviewedBy.role.level >= 4
    );
    if (user.roleLevel < 4 && wasReviewedBySectorOrHigher && isReviewAction) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ERR_SUPERVISOR_OVERRIDE_PROHIBITED',
          message: 'تمت مراجعة هذا التحضير واعتماده بواسطة أمين القطاع؛ لا يحق لأمين الخدمة تعديل هذا القرار',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const dataToUpdate: any = {};

    // Author edits content
    if (isAuthor) {
      if (req.body.title !== undefined) dataToUpdate.title = req.body.title;
      if (req.body.scriptureRef !== undefined) dataToUpdate.scriptureRef = req.body.scriptureRef;
      if (req.body.mainObjective !== undefined) dataToUpdate.mainObjective = req.body.mainObjective;
      if (req.body.content !== undefined) dataToUpdate.content = req.body.content;
      if (req.body.lessonDate !== undefined) dataToUpdate.lessonDate = new Date(req.body.lessonDate);

      const existingAttachments =
        typeof prep.attachments === 'object' && prep.attachments !== null ? (prep.attachments as any) : {};
      const hasStructuredFields =
        req.body.visualAid !== undefined ||
        req.body.extraReferences !== undefined ||
        req.body.elements !== undefined ||
        req.body.servantReflection !== undefined ||
        req.body.attachments !== undefined;

      if (hasStructuredFields) {
        const incomingAttachments =
          typeof req.body.attachments === 'object' && req.body.attachments !== null ? req.body.attachments : {};
        dataToUpdate.attachments = {
          ...existingAttachments,
          ...incomingAttachments,
          ...(req.body.visualAid !== undefined ? { visualAid: req.body.visualAid ? req.body.visualAid.trim() : null } : {}),
          ...(req.body.extraReferences !== undefined ? { extraReferences: req.body.extraReferences ? req.body.extraReferences.trim() : null } : {}),
          ...(req.body.elements !== undefined ? { elements: req.body.elements ? String(req.body.elements).trim() : null } : {}),
          ...(req.body.servantReflection !== undefined ? { servantReflection: req.body.servantReflection ? req.body.servantReflection.trim() : null } : {}),
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // Supervisor reviews
    if (isSupervisor && !isAuthor) {
      if (req.body.reviewerNotes !== undefined) dataToUpdate.reviewerNotes = req.body.reviewerNotes;
      if (req.body.status !== undefined) dataToUpdate.status = req.body.status as PrismaPrepStatus;
      dataToUpdate.reviewedById = user.userId;
    }

    const updated = await prisma.lessonPreparation.update({
      where: { id: req.params.id },
      data: dataToUpdate,
      include: {
        author: { select: { id: true, fullName: true, role: { select: { id: true, name: true, level: true, code: true } } } },
        stage: { select: { id: true, name: true, sectorId: true } },
        reviewedBy: { select: { id: true, fullName: true, role: { select: { id: true, name: true, level: true, code: true } } } },
      },
    });

    return res.status(200).json({
      success: true,
      data: formatPreparation(updated),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/v1/preparations/lesson-inspection/:eventId
   * Stage Secretary inspects who among stage servants prepared and who did not (FR-5.1, FR-5.2)
   */
  static async getLessonInspection(req: Request, res: Response) {
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
            message: 'صلاحية متابعة تحضيرات الخدام محصورة في أمين الخدمة فما فوق',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { eventId } = req.params;
      const event = await prisma.calendarEvent.findUnique({
        where: { id: eventId },
        include: { stage: { select: { id: true, name: true } } },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Lesson event not found' },
          timestamp: new Date().toISOString(),
        });
      }

      const stageId = event.stageId || (user.stageIds && user.stageIds[0]);

      // Retrieve all stage servants
      const scopeAssignments = await prisma.scopeAssignment.findMany({
        where: stageId ? { stageId } : {},
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true,
              status: true,
              role: { select: { level: true, name: true, code: true } },
            },
          },
        },
      });

      const userMap = new Map<string, any>();
      for (const sa of scopeAssignments) {
        if (sa.user && sa.user.status === 'ACTIVE' && !userMap.has(sa.user.id)) {
          // Servants (level 1, 2, and 3: خادم، مساعد أمين، أمين خدمة) are all required to prepare!
          if (!sa.user.role || sa.user.role.level <= 3) {
            userMap.set(sa.user.id, sa.user);
          }
        }
      }

      if (userMap.size === 0) {
        for (const sa of scopeAssignments) {
          if (sa.user && sa.user.status === 'ACTIVE' && !userMap.has(sa.user.id)) {
            userMap.set(sa.user.id, sa.user);
          }
        }
      }

      const allServants = Array.from(userMap.values());

      // Retrieve all preparations for this stage
      const stagePreps = await prisma.lessonPreparation.findMany({
        where: {
          stageId,
        },
        include: {
          author: { select: { id: true, fullName: true, phoneNumber: true, role: { select: { id: true, name: true, level: true, code: true } } } },
          stage: { select: { id: true, name: true, sectorId: true } },
          reviewedBy: { select: { id: true, fullName: true, role: { select: { id: true, name: true, level: true, code: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Filter preparations matching this event
      const matchingPreps = stagePreps.filter((p) => {
        const pEventId =
          p.attachments && typeof p.attachments === 'object' && !Array.isArray(p.attachments)
            ? (p.attachments as any).eventId
            : null;
        if (pEventId && pEventId === event.id) return true;
        if (p.title && event.title && p.title.trim().toLowerCase() === event.title.trim().toLowerCase()) {
          return true;
        }
        return false;
      });

      const prepByAuthor = new Map<string, any>();
      for (const p of matchingPreps) {
        if (!prepByAuthor.has(p.authorUserId)) {
          prepByAuthor.set(p.authorUserId, formatPreparation(p));
        }
      }

      const preparedServants: any[] = [];
      const unpreparedServants: any[] = [];

      for (const s of allServants) {
        const prep = prepByAuthor.get(s.id);
        if (prep) {
          preparedServants.push({
            servant: {
              id: s.id,
              fullName: s.fullName,
              phoneNumber: s.phoneNumber,
              email: s.email,
              role: s.role?.name || (s.role?.level === 3 ? 'أمين خدمة' : s.role?.level === 2 ? 'مساعد أمين' : 'خادم'),
            },
            preparation: prep,
          });
        } else {
          unpreparedServants.push({
            id: s.id,
            fullName: s.fullName,
            phoneNumber: s.phoneNumber,
            email: s.email,
            role: s.role?.name || (s.role?.level === 3 ? 'أمين خدمة' : s.role?.level === 2 ? 'مساعد أمين' : 'خادم'),
          });
        }
      }

      // Check if any outside servants prepared
      for (const [authorId, prep] of prepByAuthor.entries()) {
        if (!allServants.some((s) => s.id === authorId)) {
          preparedServants.push({
            servant: {
              id: authorId,
              fullName: prep.author?.fullName || 'خادم',
              phoneNumber: prep.author?.phoneNumber || null,
              email: null,
              role: prep.authorRole || 'خادم',
            },
            preparation: prep,
          });
        }
      }

      const callerPreparation = prepByAuthor.get(user.userId) || null;

      // Extract bibleVerse and references from event description
      let bibleVerse = null;
      let references = null;
      let overview = event.description;
      if (event.description && event.description.startsWith('{')) {
        try {
          const parsed = JSON.parse(event.description);
          bibleVerse = parsed.bibleVerse || null;
          references = parsed.references || null;
          overview = parsed.overview || '';
        } catch {}
      }

      return res.status(200).json({
        success: true,
        data: {
          lesson: {
            id: event.id,
            title: event.title,
            startDate: event.startDate,
            endDate: event.endDate,
            category: event.category,
            stageId: event.stageId,
            stageName: event.stage?.name || 'المرحلة',
            bibleVerse,
            references,
            overview,
          },
          summary: {
            totalServants: preparedServants.length + unpreparedServants.length,
            preparedCount: preparedServants.length,
            unpreparedCount: unpreparedServants.length,
            preparationRate:
              preparedServants.length + unpreparedServants.length > 0
                ? Math.round(
                    (preparedServants.length / (preparedServants.length + unpreparedServants.length)) * 100
                  )
                : 0,
          },
          preparedServants,
          unpreparedServants,
          callerPreparation,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error in getLessonInspection:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
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
