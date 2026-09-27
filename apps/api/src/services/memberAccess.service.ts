import { UserContext, MemberAccessLevel } from '@shenoda/shared';
import { prisma } from '../config/prisma';

export const ALLOWED_SERVANT_EVALUATIVE_FIELDS = [
  'financialStatus',
  'behaviorInService',
  'peerIntegration',
] as const;

export type EvaluativeField = (typeof ALLOWED_SERVANT_EVALUATIVE_FIELDS)[number];

/**
 * Resolves member access level based on user role hierarchy, administrative scopes,
 * and direct servant assignments (enforcing Assumption A2 and NFR-3.1).
 */
export async function resolveMemberAccess(
  user: UserContext,
  member: { id: string; stageId: string }
): Promise<MemberAccessLevel> {
  // Level 5: General Secretary (امين عام) -> Org-wide full access
  if (user.roleLevel >= 5) {
    return MemberAccessLevel.ORG_FULL_ACCESS;
  }

  // Level 4: Sector Secretary (امين قطاع) -> Full access if stage belongs to assigned sector
  if (user.roleLevel === 4) {
    if (user.stageIds && user.stageIds.includes(member.stageId)) {
      return MemberAccessLevel.SECTOR_FULL_ACCESS;
    }

    const stage = await prisma.stage.findUnique({
      where: { id: member.stageId },
      select: { sectorId: true },
    });

    if (stage && user.sectorIds.includes(stage.sectorId)) {
      return MemberAccessLevel.SECTOR_FULL_ACCESS;
    }

    return MemberAccessLevel.NONE;
  }

  // Level 2 & 3: Assistant (مساعد) and Stage Secretary (امين الخدمة) -> Full access within assigned stage
  if (user.roleLevel >= 2) {
    const isUserInStage = user.stageIds.includes(member.stageId);
    return isUserInStage ? MemberAccessLevel.STAGE_FULL_ACCESS : MemberAccessLevel.NONE;
  }

  // Level 1: Servant (خادم) -> Assumption A2: Only 3 evaluative fields if directly assigned
  if (user.roleLevel === 1) {
    // Check in-memory assignedMemberIds if present on user context
    if (user.assignedMemberIds && user.assignedMemberIds.includes(member.id)) {
      return MemberAccessLevel.ASSIGNED_EVALUATIVE_ONLY;
    }

    // Query database for direct assignment
    const assignment = await prisma.memberServantAssignment.findUnique({
      where: {
        memberId_servantUserId: {
          memberId: member.id,
          servantUserId: user.userId,
        },
      },
    });

    return assignment ? MemberAccessLevel.ASSIGNED_EVALUATIVE_ONLY : MemberAccessLevel.NONE;
  }

  return MemberAccessLevel.NONE;
}

/**
 * Verifies whether an update payload touches only allowed evaluative fields for an assigned servant.
 */
export function validateServantFieldRestrictions(fieldsToUpdate: string[]): {
  valid: boolean;
  unauthorizedFields: string[];
} {
  const unauthorizedFields = fieldsToUpdate.filter(
    (field) => !ALLOWED_SERVANT_EVALUATIVE_FIELDS.includes(field as any)
  );

  return {
    valid: unauthorizedFields.length === 0,
    unauthorizedFields,
  };
}
