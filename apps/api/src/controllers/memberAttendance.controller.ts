import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { MemberSessionType } from '@shenoda/shared';
import { AttendanceStatus as PrismaAttendanceStatus } from '@prisma/client';
import { scanMemberAbsencesAfterAttendance } from '../services/absenceDetector.service';
import { getMemberRollingAttendance, calculateStageAttendanceSummary } from '../services/attendanceAnalytics.service';

/**
 * In-memory idempotency cache for fast retrieval on network retries (NFR-4.2).
 */
const idempotencyCache = new Map<string, { response: any; timestamp: number }>();

export class MemberAttendanceController {
  /**
   * POST /api/v1/attendance/members/batch (FR-4.1, NFR-4.2)
   * Records or updates attendance in batch for members in a stage.
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

    const idempotencyKey =
      (req.headers['x-idempotency-key'] as string) || req.body?.idempotencyKey;

    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey)!;
      return res.status(200).json({
        ...cached.response,
        idempotentReplay: true,
      });
    }

    const { stageId, sessionType, sessionDate, records } = req.body;

    if (!stageId || !sessionType || !sessionDate || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'stageId, sessionType, sessionDate, and records array are required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Permission and scope validation
    // Level 1 servants may only submit for their assigned members
    if (user.roleLevel === 1) {
      const assignedMembers = await prisma.memberServantAssignment.findMany({
        where: { servantUserId: user.userId },
        select: { memberId: true },
      });
      const assignedIds = new Set(assignedMembers.map((a) => a.memberId));

      const hasUnauthorizedMember = records.some((r: any) => !assignedIds.has(r.memberId));
      if (hasUnauthorizedMember) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_SCOPE',
            message: 'Servants can only record attendance for directly assigned members',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } else if (user.roleLevel >= 2 && user.roleLevel <= 3) {
      if (!user.stageIds.includes(stageId)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'STAGE_SCOPE_MISMATCH',
            message: 'User does not have access to this stage',
          },
          timestamp: new Date().toISOString(),
        });
      }
    } else if (user.roleLevel === 4) {
      if (!user.stageIds.includes(stageId)) {
        const stage = await prisma.stage.findUnique({
          where: { id: stageId },
          select: { sectorId: true },
        });
        if (!stage || !user.sectorIds.includes(stage.sectorId)) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'SECTOR_SCOPE_MISMATCH',
              message: 'Stage does not belong to user assigned sector',
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    const parsedDate = new Date(sessionDate);
    // Normalize to date-only at midnight UTC to prevent time zone drift
    parsedDate.setUTCHours(0, 0, 0, 0);

    const savedRecords: any[] = [];
    const memberIdsToScan: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const item of records) {
        if (!item.memberId) continue;

        if (!item.status || item.status === 'UNSET') {
          await tx.memberAttendance.deleteMany({
            where: {
              memberId: item.memberId,
              sessionType: sessionType as MemberSessionType,
              sessionDate: parsedDate,
            },
          });
          memberIdsToScan.push(item.memberId);
          continue;
        }

        memberIdsToScan.push(item.memberId);

        const upserted = await tx.memberAttendance.upsert({
          where: {
            memberId_sessionType_sessionDate: {
              memberId: item.memberId,
              sessionType: sessionType as MemberSessionType,
              sessionDate: parsedDate,
            },
          },
          update: {
            status: item.status as PrismaAttendanceStatus,
            notes: item.notes !== undefined ? item.notes : null,
            recordedById: user.userId,
            idempotencyKey: idempotencyKey || null,
          },
          create: {
            memberId: item.memberId,
            stageId,
            sessionType: sessionType as MemberSessionType,
            sessionDate: parsedDate,
            status: item.status as PrismaAttendanceStatus,
            notes: item.notes || null,
            recordedById: user.userId,
            idempotencyKey: idempotencyKey || null,
          },
        });
        savedRecords.push(upserted);
      }
    });

    // Run absence detector pipeline for consecutive absences & auto-resolutions (FR-4.3 & FR-11.1)
    let alertResults: { generatedAlerts: any[]; resolvedAlerts: any[] } = {
      generatedAlerts: [],
      resolvedAlerts: [],
    };
    try {
      alertResults = await scanMemberAbsencesAfterAttendance({
        stageId,
        memberIds: memberIdsToScan,
      });
    } catch (scanErr) {
      console.error('Error running absence scan pipeline:', scanErr);
    }

    const summary = await calculateStageAttendanceSummary(stageId, sessionType, parsedDate);

    const responseData = {
      success: true,
      data: {
        stageId,
        sessionType,
        sessionDate: parsedDate.toISOString(),
        recordedCount: savedRecords.length,
        summary,
        alerts: {
          generatedCount: alertResults.generatedAlerts.length,
          resolvedCount: alertResults.resolvedAlerts.length,
        },
      },
      timestamp: new Date().toISOString(),
    };

    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, {
        response: responseData,
        timestamp: Date.now(),
      });
      // Purge old keys after 1 hour
      if (idempotencyCache.size > 1000) {
        const oneHourAgo = Date.now() - 3600000;
        for (const [key, val] of idempotencyCache.entries()) {
          if (val.timestamp < oneHourAgo) idempotencyCache.delete(key);
        }
      }
    }

    return res.status(200).json(responseData);
  }

  /**
   * GET /api/v1/attendance/members
   * Fetches attendance table by stage, sessionType, and date range.
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

    const stageId = req.query.stageId as string;
    const sessionType = req.query.sessionType as MemberSessionType | undefined;
    const sessionDate = req.query.sessionDate as string | undefined;
    const memberId = req.query.memberId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    if (!stageId && !memberId) {
      return res.status(400).json({
        success: false,
        error: { code: 'PARAM_REQUIRED', message: 'stageId or memberId must be provided' },
        timestamp: new Date().toISOString(),
      });
    }

    // Scope check
    if (stageId && user.roleLevel >= 2 && user.roleLevel <= 3 && !user.stageIds.includes(stageId)) {
      return res.status(403).json({
        success: false,
        error: { code: 'STAGE_SCOPE_MISMATCH', message: 'Forbidden' },
        timestamp: new Date().toISOString(),
      });
    }

    const whereClause: any = {};
    if (stageId) whereClause.stageId = stageId;
    if (memberId) whereClause.memberId = memberId;
    if (sessionType) whereClause.sessionType = sessionType;

    if (sessionDate) {
      const d = new Date(sessionDate);
      d.setUTCHours(0, 0, 0, 0);
      whereClause.sessionDate = d;
    } else if (startDate || endDate) {
      whereClause.sessionDate = {};
      if (startDate) whereClause.sessionDate.gte = new Date(startDate);
      if (endDate) whereClause.sessionDate.lte = new Date(endDate);
    }

    const records = await prisma.memberAttendance.findMany({
      where: whereClause,
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            educationalGrade: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: [{ sessionDate: 'desc' }, { member: { fullName: 'asc' } }],
    });

    return res.status(200).json({
      success: true,
      data: records,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/v1/attendance/members/:memberId/stats
   * Returns rolling 4-, 8-, and 12-week attendance statistics.
   */
  static async getMemberStats(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const memberId = req.params.memberId;
    const member = await prisma.servedMember.findUnique({
      where: { id: memberId },
      select: { id: true, stageId: true },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found' },
        timestamp: new Date().toISOString(),
      });
    }

    const stats = await getMemberRollingAttendance(memberId);

    return res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  }
}
