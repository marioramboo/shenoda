import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/authorize';
import { PermissionAction, PERMISSION_MATRIX } from '@shenoda/shared';
import { canEvaluate, getEvaluatorForUser } from '../services/evaluationHierarchy.service';
import { resolveUserContext } from '../services/scopeResolver.service';

export const permissionsRouter = Router();

// Test & inspect permission matrix
permissionsRouter.get('/permissions/matrix', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: PERMISSION_MATRIX,
    timestamp: new Date().toISOString(),
  });
});

// Middleware to simulate or load user context for testing
export const attachTestUser = (userId: string) => {
  return async (req: Request, _res: Response, next: () => void) => {
    try {
      const { userContext, stageToSectorMap } = await resolveUserContext(userId);
      req.user = userContext;
      req.stageToSectorMap = stageToSectorMap;
    } catch {
      // User might not exist yet if DB unseeded
    }
    next();
  };
};

// Route protected by MANAGE_MEMBER_FULL (Level 2+ on stage)
permissionsRouter.post(
  '/stages/:stageId/members',
  requirePermission(PermissionAction.MANAGE_MEMBER_FULL),
  (req: Request, res: Response) => {
    res.json({
      success: true,
      message: `Member created successfully in stage ${req.params.stageId}`,
      user: req.user,
      timestamp: new Date().toISOString(),
    });
  }
);

// Route protected by MANAGE_YEAR_PLAN_FULL (Level 3+ on stage)
permissionsRouter.put(
  '/stages/:stageId/year-plan',
  requirePermission(PermissionAction.MANAGE_YEAR_PLAN_FULL),
  (req: Request, res: Response) => {
    res.json({
      success: true,
      message: `Year plan updated for stage ${req.params.stageId}`,
      timestamp: new Date().toISOString(),
    });
  }
);

// Route protected by EDIT_SECRETARY_DATA (Level 4+ on sector)
permissionsRouter.patch(
  '/sectors/:sectorId/secretaries',
  requirePermission(PermissionAction.EDIT_SECRETARY_DATA),
  (req: Request, res: Response) => {
    res.json({
      success: true,
      message: `Secretary data updated in sector ${req.params.sectorId}`,
      timestamp: new Date().toISOString(),
    });
  }
);

// Route protected by TRANSFER_SUSPEND_SERVANT (Level 5 only - General Secretary)
permissionsRouter.post(
  '/servants/:userId/status',
  requirePermission(PermissionAction.TRANSFER_SUSPEND_SERVANT),
  (req: Request, res: Response) => {
    res.json({
      success: true,
      message: `Status updated for servant ${req.params.userId}`,
      timestamp: new Date().toISOString(),
    });
  }
);

// Route checking who evaluates a given user (Assumptions A1 & A3)
permissionsRouter.get(
  '/users/:userId/evaluator',
  async (req: Request, res: Response) => {
    try {
      const result = await getEvaluatorForUser(req.params.userId);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: (error as Error).message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Route to submit servant evaluation
permissionsRouter.put(
  '/users/:userId/evaluation',
  async (req: Request, res: Response) => {
    const evaluatorId = req.user?.userId || (req.headers['x-evaluator-id'] as string);

    if (!evaluatorId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Evaluator identification required' },
      });
    }

    const check = await canEvaluate(evaluatorId, req.params.userId);

    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_EVALUATOR',
          message: check.reason,
        },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: `Evaluation submitted successfully for user ${req.params.userId} by ${evaluatorId}`,
      timestamp: new Date().toISOString(),
    });
  }
);
