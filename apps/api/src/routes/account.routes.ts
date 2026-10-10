import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';
import { authenticateJwt, requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';
import { PermissionAction } from '@shenoda/shared';

export const accountRouter = Router();

// Ensure JWT authentication across account management endpoints
accountRouter.use(authenticateJwt);
accountRouter.use(requireAuth);

// Roles available for assignment
accountRouter.get('/roles', AccountController.listRoles);

// Servant directory query & search (organization-wide for General Secretary, scoped for supervisors)
accountRouter.get('/servants', AccountController.listServants);

// Scoped servant account creation (FR-1.2, MANAGE_SERVANT_ACCOUNTS - Level 3+ Stage Secretary and above)
accountRouter.post(
  '/create',
  requirePermission(PermissionAction.MANAGE_SERVANT_ACCOUNTS),
  AccountController.createAccount
);

// Bulk CSV import for servants (FR-1.2, MANAGE_SERVANT_ACCOUNTS - Level 3+ Stage Secretary and above)
accountRouter.post(
  '/bulk-import',
  requirePermission(PermissionAction.MANAGE_SERVANT_ACCOUNTS),
  AccountController.bulkImportServants
);

// Scoped servant account editing (FR-1.2, MANAGE_SERVANT_ACCOUNTS)
accountRouter.patch(
  '/:userId',
  requirePermission(PermissionAction.MANAGE_SERVANT_ACCOUNTS),
  AccountController.updateAccount
);

// General Secretary exclusive servant transfer & suspension (FR-1.4)
accountRouter.post('/:userId/status', AccountController.updateStatus);

// Audit history for account status changes
accountRouter.get('/:userId/history', AccountController.getAccountHistory);

// Servant profile and stats retrieval
accountRouter.get('/:userId', AccountController.getAccountById);
