import { Request, Response, NextFunction } from 'express';
import {
  PermissionAction,
  TargetScope,
  PERMISSION_MATRIX,
  hasPermission,
} from '@shenoda/shared';

export type ScopeExtractor = (req: Request) => TargetScope;

/**
 * Express middleware that enforces data-driven permission matrix checks and hierarchical scope control (NFR-3.1, NFR-6.1).
 */
export function requirePermission(
  action: PermissionAction,
  scopeExtractor?: ScopeExtractor
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    // 1. Verify authentication context
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required to perform this action',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Extract target scope
    const targetScope: TargetScope = scopeExtractor
      ? scopeExtractor(req)
      : {
          stageId: (req.params.stageId || req.body?.stageId || req.query?.stageId) as string | undefined,
          sectorId: (req.params.sectorId || req.body?.sectorId || req.query?.sectorId) as string | undefined,
          orgId: user.organizationId,
          targetUserId: (req.params.userId || req.body?.userId || req.query?.userId) as string | undefined,
          memberId: (req.params.memberId || req.body?.memberId || req.query?.memberId) as string | undefined,
        };

    const stageToSectorMap = req.stageToSectorMap || {};

    // 3. Evaluate permission
    const allowed = hasPermission(user, action, targetScope, stageToSectorMap);

    if (!allowed) {
      const rule = PERMISSION_MATRIX[action];
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED_SCOPE',
          message: 'Forbidden: Insufficient privileges or scope mismatch',
          details: {
            action,
            requiredMinLevel: rule?.minLevel,
            userLevel: user.roleLevel,
            targetScope,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    return next();
  };
}
