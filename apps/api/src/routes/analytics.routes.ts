import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();

router.use(requireAuth);

// Analytics Dashboards (FR-13.1)
router.get('/dashboard', AnalyticsController.getDashboardAnalytics);
router.get('/', AnalyticsController.getDashboardAnalytics);

export default router;
export { router as analyticsRouter };
