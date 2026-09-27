import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';
import { authenticateJwt, requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';
import { PermissionAction } from '@shenoda/shared';

export const accountRouter = Router();

// Ensure JWT authentication across account management endpoints
accountRouter.use(authenticateJwt);
accountRouter.use(requireAuth);

// Scoped servant account creation (FR-1.2, Assumption A7)
accountRouter.post(
  '/create',
  requirePermission(PermissionAction.MANAGE_SERVANT_ACCOUNTS),
  AccountController.createAccount
);

// General Secretary exclusive servant transfer & suspension (FR-1.4)
accountRouter.post('/:userId/status', AccountController.updateStatus);

// Audit history for account status changes
accountRouter.get('/:userId/history', AccountController.getAccountHistory);
