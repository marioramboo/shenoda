import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { getUserReachableScopes } from '../services/scopeResolver.service';

export class StageController {
  /**
   * GET /api/v1/stages
   * Returns stages reachable by the authenticated user based on role hierarchy:
   * - Level 5 (General Secretary): All canonical stages in organization (from حضانة to الشباب)
   * - Level 4 (Sector Secretary): All stages belonging to assigned sector(s)
   * - Level 1, 2, 3: Directly assigned stages
   */
  public static async listStages(req: Request, res: Response) {
    try {
      const user = req.user!;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        include: {
          role: true,
          scopeAssignments: {
            include: {
              stage: true,
              sector: true,
            },
          },
        },
      });

      if (!dbUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'المستخدم غير موجود' },
        });
      }

      const { stages, sectors } = await getUserReachableScopes(dbUser);
      return res.status(200).json({
        success: true,
        stages,
        sectors,
      });
    } catch (err: any) {
      console.error('StageController.listStages error:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'ERR_INTERNAL_SERVER', message: 'تعذر تحميل المراحل' },
      });
    }
  }
}
