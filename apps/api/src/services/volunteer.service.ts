import { prisma } from '../config/prisma';

export class VolunteerService {
  /**
   * Opt in a servant to volunteer for a calendar event with capacity checking (FR-7.2).
   */
  static async optIn(eventId: string, userId: string, roleInEvent?: string) {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        volunteers: true,
      },
    });

    if (!event) {
      const err: any = new Error('Event not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Check if already opted in
    const existing = event.volunteers.find((v) => v.userId === userId);
    if (existing) {
      return existing;
    }

    // Capacity validation
    if (event.maxVolunteers !== null && event.maxVolunteers !== undefined) {
      if (event.volunteers.length >= event.maxVolunteers) {
        const err: any = new Error('تم الوصول إلى الحد الأقصى للمتطوعين في هذه الفعالية');
        err.code = 'ERR_VOLUNTEER_CAPACITY_REACHED';
        throw err;
      }
    }

    return prisma.eventVolunteer.create({
      data: {
        eventId,
        userId,
        roleInEvent: roleInEvent || null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  /**
   * Servant withdraws their volunteer registration.
   */
  static async withdraw(eventId: string, userId: string) {
    const existing = await prisma.eventVolunteer.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (!existing) {
      const err: any = new Error('Volunteer record not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    await prisma.eventVolunteer.delete({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    return { success: true };
  }
}
