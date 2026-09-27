import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';

/**
 * NFR-4.2 Retry-Safe Idempotency Layer:
 * Prevents duplicated records caused by intermittent church basement mobile coverage
 * when users tap repeatedly. Caches the original response by user & idempotency token.
 */
export function enforceIdempotency(ttlSeconds: number = 300) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only apply idempotency to mutating requests
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    const key = req.header('X-Idempotency-Key') || req.header('Idempotency-Key');
    if (!key) return next();

    const userId = (req as any).user?.userId || (req as any).user?.id || 'anonymous';
    const cacheKey = `idempotency:${userId}:${key}`;

    try {
      const cachedResponse = await redisClient.get(cacheKey);

      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);
        res.setHeader('X-Cache-Lookup', 'HIT');
        res.setHeader('X-Idempotency-Replay', 'true');
        return res.status(parsed.status).json(
          typeof parsed.body === 'object' && parsed.body !== null
            ? { ...parsed.body, idempotentReplay: true }
            : parsed.body
        );
      }

      // Intercept res.json to cache the response payload
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        // Cache non-server-error responses (2xx, 3xx, 4xx client validations)
        if (res.statusCode < 500) {
          redisClient.set(
            cacheKey,
            JSON.stringify({ status: res.statusCode, body }),
            'EX',
            ttlSeconds
          ).catch((err: any) => {
            console.warn('Failed to cache idempotent response:', err.message);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.warn('Idempotency check error, proceeding with request:', err);
      next();
    }
  };
}
