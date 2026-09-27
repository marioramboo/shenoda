import { Request, Response, NextFunction } from 'express';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockoutUntil?: number;
}

// In-memory identity failed attempts store
const identityAttempts = new Map<string, AttemptRecord>();

// In-memory IP request counters
const ipRequests = new Map<string, { count: number; windowStart: number }>();

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const IP_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_IP_REQUESTS_PER_MIN = 100;

/**
 * Resets all rate limit tracking in-memory (useful for testing).
 */
export function resetAllRateLimits(): void {
  identityAttempts.clear;
  identityAttempts.clear();
  ipRequests.clear();
}

/**
 * Checks if a specific identity (phone/email) is currently locked out.
 */
export function checkLoginRateLimit(identifier: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const key = identifier.trim().toLowerCase();
  const now = Date.now();
  const record = identityAttempts.get(key);

  if (!record) {
    return { allowed: true };
  }

  // Check if currently locked out
  if (record.lockoutUntil && record.lockoutUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  // If lockout expired or window passed, reset
  if (now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    identityAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Records a failed login attempt for an identifier.
 */
export function recordFailedLoginAttempt(identifier: string): {
  remainingAttempts: number;
  isLocked: boolean;
  retryAfterSeconds?: number;
} {
  const key = identifier.trim().toLowerCase();
  const now = Date.now();
  let record = identityAttempts.get(key);

  if (!record || now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    record = { count: 1, firstAttemptAt: now };
    identityAttempts.set(key, record);
    return { remainingAttempts: MAX_FAILED_ATTEMPTS - 1, isLocked: false };
  }

  record.count += 1;

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;
    const retryAfterSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    return { remainingAttempts: 0, isLocked: true, retryAfterSeconds };
  }

  return {
    remainingAttempts: MAX_FAILED_ATTEMPTS - record.count,
    isLocked: false,
  };
}

/**
 * Clears failed login attempts upon successful authentication.
 */
export function clearLoginRateLimit(identifier: string): void {
  const key = identifier.trim().toLowerCase();
  identityAttempts.delete(key);
}

/**
 * Middleware enforcing identity-level brute-force lockout on login endpoint (NFR-3.2).
 */
export function loginBruteForceLimiter(req: Request, res: Response, next: NextFunction) {
  const identifier = req.body?.identifier;
  if (!identifier || typeof identifier !== 'string') {
    return next();
  }

  const status = checkLoginRateLimit(identifier);
  if (!status.allowed) {
    res.setHeader('Retry-After', status.retryAfterSeconds?.toString() || '900');
    return res.status(429).json({
      success: false,
      error: {
        code: 'ERR_RATE_LIMITED',
        message: 'تم حظر محاولات الدخول مؤقتاً لتكرار المحاولات الخاطئة. الرجاء المحاولة بعد 15 دقيقة.',
        details: {
          retryAfterSeconds: status.retryAfterSeconds,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
}

/**
 * Middleware enforcing global IP rate limiting across authentication routes (100 req/min).
 */
export function globalAuthRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown-ip';

  const now = Date.now();
  let ipRecord = ipRequests.get(ip);

  if (!ipRecord || now - ipRecord.windowStart > IP_WINDOW_MS) {
    ipRecord = { count: 1, windowStart: now };
    ipRequests.set(ip, ipRecord);
    return next();
  }

  ipRecord.count += 1;

  if (ipRecord.count > MAX_IP_REQUESTS_PER_MIN) {
    const retryAfterSeconds = Math.ceil((ipRecord.windowStart + IP_WINDOW_MS - now) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    return res.status(429).json({
      success: false,
      error: {
        code: 'ERR_RATE_LIMITED',
        message: 'تم تجاوز الحد الأقصى للطلبات من هذا العنوان. يرجى الانتظار دقيقة واحدة.',
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
}
