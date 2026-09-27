import { prisma } from '../config/prisma';

export interface EvaluatorResolutionResult {
  hasEvaluator: boolean;
  evaluatorUserId: string | null;
  evaluatorRoleCode: string | null;
  evaluatorRoleLevel: number | null;
  reason?: string;
}

/**
 * Resolves who evaluates whom according to the church hierarchy rules (Assumptions A1 & A3).
 *
 * Rules:
 * - Level 1 (خادم) & Level 2 (مساعد): Evaluator is Level 3 (امين الخدمة) of the same stage.
 * - Level 3 (امين الخدمة): Evaluator is Level 4 (امين قطاع) of the parent sector (Assumption A1).
 * - Level 4 (امين قطاع): Evaluator is Level 5 (امين عام) (Assumption A1).
 * - Level 5 (امين عام): Has NO evaluator; evaluative fields are disabled/hidden (Assumption A3).
 */
export async function getEvaluatorForUser(subjectUserId: string): Promise<EvaluatorResolutionResult> {
  const subjectUser = await prisma.user.findUnique({
    where: { id: subjectUserId },
    include: {
      role: true,
      scopeAssignments: {
        include: {
          stage: {
            include: { sector: true },
          },
          sector: true,
        },
      },
    },
  });

  if (!subjectUser) {
    throw new Error(`User with ID ${subjectUserId} not found`);
  }

  const roleLevel = subjectUser.role.level;

  // Assumption A3: General Secretary (Level 5) has no evaluator
  if (roleLevel === 5) {
    return {
      hasEvaluator: false,
      evaluatorUserId: null,
      evaluatorRoleCode: null,
      evaluatorRoleLevel: null,
      reason: 'General Secretary has identity fields only and no superior evaluator (Assumption A3)',
    };
  }

  // Assumption A1: Sector Secretary (Level 4) is evaluated by General Secretary (Level 5)
  if (roleLevel === 4) {
    const generalSecretary = await prisma.user.findFirst({
      where: {
        organizationId: subjectUser.organizationId,
        role: { level: 5 },
        status: 'ACTIVE',
      },
      include: { role: true },
    });

    if (!generalSecretary) {
      return {
        hasEvaluator: false,
        evaluatorUserId: null,
        evaluatorRoleCode: null,
        evaluatorRoleLevel: null,
        reason: 'No active General Secretary found in the organization',
      };
    }

    return {
      hasEvaluator: true,
      evaluatorUserId: generalSecretary.id,
      evaluatorRoleCode: generalSecretary.role.code,
      evaluatorRoleLevel: generalSecretary.role.level,
    };
  }

  // Assumption A1: Stage Secretary (Level 3 - امين الخدمة) is evaluated by Sector Secretary (Level 4 - امين قطاع)
  if (roleLevel === 3) {
    // Find the sector of the stage(s) assigned to this stage secretary
    const assignedStage = subjectUser.scopeAssignments.find((sa) => sa.stageId !== null)?.stage;
    const sectorId = assignedStage?.sectorId || subjectUser.scopeAssignments.find((sa) => sa.sectorId !== null)?.sectorId;

    if (!sectorId) {
      return {
        hasEvaluator: false,
        evaluatorUserId: null,
        evaluatorRoleCode: null,
        evaluatorRoleLevel: null,
        reason: 'Stage Secretary is not linked to any sector via stage assignment',
      };
    }

    // Find Sector Secretary assigned to that sector
    const sectorSecretaryAssignment = await prisma.scopeAssignment.findFirst({
      where: {
        sectorId,
        user: {
          role: { level: 4 },
          status: 'ACTIVE',
        },
      },
      include: {
        user: {
          include: { role: true },
        },
      },
    });

    if (!sectorSecretaryAssignment) {
      return {
        hasEvaluator: false,
        evaluatorUserId: null,
        evaluatorRoleCode: null,
        evaluatorRoleLevel: null,
        reason: 'No active Sector Secretary assigned to the parent sector',
      };
    }

    return {
      hasEvaluator: true,
      evaluatorUserId: sectorSecretaryAssignment.user.id,
      evaluatorRoleCode: sectorSecretaryAssignment.user.role.code,
      evaluatorRoleLevel: sectorSecretaryAssignment.user.role.level,
    };
  }

  // Level 1 (خادم) & Level 2 (مساعد امين الخدمة): Evaluated by Stage Secretary (Level 3 - امين الخدمة)
  if (roleLevel <= 2) {
    const stageId = subjectUser.scopeAssignments.find((sa) => sa.stageId !== null)?.stageId;

    if (!stageId) {
      return {
        hasEvaluator: false,
        evaluatorUserId: null,
        evaluatorRoleCode: null,
        evaluatorRoleLevel: null,
        reason: 'Servant is not assigned to any stage',
      };
    }

    const stageSecretaryAssignment = await prisma.scopeAssignment.findFirst({
      where: {
        stageId,
        user: {
          role: { level: 3 },
          status: 'ACTIVE',
        },
      },
      include: {
        user: {
          include: { role: true },
        },
      },
    });

    if (!stageSecretaryAssignment) {
      return {
        hasEvaluator: false,
        evaluatorUserId: null,
        evaluatorRoleCode: null,
        evaluatorRoleLevel: null,
        reason: 'No active Stage Secretary assigned to this stage',
      };
    }

    return {
      hasEvaluator: true,
      evaluatorUserId: stageSecretaryAssignment.user.id,
      evaluatorRoleCode: stageSecretaryAssignment.user.role.code,
      evaluatorRoleLevel: stageSecretaryAssignment.user.role.level,
    };
  }

  return {
    hasEvaluator: false,
    evaluatorUserId: null,
    evaluatorRoleCode: null,
    evaluatorRoleLevel: null,
    reason: 'Unknown hierarchy tier',
  };
}

/**
 * Validates whether `evaluatorUserId` has permission to evaluate `subjectUserId`.
 * Self-evaluation is strictly rejected.
 */
export async function canEvaluate(evaluatorUserId: string, subjectUserId: string): Promise<{ allowed: boolean; reason?: string }> {
  // Self-evaluation check
  if (evaluatorUserId === subjectUserId) {
    return {
      allowed: false,
      reason: 'Self-evaluation is strictly prohibited',
    };
  }

  const result = await getEvaluatorForUser(subjectUserId);
  if (!result.hasEvaluator) {
    return {
      allowed: false,
      reason: result.reason || 'Subject user has no eligible evaluator',
    };
  }

  if (result.evaluatorUserId !== evaluatorUserId) {
    return {
      allowed: false,
      reason: 'User is not the designated hierarchical evaluator for this subject',
    };
  }

  return { allowed: true };
}
