import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { ReportController } from '../controllers/report.controller';

const router = Router();

router.use(requireAuth);

// Reports & Data Export (FR-14.1, FR-14.2)
router.post('/pdf/member-dossier/:memberId', ReportController.exportMemberDossierPdf);
router.post('/pdf/stage-summary', ReportController.exportStageSummaryPdf);
router.post('/excel/stage-attendance', ReportController.exportStageAttendanceExcel);
router.post('/excel/stage-roster', ReportController.exportStageRosterExcel);

export default router;
export { router as reportRouter };
