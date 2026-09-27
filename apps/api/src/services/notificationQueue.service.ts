import { prisma } from '../config/prisma';
import { NotificationType, NotificationChannel } from '@shenoda/shared';

export interface DispatchNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  dataPayload?: any;
}

export class NotificationQueueService {
  /**
   * Dispatches a notification across enabled channels (Push, SMS, Email) and logs delivery (FR-11.1–11.4).
   */
  static async sendNotification(payload: DispatchNotificationPayload) {
    const { userId, type, title, body, dataPayload } = payload;

    // 1. Fetch recipient preferences (default: push = true, sms = true, email = false)
    const pref = await prisma.userNotificationPreference.findUnique({
      where: { userId },
    });

    const enablePush = pref ? pref.enablePush : true;
    const enableSms = pref ? pref.enableSms : true;
    const enableEmail = pref ? pref.enableEmail : false;

    const channelsToSend: NotificationChannel[] = [];
    if (enablePush) channelsToSend.push(NotificationChannel.PUSH);
    if (enableSms) channelsToSend.push(NotificationChannel.SMS);
    if (enableEmail) channelsToSend.push(NotificationChannel.EMAIL);

    const logs = [];

    // Dispatch & log each channel
    for (const channel of channelsToSend) {
      // In production, integration with web-push/VAPID, Twilio, or SMTP would execute here
      const log = await prisma.notificationLog.create({
        data: {
          userId,
          type: type as any,
          channel: channel as any,
          title,
          body,
          dataPayload: dataPayload || null,
          isDelivered: true, // Simulation / Queue delivery
          sentAt: new Date(),
        },
      });
      logs.push(log);
    }

    return logs;
  }

  /**
   * Batch dispatch to multiple recipients.
   */
  static async sendBatchNotifications(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    dataPayload?: any
  ) {
    const results = [];
    for (const uId of userIds) {
      const logs = await this.sendNotification({
        userId: uId,
        type,
        title,
        body,
        dataPayload,
      });
      results.push(...logs);
    }
    return results;
  }

  /**
   * Dedicated helper for urgent consecutive absence alerts (FR-11.1).
   */
  static async notifyAbsenceAlert(
    servantUserId: string,
    memberName: string,
    consecutiveCount: number
  ) {
    return this.sendNotification({
      userId: servantUserId,
      type: NotificationType.ABSENCE_ALERT,
      title: 'تنبيه افتقاد عاجل',
      body: `تنبيه: المخدوم (${memberName}) غائب لـ ${consecutiveCount} أسابيع متتالية ويحتاج لافتقاد فوري.`,
      dataPayload: { consecutiveCount, memberName },
    });
  }
}
