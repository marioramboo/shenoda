import { PermissionAction, ScopeRule, PermissionRule } from './types';

export const PERMISSION_MATRIX: Record<PermissionAction, PermissionRule> = {
  // Level 1: Servant (خادم)
  [PermissionAction.LOGIN]: {
    action: PermissionAction.LOGIN,
    minLevel: 1,
    defaultScope: ScopeRule.SELF,
    description: 'تسجيل الدخول إلى النظام',
  },
  [PermissionAction.VIEW_OWN_PROFILE]: {
    action: PermissionAction.VIEW_OWN_PROFILE,
    minLevel: 1,
    defaultScope: ScopeRule.SELF,
    description: 'عرض الملف الشخصي للخادم',
  },
  [PermissionAction.EDIT_OWN_PROFILE]: {
    action: PermissionAction.EDIT_OWN_PROFILE,
    minLevel: 1,
    defaultScope: ScopeRule.SELF,
    description: 'تعديل البيانات الشخصية الأساسية غير التقييمية',
  },
  [PermissionAction.VIEW_OWN_FOLLOWUP]: {
    action: PermissionAction.VIEW_OWN_FOLLOWUP,
    minLevel: 1,
    defaultScope: ScopeRule.SELF,
    description: 'عرض متابعة وافتقاد الخادم الشخصية',
  },
  [PermissionAction.SUBMIT_LESSON_PREP]: {
    action: PermissionAction.SUBMIT_LESSON_PREP,
    minLevel: 1,
    defaultScope: ScopeRule.SELF,
    description: 'تقديم تحضير الدروس الأسبوعية',
  },
  [PermissionAction.EDIT_OWN_SPIRITUAL_LIFE]: {
    action: PermissionAction.EDIT_OWN_SPIRITUAL_LIFE,
    minLevel: 1,
    defaultScope: ScopeRule.SELF,
    description: 'تسجيل مؤشرات الحياة الروحية الذاتية',
  },
  [PermissionAction.VIEW_YEAR_PLAN]: {
    action: PermissionAction.VIEW_YEAR_PLAN,
    minLevel: 1,
    defaultScope: ScopeRule.STAGE,
    description: 'عرض الخطة السنوية للمرحلة',
  },
  [PermissionAction.OPT_IN_YEAR_PLAN]: {
    action: PermissionAction.OPT_IN_YEAR_PLAN,
    minLevel: 1,
    defaultScope: ScopeRule.STAGE,
    description: 'المشاركة وإبداء الرغبة في فعاليات الخطة السنوية',
  },
  [PermissionAction.POST_STAGE_YEAR_PLAN_UPDATE]: {
    action: PermissionAction.POST_STAGE_YEAR_PLAN_UPDATE,
    minLevel: 1,
    defaultScope: ScopeRule.STAGE,
    description: 'إضافة تحديث أو اقتراح محدود على فعاليات الخطة',
  },
  [PermissionAction.EDIT_ASSIGNED_MEMBER_EVAL]: {
    action: PermissionAction.EDIT_ASSIGNED_MEMBER_EVAL,
    minLevel: 1,
    defaultScope: ScopeRule.ASSIGNED_MEMBERS,
    description: 'تقييم المخدومين المسندين للخادم (3 حقول محددة)',
  },
  [PermissionAction.VIEW_ANNOUNCEMENT]: {
    action: PermissionAction.VIEW_ANNOUNCEMENT,
    minLevel: 1,
    defaultScope: ScopeRule.STAGE,
    description: 'عرض إعلانات وتنبيهات الخدمة',
  },

  // Level 2: Assistant Stage Secretary (مساعد امين الخدمة)
  [PermissionAction.MANAGE_MEMBER_FULL]: {
    action: PermissionAction.MANAGE_MEMBER_FULL,
    minLevel: 2,
    defaultScope: ScopeRule.STAGE,
    description: 'إدارة وتعديل سجلات المخدومين بالكامل داخل المرحلة',
  },
  [PermissionAction.VIEW_ANALYTICS_STAGE]: {
    action: PermissionAction.VIEW_ANALYTICS_STAGE,
    minLevel: 2,
    defaultScope: ScopeRule.STAGE,
    description: 'عرض الإحصائيات ومؤشرات الحضور على مستوى المرحلة',
  },

  // Level 3: Stage Secretary (امين الخدمة)
  [PermissionAction.MANAGE_YEAR_PLAN_FULL]: {
    action: PermissionAction.MANAGE_YEAR_PLAN_FULL,
    minLevel: 3,
    defaultScope: ScopeRule.STAGE,
    description: 'إدارة واعتماد الخطة السنوية ومحاورها بالكامل للمرحلة',
  },
  [PermissionAction.CREATE_ANNOUNCEMENT]: {
    action: PermissionAction.CREATE_ANNOUNCEMENT,
    minLevel: 3,
    defaultScope: ScopeRule.STAGE,
    description: 'إنشاء ونشر الإعلانات لخدام ومخدومي المرحلة',
  },
  [PermissionAction.ADD_PRIVATE_NOTES]: {
    action: PermissionAction.ADD_PRIVATE_NOTES,
    minLevel: 3,
    defaultScope: ScopeRule.STAGE,
    description: 'إضافة ملاحظات سرية في السلسلة الإدارية للخدمة',
  },
  [PermissionAction.CREATE_POLL]: {
    action: PermissionAction.CREATE_POLL,
    minLevel: 3,
    defaultScope: ScopeRule.STAGE,
    description: 'إنشاء استطلاعات الرأي والتصويت',
  },
  [PermissionAction.MANAGE_SERVANT_ACCOUNTS]: {
    action: PermissionAction.MANAGE_SERVANT_ACCOUNTS,
    minLevel: 3,
    defaultScope: ScopeRule.STAGE,
    description: 'تعديل وإدارة بيانات الخدام ضمن النطاق الإداري المسموح',
  },
  [PermissionAction.EDIT_SERVANT_PROFILE_EVAL]: {
    action: PermissionAction.EDIT_SERVANT_PROFILE_EVAL,
    minLevel: 3,
    defaultScope: ScopeRule.STAGE,
    description: 'تقييم الخدام التابعين للمرحلة من قبل المشرف المعتمد',
  },
  [PermissionAction.EDIT_SERVANT_FOLLOWUP]: {
    action: PermissionAction.EDIT_SERVANT_FOLLOWUP,
    minLevel: 3,
    defaultScope: ScopeRule.STAGE,
    description: 'متابعة افتقاد الخدام والتزامهم الروحي والخدمي',
  },
  [PermissionAction.VIEW_SERVANT_LESSON_PREP]: {
    action: PermissionAction.VIEW_SERVANT_LESSON_PREP,
    minLevel: 3,
    defaultScope: ScopeRule.STAGE,
    description: 'الاطلاع على تحضير الدروس واعتمادها',
  },
  [PermissionAction.EXPORT_REPORTS]: {
    action: PermissionAction.EXPORT_REPORTS,
    minLevel: 3,
    defaultScope: ScopeRule.STAGE,
    description: 'تصدير التقارير وسجلات الحضور والغياب بصيغة Excel/PDF',
  },

  // Level 4: Sector Secretary (امين قطاع)
  [PermissionAction.EDIT_SECRETARY_DATA]: {
    action: PermissionAction.EDIT_SECRETARY_DATA,
    minLevel: 4,
    defaultScope: ScopeRule.SECTOR,
    description: 'تقييم وتعديل بيانات أمناء المراحل في نطاق القطاع',
  },
  [PermissionAction.VIEW_ANALYTICS_SECTOR]: {
    action: PermissionAction.VIEW_ANALYTICS_SECTOR,
    minLevel: 4,
    defaultScope: ScopeRule.SECTOR,
    description: 'عرض التحليلات الإحصائية الشاملة لجميع مراحل القطاع',
  },

  // Level 5: General Secretary (امين عام)
  [PermissionAction.TRANSFER_SUSPEND_SERVANT]: {
    action: PermissionAction.TRANSFER_SUSPEND_SERVANT,
    minLevel: 5,
    defaultScope: ScopeRule.ORGANIZATION,
    description: 'نقل أو إيقاف أو تفعيل الخدام على مستوى الكنيسة بالكامل',
  },
  [PermissionAction.VIEW_ANALYTICS_ORG]: {
    action: PermissionAction.VIEW_ANALYTICS_ORG,
    minLevel: 5,
    defaultScope: ScopeRule.ORGANIZATION,
    description: 'عرض لوحة المؤشرات المركزية للكنيسة بالكامل',
  },
};
