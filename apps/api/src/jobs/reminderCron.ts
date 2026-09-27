import { prisma } from '../config/prisma';
import { NotificationQueueService } from '../services/notificationQueue.service';
import { NotificationType } from '@shenoda/shared';

/**
 * Scheduled job to check for missing lesson preparations and dispatch reminders (FR-11.3).
 * Triggers weekly (e.g., Wednesday 6:00 PM) for the upcoming Friday's service.
 */
export async function runLessonPreparationReminderCheck(targetServiceDate?: Date) {
  // Determine upcoming Friday date if not specified
  const now = new Date();
  let fridayDate = targetServiceDate;
  if (!fridayDate) {
    const dayOfWeek = now.getDay(); // 0 is Sunday, 5 is Friday
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    fridayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFriday);
    fridayDate.setHours(0, 0, 0, 0);
  }

  // Find all active servants (level 1)
  const servants = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      role: { level: 1 },
    },
    select: { id: true, fullName: true },
  });

  const remindersSent: string[] = [];

  for (const servant of servants) {
    // Check if servant has submitted a preparation for this target date
    const startOfDay = new Date(fridayDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(fridayDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingPrep = await prisma.lessonPreparation.findFirst({
      where: {
        authorUserId: servant.id,
        lessonDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: ['SUBMITTED', 'REVIEWED'] },
      },
    });

    if (!existingPrep) {
      await NotificationQueueService.sendNotification({
        userId: servant.id,
        type: NotificationType.PREP_DEADLINE,
        title: 'تذكير بتحضير الدرس',
        body: `عزيزي الخادم ${servant.fullName}، نذكرك باستكمال تحضير درس الأسبوع القادم ورفعه قبل يوم الجمعة.`,
        dataPayload: { targetServiceDate: fridayDate.toISOString() },
      }).catch((e) => console.error(`Failed to send prep reminder to ${servant.id}:`, e));

      remindersSent.push(servant.id);
    }
  }

  return { targetDate: fridayDate, remindersSentCount: remindersSent.length, remindersSent };
}
