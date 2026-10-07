export enum TargetScopeLevel {
  STAGE_SUBSET = 'STAGE_SUBSET', // خدام محددين بالمرحلة
  STAGE_ALL = 'STAGE_ALL',       // كل خدام المرحلة
  SECTOR_ALL = 'SECTOR_ALL',     // كل خدام وأمناء القطاع
  ORG_ALL = 'ORG_ALL',           // الكنيسة بالكامل
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

export enum NotificationType {
  ABSENCE_ALERT = 'ABSENCE_ALERT',       // تنبيه غياب متكرر لمخدوم
  NEW_ANNOUNCEMENT = 'NEW_ANNOUNCEMENT', // إعلان جديد
  PREP_DEADLINE = 'PREP_DEADLINE',       // تذكير بتحضير الدرس
  SERVICE_MEETING = 'SERVICE_MEETING',   // تذكير باجتماع الخدمة
  POLL_CREATED = 'POLL_CREATED',         // استطلاع رأي جديد
}

export const TARGET_SCOPE_LABELS: Record<TargetScopeLevel, string> = {
  [TargetScopeLevel.STAGE_SUBSET]: 'خدام محددون بالمرحلة',
  [TargetScopeLevel.STAGE_ALL]: 'كل خدام المرحلة',
  [TargetScopeLevel.SECTOR_ALL]: 'كل خدام وأمناء القطاع',
  [TargetScopeLevel.ORG_ALL]: 'الكنيسة بالكامل',
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.ABSENCE_ALERT]: 'تنبيه غياب وافتقاد',
  [NotificationType.NEW_ANNOUNCEMENT]: 'إعلان رسمي جديد',
  [NotificationType.PREP_DEADLINE]: 'تذكير بتحضير الدرس الأسبوعي',
  [NotificationType.SERVICE_MEETING]: 'تذكير باجتماع الخدمة الأسبوعي',
  [NotificationType.POLL_CREATED]: 'استطلاع رأي جديد',
};
