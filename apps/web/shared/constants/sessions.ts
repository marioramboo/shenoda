/**
 * Phase 4: Session Taxonomy & Follow-up Matrix (Assumption A4 & §4.3)
 */

export enum ServantSessionType {
  MASS = 'MASS',                                     // القداس الإلهي
  LESSON_PREPARATION = 'LESSON_PREPARATION',         // التحضير
  SERVICE_ATTENDANCE = 'SERVICE_ATTENDANCE',         // الخدمة
  PASTORAL_VISITATION = 'PASTORAL_VISITATION',       // الافتقاد
  SERVICE_MEETING = 'SERVICE_MEETING',               // اجتماع الخدمة
  PRAYER_FAMILY_MEETING = 'PRAYER_FAMILY_MEETING',   // اجتماع الصلاة / الأسرة
  ACTIVITIES = 'ACTIVITIES',                         // الأنشطة
  SECRETARIES_MEETING = 'SECRETARIES_MEETING',       // اجتماع الأمناء (Stage Secretary+)
  STAGE_SECRETARIES_MEET = 'STAGE_SECRETARIES_MEET', // اجتماع أمناء المراحل (Sector Secretary+)
}

export enum MemberSessionType {
  MASS = 'MASS',                                     // القداس الإلهي
  SERVICE_ATTENDANCE = 'SERVICE_ATTENDANCE',         // الخدمة / حصة مدارس الأحد
  PASTORAL_VISITATION = 'PASTORAL_VISITATION',       // الافتقاد المنزلي
  ACTIVITY_CLUB_TRIP_CONF = 'ACTIVITY_CLUB_TRIP_CONF', // نادي / رحلة / مؤتمر
}

export const SERVANT_SESSION_LABELS: Record<ServantSessionType, { ar: string; en: string }> = {
  [ServantSessionType.MASS]: { ar: 'القداس الإلهي', en: 'Holy Liturgy' },
  [ServantSessionType.LESSON_PREPARATION]: { ar: 'التحضير', en: 'Lesson Preparation' },
  [ServantSessionType.SERVICE_ATTENDANCE]: { ar: 'الخدمة', en: 'Service Attendance' },
  [ServantSessionType.PASTORAL_VISITATION]: { ar: 'الافتقاد', en: 'Pastoral Visitation' },
  [ServantSessionType.SERVICE_MEETING]: { ar: 'اجتماع الخدمة', en: 'Service Meeting' },
  [ServantSessionType.PRAYER_FAMILY_MEETING]: { ar: 'اجتماع الصلاة / الأسرة', en: 'Prayer / Family Meeting' },
  [ServantSessionType.ACTIVITIES]: { ar: 'الأنشطة', en: 'Activities' },
  [ServantSessionType.SECRETARIES_MEETING]: { ar: 'اجتماع الأمناء', en: 'Secretaries Meeting' },
  [ServantSessionType.STAGE_SECRETARIES_MEET]: { ar: 'اجتماع أمناء المراحل', en: 'Stage Secretaries Meeting' },
};

export const MEMBER_SESSION_LABELS: Record<MemberSessionType, { ar: string; en: string }> = {
  [MemberSessionType.MASS]: { ar: 'القداس الإلهي', en: 'Holy Liturgy' },
  [MemberSessionType.SERVICE_ATTENDANCE]: { ar: 'الخدمة / مدارس الأحد', en: 'Service / Sunday School' },
  [MemberSessionType.PASTORAL_VISITATION]: { ar: 'الافتقاد المنزلي', en: 'Pastoral Home Visit' },
  [MemberSessionType.ACTIVITY_CLUB_TRIP_CONF]: { ar: 'نادي / رحلة / مؤتمر', en: 'Club / Trip / Conference' },
};

/**
 * Assumption A4 Enforcement:
 * Assistant Secretaries (مساعد امين الخدمة) have the same activities as servants (including activities/أنشطة),
 * but do NOT receive اجتماع الأمناء (which begins at Stage Secretary level).
 * Stage Secretary (Level 3) adds اجتماع الأمناء.
 * Sector Secretary (Level 4) adds اجتماع أمناء المراحل.
 */
export function getAllowedSessionsForRole(roleLevel: number): ServantSessionType[] {
  const baseSessions: ServantSessionType[] = [
    ServantSessionType.MASS,
    ServantSessionType.LESSON_PREPARATION,
    ServantSessionType.SERVICE_ATTENDANCE,
    ServantSessionType.PASTORAL_VISITATION,
    ServantSessionType.SERVICE_MEETING,
    ServantSessionType.PRAYER_FAMILY_MEETING,
    ServantSessionType.ACTIVITIES, // Included for مساعد per A4
  ];

  // Level 3 (امين الخدمة) adds اجتماع الأمناء
  if (roleLevel >= 3) {
    baseSessions.push(ServantSessionType.SECRETARIES_MEETING);
  }

  // Level 4 (امين قطاع) and Level 5 (امين عام) adds اجتماع أمناء المراحل
  if (roleLevel >= 4) {
    baseSessions.push(ServantSessionType.STAGE_SECRETARIES_MEET);
  }

  return baseSessions;
}

export type AlertTargetType = 'MEMBER' | 'SERVANT';
export type AlertStatus = 'ACTIVE' | 'RESOLVED' | 'DISMISSED';

export const ALERT_STATUS_LABELS: Record<AlertStatus, { ar: string; en: string }> = {
  ACTIVE: { ar: 'نشط (يحتاج افتقاد)', en: 'Active' },
  RESOLVED: { ar: 'تم الحل (تم الافتقاد)', en: 'Resolved' },
  DISMISSED: { ar: 'تم التجاهل', en: 'Dismissed' },
};
