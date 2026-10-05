import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { HealthResponse } from '@shenoda/shared';

export const healthRouter = Router();

healthRouter.get(['/health', '//health'], async (_req: Request, res: Response) => {
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  let isOk = true;

  try {
    // Ping PostgreSQL via Prisma
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
    isOk = false;
    console.warn('⚠️ Database ping check failed:', (error as Error).message);
  }

  const responsePayload: HealthResponse = {
    status: isOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '0.1.0-phase0',
    database: dbStatus,
    environment: env.NODE_ENV,
  };

  // Return 200 even if degraded so health monitors receive detailed payload,
  // or return 200 when ok
  res.status(isOk ? 200 : 200).json(responsePayload);
});
