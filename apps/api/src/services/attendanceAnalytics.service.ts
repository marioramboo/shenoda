import { prisma } from '../config/prisma';
import { MemberSessionType } from '@shenoda/shared';

export interface AttendanceSummary {
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  lateCount: number;
  totalSessions: number;
  attendanceRatePercentage: number; // 0 - 100
}

export interface RollingAttendanceSummaries {
  week4: AttendanceSummary;
  week8: AttendanceSummary;
  week12: AttendanceSummary;
}

/**
 * Calculates rolling attendance rate for a member over the specified number of weeks (FR-4.2 & NFR-2.1).
 */
export async function calculateMemberAttendanceRate(
  memberId: string,
  weeks: number = 8
): Promise<AttendanceSummary> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - weeks * 7);

  const records = await prisma.memberAttendance.findMany({
    where: {
      memberId,
      sessionDate: {
        gte: sinceDate,
      },
      sessionType: {
        in: [MemberSessionType.MASS, MemberSessionType.SERVICE_ATTENDANCE],
      },
    },
    select: {
      status: true,
    },
  });

  let present = 0;
  let absent = 0;
  let excused = 0;
  let late = 0;

  for (const r of records) {
    if (r.status === 'PRESENT') present++;
    else if (r.status === 'ABSENT') absent++;
    else if (r.status === 'EXCUSED') excused++;
    else if (r.status === 'LATE') {
      late++;
      present++; // Late counts as attended in attendance rate
    }
  }

  const total = present + absent + excused;
  const rate = total > 0 ? Math.round((present / total) * 100) : 100;

  return {
    presentCount: present,
    absentCount: absent,
    excusedCount: excused,
    lateCount: late,
    totalSessions: total,
    attendanceRatePercentage: rate,
  };
}

/**
 * Computes 4-, 8-, and 12-week rolling attendance summaries for member profile badges.
 */
export async function getMemberRollingAttendance(
  memberId: string
): Promise<RollingAttendanceSummaries> {
  const [week4, week8, week12] = await Promise.all([
    calculateMemberAttendanceRate(memberId, 4),
    calculateMemberAttendanceRate(memberId, 8),
    calculateMemberAttendanceRate(memberId, 12),
  ]);

  return { week4, week8, week12 };
}

/**
 * Calculates rolling attendance rate for a servant over the specified number of weeks.
 */
export async function calculateServantAttendanceRate(
  servantUserId: string,
  weeks: number = 8
): Promise<AttendanceSummary> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - weeks * 7);

  const records = await prisma.servantAttendance.findMany({
    where: {
      servantUserId,
      sessionDate: {
        gte: sinceDate,
      },
    },
    select: {
      status: true,
    },
  });

  let present = 0;
  let absent = 0;
  let excused = 0;
  let late = 0;

  for (const r of records) {
    if (r.status === 'PRESENT') present++;
    else if (r.status === 'ABSENT') absent++;
    else if (r.status === 'EXCUSED') excused++;
    else if (r.status === 'LATE') {
      late++;
      present++;
    }
  }

  const total = present + absent + excused;
  const rate = total > 0 ? Math.round((present / total) * 100) : 100;

  return {
    presentCount: present,
    absentCount: absent,
    excusedCount: excused,
    lateCount: late,
    totalSessions: total,
    attendanceRatePercentage: rate,
  };
}

/**
 * Stage-wide aggregate statistics for a particular date or session type.
 */
export async function calculateStageAttendanceSummary(
  stageId: string,
  sessionType?: MemberSessionType,
  sessionDate?: Date
): Promise<{
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  lateCount: number;
  totalMembers: number;
  attendanceRatePercentage: number;
}> {
  const whereClause: any = { stageId };
  if (sessionType) whereClause.sessionType = sessionType;
  if (sessionDate) whereClause.sessionDate = sessionDate;

  const records = await prisma.memberAttendance.findMany({
    where: whereClause,
    select: { status: true },
  });

  let present = 0;
  let absent = 0;
  let excused = 0;
  let late = 0;

  for (const r of records) {
    if (r.status === 'PRESENT') present++;
    else if (r.status === 'ABSENT') absent++;
    else if (r.status === 'EXCUSED') excused++;
    else if (r.status === 'LATE') {
      late++;
      present++;
    }
  }

  const total = present + absent + excused;
  const rate = total > 0 ? Math.round((present / total) * 100) : 100;

  return {
    presentCount: present,
    absentCount: absent,
    excusedCount: excused,
    lateCount: late,
    totalMembers: total,
    attendanceRatePercentage: rate,
  };
}
