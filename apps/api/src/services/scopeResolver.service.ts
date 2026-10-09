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

  // Level 5+ (General Secretary Level 5 & Admin Level 6): Organization-wide
  if (roleLevel >= 5) {
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

export interface ScopeStageItem {
  id: string;
  name: string;
  code: string;
  sectorId?: string;
  orderIndex?: number;
}

export interface ScopeSectorItem {
  id: string;
  name: string;
  code: string;
}

export interface UserReachableScopes {
  stages: ScopeStageItem[];
  sectors: ScopeSectorItem[];
  stageIds: string[];
  sectorIds: string[];
}

/**
 * Computes the stages and sectors reachable by a user based on hierarchical permissions:
 * - Level 5 (General Secretary / الأمين العام): All stages in the organization (from Nursery to Youth/University)
 * - Level 4 (Sector Secretary / أمين القطاع): All stages belonging to assigned sector(s)
 * - Level 1, 2, 3 (Servants & Stage Secretaries): Specifically assigned stages from scope assignments
 */
export async function getUserReachableScopes(user: {
  id: string;
  organizationId: string;
  role: { level: number; code: string };
  scopeAssignments?: any[];
}): Promise<UserReachableScopes> {
  const roleLevel = user.role?.level ?? 1;

  if (roleLevel >= 5) {
    // Level 5 (General Secretary / الأمين العام): All stages & sectors organization-wide
    const allStages = await prisma.stage.findMany({
      where: {
        sector: {
          organizationId: user.organizationId,
        },
      },
      select: {
        id: true,
        name: true,
        code: true,
        sectorId: true,
        orderIndex: true,
      },
    });

    const allSectors = await prisma.sector.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, code: true },
    });

    const sortedStages = [...allStages].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    return {
      stages: sortedStages,
      sectors: allSectors,
      stageIds: sortedStages.map((s) => s.id),
      sectorIds: allSectors.map((s) => s.id),
    };
  }

  if (roleLevel === 4) {
    // Level 4 (Sector Secretary / أمين قطاع): Sector and all its child stages
    const assignedSectorIds = (user.scopeAssignments || [])
      .map((sa: any) => sa.sectorId)
      .filter((id: any): id is string => id !== null && id !== undefined);

    const directStageIds = (user.scopeAssignments || [])
      .map((sa: any) => sa.stageId)
      .filter((id: any): id is string => id !== null && id !== undefined);

    const childStages = await prisma.stage.findMany({
      where: {
        OR: [
          { sectorId: { in: assignedSectorIds } },
          { id: { in: directStageIds } },
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
        sectorId: true,
        orderIndex: true,
      },
    });

    const sectors = (user.scopeAssignments || [])
      .filter((sa: any) => sa.sector)
      .map((sa: any) => ({
        id: sa.sector.id,
        name: sa.sector.name,
        code: sa.sector.code,
      }));

    const sortedStages = [...childStages].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    return {
      stages: sortedStages,
      sectors,
      stageIds: sortedStages.map((s) => s.id),
      sectorIds: assignedSectorIds,
    };
  }

  // Level 1, 2, 3 (Servant, Assistant Secretary, Stage Secretary)
  const assignedStages = (user.scopeAssignments || [])
    .filter((sa: any) => sa.stage)
    .map((sa: any) => ({
      id: sa.stage.id,
      name: sa.stage.name,
      code: sa.stage.code,
      sectorId: sa.stage.sectorId,
      orderIndex: sa.stage.orderIndex,
    }))
    .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const assignedSectors = (user.scopeAssignments || [])
    .filter((sa: any) => sa.sector)
    .map((sa: any) => ({
      id: sa.sector.id,
      name: sa.sector.name,
      code: sa.sector.code,
    }));

  return {
    stages: assignedStages,
    sectors: assignedSectors,
    stageIds: assignedStages.map((s: any) => s.id),
    sectorIds: assignedSectors.map((s: any) => s.id),
  };
}
