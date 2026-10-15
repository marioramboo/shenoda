import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { HealthResponse } from '@shenoda/shared';

export const healthRouter = Router();

healthRouter.get(
  ['/health', '//health', '/api/v1/system-status', '/system-status'],
  async (req: Request, res: Response) => {
    let dbStatus: 'connected' | 'disconnected' = 'connected';
    let isOk = true;

    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isUptimeMonitor =
      req.method === 'HEAD' ||
      req.query.db === 'false' ||
      ua.includes('uptimerobot');

    if (!isUptimeMonitor) {
      try {
        // Ping PostgreSQL via Prisma when requested by non-monitor clients
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
      } catch (error) {
        dbStatus = 'disconnected';
        isOk = false;
        console.warn('⚠️ Database ping check failed:', (error as Error).message);
      }
    }

    const responsePayload: HealthResponse = {
      status: isOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.1.0-phase0',
      database: dbStatus,
      environment: env.NODE_ENV,
    };

    res.status(200).json(responsePayload);
  }
);
