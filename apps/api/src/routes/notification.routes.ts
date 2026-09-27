import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();

router.use(requireAuth);

// Notifications & Preferences (FR-11.1–11.4)
router.get('/preferences', NotificationController.getPreferences);
router.put('/preferences', NotificationController.updatePreferences);
router.get('/logs', NotificationController.getLogs);
router.post('/absence-alert', NotificationController.dispatchAbsenceAlert);

export default router;
export { router as notificationRouter };
