import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { AnnouncementController } from '../controllers/announcement.controller';

const router = Router();

router.use(requireAuth);

// Announcements (FR-10.1, FR-10.2, FR-10.3)
router.post('/', AnnouncementController.createAnnouncement);
router.get('/', AnnouncementController.listAnnouncements);
router.patch('/:id/read', AnnouncementController.markAsRead);

export default router;
export { router as announcementRouter };
