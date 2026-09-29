import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { calculateServantAttendanceRate } from '../services/attendanceAnalytics.service';
import { formatPreparation } from './preparation.controller';

export class DashboardController {
  /**
   * GET /api/v1/dashboard/servant-summary (FR-13.2)
   * Aggregates personal metrics, teaching schedules, and assigned member alerts.
   */
  static async getServantSummary(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      // 1. Personal rolling attendance rate (8 weeks)
      const attendanceStats = await calculateServantAttendanceRate(user.userId, 8);

      // 2. Preparations count & upcoming preparations
      const prepsCount = await prisma.lessonPreparation.count({
        where: { authorUserId: user.userId },
      });

      const upcomingPreps = await prisma.lessonPreparation.findMany({
        where: {
          authorUserId: user.userId,
          lessonDate: { gte: new Date() },
        },
        orderBy: { lessonDate: 'asc' },
        take: 3,
        include: {
          stage: { select: { id: true, name: true } },
          reviewedBy: {
            select: {
              id: true,
              fullName: true,
              role: { select: { id: true, name: true, level: true, code: true } },
            },
          },
        },
      });

      // 3. Days since last confession / communion (Self-only query)
      const lastConfession = await prisma.spiritualLifeEntry.findFirst({
        where: {
          userId: user.userId,
          sacrament: 'CONFESSION',
        },
        orderBy: { entryDate: 'desc' },
        select: { entryDate: true },
      });

      let daysSinceLastConfession: number | null = null;
      if (lastConfession) {
        const diffMs = Date.now() - new Date(lastConfession.entryDate).getTime();
        daysSinceLastConfession = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      // 4. Assigned members under care
      const assignments = await prisma.memberServantAssignment.findMany({
        where: { servantUserId: user.userId },
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              educationalGrade: true,
            },
          },
        },
      });

      const assignedMembers = assignments
        .map((a: any) => a.member)
        .filter((m: any) => m != null);

      // 5. Urgent absence alerts for assigned members or assigned directly to this servant
      const memberIds = assignedMembers.map((m: any) => m.id);
      const orClauses: any[] = [{ assignedFollowUpId: user.userId }];
      if (memberIds.length > 0) {
        orClauses.push({ memberId: { in: memberIds } });
      }

      const alerts = await prisma.absenceAlert.findMany({
        where: {
          alertStatus: 'ACTIVE',
          OR: orClauses,
        },
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              educationalGrade: true,
            },
          },
        },
        orderBy: { consecutiveCount: 'desc' },
      });

      return res.status(200).json({
        success: true,
        data: {
          servant: {
            id: user.userId,
            roleCode: user.roleCode,
            roleLevel: user.roleLevel,
          },
          metrics: {
            attendanceRatePercentage: attendanceStats.attendanceRatePercentage,
            attendancePresentCount: attendanceStats.presentCount,
            attendanceTotalSessions: attendanceStats.totalSessions,
            preparationsCount: prepsCount,
            assignedMembersCount: assignedMembers.length,
            daysSinceLastConfession,
          },
          upcomingLessons: upcomingPreps.map(formatPreparation),
          assignedMembers,
          urgentAbsenceAlerts: alerts,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error in getServantSummary:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Failed to aggregate servant dashboard summary',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
