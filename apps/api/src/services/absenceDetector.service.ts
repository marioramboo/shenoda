import { prisma } from '../config/prisma';
import { MemberSessionType } from '@shenoda/shared';

export interface AbsenceScanOptions {
  stageId: string;
  memberIds?: string[];
  threshold?: number; // default: 2
}

/**
 * Scans recent attendance history for members to detect consecutive absences and trigger
 * or resolve absence alerts (FR-4.3 & FR-11.1).
 */
export async function scanMemberAbsencesAfterAttendance({
  stageId,
  memberIds,
  threshold = 2,
}: AbsenceScanOptions) {
  // If specific memberIds not provided, fetch all members in this stage
  let targetMemberIds = memberIds;
  if (!targetMemberIds || targetMemberIds.length === 0) {
    const stageMembers = await prisma.servedMember.findMany({
      where: { stageId },
      select: { id: true },
    });
    targetMemberIds = stageMembers.map((m) => m.id);
  }

  const generatedAlerts: any[] = [];
  const resolvedAlerts: any[] = [];

  for (const memberId of targetMemberIds) {
    // 1. Fetch recent attendance records for this member (ordered by sessionDate descending)
    const recentRecords = await prisma.memberAttendance.findMany({
      where: {
        memberId,
        sessionType: {
          in: [MemberSessionType.SERVICE_ATTENDANCE, MemberSessionType.MASS],
        },
      },
      orderBy: {
        sessionDate: 'desc',
      },
      take: 10,
    });

    if (recentRecords.length === 0) continue;

    const latestRecord = recentRecords[0];

    // Case A: Member is PRESENT or LATE on the most recent session -> Auto-resolve active alert
    if (latestRecord.status === 'PRESENT' || latestRecord.status === 'LATE') {
      const activeAlert = await prisma.absenceAlert.findFirst({
        where: {
          memberId,
          alertStatus: 'ACTIVE',
        },
      });

      if (activeAlert) {
        const updated = await prisma.absenceAlert.update({
          where: { id: activeAlert.id },
          data: {
            alertStatus: 'RESOLVED',
            resolvedAt: new Date(),
            resolutionNotes: 'تم حل التنبيه تلقائياً بحضور المخدوم في الخدمة',
          },
        });
        resolvedAlerts.push(updated);
      }
      continue;
    }

    // Case B: Calculate consecutive ABSENT count starting from the most recent session
    let consecutiveAbsences = 0;
    let lastAttendedDate: Date | null = null;

    for (const record of recentRecords) {
      if (record.status === 'ABSENT') {
        consecutiveAbsences++;
      } else {
        if (record.status === 'PRESENT' || record.status === 'LATE') {
          lastAttendedDate = record.sessionDate;
        }
        break; // Stop at first non-absent session
      }
    }

    // If consecutive absences exceed or meet threshold
    if (consecutiveAbsences >= threshold) {
      const existingAlert = await prisma.absenceAlert.findFirst({
        where: {
          memberId,
          alertStatus: 'ACTIVE',
        },
      });

      if (existingAlert) {
        // Update consecutive count if changed
        if (existingAlert.consecutiveCount !== consecutiveAbsences) {
          await prisma.absenceAlert.update({
            where: { id: existingAlert.id },
            data: {
              consecutiveCount: consecutiveAbsences,
              lastAttendedDate: lastAttendedDate || existingAlert.lastAttendedDate,
            },
          });
        }
      } else {
        // Resolve designated follow-up servant:
        // 1. Direct assigned servant for this member
        const assignment = await prisma.memberServantAssignment.findFirst({
          where: { memberId },
          select: { servantUserId: true },
        });

        let assignedFollowUpId = assignment?.servantUserId || null;

        // 2. If unassigned, find Assistant Secretary (Level 2) or Stage Secretary (Level 3)
        if (!assignedFollowUpId) {
          const supervisorAssignment = await prisma.scopeAssignment.findFirst({
            where: {
              stageId,
              user: {
                role: { level: { in: [2, 3] } },
                status: 'ACTIVE',
              },
            },
            select: { userId: true },
          });
          assignedFollowUpId = supervisorAssignment?.userId || null;
        }

        const newAlert = await prisma.absenceAlert.create({
          data: {
            targetType: 'MEMBER',
            memberId,
            stageId,
            consecutiveCount: consecutiveAbsences,
            lastAttendedDate,
            alertStatus: 'ACTIVE',
            assignedFollowUpId,
          },
        });

        generatedAlerts.push(newAlert);
      }
    }
  }

  return { generatedAlerts, resolvedAlerts };
}
