import { prisma } from '../../config/prisma';
import { UserContext } from '@shenoda/shared';
import { assertNoSpiritualDataInPayload } from './securityAssert';

export interface AnalyticsQueryOptions {
  stageId?: string;
  sectorId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExecutiveMetrics {
  activeMembersCount: number;
  averageAttendanceRate: number; // percentage (0-100)
  prepComplianceRate: number; // percentage (0-100)
  outstandingAbsenceAlerts: number;
}

export interface AttendanceTrendPoint {
  date: string;
  label: string;
  massPresent: number;
  sundaySchoolPresent: number;
  totalPresent: number;
}

export interface AbsenceFunnel {
  regularCount: number; // >= 80% attendance
  irregularCount: number; // 50% - 79%
  highRiskCount: number; // < 50% or active absence alert
}

export interface StageComparisonItem {
  stageId: string;
  stageName: string;
  membersCount: number;
  attendanceRate: number;
  prepCompliance: number;
  activeAlertsCount: number;
}

export interface DashboardAnalyticsPayload {
  scopeLevel: number;
  stageId?: string | null;
  targetStageId: string | null;
  targetSectorId: string | null;
  metrics: ExecutiveMetrics;
  attendanceTrends: AttendanceTrendPoint[];
  absenceFunnel: AbsenceFunnel;
  stageComparisons?: StageComparisonItem[];
}

export class DashboardAnalyticsService {
  /**
   * Computes tier-scoped analytics tailored to caller's administrative authority (FR-13.1).
   * Automatically executes the Spiritual Data Blacklist firewall (NFR-3.4) before returning.
   */
  static async getScopedAnalytics(
    user: UserContext,
    options: AnalyticsQueryOptions = {}
  ): Promise<DashboardAnalyticsPayload> {
    const roleLevel = user.roleLevel;
    let targetStageIds: string[] = [];
    let sectorStageIds: string[] = [];
    let targetSectorId: string | null = null;
    let singleStageId: string | null = null;

    // 1. Validate Scope & Hierarchy
    if (roleLevel <= 3) {
      // Stage level: restricted strictly to user's assigned stages
      if (options.stageId && !user.stageIds.includes(options.stageId)) {
        const err: any = new Error('لا يمكنك الاطلاع على إحصائيات مرحلة أخرى غير مسندة إليك');
        err.code = 'ERR_SCOPE_MISMATCH';
        err.status = 403;
        throw err;
      }
      singleStageId = options.stageId || user.stageIds[0] || null;
      targetStageIds = singleStageId ? [singleStageId] : user.stageIds;
    } else if (roleLevel === 4) {
      // Sector level: restricted strictly to user's assigned sectors
      targetSectorId = options.sectorId || user.sectorIds[0] || null;
      if (targetSectorId && !user.sectorIds.includes(targetSectorId)) {
        const err: any = new Error('لا يمكنك الاطلاع على إحصائيات قطاع خارج نطاق إشرافك');
        err.code = 'ERR_SCOPE_MISMATCH';
        err.status = 403;
        throw err;
      }

      // Fetch all stages in sector
      const stagesInSector = await prisma.stage.findMany({
        where: targetSectorId ? { sectorId: targetSectorId } : undefined,
        select: { id: true },
      });
      const validSectorStageIds = stagesInSector.map((s) => s.id);
      sectorStageIds = validSectorStageIds;

      if (options.stageId) {
        if (!validSectorStageIds.includes(options.stageId)) {
          const err: any = new Error('المرحلة المطلوبة لا تتبع القطاع المسند إليك');
          err.code = 'ERR_SCOPE_MISMATCH';
          err.status = 403;
          throw err;
        }
        singleStageId = options.stageId;
        targetStageIds = [options.stageId];
      } else {
        targetStageIds = validSectorStageIds;
      }
    } else {
      // General Secretary (Level 5): Church-wide access
      if (options.stageId) {
        singleStageId = options.stageId;
        targetStageIds = [options.stageId];
      } else if (options.sectorId) {
        targetSectorId = options.sectorId;
        const stagesInSector = await prisma.stage.findMany({
          where: { sectorId: options.sectorId },
          select: { id: true },
        });
        targetStageIds = stagesInSector.map((s) => s.id);
      } else {
        const allStages = await prisma.stage.findMany({ select: { id: true } });
        targetStageIds = allStages.map((s) => s.id);
      }
    }

    // 2. Aggregate Active Members Count
    const activeMembers = await prisma.servedMember.findMany({
      where: {
        stageId: { in: targetStageIds },
      },
      select: { id: true, stageId: true },
    });
    const activeMembersCount = activeMembers.length;

    // 3. Aggregate Member Attendance Rate
    const attendanceRecords = await prisma.memberAttendance.findMany({
      where: {
        stageId: { in: targetStageIds },
      },
      select: {
        id: true,
        memberId: true,
        sessionType: true,
        sessionDate: true,
        status: true,
      },
    });

    const totalAttendanceLogs = attendanceRecords.length;
    const presentAttendanceLogs = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
    const averageAttendanceRate =
      totalAttendanceLogs > 0 ? Math.round((presentAttendanceLogs / totalAttendanceLogs) * 100) : 0;

    // 4. Aggregate Lesson Preparation Compliance
    const preparations = await prisma.lessonPreparation.findMany({
      where: {
        stageId: { in: targetStageIds },
      },
      select: { id: true, status: true },
    });
    const submittedOrReviewedPreps = preparations.filter(
      (p) => p.status === 'SUBMITTED' || p.status === 'REVIEWED'
    ).length;
    const prepComplianceRate =
      preparations.length > 0
        ? Math.round((submittedOrReviewedPreps / preparations.length) * 100)
        : 100;

    // 5. Aggregate Outstanding Absence Alerts
    const activeAlerts = await prisma.absenceAlert.findMany({
      where: {
        stageId: { in: targetStageIds },
        alertStatus: 'ACTIVE',
      },
      select: { id: true, memberId: true },
    });
    const outstandingAbsenceAlerts = activeAlerts.length;

    // 6. Compute Attendance Trends (Weekly Points)
    const trendsMap: Record<string, { massPresent: number; ssPresent: number; totalPresent: number }> =
      {};

    for (const r of attendanceRecords) {
      if (r.status !== 'PRESENT') continue;
      const dateKey = new Date(r.sessionDate).toISOString().split('T')[0];
      if (!trendsMap[dateKey]) {
        trendsMap[dateKey] = { massPresent: 0, ssPresent: 0, totalPresent: 0 };
      }
      if (r.sessionType === 'MASS') {
        trendsMap[dateKey].massPresent++;
      } else {
        trendsMap[dateKey].ssPresent++;
      }
      trendsMap[dateKey].totalPresent++;
    }

    const attendanceTrends: AttendanceTrendPoint[] = Object.keys(trendsMap)
      .sort()
      .slice(-8) // Last 8 sessions
      .map((dateStr) => {
        const item = trendsMap[dateStr];
        return {
          date: dateStr,
          label: new Date(dateStr).toLocaleDateString('ar-EG', {
            month: 'short',
            day: 'numeric',
          }),
          massPresent: item.massPresent,
          sundaySchoolPresent: item.ssPresent,
          totalPresent: item.totalPresent,
        };
      });

    // 7. Compute Absence Risk Funnel
    let regularCount = 0;
    let irregularCount = 0;
    let highRiskCount = 0;

    const alertMemberIdSet = new Set(activeAlerts.map((a) => a.memberId).filter(Boolean));

    for (const member of activeMembers) {
      if (alertMemberIdSet.has(member.id)) {
        highRiskCount++;
        continue;
      }
      const memberLogs = attendanceRecords.filter((r) => r.memberId === member.id);
      if (memberLogs.length === 0) {
        regularCount++;
        continue;
      }
      const presentCount = memberLogs.filter((r) => r.status === 'PRESENT').length;
      const rate = (presentCount / memberLogs.length) * 100;
      if (rate >= 80) regularCount++;
      else if (rate >= 50) irregularCount++;
      else highRiskCount++;
    }

    // 8. Compute Comparative Stage Matrix for Sector/General Secretaries (FR-13.1)
    let stageComparisons: StageComparisonItem[] | undefined;
    if (roleLevel >= 4) {
      const compareStageIds =
        targetStageIds.length > 1
          ? targetStageIds
          : sectorStageIds.length > 0
          ? sectorStageIds
          : targetStageIds;

      if (compareStageIds.length > 0) {
        const allStagesMeta = await prisma.stage.findMany({
          where: { id: { in: compareStageIds } },
          select: { id: true, name: true },
        });

        // Ensure we include members, attendance, and preps for all compared stages
        const compareMembers =
          compareStageIds.length === targetStageIds.length
            ? activeMembers
            : await prisma.servedMember.findMany({
                where: { stageId: { in: compareStageIds } },
                select: { id: true, stageId: true },
              });

        const compareAttendance =
          compareStageIds.length === targetStageIds.length
            ? attendanceRecords
            : await prisma.memberAttendance.findMany({
                where: { stageId: { in: compareStageIds } },
                select: { memberId: true, status: true, sessionType: true, stageId: true },
              });

        stageComparisons = allStagesMeta.map((st) => {
          const stMembers = compareMembers.filter((m) => m.stageId === st.id).length;
          const stAttendance = compareAttendance.filter((r) => (r as any).stageId === st.id);
          const stPresent = stAttendance.filter((r) => r.status === 'PRESENT').length;
          const stRate =
            stAttendance.length > 0 ? Math.round((stPresent / stAttendance.length) * 100) : 0;
          const stPreps = preparations.filter((p) => (p as any).stageId === st.id);
          const stPrepSubmitted = stPreps.filter((p) => p.status === 'SUBMITTED' || p.status === 'REVIEWED').length;
          const stPrepRate = stPreps.length > 0 ? Math.round((stPrepSubmitted / stPreps.length) * 100) : 100;
          const stAlerts = activeAlerts.filter((a) => (a as any).stageId === st.id).length;

          return {
            stageId: st.id,
            stageName: st.name,
            membersCount: stMembers,
            attendanceRate: stRate,
            prepCompliance: stPrepRate,
            activeAlertsCount: stAlerts,
          };
        });
      }
    }

    const payload: DashboardAnalyticsPayload = {
      scopeLevel: roleLevel,
      stageId: singleStageId,
      targetStageId: singleStageId,
      targetSectorId,
      metrics: {
        activeMembersCount,
        averageAttendanceRate,
        prepComplianceRate,
        outstandingAbsenceAlerts,
      },
      attendanceTrends,
      absenceFunnel: {
        regularCount,
        irregularCount,
        highRiskCount,
      },
      stageComparisons,
    };

    // 9. NFR-3.4 CRITICAL SECURITY FIREWALL ASSERTION:
    // Guarantees zero spiritual records leak into the analytics payload.
    assertNoSpiritualDataInPayload(payload);

    return payload;
  }
}
