import { prisma } from '../config/prisma';
import { mapEventCategoryToSessionType } from '@shenoda/shared';

export interface ConfirmAttendanceResult {
  confirmation: any;
  servantAttendance: any;
}

export class EventAttendanceSyncService {
  /**
   * Confirms attendance of a servant for a calendar event and automatically bridges into ServantAttendance (FR-12.2).
   */
  static async confirmServantAttendance(
    eventId: string,
    servantUserId: string,
    confirmedById: string
  ): Promise<ConfirmAttendanceResult> {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('CALENDAR_EVENT_NOT_FOUND');
    }

    // 1. Upsert EventAttendanceConfirmation record
    const confirmation = await prisma.eventAttendanceConfirmation.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: servantUserId,
        },
      },
      update: {
        confirmedById,
        confirmedAt: new Date(),
      },
      create: {
        eventId,
        userId: servantUserId,
        confirmedById,
        confirmedAt: new Date(),
      },
    });

    // 2. Map calendar event category to ServantSessionType
    const sessionType = mapEventCategoryToSessionType(event.category) as any;

    // Normalize date to midnight UTC/local
    const sessionDate = new Date(event.startDate);
    sessionDate.setHours(0, 0, 0, 0);

    // 3. Upsert record directly into ServantAttendance (bridging into جدول المتابعة)
    const servantAttendance = await prisma.servantAttendance.upsert({
      where: {
        servantUserId_sessionType_sessionDate: {
          servantUserId,
          sessionType,
          sessionDate,
        },
      },
      update: {
        status: 'PRESENT' as any,
        recordedById: confirmedById,
        notes: `حضور تلقائي من التقويم: ${event.title}`,
      },
      create: {
        servantUserId,
        stageId: event.stageId,
        sessionType,
        sessionDate,
        status: 'PRESENT' as any,
        recordedById: confirmedById,
        notes: `حضور تلقائي من التقويم: ${event.title}`,
      },
    });

    return { confirmation, servantAttendance };
  }
}
