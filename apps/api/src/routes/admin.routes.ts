import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';

export const adminRouter = Router();

// Strictly guard ALL admin routes with requireAdmin (Level 6)
adminRouter.use(AdminController.requireAdmin);

adminRouter.get('/overview', AdminController.getOverview);
adminRouter.get('/audit-logs', AdminController.getAuditLogs);
adminRouter.get('/accounts', AdminController.getAccounts);
adminRouter.post('/reset-password', AdminController.resetPassword);
adminRouter.post('/create-account', AdminController.createAccount);
adminRouter.post('/update-status', AdminController.updateStatus);
