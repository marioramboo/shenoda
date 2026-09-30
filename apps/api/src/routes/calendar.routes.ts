import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { CalendarController } from '../controllers/calendar.controller';
import { YearPlanController } from '../controllers/yearPlan.controller';

const router = Router();

router.use(requireAuth);

// Calendar Events Listing & Details (FR-12.1)
router.get('/', CalendarController.getCalendarEvents);
router.get('/:id', CalendarController.getEventById);
router.patch('/:id', YearPlanController.updateEventInPlan);
router.delete('/:id', YearPlanController.deleteEventFromPlan);

// Volunteer Opt-In & Withdrawal (FR-7.2)
router.post('/:id/volunteer', CalendarController.volunteerForEvent);
router.delete('/:id/volunteer', CalendarController.withdrawVolunteer);

// Attendance Verification Bridge into جدول المتابعة (FR-12.2)
router.post('/:id/confirm-attendance', CalendarController.confirmAttendance);

export default router;
