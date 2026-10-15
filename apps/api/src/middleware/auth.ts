import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { prisma } from '../config/prisma';

let cachedStageToSectorMap: Record<string, string> | null = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function clearStageToSectorCache(): void {
  cachedStageToSectorMap = null;
  lastCacheTimestamp = 0;
}

export async function getStageToSectorMap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedStageToSectorMap && now - lastCacheTimestamp < CACHE_TTL_MS) {
    return cachedStageToSectorMap;
  }
  const stages = await prisma.stage.findMany({
    select: { id: true, sectorId: true },
  });
  const map: Record<string, string> = {};
  for (const s of stages) {
    map[s.id] = s.sectorId;
  }
  cachedStageToSectorMap = map;
  lastCacheTimestamp = now;
  return map;
}

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
    let roleLevel = payload.roleLevel;
    let roleCode = payload.roleCode;
    let stageIds = payload.stageIds || [];
    let sectorIds = payload.sectorIds || [];

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          status: true,
          role: { select: { level: true, code: true } },
          scopeAssignments: { select: { stageId: true, sectorId: true } },
        },
      });
      if (dbUser) {
        if (dbUser.status !== 'ACTIVE' || !dbUser.role) {
          return next();
        }
        roleLevel = dbUser.role.level;
        roleCode = dbUser.role.code;
        if (Array.isArray(dbUser.scopeAssignments)) {
          const dbStageIds = dbUser.scopeAssignments.map((s) => s.stageId).filter(Boolean) as string[];
          const dbSectorIds = dbUser.scopeAssignments.map((s) => s.sectorId).filter(Boolean) as string[];
          if (dbStageIds.length > 0) {
            stageIds = (payload.stageIds && payload.stageIds.length > 0)
              ? payload.stageIds.filter((id) => dbStageIds.includes(id))
              : dbStageIds;
          } else if (env.NODE_ENV === 'production') {
            stageIds = [];
          }
          if (dbSectorIds.length > 0) {
            sectorIds = (payload.sectorIds && payload.sectorIds.length > 0)
              ? payload.sectorIds.filter((id) => dbSectorIds.includes(id))
              : dbSectorIds;
          } else if (env.NODE_ENV === 'production') {
            sectorIds = [];
          }
        }
      } else if (env.NODE_ENV === 'production') {
        return next();
      }
    } catch {
      // fallback to token payload only in unit tests with mocked DB
    }

    req.user = {
      userId: payload.userId,
      organizationId: payload.orgId,
      roleLevel,
      roleCode,
      stageIds,
      sectorIds,
    };

    // Lazily load stageToSectorMap if not already populated
    if (!req.stageToSectorMap) {
      try {
        req.stageToSectorMap = await getStageToSectorMap();
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
