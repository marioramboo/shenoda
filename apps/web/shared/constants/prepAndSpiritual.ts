/**
 * Phase 5: Lesson Preparation & Spiritual Life Enums and Constants
 */

export enum PrepStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED',
}

export const PREP_STATUS_LABELS: Record<PrepStatus, { ar: string; en: string }> = {
  DRAFT: { ar: 'مسودة', en: 'Draft' },
  SUBMITTED: { ar: 'تم التسليم', en: 'Submitted' },
  REVIEWED: { ar: 'تمت المراجعة', en: 'Reviewed' },
};

export enum SpiritualSacrament {
  COMMUNION = 'COMMUNION',     // تناول الأسرار المقدسة
  CONFESSION = 'CONFESSION',   // سر الاعتراف
  FASTING = 'FASTING',         // الصوم الكنسي
  PRAYER_RULE = 'PRAYER_RULE', // قانون الصلاة اليومي
}

export const SPIRITUAL_SACRAMENT_LABELS: Record<SpiritualSacrament, { ar: string; en: string }> = {
  COMMUNION: { ar: 'تناول الأسرار المقدسة', en: 'Holy Communion' },
  CONFESSION: { ar: 'سر الاعتراف', en: 'Confession' },
  FASTING: { ar: 'الصوم الكنسي', en: 'Fasting' },
  PRAYER_RULE: { ar: 'قانون الصلاة اليومي', en: 'Daily Prayer Rule' },
};

export interface LessonAttachment {
  url: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
}
