import express, { Application, Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { healthRouter } from './routes/health.routes';
import { permissionsRouter } from './routes/permissions.routes';
import { authRouter } from './routes/auth.routes';
import { accountRouter } from './routes/account.routes';
import { AccountController } from './controllers/account.controller';
import { memberRouter } from './routes/member.routes';
import { noteRouter } from './routes/note.routes';
import { attendanceRouter } from './routes/attendance.routes';
import { preparationRouter } from './routes/preparation.routes';
import { spiritualLifeRouter } from './routes/spiritualLife.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import yearPlanRouter from './routes/yearPlan.routes';
import calendarRouter from './routes/calendar.routes';
import { announcementRouter } from './routes/announcement.routes';
import { pollRouter } from './routes/poll.routes';
import { notificationRouter } from './routes/notification.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { reportRouter } from './routes/report.routes';
import { stageRouter } from './routes/stage.routes';
import { adminRouter } from './routes/admin.routes';
import { authenticateJwt } from './middleware/auth';
import { enforceIdempotency } from './middleware/idempotency';

export const createApp = (beforeRoutesMiddleware?: RequestHandler): Application => {
  const app = express();

  // Security & standard middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          !env.CORS_ORIGIN ||
          env.CORS_ORIGIN === '*' ||
          origin === env.CORS_ORIGIN ||
          origin.endsWith('.vercel.app') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Pre-route middleware (e.g. auth context in tests or production auth)
  if (beforeRoutesMiddleware) {
    app.use(beforeRoutesMiddleware);
  }

  // Global JWT authentication middleware (populates req.user if Bearer token present)
  app.use(authenticateJwt);

  // Phase 9: Network resilience & retry-safe idempotency (NFR-4.2)
  app.use(enforceIdempotency());

  // Health check routes
  app.use(healthRouter);
  app.use('/api', healthRouter);

  // Permission routes
  app.use('/api', permissionsRouter);

  // Auth routes (FR-1.1, FR-1.3, NFR-3.2)
  app.use('/api/v1/auth', authRouter);
  app.use('/api/auth', authRouter);

  // Account provisioning & management routes (FR-1.2, FR-1.4, Assumption A7)
  app.use('/api/v1/accounts', accountRouter);
  app.use('/api/accounts', accountRouter);

  // Served Member routes (FR-3.1, FR-3.2, FR-3.3, Assumption A2)
  app.use('/api/v1/members', memberRouter);
  app.use('/api/members', memberRouter);

  // Stages routes (FR-3.4 / Multi-stage oversight for General & Sector Secretaries)
  app.use('/api/v1/stages', stageRouter);
  app.use('/api/stages', stageRouter);

  // Roles routes
  app.get('/api/v1/roles', AccountController.listRoles);
  app.get('/api/roles', AccountController.listRoles);

  // Supervisory Notes routes (FR-8.1, FR-8.2)
  app.use('/api/v1/notes', noteRouter);
  app.use('/api/notes', noteRouter);

  // Phase 4: Attendance & Follow-up routes (FR-4.1, FR-4.2, FR-4.3)
  app.use('/api/v1/attendance', attendanceRouter);
  app.use('/api/attendance', attendanceRouter);

  // Phase 5: Servant Self-Service routes (FR-5.1, FR-5.2, FR-6.1, FR-13.2)
  app.use('/api/v1/preparations', preparationRouter);
  app.use('/api/preparations', preparationRouter);
  app.use('/api/v1/spiritual-life', spiritualLifeRouter);
  app.use('/api/spiritual-life', spiritualLifeRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/dashboard', dashboardRouter);

  // Phase 6: Year Plan & Calendar routes (FR-7.1, FR-7.2, FR-7.4, FR-12.1, FR-12.2)
  app.use('/api/v1/year-plans', yearPlanRouter);
  app.use('/api/year-plans', yearPlanRouter);
  app.use('/api/v1/calendar', calendarRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/v1/events', calendarRouter);
  app.use('/api/events', calendarRouter);

  // Phase 7: Announcements, Polls & Notifications (FR-9.1, FR-9.2, FR-10.1, FR-10.2, FR-10.3, FR-11.1–11.4)
  app.use('/api/v1/announcements', announcementRouter);
  app.use('/api/announcements', announcementRouter);
  app.use('/api/v1/polls', pollRouter);
  app.use('/api/polls', pollRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/notifications', notificationRouter);

  // Phase 8: Analytics & Export routes (FR-13.1, FR-14.1, FR-14.2, NFR-3.4)
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/v1/reports', reportRouter);
  app.use('/api/reports', reportRouter);

  // Exclusive Stealth Admin Command Center routes (Level 6)
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/admin', adminRouter);

  // Root welcome route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Church Service Management API (نظام إدارة الخدمة الكنسية)',
      version: '0.1.0-phase0',
      docs: '/api/docs',
      health: '/health',
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Global Error Handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  });

  return app;
};
