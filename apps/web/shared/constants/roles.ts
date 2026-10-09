export enum RoleKey {
  ADMIN = 'ADMIN',
  GENERAL_SECRETARY = 'GENERAL_SECRETARY',
  SECTOR_SECRETARY = 'SECTOR_SECRETARY',
  STAGE_SECRETARY = 'STAGE_SECRETARY',
  CLASS_SECRETARY = 'CLASS_SECRETARY',
  SERVANT = 'SERVANT',
  PRIEST = 'PRIEST',
}

export interface RoleMetadata {
  key: RoleKey;
  arabicName: string;
  englishName: string;
  hierarchyTier: number; // 0 = System Administrator, 1 = General Secretary
  description: string;
}

export const ROLES: Record<RoleKey, RoleMetadata> = {
  [RoleKey.ADMIN]: {
    key: RoleKey.ADMIN,
    arabicName: 'مدير النظام',
    englishName: 'System Administrator',
    hierarchyTier: 0,
    description: 'مدير النظام والصلاحيات الكاملة فوق كافة الأدوار والرتب',
  },
  [RoleKey.GENERAL_SECRETARY]: {
    key: RoleKey.GENERAL_SECRETARY,
    arabicName: 'أمين عام',
    englishName: 'General Secretary',
    hierarchyTier: 1,
    description: 'المسؤول الأول عن متابعة كافة قطاعات ومراحل وخدام الكنيسة',
  },
  [RoleKey.SECTOR_SECRETARY]: {
    key: RoleKey.SECTOR_SECRETARY,
    arabicName: 'أمين قطاع',
    englishName: 'Sector Secretary',
    hierarchyTier: 2,
    description: 'المسؤول عن قطاع معين (مثل قطاع الطفولة أو الشباب)',
  },
  [RoleKey.STAGE_SECRETARY]: {
    key: RoleKey.STAGE_SECRETARY,
    arabicName: 'أمين مرحلة',
    englishName: 'Stage Secretary',
    hierarchyTier: 3,
    description: 'المسؤول عن مرحلة عمرية محددة داخل القطاع',
  },
  [RoleKey.CLASS_SECRETARY]: {
    key: RoleKey.CLASS_SECRETARY,
    arabicName: 'أمين أسرة',
    englishName: 'Class/Family Secretary',
    hierarchyTier: 4,
    description: 'المسؤول عن أسرة أو فصل داخل المرحلة',
  },
  [RoleKey.SERVANT]: {
    key: RoleKey.SERVANT,
    arabicName: 'خادم',
    englishName: 'Servant',
    hierarchyTier: 5,
    description: 'خادم مباشر لمجموعة مخدومين ومسؤول عن الافتقاد والحضور',
  },
  [RoleKey.PRIEST]: {
    key: RoleKey.PRIEST,
    arabicName: 'أب كاهن',
    englishName: 'Priest',
    hierarchyTier: 0,
    description: 'الرعاية الروحية والإشرافية لكافة خدمات الكنيسة',
  },
};
