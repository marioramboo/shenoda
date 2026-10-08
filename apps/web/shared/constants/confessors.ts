export const SHENODA_CHURCH_NAME = 'الانبا شنودة رئيس المتوحدين';

export const PRIEST_CONFESSORS = [
  'ابونا مرقس رمزي',
  'ابونا بيشوي عادل',
  'ابونا رفائيل قليني',
  'ابونا يوسف عبدالمسيح',
  'ابونا صموئيل بخيت',
  'ابونا ارميا ادور',
] as const;

export const OTHER_CONFESSOR_OPTION = 'اب اعتراف اخر';

export type PriestConfessorName = (typeof PRIEST_CONFESSORS)[number];
