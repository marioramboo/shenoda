import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HashService } from '../services/hash.service';
import { TokenService } from '../services/token.service';
import { UserStatus } from '@prisma/client';
import { getPhoneVariants } from '@shenoda/shared';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0)?1[0125][0-9]{8}$/;

const createAccountSchema = z.object({
  fullName: z.string().min(3, 'الاسم بالكامل يجب ألا يقل عن 3 أحرف'),
  phoneNumber: z
    .string()
    .min(10, 'رقم الهاتف مطلوب')
    .regex(EGYPTIAN_PHONE_REGEX, 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01xxxxxxxxx)'),
  email: z.string().email('بريد إلكتروني غير صالح').optional().nullable(),
  roleId: z.string().min(1, 'معرف الدور مطلوب'),
  stageId: z.string().optional().nullable(),
  sectorId: z.string().optional().nullable(),
  temporaryPassword: z.string().min(8, 'كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف'),
});

const updateStatusSchema = z.object({
  action: z.enum(['SUSPEND', 'ACTIVATE', 'TRANSFER']),
  newStageId: z.string().optional(),
  newSectorId: z.string().optional(),
  reason: z.string().optional(),
});

export class AccountController {
  /**
   * POST /api/v1/accounts/create (FR-1.2, Assumption A7)
   * Scoped account creation strictly enforcing hierarchical authority.
   */
  public static async createAccount(req: Request, res: Response) {
    const creator = req.user;
    if (!creator) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
      });
    }

    const parseResult = createAccountSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'بيانات إنشاء الحساب غير صحيحة',
          details: parseResult.error.format(),
        },
      });
    }

    const {
      fullName,
      phoneNumber,
      email,
      roleId,
      stageId,
      sectorId,
      temporaryPassword,
    } = parseResult.data;

    // 1. Fetch target role
    const targetRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!targetRole) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: 'الدور المطلوب غير موجود في النظام',
        },
      });
    }

    // 2. Validate hierarchical creation authority (Assumption A7)
    // Level 3 (امين الخدمة) -> can create Level 1 (خادم) and Level 2 (مساعد) within own stage
    // Level 4 (امين قطاع)  -> can create Level 3, 2, 1 within stages of own sector
    // Level 5 (امين عام)   -> can create Level 4 or any role org-wide
    const creatorLevel = creator.roleLevel;

    if (creatorLevel < 3) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_SCOPE',
          message: 'ليس لديك الصلاحية لإنشاء حسابات خدام',
        },
      });
    }

    // Cannot create role at or above own level
    if (creatorLevel < 5 && targetRole.level >= creatorLevel) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_ROLE_HIERARCHY',
          message: `لا يمكن إنشاء حساب برتبة مساوية أو أعلى من رتبتك الحالية (${creator.roleCode})`,
        },
      });
    }

    // 3. Validate Scope Assignment bounds
    let assignedSectorId = sectorId || null;
    let assignedStageId = stageId || null;

    if (targetRole.level <= 3) {
      // Stage-level roles require a valid stageId
      if (!assignedStageId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'STAGE_REQUIRED',
            message: 'تحديد المرحلة (stageId) إلزامي لهذا الدور',
          },
        });
      }

      const stage = await prisma.stage.findUnique({
        where: { id: assignedStageId },
      });

      if (!stage) {
        return res.status(404).json({
          success: false,
          error: { code: 'STAGE_NOT_FOUND', message: 'المرحلة المحددة غير موجودة' },
        });
      }

      assignedSectorId = stage.sectorId;

      // Creator scope enforcement
      if (creatorLevel === 3) {
        // Must belong to creator's assigned stage
        if (!creator.stageIds.includes(assignedStageId)) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED_STAGE_MISMATCH',
              message: 'لا يمكنك إنشاء خادم في مرحلة خارج نطاق إشرافك المباشر',
            },
          });
        }
      } else if (creatorLevel === 4) {
        // Stage's sector must belong to creator's sector
        if (!creator.sectorIds.includes(stage.sectorId)) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED_SECTOR_MISMATCH',
              message: 'المرحلة المحددة لا تنتمي للقطاع التابع لك',
            },
          });
        }
      }
    } else if (targetRole.level === 4) {
      // Sector Secretary (Level 4): requires sectorId and creator must be Level 5
      if (creatorLevel < 5) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED_SCOPE',
            message: 'إنشاء أمناء القطاعات مقتصر حصرياً على الأمين العام',
          },
        });
      }

      if (!assignedSectorId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SECTOR_REQUIRED',
            message: 'تحديد القطاع (sectorId) إلزامي لأمين القطاع',
          },
        });
      }
    }

    // 4. Check uniqueness for phone variants and email
    const phoneVariants = getPhoneVariants(phoneNumber);
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: { in: phoneVariants } },
          ...(email ? [{ email: email.toLowerCase() }] : []),
        ],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ERR_USER_EXISTS',
          message: 'رقم الهاتف أو البريد الإلكتروني مسجل مسبقاً في النظام',
        },
      });
    }

    // 5. Hash temporary password
    const passwordHash = await HashService.hashPassword(temporaryPassword);

    // 6. Create User and Scope Assignment in transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organizationId: creator.organizationId,
          roleId: targetRole.id,
          fullName,
          phoneNumber,
          email: email ? email.toLowerCase() : null,
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });

      if (assignedStageId || assignedSectorId) {
        await tx.scopeAssignment.create({
          data: {
            userId: user.id,
            stageId: assignedStageId,
            sectorId: assignedSectorId,
          },
        });
      }

      return user;
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء حساب الخادم وتفعيله بنجاح',
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        phoneNumber: newUser.phoneNumber,
        email: newUser.email,
        role: {
          id: targetRole.id,
          code: targetRole.code,
          name: targetRole.name,
          level: targetRole.level,
        },
        scope: {
          stageId: assignedStageId,
          sectorId: assignedSectorId,
        },
      },
    });
  }

  /**
   * POST /api/v1/accounts/:userId/status (FR-1.4)
   * General Secretary exclusive workflow for Suspend, Activate, and Transfer with immutable audit logging.
   */
  public static async updateStatus(req: Request, res: Response) {
    const operator = req.user;
    if (!operator) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
      });
    }

    // Must be General Secretary (Level 5) per FR-1.4
    if (operator.roleLevel < 5) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_GENERAL_SECRETARY_ONLY',
          message: 'صلاحية نقل وإيقاف الخدام وتغيير حالتهم محصورة حصرياً في رتبة الأمين العام (FR-1.4)',
        },
      });
    }

    const { userId } = req.params;
    const parseResult = updateStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'بيانات تعديل الحالة غير صحيحة',
        },
      });
    }

    const { action, newStageId, newSectorId, reason } = parseResult.data;

    // Fetch target user with current scopes
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        scopeAssignments: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'المستخدم المستهدف غير موجود' },
      });
    }

    const previousStatus = targetUser.status;
    const currentPrimaryScope = targetUser.scopeAssignments[0];
    const previousStageId = currentPrimaryScope?.stageId || null;

    let newStatus = previousStatus;
    let targetStageId: string | null = previousStageId;

    if (action === 'SUSPEND') {
      newStatus = UserStatus.SUSPENDED;
      // Revoke all active refresh tokens immediately to kick the user out of active sessions
      await TokenService.revokeAllUserRefreshTokens(userId);
    } else if (action === 'ACTIVATE') {
      newStatus = UserStatus.ACTIVE;
    } else if (action === 'TRANSFER') {
      if (!newStageId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'STAGE_REQUIRED_FOR_TRANSFER',
            message: 'تحديد المرحلة الجديدة (newStageId) إلزامي لعملية نقل الخادم',
          },
        });
      }

      const targetStage = await prisma.stage.findUnique({
        where: { id: newStageId },
      });

      if (!targetStage) {
        return res.status(404).json({
          success: false,
          error: { code: 'STAGE_NOT_FOUND', message: 'المرحلة الجديدة غير موجودة' },
        });
      }

      targetStageId = targetStage.id;
      newStatus = UserStatus.ACTIVE;
    }

    // Perform updates and audit log inside database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update user status
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { status: newStatus },
      });

      // 2. If transfer, re-link scope assignment
      if (action === 'TRANSFER' && targetStageId) {
        const stage = await tx.stage.findUnique({ where: { id: targetStageId } });
        const sectorId = newSectorId || stage?.sectorId || null;

        // Remove old stage scope assignments
        await tx.scopeAssignment.deleteMany({
          where: { userId },
        });

        // Insert new scope assignment
        await tx.scopeAssignment.create({
          data: {
            userId,
            stageId: targetStageId,
            sectorId,
          },
        });
      }

      // 3. Write immutable audit log (AccountStatusLog)
      const auditLog = await tx.accountStatusLog.create({
        data: {
          targetUserId: userId,
          changedById: operator.userId,
          previousStatus,
          newStatus,
          previousStage: previousStageId,
          newStage: action === 'TRANSFER' ? targetStageId : null,
          reason: reason || null,
        },
      });

      return { updatedUser, auditLog };
    });

    return res.status(200).json({
      success: true,
      message: `تم تنفيذ عملية (${action}) للحساب بنجاح`,
      user: {
        id: result.updatedUser.id,
        fullName: result.updatedUser.fullName,
        status: result.updatedUser.status,
      },
      auditLog: result.auditLog,
    });
  }

  /**
   * GET /api/v1/accounts/:userId/history
   * Audit log history for a servant's status changes and transfers.
   */
  public static async getAccountHistory(req: Request, res: Response) {
    const { userId } = req.params;

    const logs = await prisma.accountStatusLog.findMany({
      where: { targetUserId: userId },
      include: {
        changedBy: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      logs,
    });
  }
}
