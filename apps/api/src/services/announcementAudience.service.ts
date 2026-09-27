import { prisma } from '../config/prisma';
import { TargetScopeLevel, UserContext } from '@shenoda/shared';

export interface ResolveAudienceInput {
  targetScopeType: TargetScopeLevel;
  targetStageId?: string;
  targetSectorId?: string;
  specificUserIds?: string[];
}

export class AnnouncementAudienceService {
  /**
   * Validates and resolves announcement recipients enforcing the Upward-Addressing Ban (FR-10.2 & Assumption A5).
   */
  static async validateAndResolveAudience(
    author: UserContext,
    input: ResolveAudienceInput
  ): Promise<string[]> {
    // 1. Author must have roleLevel >= 3 (امين الخدمة or higher)
    if (author.roleLevel < 3) {
      const err: any = new Error('إنشاء الإعلانات مقتصر على أمناء الخدمة والمشرفين (Level 3+)');
      err.code = 'ERR_UNAUTHORIZED_ANNOUNCER';
      err.status = 403;
      throw err;
    }

    let candidateUsers: Array<{ id: string; roleLevel: number }> = [];

    // Case A: Specific User IDs Targeted
    if (input.specificUserIds && input.specificUserIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: input.specificUserIds } },
        include: { role: { select: { level: true } } },
      });

      candidateUsers = users.map((u) => ({
        id: u.id,
        roleLevel: u.role.level,
      }));

      // THE UPWARD ADDRESSING BAN (FR-10.2 & Assumption A5):
      // If author explicitly targeted any user above their level, immediately reject with 403
      const upwardUsers = candidateUsers.filter((u) => u.roleLevel > author.roleLevel);
      if (upwardUsers.length > 0) {
        const err: any = new Error(
          `مخالفة قاعدة التسلسل الرئاسي (FR-10.2): لا يمكنك توجيه إعلانات إلى رتب أو مشرفين أعلى منك (${upwardUsers.length} مستخدمين برتبة أعلى)`
        );
        err.code = 'ERR_UPWARD_ADDRESSING_PROHIBITED';
        err.status = 403;
        throw err;
      }
    }
    // Case B: Stage-wide Targeting (STAGE_ALL / STAGE_SUBSET)
    else if (input.targetScopeType === TargetScopeLevel.STAGE_ALL || input.targetStageId) {
      const stageId = input.targetStageId || author.stageIds[0];

      if (!stageId) {
        const err: any = new Error('targetStageId is required for stage targeting');
        err.code = 'ERR_VALIDATION';
        err.status = 400;
        throw err;
      }

      // Level 3 Stage Secretary can target ONLY his own stage
      if (author.roleLevel === 3 && !author.stageIds.includes(stageId)) {
        const err: any = new Error('لا يمكنك توجيه إعلانات لمرحلة أخرى غير مسندة إليك');
        err.code = 'ERR_SCOPE_MISMATCH';
        err.status = 403;
        throw err;
      }

      // Fetch users assigned to stage
      const scopes = await prisma.scopeAssignment.findMany({
        where: { stageId },
        include: {
          user: {
            include: { role: { select: { level: true } } },
          },
        },
      });

      // Filter: Strictly at or below author's tier
      candidateUsers = scopes
        .filter((s) => s.user && s.user.role.level <= author.roleLevel)
        .map((s) => ({
          id: s.user.id,
          roleLevel: s.user.role.level,
        }));
    }
    // Case C: Sector-wide Targeting (SECTOR_ALL)
    else if (input.targetScopeType === TargetScopeLevel.SECTOR_ALL || input.targetSectorId) {
      if (author.roleLevel < 4) {
        const err: any = new Error('توجيه إعلان على مستوى القطاع مقتصر على أمناء القطاعات والأمين العام (Level 4+)');
        err.code = 'ERR_SCOPE_MISMATCH';
        err.status = 403;
        throw err;
      }

      const sectorId = input.targetSectorId || author.sectorIds[0];
      if (author.roleLevel === 4 && sectorId && !author.sectorIds.includes(sectorId)) {
        const err: any = new Error('لا يمكنك توجيه إعلانات لقطاع غير مسند إليك');
        err.code = 'ERR_SCOPE_MISMATCH';
        err.status = 403;
        throw err;
      }

      // Fetch users assigned to sector or stages in sector
      const stagesInSector = await prisma.stage.findMany({
        where: { sectorId },
        select: { id: true },
      });
      const stageIds = stagesInSector.map((st) => st.id);

      const scopes = await prisma.scopeAssignment.findMany({
        where: {
          OR: [
            { sectorId },
            { stageId: { in: stageIds } },
          ],
        },
        include: {
          user: {
            include: { role: { select: { level: true } } },
          },
        },
      });

      candidateUsers = scopes
        .filter((s) => s.user && s.user.role.level <= author.roleLevel)
        .map((s) => ({
          id: s.user.id,
          roleLevel: s.user.role.level,
        }));
    }
    // Case D: Church-wide Targeting (ORG_ALL)
    else if (input.targetScopeType === TargetScopeLevel.ORG_ALL) {
      if (author.roleLevel < 5) {
        const err: any = new Error('توجيه إعلان عام على مستوى الكنيسة مقتصر على الأمين العام فقط (Level 5)');
        err.code = 'ERR_SCOPE_MISMATCH';
        err.status = 403;
        throw err;
      }

      const allUsers = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        include: { role: { select: { level: true } } },
      });

      candidateUsers = allUsers.map((u) => ({
        id: u.id,
        roleLevel: u.role.level,
      }));
    }

    // Deduplicate recipient IDs
    const uniqueIds = Array.from(new Set(candidateUsers.map((u) => u.id)));
    return uniqueIds;
  }
}
