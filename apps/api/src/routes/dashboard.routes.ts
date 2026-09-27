import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { DashboardController } from '../controllers/dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/servant-summary', DashboardController.getServantSummary);
