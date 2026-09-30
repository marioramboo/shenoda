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

const updateAccountSchema = z.object({
  fullName: z.string().min(3, 'الاسم بالكامل يجب ألا يقل عن 3 أحرف').optional(),
  phoneNumber: z
    .string()
    .min(10, 'رقم الهاتف مطلوب')
    .regex(EGYPTIAN_PHONE_REGEX, 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01xxxxxxxxx)')
    .optional(),
  email: z.string().email('بريد إلكتروني غير صالح').optional().nullable(),
  roleId: z.string().optional(),
  roleCode: z.string().optional(),
  temporaryPassword: z.string().min(8, 'كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف').optional(),

  // Non-evaluative servant profile fields
  fatherConfessor: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  spouseName: z.string().optional().nullable(),
  educationOrCareer: z.string().optional().nullable(),
  childrenInfo: z.any().optional().nullable(),

  // Evaluative fields (added by Stage Secretary / Supervisor)
  financialStatus: z.string().optional().nullable(),
  behaviorWithMembers: z.string().optional().nullable(),
  behaviorWithServants: z.string().optional().nullable(),
  cooperation: z.string().optional().nullable(),
  individualInitiative: z.string().optional().nullable(),
  evaluationNotes: z.string().optional().nullable(),
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
    // Adding/creating a new servant is strictly restricted to General Secretary (الامين العام - Level 5)
    const creatorLevel = creator.roleLevel;

    if (creatorLevel < 5) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_MIN_LEVEL',
          message: 'إنشاء وإضافة خادم جديد مقتصر حصرياً على الأمين العام',
        },
      });
    }

    // Cannot create role at or above Level 5
    if (targetRole.level >= 5) {
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

  /**
   * PATCH /api/v1/accounts/:userId
   * Scoped account editing (FR-1.2, MANAGE_SERVANT_ACCOUNTS).
   * Level 3 (أمين الخدمة): can edit servants (Level 1 & 2) in their assigned stage.
   * Level 4 (أمين قطاع): can edit servants (Level 1, 2 & 3) in their sector.
   * Level 5 (الأمين العام): can edit any servant in the organization.
   */
  public static async updateAccount(req: Request, res: Response) {
    const operator = req.user;
    if (!operator) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
      });
    }

    if (operator.roleLevel < 3) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_SCOPE',
          message: 'ليس لديك الصلاحية لتعديل بيانات الخدام',
        },
      });
    }

    const { userId } = req.params;
    const parseResult = updateAccountSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'بيانات تعديل الحساب غير صحيحة',
          details: parseResult.error.format(),
        },
      });
    }

    const {
      fullName,
      phoneNumber,
      email,
      roleId,
      roleCode,
      temporaryPassword,
      fatherConfessor,
      dateOfBirth,
      address,
      maritalStatus,
      spouseName,
      educationOrCareer,
      childrenInfo,
      financialStatus,
      behaviorWithMembers,
      behaviorWithServants,
      cooperation,
      individualInitiative,
      evaluationNotes,
    } = parseResult.data;

    // 1. Fetch target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        scopeAssignments: {
          include: { stage: true, sector: true },
        },
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'حساب الخادم غير موجود',
        },
      });
    }

    // 2. Validate hierarchical authority
    const targetLevel = targetUser.role?.level || 1;

    // Operator cannot edit peers or superiors unless General Secretary (Level 5)
    if (operator.roleLevel < 5 && targetLevel >= operator.roleLevel) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_HIERARCHY',
          message: 'لا يمكنك تعديل بيانات رتبة مساوية أو أعلى من رتبتك',
        },
      });
    }

    // Scope verification
    const targetStageIds = (targetUser.scopeAssignments || []).map((sa: any) => sa.stageId).filter(Boolean) as string[];
    const targetSectorIds = (targetUser.scopeAssignments || []).map((sa: any) => sa.sectorId).filter(Boolean) as string[];

    if (operator.roleLevel === 3) {
      // Stage Secretary can ONLY edit servants within their assigned stage
      const hasOverlap = (operator.stageIds || []).some((stId: string) => targetStageIds.includes(stId));
      if (!hasOverlap) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_STAGE_SCOPE',
            message: 'لا يمكنك تعديل بيانات خادم خارج مرحلتك المسندة إليك',
          },
        });
      }
    } else if (operator.roleLevel === 4) {
      // Sector Secretary can edit within their sector
      const hasSectorOverlap =
        (operator.sectorIds || []).some((secId: string) => targetSectorIds.includes(secId)) ||
        (targetUser.scopeAssignments || []).some((sa: any) => sa.stage && (operator.sectorIds || []).includes(sa.stage.sectorId));
      if (!hasSectorOverlap) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_SECTOR_SCOPE',
            message: 'لا يمكنك تعديل بيانات خادم خارج قطاعك',
          },
        });
      }
    }

    // 3. If changing role
    let newRoleId = targetUser.roleId;
    if (roleId || roleCode) {
      const foundRole = await prisma.role.findFirst({
        where: roleId ? { id: roleId } : { code: roleCode },
      });

      if (!foundRole) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ROLE_NOT_FOUND',
            message: 'الرتبة الجديدة غير موجودة في النظام',
          },
        });
      }

      // Cannot assign role at or above operator's own level
      if (operator.roleLevel < 5 && foundRole.level >= operator.roleLevel) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_ROLE_ASSIGNMENT',
            message: 'لا يمكنك ترقية الخادم لرتبة مساوية أو أعلى من رتبتك',
          },
        });
      }

      newRoleId = foundRole.id;
    }

    // 4. Check phone collision if phone is updated
    if (phoneNumber && phoneNumber !== targetUser.phoneNumber) {
      const phoneVariants = getPhoneVariants(phoneNumber);
      const existingPhone = await prisma.user.findFirst({
        where: {
          id: { not: targetUser.id },
          phoneNumber: { in: phoneVariants },
        },
      });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'ERR_PHONE_EXISTS',
            message: 'رقم الهاتف مسجل بالفعل لخادم آخر في النظام',
          },
        });
      }
    }

    // Check email collision if email is updated
    if (email && email.toLowerCase() !== targetUser.email?.toLowerCase()) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          id: { not: targetUser.id },
          email: email.toLowerCase(),
        },
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'ERR_EMAIL_EXISTS',
            message: 'البريد الإلكتروني مسجل بالفعل لخادم آخر في النظام',
          },
        });
      }
    }

    // 5. Prepare update data
    const updateData: any = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (phoneNumber) updateData.phoneNumber = phoneNumber.trim();
    if (email !== undefined) updateData.email = email ? email.trim().toLowerCase() : null;
    if (newRoleId && newRoleId !== targetUser.roleId) updateData.roleId = newRoleId;
    if (temporaryPassword) {
      updateData.passwordHash = await HashService.hashPassword(temporaryPassword);
    }
    if (fatherConfessor !== undefined) updateData.fatherConfessor = fatherConfessor ? fatherConfessor.trim() : null;
    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }
    if (address !== undefined) updateData.address = address ? address.trim() : null;
    if (maritalStatus !== undefined) updateData.maritalStatus = maritalStatus ? maritalStatus.trim() : null;
    if (spouseName !== undefined) updateData.spouseName = spouseName ? spouseName.trim() : null;
    if (educationOrCareer !== undefined) updateData.educationOrCareer = educationOrCareer ? educationOrCareer.trim() : null;
    if (childrenInfo !== undefined) updateData.childrenInfo = childrenInfo;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        role: true,
        scopeAssignments: {
          include: { stage: true, sector: true },
        },
      },
    });

    // 6. Upsert supervisor evaluation if any evaluative field is provided
    let updatedEvaluation: any = null;
    const hasEvaluativeUpdate =
      financialStatus !== undefined ||
      behaviorWithMembers !== undefined ||
      behaviorWithServants !== undefined ||
      cooperation !== undefined ||
      individualInitiative !== undefined ||
      evaluationNotes !== undefined;

    if (hasEvaluativeUpdate) {
      updatedEvaluation = await prisma.servantEvaluation.upsert({
        where: { subjectUserId: userId },
        create: {
          subjectUserId: userId,
          evaluatorUserId: operator.userId,
          financialStatus: financialStatus || null,
          behaviorWithMembers: behaviorWithMembers || null,
          behaviorWithServants: behaviorWithServants || null,
          cooperation: cooperation || null,
          individualInitiative: individualInitiative || null,
          notes: evaluationNotes || null,
        },
        update: {
          evaluatorUserId: operator.userId,
          ...(financialStatus !== undefined && { financialStatus }),
          ...(behaviorWithMembers !== undefined && { behaviorWithMembers }),
          ...(behaviorWithServants !== undefined && { behaviorWithServants }),
          ...(cooperation !== undefined && { cooperation }),
          ...(individualInitiative !== undefined && { individualInitiative }),
          ...(evaluationNotes !== undefined && { notes: evaluationNotes }),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'تم تحديث بيانات الخادم بنجاح',
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        phoneNumber: updatedUser.phoneNumber,
        email: updatedUser.email,
        fatherConfessor: updatedUser.fatherConfessor,
        dateOfBirth: updatedUser.dateOfBirth
          ? (typeof updatedUser.dateOfBirth === 'string'
              ? updatedUser.dateOfBirth
              : updatedUser.dateOfBirth.toISOString().split('T')[0])
          : null,
        address: updatedUser.address,
        maritalStatus: updatedUser.maritalStatus,
        spouseName: updatedUser.spouseName,
        educationOrCareer: updatedUser.educationOrCareer,
        childrenInfo: updatedUser.childrenInfo,
        role: {
          id: updatedUser.role.id,
          code: updatedUser.role.code,
          name: updatedUser.role.name,
          level: updatedUser.role.level,
        },
        evaluation: updatedEvaluation
          ? {
              financialStatus: updatedEvaluation.financialStatus,
              behaviorWithMembers: updatedEvaluation.behaviorWithMembers,
              behaviorWithServants: updatedEvaluation.behaviorWithServants,
              cooperation: updatedEvaluation.cooperation,
              individualInitiative: updatedEvaluation.individualInitiative,
              notes: updatedEvaluation.notes,
            }
          : null,
        scopes: (updatedUser.scopeAssignments || []).map((sa: any) => ({
          stageId: sa.stageId,
          stageName: sa.stage?.name,
          sectorId: sa.sectorId,
          sectorName: sa.sector?.name,
        })),
      },
    });
  }
}
