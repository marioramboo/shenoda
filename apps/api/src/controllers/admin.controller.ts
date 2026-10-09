import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { HashService } from '../services/hash.service';
import { TokenService } from '../services/token.service';
import { UserStatus } from '@prisma/client';
import { z } from 'zod';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0)?1[0125][0-9]{8}$/;

const adminResetPasswordSchema = z.object({
  targetUserId: z.string().min(1, 'معرف المستخدم مطلوب'),
  newPassword: z.string().min(8, 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف'),
});

const adminCreateAccountSchema = z.object({
  fullName: z.string().min(3, 'الاسم يجب ألا يقل عن 3 أحرف'),
  phoneNumber: z.string().regex(EGYPTIAN_PHONE_REGEX, 'يرجى إدخال رقم هاتف مصري صحيح'),
  email: z.string().email('بريد إلكتروني غير صالح').optional().nullable(),
  roleCode: z.string().min(1, 'كود الرتبة مطلوب'),
  temporaryPassword: z.string().min(8, 'كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف'),
  stageIds: z.array(z.string()).optional(),
  sectorId: z.string().optional().nullable(),
});

const adminUpdateStatusSchema = z.object({
  targetUserId: z.string().min(1, 'معرف المستخدم مطلوب'),
  action: z.enum(['ACTIVATE', 'SUSPEND']),
  reason: z.string().optional(),
});

export class AdminController {
  /**
   * Middleware to guarantee caller is Level 6 Admin
   */
  public static async requireAdmin(req: Request, res: Response, next: Function) {
    const user = req.user;
    if (!user || user.roleLevel < 6) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ERR_ADMIN_ONLY',
          message: 'هذا القسم مخصص حصرياً لمدير النظام (Admin)',
        },
        timestamp: new Date().toISOString(),
      });
    }
    next();
  }

  /**
   * GET /api/v1/admin/overview
   * Complete KPI summary, system metrics, and quick statistics.
   */
  public static async getOverview(req: Request, res: Response) {
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        activeUsers,
        suspendedUsers,
        adminCount,
        genSecCount,
        stageSecCount,
        servantCount,
        totalMembers,
        totalStages,
        totalSectors,
        memberAuditCount24h,
        statusLogCount24h,
        sensitiveAccessCount24h,
        recentMemberAudits,
        recentStatusLogs,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { status: 'SUSPENDED' } }),
        prisma.user.count({ where: { role: { code: 'ADMIN' } } }),
        prisma.user.count({ where: { role: { code: 'GENERAL_SECRETARY' } } }),
        prisma.user.count({ where: { role: { code: 'STAGE_SECRETARY' } } }),
        prisma.user.count({ where: { role: { code: 'SERVANT' } } }),
        prisma.servedMember.count(),
        prisma.stage.count(),
        prisma.sector.count(),
        prisma.memberAuditLog.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
        prisma.accountStatusLog.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
        prisma.sensitiveAccessLog.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
        prisma.memberAuditLog.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { fullName: true, phoneNumber: true, role: { select: { name: true } } } },
            member: { select: { fullName: true } },
          },
        }),
        prisma.accountStatusLog.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { fullName: true, role: { select: { name: true } } } },
            targetUser: { select: { fullName: true, role: { select: { name: true } } } },
          },
        }),
      ]);

      const systemHealth = {
        status: 'HEALTHY',
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json({
        success: true,
        stats: {
          totalUsers,
          activeUsers,
          suspendedUsers,
          rolesDistribution: {
            admin: adminCount,
            generalSecretary: genSecCount,
            stageSecretary: stageSecCount,
            servant: servantCount,
          },
          totalMembers,
          totalStages,
          totalSectors,
          activity24h: {
            memberModifications: memberAuditCount24h,
            accountStatusChanges: statusLogCount24h,
            sensitiveDataAccess: sensitiveAccessCount24h,
            totalAuditEvents: memberAuditCount24h + statusLogCount24h + sensitiveAccessCount24h,
          },
        },
        recentActivity: {
          memberAudits: recentMemberAudits,
          statusLogs: recentStatusLogs,
        },
        systemHealth,
      });
    } catch (err: any) {
      console.error('AdminController.getOverview error:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  /**
   * GET /api/v1/admin/audit-logs
   * Aggregated, searchable audit timeline (Member changes, Account changes, Sensitive access).
   */
  public static async getAuditLogs(req: Request, res: Response) {
    try {
      const { type = 'ALL', search, limit = '50', page = '1' } = req.query;
      const take = Math.min(Math.max(parseInt(limit as string, 10) || 50, 1), 200);
      const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;

      const events: any[] = [];

      // 1. Member Audit Logs (modifications to served member records)
      if (type === 'ALL' || type === 'MEMBER_AUDIT') {
        const memberAudits = await prisma.memberAuditLog.findMany({
          take,
          skip: type === 'MEMBER_AUDIT' ? skip : 0,
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { id: true, fullName: true, phoneNumber: true, role: { select: { name: true } } } },
            member: { select: { id: true, fullName: true } },
          },
        });

        for (const log of memberAudits) {
          events.push({
            id: `member-${log.id}`,
            logType: 'MEMBER_AUDIT',
            actionName: `تعديل بيانات مخدوم (${log.fieldName})`,
            actor: {
              id: log.changedBy?.id,
              name: log.changedBy?.fullName || 'غير معروف',
              phone: log.changedBy?.phoneNumber,
              roleName: log.changedBy?.role?.name,
            },
            target: {
              id: log.member?.id,
              name: log.member?.fullName || 'مخدوم',
              type: 'مخدوم',
            },
            details: {
              fieldName: log.fieldName,
              oldValue: log.oldValue,
              newValue: log.newValue,
            },
            createdAt: log.createdAt,
          });
        }
      }

      // 2. Account Status Logs (suspension, activation, transfer)
      if (type === 'ALL' || type === 'ACCOUNT_STATUS') {
        const statusLogs = await prisma.accountStatusLog.findMany({
          take,
          skip: type === 'ACCOUNT_STATUS' ? skip : 0,
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { id: true, fullName: true, phoneNumber: true, role: { select: { name: true } } } },
            targetUser: { select: { id: true, fullName: true, phoneNumber: true, role: { select: { name: true } } } },
          },
        });

        for (const log of statusLogs) {
          events.push({
            id: `status-${log.id}`,
            logType: 'ACCOUNT_STATUS',
            actionName: `تغيير حالة حساب: ${log.previousStatus} ➔ ${log.newStatus}`,
            actor: {
              id: log.changedBy?.id,
              name: log.changedBy?.fullName || 'غير معروف',
              phone: log.changedBy?.phoneNumber,
              roleName: log.changedBy?.role?.name,
            },
            target: {
              id: log.targetUser?.id,
              name: log.targetUser?.fullName || 'خادم',
              type: 'خادم / مسؤول',
            },
            details: {
              previousStatus: log.previousStatus,
              newStatus: log.newStatus,
              reason: log.reason,
            },
            createdAt: log.createdAt,
          });
        }
      }

      // 3. Sensitive Access Logs (views on financial or contact details)
      if (type === 'ALL' || type === 'SENSITIVE_ACCESS') {
        const sensitiveLogs = await prisma.sensitiveAccessLog.findMany({
          take,
          skip: type === 'SENSITIVE_ACCESS' ? skip : 0,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, fullName: true, phoneNumber: true, role: { select: { name: true } } } },
            member: { select: { id: true, fullName: true } },
          },
        });

        for (const log of sensitiveLogs) {
          events.push({
            id: `sens-${log.id}`,
            logType: 'SENSITIVE_ACCESS',
            actionName: `اطلاع على بيانات حساسة (${log.field})`,
            actor: {
              id: log.user?.id,
              name: log.user?.fullName || 'غير معروف',
              phone: log.user?.phoneNumber,
              roleName: log.user?.role?.name,
            },
            target: {
              id: log.member?.id,
              name: log.member?.fullName || 'مخدوم',
              type: 'مخدوم',
            },
            details: {
              field: log.field,
              accessType: log.accessType,
              ipAddress: log.ipAddress,
            },
            createdAt: log.createdAt,
          });
        }
      }

      // Sort all combined events descending by date
      events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Filter by search query if provided
      let filtered = events;
      if (search && typeof search === 'string' && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = events.filter((e) =>
          (e.actionName && e.actionName.toLowerCase().includes(q)) ||
          (e.actor.name && e.actor.name.toLowerCase().includes(q)) ||
          (e.actor.phone && e.actor.phone.includes(q)) ||
          (e.target.name && e.target.name.toLowerCase().includes(q)) ||
          (e.details.fieldName && e.details.fieldName.toLowerCase().includes(q)) ||
          (e.details.reason && e.details.reason.toLowerCase().includes(q))
        );
      }

      const paged = filtered.slice(skip, skip + take);

      return res.status(200).json({
        success: true,
        count: filtered.length,
        page: parseInt(page as string, 10) || 1,
        logs: paged,
      });
    } catch (err: any) {
      console.error('AdminController.getAuditLogs error:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  /**
   * GET /api/v1/admin/accounts
   * Returns all accounts across the entire organization, including Admins.
   */
  public static async getAccounts(req: Request, res: Response) {
    try {
      const { search, roleCode, status } = req.query;

      const where: any = {};
      if (status && typeof status === 'string') {
        where.status = status as UserStatus;
      }
      if (roleCode && typeof roleCode === 'string') {
        where.role = { code: roleCode };
      }
      if (search && typeof search === 'string' && search.trim()) {
        const q = search.trim();
        where.OR = [
          { fullName: { contains: q, mode: 'insensitive' } },
          { phoneNumber: { contains: q } },
          { email: { contains: q, mode: 'insensitive' } },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        include: {
          role: true,
          scopeAssignments: {
            include: { stage: true, sector: true },
          },
        },
        orderBy: [{ role: { level: 'desc' } }, { fullName: 'asc' }],
      });

      const mapped = users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        phoneNumber: u.phoneNumber,
        email: u.email,
        status: u.status,
        whatsappPhone: u.whatsappPhone || u.phoneNumber,
        dateOfBirth: u.dateOfBirth,
        facebookUrl: u.facebookUrl,
        instagramUrl: u.instagramUrl,
        role: {
          id: u.role.id,
          name: u.role.name,
          code: u.role.code,
          level: u.role.level,
        },
        scopes: u.scopeAssignments.map((sa) => ({
          stageId: sa.stageId,
          stageName: sa.stage?.name,
          sectorId: sa.sectorId,
          sectorName: sa.sector?.name,
        })),
        createdAt: u.createdAt,
      }));

      return res.status(200).json({
        success: true,
        count: mapped.length,
        accounts: mapped,
      });
    } catch (err: any) {
      console.error('AdminController.getAccounts error:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  /**
   * POST /api/v1/admin/reset-password
   * Direct password reset by Admin without requiring the current password.
   */
  public static async resetPassword(req: Request, res: Response) {
    try {
      const parseResult = adminResetPasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0]?.message || 'بيانات إعادة تعيين كلمة المرور غير صحيحة',
          },
        });
      }

      const { targetUserId, newPassword } = parseResult.data;

      const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, fullName: true, phoneNumber: true },
      });

      if (!target) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'المستخدم غير موجود' },
        });
      }

      const passwordHash = await HashService.hashPassword(newPassword);

      await prisma.user.update({
        where: { id: targetUserId },
        data: { passwordHash },
      });

      // Invalidate existing sessions immediately
      await TokenService.revokeAllUserRefreshTokens(targetUserId);

      return res.status(200).json({
        success: true,
        message: `تم إعادة تعيين كلمة المرور بنجاح للمستخدم: ${target.fullName}`,
      });
    } catch (err: any) {
      console.error('AdminController.resetPassword error:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  /**
   * POST /api/v1/admin/create-account
   * Create an account for any role (including Admin or General Secretary).
   */
  public static async createAccount(req: Request, res: Response) {
    try {
      const parseResult = adminCreateAccountSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0]?.message || 'بيانات الحساب غير صحيحة',
          },
        });
      }

      const { fullName, phoneNumber, email, roleCode, temporaryPassword, stageIds, sectorId } = parseResult.data;

      const existingPhone = await prisma.user.findFirst({
        where: { phoneNumber },
      });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          error: { code: 'PHONE_EXISTS', message: 'رقم الهاتف مسجل بالفعل لحساب آخر' },
        });
      }

      const targetRole = await prisma.role.findUnique({
        where: { code: roleCode },
      });
      if (!targetRole) {
        return res.status(404).json({
          success: false,
          error: { code: 'ROLE_NOT_FOUND', message: 'الرتبة المحددة غير موجودة' },
        });
      }

      const org = await prisma.organization.findFirst();
      if (!org) {
        return res.status(500).json({
          success: false,
          error: { code: 'ORG_NOT_FOUND', message: 'لم يتم العثور على الكنيسة في النظام' },
        });
      }

      const passwordHash = await HashService.hashPassword(temporaryPassword);

      const newUser = await prisma.user.create({
        data: {
          fullName,
          phoneNumber,
          email: email ? email.toLowerCase() : null,
          roleId: targetRole.id,
          organizationId: org.id,
          passwordHash,
          status: 'ACTIVE',
        },
      });

      // Attach stage/sector scope assignments if provided
      if (Array.isArray(stageIds) && stageIds.length > 0) {
        for (const stageId of stageIds) {
          const stage = await prisma.stage.findUnique({ where: { id: stageId } });
          await prisma.scopeAssignment.create({
            data: {
              userId: newUser.id,
              stageId,
              sectorId: sectorId || stage?.sectorId || null,
            },
          }).catch(() => {});
        }
      } else if (sectorId) {
        await prisma.scopeAssignment.create({
          data: {
            userId: newUser.id,
            sectorId,
          },
        }).catch(() => {});
      }

      return res.status(201).json({
        success: true,
        message: `تم إنشاء حساب ${targetRole.name} بنجاح: ${newUser.fullName}`,
        user: {
          id: newUser.id,
          fullName: newUser.fullName,
          phoneNumber: newUser.phoneNumber,
          role: {
            code: targetRole.code,
            name: targetRole.name,
            level: targetRole.level,
          },
        },
      });
    } catch (err: any) {
      console.error('AdminController.createAccount error:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  /**
   * POST /api/v1/admin/update-status
   * Direct activation or suspension of any user.
   */
  public static async updateStatus(req: Request, res: Response) {
    try {
      const parseResult = adminUpdateStatusSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0]?.message || 'البيانات غير صحيحة',
          },
        });
      }

      const { targetUserId, action, reason } = parseResult.data;
      const operator = req.user!;

      const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { role: true },
      });

      if (!target) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'المستخدم غير موجود' },
        });
      }

      const newStatus = action === 'SUSPEND' ? UserStatus.SUSPENDED : UserStatus.ACTIVE;

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: targetUserId },
          data: { status: newStatus },
        });

        await tx.accountStatusLog.create({
          data: {
            targetUserId,
            changedById: operator.userId,
            previousStatus: target.status,
            newStatus,
            reason: reason || (action === 'SUSPEND' ? 'إيقاف إداري بواسطة مدير النظام' : 'تفعيل الحساب بواسطة مدير النظام'),
          },
        });
      });

      if (action === 'SUSPEND') {
        await TokenService.revokeAllUserRefreshTokens(targetUserId);
      }

      return res.status(200).json({
        success: true,
        message: `تم ${action === 'SUSPEND' ? 'إيقاف' : 'تفعيل'} الحساب بنجاح`,
        status: newStatus,
      });
    } catch (err: any) {
      console.error('AdminController.updateStatus error:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  }
}
