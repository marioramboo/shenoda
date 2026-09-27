import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';

const createNoteSchema = z.object({
  targetUserId: z.string().min(1, 'معرف الخادم المستهدف مطلوب'),
  stageId: z.string().min(1, 'المرحلة مطلوبة'),
  content: z.string().min(3, 'محتوى الملاحظة مطلوب'),
});

export class NoteController {
  /**
   * POST /api/v1/notes (FR-8.1)
   * Creates a confidential supervisory note. Restricted to Stage Secretary (Level 3) and above.
   */
  public static async createNote(req: Request, res: Response) {
    const author = req.user!;

    if (author.roleLevel < 3) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_ROLE',
          message: 'كتابة الملاحظات الإشرافية السرية مقتصرة على أمين الخدمة أو أعلى (FR-8.1)',
        },
      });
    }

    const parseResult = createNoteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'بيانات الملاحظة غير صحيحة',
        },
      });
    }

    const { targetUserId, stageId, content } = parseResult.data;

    // Cannot write a note on oneself
    if (author.userId === targetUserId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SELF_NOTE_FORBIDDEN',
          message: 'لا يمكن كتابة ملاحظة إشرافية على نفسك',
        },
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'الخادم المستهدف غير موجود' },
      });
    }

    // Cannot write a note on someone at or above author level
    if (author.roleLevel < 5 && targetUser.role.level >= author.roleLevel) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_CHAIN',
          message: 'لا يمكن كتابة ملاحظات إشرافية إلا على الخدام التابعين لك في السلسلة الإدارية',
        },
      });
    }

    // Verify stage scope
    if (author.roleLevel === 3 && !author.stageIds.includes(stageId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_SCOPE',
          message: 'المرحلة المحددة خارج نطاق إشرافك',
        },
      });
    }

    const note = await prisma.supervisoryNote.create({
      data: {
        targetUserId,
        authorUserId: author.userId,
        stageId,
        content,
      },
      include: {
        authorUser: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'تم تسجيل الملاحظة الإشرافية السرية بنجاح',
      note,
    });
  }

  /**
   * GET /api/v1/notes/:targetUserId (FR-8.2)
   * Upward-only visibility: The target user can NEVER see notes on themselves.
   * Fellow servants cannot view them. Only the author and superiors up the chain can view.
   */
  public static async getNotesForUser(req: Request, res: Response) {
    const caller = req.user!;
    const { targetUserId } = req.params;

    // Rule 1: A servant can NEVER view notes written about themselves
    if (caller.userId === targetUserId) {
      return res.status(200).json({
        success: true,
        notes: [],
      });
    }

    // Rule 2: Fellow servants (Level 1) or assistants (Level 2) cannot inspect notes
    if (caller.roleLevel < 3) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_ROLE',
          message: 'الاطلاع على الملاحظات الإشرافية مقتصر على أمين الخدمة فما فوق (FR-8.2)',
        },
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'المستخدم غير موجود' },
      });
    }

    // Rule 3: Caller cannot view notes on someone higher than caller
    if (caller.roleLevel < targetUser.role.level) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_HIERARCHY',
          message: 'لا تمتلك الصلاحية للاطلاع على ملاحظات رتبة أعلى منك',
        },
      });
    }

    // Fetch notes written by caller or superiors up the chain
    const notes = await prisma.supervisoryNote.findMany({
      where: { targetUserId },
      include: {
        authorUser: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter notes: caller must have roleLevel >= author's role level (or be the author)
    const visibleNotes = notes.filter((n) => {
      if (n.authorUserId === caller.userId) return true;
      const authorLevel = n.authorUser?.role?.level || 3;
      return caller.roleLevel >= authorLevel;
    });

    return res.status(200).json({
      success: true,
      notes: visibleNotes,
    });
  }
}
