import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { MemberAttendanceController } from '../controllers/memberAttendance.controller';
import { ServantAttendanceController } from '../controllers/servantAttendance.controller';
import { AlertController } from '../controllers/alert.controller';

export const attendanceRouter = Router();

// All attendance routes require authentication
attendanceRouter.use(requireAuth);

// -------------------------------------------------------------
// MEMBER ATTENDANCE (المخدومين)
// -------------------------------------------------------------
attendanceRouter.post('/members/batch', MemberAttendanceController.recordBatch);
attendanceRouter.get('/members', MemberAttendanceController.getAttendance);
attendanceRouter.get('/members/:memberId/stats', MemberAttendanceController.getMemberStats);

// -------------------------------------------------------------
// SERVANT ATTENDANCE (الخدام والأمناء - جدول المتابعة)
// -------------------------------------------------------------
attendanceRouter.post('/servants/batch', ServantAttendanceController.recordBatch);
attendanceRouter.get('/servants', ServantAttendanceController.getAttendance);
attendanceRouter.get('/servants/list', ServantAttendanceController.listServants);
attendanceRouter.get('/servants/history', ServantAttendanceController.getHistory);
attendanceRouter.get('/servants/allowed-sessions', ServantAttendanceController.getAllowedSessions);

// -------------------------------------------------------------
// ABSENCE ALERTS (تنبيهات الغياب المتتالي والافتقاد)
// -------------------------------------------------------------
attendanceRouter.get('/alerts', AlertController.listAlerts);
attendanceRouter.patch('/alerts/:id/resolve', AlertController.resolveAlert);
attendanceRouter.patch('/alerts/:id/dismiss', AlertController.dismissAlert);
