import { prisma } from '../config/prisma';
import { SpiritualSacrament as PrismaSpiritualSacrament } from '@prisma/client';

export class SpiritualLifeService {
  /**
   * Logs a new private spiritual entry for the authenticated user only (FR-6.1).
   */
  static async logEntry(data: {
    userId: string;
    sacrament: PrismaSpiritualSacrament;
    entryDate: Date;
    notes?: string;
    fatherName?: string;
  }) {
    return prisma.spiritualLifeEntry.create({
      data: {
        userId: data.userId,
        sacrament: data.sacrament,
        entryDate: data.entryDate,
        notes: data.notes || null,
        fatherName: data.fatherName || null,
      },
    });
  }

  /**
   * Retrieves the caller's own private spiritual journal entries (NFR-3.4).
   * Strictly enforces self-only access.
   */
  static async getEntriesForUser(
    targetUserId: string,
    callerUserId: string,
    filters?: {
      sacrament?: PrismaSpiritualSacrament;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    // Architectural Privacy Firewall Check (NFR-3.4 & FR-6.2)
    if (targetUserId !== callerUserId) {
      const error: any = new Error(
        'Forbidden: Spiritual life records are strictly private and quarantined. No supervisor or administrator may view them.'
      );
      error.code = 'ERR_SPIRITUAL_DATA_FIREWALL';
      error.status = 403;
      throw error;
    }

    const whereClause: any = { userId: callerUserId };

    if (filters?.sacrament) {
      whereClause.sacrament = filters.sacrament;
    }

    if (filters?.startDate || filters?.endDate) {
      whereClause.entryDate = {};
      if (filters.startDate) whereClause.entryDate.gte = filters.startDate;
      if (filters.endDate) whereClause.entryDate.lte = filters.endDate;
    }

    return prisma.spiritualLifeEntry.findMany({
      where: whereClause,
      orderBy: { entryDate: 'desc' },
    });
  }

  /**
   * Deletes a spiritual entry, ensuring the caller is the owner.
   */
  static async deleteEntry(entryId: string, callerUserId: string) {
    const entry = await prisma.spiritualLifeEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      const error: any = new Error('Entry not found');
      error.status = 404;
      throw error;
    }

    if (entry.userId !== callerUserId) {
      const error: any = new Error('Forbidden');
      error.code = 'ERR_SPIRITUAL_DATA_FIREWALL';
      error.status = 403;
      throw error;
    }

    return prisma.spiritualLifeEntry.delete({
      where: { id: entryId },
    });
  }

  /**
   * Returns the caller's checked items for the given period keys (owner-only).
   */
  static async getChecklist(callerUserId: string, periodKeys: string[]) {
    return prisma.spiritualChecklistEntry.findMany({
      where: { userId: callerUserId, periodKey: { in: periodKeys } },
      select: { itemKey: true, periodKey: true },
    });
  }

  /**
   * Checks or unchecks a single checklist item for the caller.
   */
  static async setChecklistItem(data: {
    userId: string;
    itemKey: string;
    periodKey: string;
    done: boolean;
  }) {
    if (data.done) {
      await prisma.spiritualChecklistEntry.upsert({
        where: {
          userId_itemKey_periodKey: {
            userId: data.userId,
            itemKey: data.itemKey,
            periodKey: data.periodKey,
          },
        },
        update: {},
        create: {
          userId: data.userId,
          itemKey: data.itemKey,
          periodKey: data.periodKey,
        },
      });
    } else {
      await prisma.spiritualChecklistEntry.deleteMany({
        where: {
          userId: data.userId,
          itemKey: data.itemKey,
          periodKey: data.periodKey,
        },
      });
    }
    return { itemKey: data.itemKey, periodKey: data.periodKey, done: data.done };
  }
}
