import { prisma } from '../config/prisma';
import { UserContext } from '@shenoda/shared';

export interface HydratedUserScope {
  userContext: UserContext;
  stageToSectorMap: Record<string, string>;
}

/**
 * Hydrates a user's full reachable stages, sectors, and context based on their role and assignments.
 */
export async function resolveUserContext(userId: string): Promise<HydratedUserScope> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      scopeAssignments: {
        include: {
          stage: true,
          sector: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  // Fetch all stages in the organization to construct stage-to-sector lookup
  const allStages = await prisma.stage.findMany({
    where: {
      sector: {
        organizationId: user.organizationId,
      },
    },
    select: {
      id: true,
      sectorId: true,
    },
  });

  const stageToSectorMap: Record<string, string> = {};
  for (const s of allStages) {
    stageToSectorMap[s.id] = s.sectorId;
  }

  const roleLevel = user.role.level;
  let reachableStageIds: string[] = [];
  let reachableSectorIds: string[] = [];

  // Level 5 (General Secretary / أمين عام): Organization-wide
  if (roleLevel === 5) {
    reachableStageIds = allStages.map((s) => s.id);
    const allSectors = await prisma.sector.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true },
    });
    reachableSectorIds = allSectors.map((s) => s.id);
  }
  // Level 4 (Sector Secretary / أمين قطاع): Sector and all its child stages
  else if (roleLevel === 4) {
    const assignedSectorIds = user.scopeAssignments
      .map((sa) => sa.sectorId)
      .filter((id): id is string => id !== null);

    reachableSectorIds = [...new Set(assignedSectorIds)];

    // Find all stages that belong to these sectors
    const childStages = allStages.filter((s) => reachableSectorIds.includes(s.sectorId));
    reachableStageIds = childStages.map((s) => s.id);
  }
  // Level 1, 2, 3 (خادم، مساعد، أمين الخدمة): Stage-based assignments
  else {
    const assignedStageIds = user.scopeAssignments
      .map((sa) => sa.stageId)
      .filter((id): id is string => id !== null);

    reachableStageIds = [...new Set(assignedStageIds)];

    // Parent sectors of assigned stages
    const parentSectorIds = reachableStageIds
      .map((stageId) => stageToSectorMap[stageId])
      .filter((id): id is string => id !== undefined);

    reachableSectorIds = [...new Set(parentSectorIds)];
  }

  const userContext: UserContext = {
    userId: user.id,
    organizationId: user.organizationId,
    roleLevel: user.role.level,
    roleCode: user.role.code,
    stageIds: reachableStageIds,
    sectorIds: reachableSectorIds,
    assignedMemberIds: [], // Ready for Phase 3
  };

  return {
    userContext,
    stageToSectorMap,
  };
}
