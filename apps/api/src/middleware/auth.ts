import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { prisma } from '../config/prisma';

/**
 * Middleware that extracts Bearer JWT token from Authorization header
 * and attaches verified user context to req.user.
 */
export async function authenticateJwt(req: Request, _res: Response, next: NextFunction) {
  // If user is already set (e.g. injected in tests), keep it
  if (req.user) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  const payload = TokenService.verifyAccessToken(token);

  if (payload) {
    req.user = {
      userId: payload.userId,
      organizationId: payload.orgId,
      roleLevel: payload.roleLevel,
      roleCode: payload.roleCode,
      stageIds: payload.stageIds || [],
      sectorIds: payload.sectorIds || [],
    };

    // Lazily load stageToSectorMap if not already populated
    if (!req.stageToSectorMap) {
      try {
        const stages = await prisma.stage.findMany({
          select: { id: true, sectorId: true },
        });
        const map: Record<string, string> = {};
        for (const s of stages) {
          map[s.id] = s.sectorId;
        }
        req.stageToSectorMap = map;
      } catch {
        // Fallback if DB query fails
      }
    }
  }

  next();
}

/**
 * Middleware requiring authenticated user context.
 * Returns 401 if req.user is absent.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required to access this resource',
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
}
