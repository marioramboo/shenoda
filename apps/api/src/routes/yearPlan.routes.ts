import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { YearPlanController } from '../controllers/yearPlan.controller';
import { ServantPostController } from '../controllers/servantPost.controller';

const router = Router();

router.use(requireAuth);

// Official Year Plan Management (FR-7.1, FR-7.2)
router.post('/', YearPlanController.createYearPlan);
router.get('/', YearPlanController.listYearPlans);
router.get('/:id', YearPlanController.getYearPlanById);
router.post('/:id/events', YearPlanController.addEventToPlan);

// Servant Stage-Isolated Posts (FR-7.4)
router.post('/:id/servant-posts', ServantPostController.createPost);
router.get('/:id/servant-posts', ServantPostController.listPosts);

export default router;
