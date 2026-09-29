import { PermissionAction, ScopeRule, TargetScope, UserContext } from './types';
import { PERMISSION_MATRIX } from './matrix';

/**
 * Evaluates whether a user has permission to perform an action against a target scope.
 * Implements cumulative inheritance and hierarchical scope checking (NFR-3.1, NFR-6.1).
 */
export function hasPermission(
  user: UserContext,
  requiredAction: PermissionAction,
  targetScope: TargetScope = {},
  stageToSectorMap: Record<string, string> = {}
): boolean {
  // 1. Fetch rule from Permission Matrix
  const rule = PERMISSION_MATRIX[requiredAction];
  if (!rule) {
    return false;
  }

  // 2. Cumulative level check: User's level must be >= required minLevel
  if (user.roleLevel < rule.minLevel) {
    return false;
  }

  // 3. Organization boundary validation
  if (targetScope.orgId && targetScope.orgId !== user.organizationId) {
    return false;
  }

  // 4. Level 5 (General Secretary / أمين عام) has organization-wide authority
  if (user.roleLevel === 5) {
    return true;
  }

  // 5. Actions with ScopeRule.SELF must target the user themselves
  if (rule.defaultScope === ScopeRule.SELF) {
    // If targetUserId is specified, it must match current user's ID
    if (targetScope.targetUserId && targetScope.targetUserId !== user.userId) {
      return false;
    }
    return true;
  }

  // 6. Level 4 (Sector Secretary / أمين قطاع)
  if (user.roleLevel === 4) {
    // Check if target sector is assigned to user
    if (targetScope.sectorId && user.sectorIds.includes(targetScope.sectorId)) {
      return true;
    }

    // Check if target stage belongs to one of user's assigned sectors
    if (targetScope.stageId) {
      if (user.stageIds.includes(targetScope.stageId)) {
        return true;
      }
      const parentSectorId = stageToSectorMap[targetScope.stageId];
      if (parentSectorId && user.sectorIds.includes(parentSectorId)) {
        return true;
      }
      return false;
    }

    // If no specific stage/sector targeted and action is allowed at sector level, permit
    if (!targetScope.sectorId && !targetScope.stageId) {
      return true;
    }

    return false;
  }

  // 7. Level 2 & 3 (Assistant Secretary & Stage Secretary / مساعد وأمين مرحلة)
  if (user.roleLevel >= 2) {
    // Target stage must be within user's assigned stages
    if (targetScope.stageId) {
      return user.stageIds.includes(targetScope.stageId);
    }
    // If action is within user's stage scope
    return true;
  }

  // 8. Level 1 (Servant / خادم)
  if (user.roleLevel === 1) {
    // Restricted to assigned members for member evaluation
    if (rule.defaultScope === ScopeRule.ASSIGNED_MEMBERS) {
      if (targetScope.memberId) {
        return Boolean(user.assignedMemberIds && user.assignedMemberIds.includes(targetScope.memberId));
      }
      // If no specific member targeted or checking general capability
      return true;
    }

    // Read access to Stage resources (e.g. View Year Plan, View Announcements)
    if (rule.defaultScope === ScopeRule.STAGE) {
      if (targetScope.stageId) {
        return user.stageIds.includes(targetScope.stageId);
      }
      return true;
    }
  }

  return false;
}
