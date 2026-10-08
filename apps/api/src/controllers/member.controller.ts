import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { MemberAccessLevel } from '@shenoda/shared';
import {
  resolveMemberAccess,
  validateServantFieldRestrictions,
  ALLOWED_SERVANT_EVALUATIVE_FIELDS,
} from '../services/memberAccess.service';
import {
  SensitiveLoggerService,
  SensitiveField,
  AccessType,
} from '../services/sensitiveLogger.service';
import { BulkImportService } from '../services/bulkImport.service';

const createMemberSchema = z.object({
  fullName: z.string().min(2, 'الاسم بالكامل مطلوب'),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'تاريخ الميلاد غير صالح',
  }),
  address: z.string().min(3, 'العنوان مطلوب'),
  stageId: z.string().min(1, 'المرحلة مطلوبة'),
  phoneNumber: z.string().optional().nullable(),
  fatherConfessor: z.string().optional().nullable(),
  fatherConfessorChurch: z.string().optional().nullable(),
  facebookUrl: z.string().optional().nullable(),
  instagramUrl: z.string().optional().nullable(),
  fatherName: z.string().optional().nullable(),
  fatherAge: z.coerce.number().optional().nullable(),
  motherName: z.string().optional().nullable(),
  motherAge: z.coerce.number().optional().nullable(),
  schoolOrUniversity: z.string().optional().nullable(),
  educationalGrade: z.string().optional().nullable(),
  financialStatus: z.string().optional().nullable(),
  behaviorInService: z.string().optional().nullable(),
  peerIntegration: z.string().optional().nullable(),
});

export class MemberController {
  /**
   * GET /api/v1/members
   * Lists served members filtered by user's permitted administrative scope.
   */
  public static async listMembers(req: Request, res: Response) {
    const user = req.user!;
    const { stageId, search, assignedOnly, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));

    // Determine target stages based on user hierarchy
    let permittedStageIds: string[] = [];

    const requestedStageId = typeof stageId === 'string' && stageId.trim() ? stageId.trim() : null;

    if (user.roleLevel >= 5) {
      // General Secretary: all stages allowed
      if (requestedStageId) permittedStageIds = [requestedStageId];
    } else if (user.roleLevel === 4) {
      // Sector Secretary: stages within sector
      if (requestedStageId) {
        if (user.stageIds && user.stageIds.length > 0 && !user.stageIds.includes(requestedStageId)) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED_SCOPE',
              message: 'المرحلة المطلوبة خارج نطاق إشراف قطاعك',
            },
          });
        }
        permittedStageIds = [requestedStageId];
      } else {
        permittedStageIds = user.stageIds || [];
      }
    } else {
      // Level 1, 2, 3: user's assigned stages
      permittedStageIds = user.stageIds || [];
      if (requestedStageId && !permittedStageIds.includes(requestedStageId)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED_SCOPE',
            message: 'المرحلة المطلوبة خارج نطاق إشرافك',
          },
        });
      }
      if (requestedStageId) {
        permittedStageIds = [requestedStageId];
      }
    }

    const whereClause: any = {};
    if (permittedStageIds.length > 0) {
      whereClause.stageId = { in: permittedStageIds };
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      whereClause.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q } },
      ];
    }

    // Level 1 Servant: if assignedOnly is requested or default check
    if (user.roleLevel === 1 && (assignedOnly === 'true' || assignedOnly === '1')) {
      whereClause.servantAssignments = {
        some: { servantUserId: user.userId },
      };
    }

    const members = await prisma.servedMember.findMany({
      where: whereClause,
      include: {
        stage: { select: { id: true, name: true, code: true } },
        servantAssignments: {
          include: {
            servant: { select: { id: true, fullName: true, phoneNumber: true } },
          },
        },
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { fullName: 'asc' },
    });

    // Mark isAssigned for Level 1 servants
    const formatted = members.map((m) => {
      const isAssigned = m.servantAssignments.some(
        (a) => a.servantUserId === user.userId
      );
      return {
        ...m,
        isAssigned,
      };
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      page: pageNum,
      members: formatted,
      data: formatted,
    });
  }

  /**
   * GET /api/v1/members/:id
   * Fetches full member dossier and logs sensitive field access (NFR-3.3).
   */
  public static async getMemberById(req: Request, res: Response) {
    const user = req.user!;
    const { id } = req.params;

    const member = await prisma.servedMember.findUnique({
      where: { id },
      include: {
        stage: true,
        servantAssignments: {
          include: {
            servant: { select: { id: true, fullName: true, phoneNumber: true } },
          },
        },
      },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: { code: 'MEMBER_NOT_FOUND', message: 'المخدوم غير موجود' },
      });
    }

    // Verify access
    const accessLevel = await resolveMemberAccess(user, {
      id: member.id,
      stageId: member.stageId,
    });

    if (accessLevel === MemberAccessLevel.NONE) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_SCOPE',
          message: 'ليس لديك الصلاحية للاطلاع على بيانات هذا المخدوم',
        },
      });
    }

    // Log sensitive PII access (NFR-3.3)
    await SensitiveLoggerService.logMultipleFields({
      userId: user.userId,
      memberId: member.id,
      fields: [
        SensitiveField.FINANCIAL_STATUS,
        SensitiveField.PHONE_NUMBER,
        SensitiveField.HOME_ADDRESS,
      ],
      accessType: AccessType.VIEW,
      req,
    });

    const isAssigned = member.servantAssignments.some(
      (a) => a.servantUserId === user.userId
    );

    return res.status(200).json({
      success: true,
      accessLevel,
      isAssigned,
      member,
    });
  }

  /**
   * POST /api/v1/members (FR-3.2)
   * Creates a new served member. Restricted to Assistant Secretary (Level 2) and above.
   */
  public static async createMember(req: Request, res: Response) {
    const user = req.user!;

    if (user.roleLevel < 2) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_ROLE',
          message: 'إضافة مخدوم جديد مقتصرة على رتبة مساعد أمين الخدمة أو أعلى (FR-3.2)',
        },
      });
    }

    const parseResult = createMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'بيانات المخدوم غير صحيحة',
        },
      });
    }

    const data = parseResult.data;

    // Check scope authority over the stage
    if (user.roleLevel < 5 && !user.stageIds.includes(data.stageId)) {
      // If Sector Secretary, verify stage belongs to sector
      if (user.roleLevel === 4) {
        const stage = await prisma.stage.findUnique({ where: { id: data.stageId } });
        if (!stage || !user.sectorIds.includes(stage.sectorId)) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED_SCOPE',
              message: 'المرحلة المحددة لا تتبع قطاعك الإشرافي',
            },
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED_SCOPE',
            message: 'لا يمكنك إضافة مخدوم في مرحلة خارج نطاق إشرافك',
          },
        });
      }
    }

    const newMember = await prisma.servedMember.create({
      data: {
        stageId: data.stageId,
        fullName: data.fullName,
        dateOfBirth: new Date(data.dateOfBirth),
        address: data.address,
        phoneNumber: data.phoneNumber || null,
        fatherConfessor: data.fatherConfessor || null,
        fatherConfessorChurch: data.fatherConfessorChurch || null,
        facebookUrl: data.facebookUrl || null,
        instagramUrl: data.instagramUrl || null,
        fatherName: data.fatherName || null,
        fatherAge: data.fatherAge || null,
        motherName: data.motherName || null,
        motherAge: data.motherAge || null,
        schoolOrUniversity: data.schoolOrUniversity || null,
        educationalGrade: data.educationalGrade || null,
        financialStatus: data.financialStatus || null,
        behaviorInService: data.behaviorInService || null,
        peerIntegration: data.peerIntegration || null,
      },
    });

    // Log sensitive creation
    await SensitiveLoggerService.logMultipleFields({
      userId: user.userId,
      memberId: newMember.id,
      fields: [SensitiveField.HOME_ADDRESS, SensitiveField.PHONE_NUMBER],
      accessType: AccessType.UPDATE,
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'تم إضافة المخدوم بنجاح',
      member: newMember,
    });
  }

  /**
   * PATCH /api/v1/members/:id (FR-3.1 & FR-3.2, Assumption A2)
   * Enforces field-level restrictions: Servants edit ONLY 3 evaluative fields on assigned members.
   */
  public static async updateMember(req: Request, res: Response) {
    const user = req.user!;
    const { id } = req.params;

    const member = await prisma.servedMember.findUnique({
      where: { id },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: { code: 'MEMBER_NOT_FOUND', message: 'المخدوم غير موجود' },
      });
    }

    const accessLevel = await resolveMemberAccess(user, {
      id: member.id,
      stageId: member.stageId,
    });

    if (accessLevel === MemberAccessLevel.NONE) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_SCOPE',
          message: 'ليس لديك الصلاحية لتعديل بيانات هذا المخدوم',
        },
      });
    }

    const rawPayload = req.body || {};
    const { servantUserId, assignedServantId, ...payload } = rawPayload;
    const targetServantId = servantUserId !== undefined ? servantUserId : assignedServantId;
    const fieldsToUpdate = Object.keys(payload);

    // Assumption A2 Enforcement: Servants can ONLY update the 3 evaluative fields
    if (accessLevel === MemberAccessLevel.ASSIGNED_EVALUATIVE_ONLY) {
      const { valid, unauthorizedFields } = validateServantFieldRestrictions(fieldsToUpdate);

      if (!valid) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ERR_FIELD_UPDATE_RESTRICTED',
            message: `صلاحية الخادم مقتصرة حصرياً على تعديل الحقول التقييمية الثلاثة: الحالة المادية، السلوك، والاندماج (Assumption A2). الحقول المحظورة: ${unauthorizedFields.join(', ')}`,
            details: {
              unauthorizedFields,
              allowedFields: ALLOWED_SERVANT_EVALUATIVE_FIELDS,
            },
          },
        });
      }
    }

    // Build update data and audit log entries
    const updateData: any = {};
    const auditLogs: any[] = [];
    const sensitiveFieldsToLog: SensitiveField[] = [];

    for (const [key, val] of Object.entries(payload)) {
      const currentVal = (member as any)[key];
      const newVal = key === 'dateOfBirth' && val ? new Date(val as string) : val;

      const hasChanged =
        key === 'dateOfBirth' && currentVal instanceof Date && newVal instanceof Date
          ? currentVal.getTime() !== newVal.getTime()
          : String(currentVal ?? '') !== String(newVal ?? '');

      if (hasChanged) {
        updateData[key] = newVal;
        auditLogs.push({
          memberId: member.id,
          changedById: user.userId,
          fieldName: key,
          oldValue:
            currentVal != null
              ? currentVal instanceof Date
                ? currentVal.toISOString()
                : String(currentVal)
              : null,
          newValue:
            newVal != null
              ? newVal instanceof Date
                ? newVal.toISOString()
                : String(newVal)
              : null,
        });

        if (key === 'financialStatus') sensitiveFieldsToLog.push(SensitiveField.FINANCIAL_STATUS);
        if (key === 'phoneNumber') sensitiveFieldsToLog.push(SensitiveField.PHONE_NUMBER);
        if (key === 'address') sensitiveFieldsToLog.push(SensitiveField.HOME_ADDRESS);
      }
    }

    // Perform update and audit log inside transaction
    await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.servedMember.update({
          where: { id: member.id },
          data: updateData,
        });
      }

      for (const log of auditLogs) {
        await tx.memberAuditLog.create({ data: log });
      }
    });

    // Handle servant assignment if provided and user has permission
    if (targetServantId !== undefined && (user.roleLevel >= 2 || (user.roleLevel === 1 && targetServantId === user.userId))) {
      await prisma.memberServantAssignment.deleteMany({
        where: { memberId: member.id },
      });
      if (targetServantId) {
        await prisma.memberServantAssignment.create({
          data: {
            memberId: member.id,
            servantUserId: targetServantId,
            assignedById: user.userId,
          },
        });
      }
    }

    // Log sensitive updates
    if (sensitiveFieldsToLog.length > 0) {
      await SensitiveLoggerService.logMultipleFields({
        userId: user.userId,
        memberId: member.id,
        fields: sensitiveFieldsToLog,
        accessType: AccessType.UPDATE,
        req,
      });
    }

    const updatedMember = await prisma.servedMember.findUnique({
      where: { id: member.id },
      include: {
        stage: { select: { id: true, name: true, code: true } },
        servantAssignments: {
          include: {
            servant: { select: { id: true, fullName: true, phoneNumber: true } },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'تم تحديث بيانات المخدوم بنجاح',
      member: updatedMember,
      changesCount: auditLogs.length,
    });
  }

  /**
   * POST /api/v1/members/:id/assign-servant
   * Links a servant to a member. Restricted to Assistant Secretary (Level 2) and above,
   * or a stage servant assigning an unassigned member to themselves.
   */
  public static async assignServant(req: Request, res: Response) {
    const user = req.user!;
    const { id } = req.params;
    const { servantUserId } = req.body;

    const member = await prisma.servedMember.findUnique({
      where: { id },
      include: {
        stage: true,
        servantAssignments: true,
      },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: { code: 'MEMBER_NOT_FOUND', message: 'المخدوم غير موجود' },
      });
    }

    // Role check: level >= 2 or level 1 self-assignment
    const isLevel2Plus = user.roleLevel >= 2;
    const isSelfAssign = user.roleLevel === 1 && servantUserId === user.userId && user.stageIds.includes(member.stageId);

    if (!isLevel2Plus && !isSelfAssign) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_ROLE',
          message: 'إسناد الخدام للمخدومين مقتصر على مساعد أمين الخدمة أو أعلى',
        },
      });
    }

    // Scope check for non-General Secretary
    if (user.roleLevel < 5 && !user.stageIds.includes(member.stageId)) {
      if (user.roleLevel === 4) {
        if (!user.sectorIds.includes(member.stage.sectorId)) {
          return res.status(403).json({
            success: false,
            error: { code: 'ACCESS_DENIED_SCOPE', message: 'المخدوم خارج قطاعك الإشرافي' },
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED_SCOPE', message: 'المخدوم خارج نطاق مرحلتك' },
        });
      }
    }

    // If servantUserId is empty/null/false -> unassign
    if (!servantUserId) {
      await prisma.memberServantAssignment.deleteMany({
        where: { memberId: id },
      });

      const updatedMember = await prisma.servedMember.findUnique({
        where: { id },
        include: {
          stage: { select: { id: true, name: true, code: true } },
          servantAssignments: {
            include: {
              servant: { select: { id: true, fullName: true, phoneNumber: true } },
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'تم إلغاء إسناد المخدوم بنجاح',
        member: updatedMember,
      });
    }

    // Verify servant exists
    const servant = await prisma.user.findUnique({ where: { id: servantUserId } });
    if (!servant) {
      return res.status(404).json({
        success: false,
        error: { code: 'SERVANT_NOT_FOUND', message: 'الخادم غير موجود' },
      });
    }

    // Clean up previous assignments for this member to prevent duplicate/conflicting assignments
    await prisma.memberServantAssignment.deleteMany({
      where: { memberId: id },
    });

    // Create new assignment
    const assignment = await prisma.memberServantAssignment.create({
      data: {
        memberId: id,
        servantUserId,
        assignedById: user.userId,
      },
      include: {
        servant: { select: { id: true, fullName: true, phoneNumber: true } },
      },
    });

    const updatedMember = await prisma.servedMember.findUnique({
      where: { id },
      include: {
        stage: { select: { id: true, name: true, code: true } },
        servantAssignments: {
          include: {
            servant: { select: { id: true, fullName: true, phoneNumber: true } },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'تم إسناد المخدوم للخادم بنجاح',
      assignment,
      member: updatedMember,
    });
  }

  /**
   * POST /api/v1/members/bulk-import (FR-3.3)
   * Ingests CSV or batch JSON array of members into a designated stage.
   */
  public static async bulkImport(req: Request, res: Response) {
    const user = req.user!;

    if (user.roleLevel < 2) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_ROLE',
          message: 'الاستيراد الجماعي للمخدومين مقتصر على مساعد أمين الخدمة أو أعلى (FR-3.3)',
        },
      });
    }

    const { stageId, csvContent, members } = req.body;

    if (!stageId) {
      return res.status(400).json({
        success: false,
        error: { code: 'STAGE_REQUIRED', message: 'تحديد المرحلة (stageId) إلزامي' },
      });
    }

    // Scope check
    if (user.roleLevel < 5 && !user.stageIds.includes(stageId)) {
      if (user.roleLevel === 4) {
        const stage = await prisma.stage.findUnique({ where: { id: stageId } });
        if (!stage || !user.sectorIds.includes(stage.sectorId)) {
          return res.status(403).json({
            success: false,
            error: { code: 'ACCESS_DENIED_SCOPE', message: 'المرحلة خارج قطاعك الإشرافي' },
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED_SCOPE', message: 'المرحلة خارج نطاق إشرافك' },
        });
      }
    }

    let rowsToImport = members;
    if (csvContent && typeof csvContent === 'string') {
      try {
        rowsToImport = BulkImportService.parseCsv(csvContent);
      } catch (err: any) {
        return res.status(400).json({
          success: false,
          error: { code: 'CSV_PARSE_ERROR', message: err.message },
        });
      }
    }

    if (!Array.isArray(rowsToImport) || rowsToImport.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_DATA', message: 'لم يتم توفير سجلات صالحة للاستيراد' },
      });
    }

    const result = await BulkImportService.importMembersForStage(stageId, rowsToImport);

    return res.status(result.success ? 200 : 400).json({
      success: result.success,
      message: `تم استيراد ${result.importedCount} مخدوم بنجاح`,
      importedCount: result.importedCount,
      errors: result.errors,
    });
  }
}
