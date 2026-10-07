import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import {
  ServantSessionType,
  getAllowedSessionsForRole,
} from '@shenoda/shared';
import { AttendanceStatus as PrismaAttendanceStatus } from '@prisma/client';
import { calculateServantAttendanceRate } from '../services/attendanceAnalytics.service';

export class ServantAttendanceController {
  /**
   * POST /api/v1/attendance/servants/batch (FR-4.1 & Assumption A4)
   * Supervisor records or updates attendance for subordinates.
   * Self-attendance is strictly rejected with 403 (ERR_CANNOT_SELF_RECORD_ATTENDANCE).
   */
  static async recordBatch(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const { sessionType, sessionDate, stageId, records } = req.body;

    if (!sessionType || !sessionDate || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'sessionType, sessionDate, and a non-empty records array are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 1. Strict Self-Recording Prevention Check (FR-4.1 & §3.1.2)
    const containsSelf = records.some((r: any) => r.servantUserId === user.userId);
    if (containsSelf) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ERR_CANNOT_SELF_RECORD_ATTENDANCE',
          message: 'Servants and secretaries cannot record or edit their own attendance. Attendance must be logged by a supervisor.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Operator must be at least Level 3 (Stage Secretary) to record any servant attendance
    if (user.roleLevel < 3) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ERR_INSUFFICIENT_SUPERVISORY_LEVEL',
          message: 'Only supervising secretaries (Level 3+) can record servant attendance',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const parsedDate = new Date(sessionDate);
    parsedDate.setUTCHours(0, 0, 0, 0);

    const savedRecords: any[] = [];

    // Process each record within hierarchy and Assumption A4 session checks
    for (const item of records) {
      if (!item.servantUserId || !item.status) continue;

      const targetUser = await prisma.user.findUnique({
        where: { id: item.servantUserId },
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
            message: `Servant with ID ${item.servantUserId} not found`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const targetRoleLevel = targetUser.role.level;

      // 2. Hierarchy Supervision Authorization Check
      // - Level 1 & 2 (خادم ومساعد): Operator must be Level 3+
      if (targetRoleLevel <= 2) {
        if (user.roleLevel < 3) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'SUPERVISOR_LEVEL_MISMATCH',
              message: 'Attendance for servants or assistant secretaries must be logged by Stage Secretary (Level 3) or above',
            },
            timestamp: new Date().toISOString(),
          });
        }
        // If operator is Level 3, ensure same stage scope
        if (user.roleLevel === 3 && stageId && !user.stageIds.includes(stageId)) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'STAGE_SCOPE_MISMATCH',
              message: 'Stage Secretary can only record attendance for servants within their stage',
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
      // - Level 3 (امين الخدمة): Operator must be Level 4+ (Sector Secretary)
      else if (targetRoleLevel === 3) {
        if (user.roleLevel < 4) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'SUPERVISOR_LEVEL_MISMATCH',
              message: 'Attendance for Stage Secretaries must be logged by Sector Secretary (Level 4) or above',
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
      // - Level 4 (امين قطاع): Operator must be Level 5 (General Secretary)
      else if (targetRoleLevel === 4) {
        if (user.roleLevel < 5) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'SUPERVISOR_LEVEL_MISMATCH',
              message: 'Attendance for Sector Secretaries must be logged by General Secretary (Level 5)',
            },
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: {
            code: 'CANNOT_RECORD_FOR_ROLE',
            message: 'Attendance cannot be recorded for General Secretary',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 3. Assumption A4 Session Allowance Check
      const allowedSessions = getAllowedSessionsForRole(targetRoleLevel);
      if (!allowedSessions.includes(sessionType as ServantSessionType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ERR_SESSION_TYPE_NOT_ALLOWED_FOR_ROLE',
            message: `Session type ${sessionType} is not permitted for role ${targetUser.role.name} (Assumption A4)`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (!item.status || item.status === 'UNSET') {
        await prisma.servantAttendance.deleteMany({
          where: {
            servantUserId: item.servantUserId,
            sessionType: sessionType as ServantSessionType,
            sessionDate: parsedDate,
          },
        });
        continue;
      }

      const upserted = await prisma.servantAttendance.upsert({
        where: {
          servantUserId_sessionType_sessionDate: {
            servantUserId: item.servantUserId,
            sessionType: sessionType as ServantSessionType,
            sessionDate: parsedDate,
          },
        },
        update: {
          status: item.status as PrismaAttendanceStatus,
          notes: item.notes !== undefined ? item.notes : null,
          recordedById: user.userId,
        },
        create: {
          servantUserId: item.servantUserId,
          stageId: stageId || null,
          sessionType: sessionType as ServantSessionType,
          sessionDate: parsedDate,
          status: item.status as PrismaAttendanceStatus,
          notes: item.notes || null,
          recordedById: user.userId,
        },
      });

      savedRecords.push(upserted);
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionType,
        sessionDate: parsedDate.toISOString(),
        recordedCount: savedRecords.length,
        records: savedRecords,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/v1/attendance/servants
   * Fetches servant attendance for a stage, sessionType, and sessionDate.
   */
  static async getAttendance(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const stageId = req.query.stageId as string | undefined;
    const sessionType = req.query.sessionType as ServantSessionType | undefined;
    const sessionDate = req.query.sessionDate as string | undefined;

    const whereClause: any = {};
    if (stageId) whereClause.stageId = stageId;
    if (sessionType) whereClause.sessionType = sessionType;

    if (sessionDate) {
      const d = new Date(sessionDate);
      d.setUTCHours(0, 0, 0, 0);
      whereClause.sessionDate = d;
    }

    const records = await prisma.servantAttendance.findMany({
      where: whereClause,
      include: {
        servantUser: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: records,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/v1/attendance/servants/history (FR-4.1 & §3.1.2)
   * Servants view their own follow-up history (read-only), or supervisors view their subordinates.
   */
  static async getHistory(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const targetUserId = (req.query.servantUserId as string) || user.userId;

    // If querying another servant's history, ensure user is a supervisor (Level 3+)
    if (targetUserId !== user.userId && user.roleLevel < 3) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_SCOPE',
          message: 'Servants can only view their own attendance history',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const sessionType = req.query.sessionType as ServantSessionType | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const whereClause: any = { servantUserId: targetUserId };
    if (sessionType) whereClause.sessionType = sessionType;

    if (startDate || endDate) {
      whereClause.sessionDate = {};
      if (startDate) whereClause.sessionDate.gte = new Date(startDate);
      if (endDate) whereClause.sessionDate.lte = new Date(endDate);
    }

    const records = await prisma.servantAttendance.findMany({
      where: whereClause,
      include: {
        recordedBy: {
          select: {
            id: true,
            fullName: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });

    const stats = await calculateServantAttendanceRate(targetUserId, 8);

    return res.status(200).json({
      success: true,
      data: {
        servantUserId: targetUserId,
        stats,
        records,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/v1/attendance/servants/allowed-sessions (Assumption A4)
   * Returns allowed sessions for a role level.
   */
  static async getAllowedSessions(req: Request, res: Response) {
    const roleLevel = Number(req.query.roleLevel || req.user?.roleLevel || 1);
    const sessions = getAllowedSessionsForRole(roleLevel);

    return res.status(200).json({
      success: true,
      data: {
        roleLevel,
        allowedSessions: sessions,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/v1/attendance/servants/list
   * Lists servants in the requested or permitted stage with their attendance stats.
   */
  static async listServants(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const { stageId } = req.query;
    const targetStageId = (stageId as string) || (user.stageIds && user.stageIds[0]);

    if (!targetStageId && user.roleLevel < 4) {
      return res.status(400).json({
        success: false,
        error: { code: 'STAGE_ID_REQUIRED', message: 'stageId query parameter is required' },
        timestamp: new Date().toISOString(),
      });
    }

    // Find all users who are assigned to this stage
    const scopeAssignments = await prisma.scopeAssignment.findMany({
      where: targetStageId ? { stageId: targetStageId } : {},
      include: {
        user: {
          include: {
            role: true,
            evaluationsReceived: true,
          },
        },
      },
    });

    // Extract unique users (include suspended servants if caller is General Secretary Level 5 or explicitly requested)
    const includeInactive = req.query.includeInactive === 'true' || req.query.includeSuspended === 'true' || user.roleLevel >= 5;
    const userMap = new Map<string, any>();
    for (const sa of scopeAssignments) {
      if (sa.user && (includeInactive || sa.user.status === 'ACTIVE') && !userMap.has(sa.user.id)) {
        userMap.set(sa.user.id, sa.user);
      }
    }

    const servants = Array.from(userMap.values());

    // Enrich each servant with attendance stats, profile, status, and evaluation data
    const enrichedServants = await Promise.all(
      servants.map(async (s) => {
        const stats = await calculateServantAttendanceRate(s.id, 8);
        const evalItem = s.evaluationsReceived && s.evaluationsReceived.length > 0 ? s.evaluationsReceived[0] : null;

        return {
          id: s.id,
          fullName: s.fullName,
          phoneNumber: s.phoneNumber,
          email: s.email,
          status: s.status,
          fatherConfessor: s.fatherConfessor || null,
          dateOfBirth: s.dateOfBirth ? (typeof s.dateOfBirth === 'string' ? s.dateOfBirth : s.dateOfBirth.toISOString().split('T')[0]) : null,
          address: s.address || null,
          maritalStatus: s.maritalStatus || null,
          spouseName: s.spouseName || null,
          educationOrCareer: s.educationOrCareer || null,
          childrenInfo: s.childrenInfo || null,
          whatsappPhone: s.whatsappPhone || s.phoneNumber,
          whatsappPhoneRaw: s.whatsappPhone || null,
          facebookUrl: s.facebookUrl || null,
          instagramUrl: s.instagramUrl || null,
          talents: s.talents || [],
          siblingsInfo: s.siblingsInfo || [],
          activities: s.activities || [],
          isDeacon: s.isDeacon || false,
          deaconName: s.deaconName || null,
          deaconRank: s.deaconRank || null,
          profilePicture: s.profilePicture || null,
          role: {
            id: s.role.id,
            name: s.role.name,
            code: s.role.code,
            level: s.role.level,
          },
          evaluation: evalItem
            ? {
              financialStatus: evalItem.financialStatus || null,
              behaviorWithMembers: evalItem.behaviorWithMembers || null,
              behaviorWithServants: evalItem.behaviorWithServants || null,
              cooperation: evalItem.cooperation || null,
              individualInitiative: evalItem.individualInitiative || null,
              notes: evalItem.notes || null,
            }
            : null,
          stats,
        };
      })
    );

    // Sort by role level descending
    enrichedServants.sort((a, b) => b.role.level - a.role.level);

    return res.status(200).json({
      success: true,
      data: enrichedServants,
      timestamp: new Date().toISOString(),
    });
  }
}
