import { ServantSessionType } from './sessions';

export enum EventCategory {
  LITURGY_FEAST = 'LITURGY_FEAST',             // أعياد ومناسبات كنسية
  SPIRITUAL_LESSON = 'SPIRITUAL_LESSON',       // درس روحي / موضوع دراسي
  SERVICE_MEETING = 'SERVICE_MEETING',         // اجتماع الخدمة الأسبوعي
  SECRETARIES_COUNCIL = 'SECRETARIES_COUNCIL', // اجتماع الأمناء
  TRIP_OR_OUTING = 'TRIP_OR_OUTING',           // رحلة
  CONFERENCE_RETREAT = 'CONFERENCE_RETREAT',   // مؤتمر روحي
  COMMUNITY_ACTIVITY = 'COMMUNITY_ACTIVITY',   // نشاط اجتماعي / يوم رياضي
}

export enum PlanScopeType {
  STAGE = 'STAGE',               // خاص بمرحلة معينة
  SECTOR = 'SECTOR',             // خاص بقطاع
  ORGANIZATION = 'ORGANIZATION', // عام للكنيسة بأكملها
}

export const EVENT_CATEGORY_ARABIC: Record<EventCategory, string> = {
  [EventCategory.LITURGY_FEAST]: 'قداس / عيد كنسي',
  [EventCategory.SPIRITUAL_LESSON]: 'درس روحي / موضوع',
  [EventCategory.SERVICE_MEETING]: 'اجتماع الخدمة الأسبوعي',
  [EventCategory.SECRETARIES_COUNCIL]: 'اجتماع مجلس الأمناء',
  [EventCategory.TRIP_OR_OUTING]: 'رحلة ترفيهية / روحية',
  [EventCategory.CONFERENCE_RETREAT]: 'مؤتمر روحي',
  [EventCategory.COMMUNITY_ACTIVITY]: 'نشاط اجتماعي / رياضي',
};

export const EVENT_CATEGORY_COLORS: Record<EventCategory, string> = {
  [EventCategory.LITURGY_FEAST]: '#B8892B',        // Gold Accent
  [EventCategory.SPIRITUAL_LESSON]: '#1F3A5F',     // Deep Blue
  [EventCategory.SERVICE_MEETING]: '#2B6CB0',      // Medium Blue
  [EventCategory.SECRETARIES_COUNCIL]: '#4A5568',  // Slate Gray
  [EventCategory.TRIP_OR_OUTING]: '#2F855A',       // Green
  [EventCategory.CONFERENCE_RETREAT]: '#805AD5',   // Purple/Burgundy
  [EventCategory.COMMUNITY_ACTIVITY]: '#DD6B20',   // Amber/Orange
};

/**
 * Maps calendar event category to ServantSessionType for direct attendance bridge (FR-12.2).
 */
export function mapEventCategoryToSessionType(category: EventCategory | string): ServantSessionType {
  switch (category) {
    case EventCategory.SERVICE_MEETING:
      return ServantSessionType.SERVICE_MEETING;
    case EventCategory.LITURGY_FEAST:
      return ServantSessionType.MASS;
    case EventCategory.CONFERENCE_RETREAT:
    case EventCategory.TRIP_OR_OUTING:
    case EventCategory.COMMUNITY_ACTIVITY:
      return ServantSessionType.ACTIVITIES;
    default:
      return ServantSessionType.SERVICE_ATTENDANCE;
  }
}
