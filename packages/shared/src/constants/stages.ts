export type StageGender = 'COED' | 'MALE' | 'FEMALE';

export interface StageDefinition {
  id: string;
  code: string;
  arabicName: string;
  englishName: string;
  gender: StageGender;
  order: number;
}

export const CANONICAL_STAGES: StageDefinition[] = [
  {
    id: 'stage_nursery',
    code: 'NURSERY',
    arabicName: 'حضانة',
    englishName: 'Nursery',
    gender: 'COED',
    order: 1,
  },
  {
    id: 'stage_primary',
    code: 'PRIMARY',
    arabicName: 'ابتدائي',
    englishName: 'Primary',
    gender: 'COED',
    order: 2,
  },
  {
    id: 'stage_prep_boys',
    code: 'PREP_BOYS',
    arabicName: 'إعدادي بنين',
    englishName: 'Prep Boys',
    gender: 'MALE',
    order: 3,
  },
  {
    id: 'stage_prep_girls',
    code: 'PREP_GIRLS',
    arabicName: 'إعدادي بنات',
    englishName: 'Prep Girls',
    gender: 'FEMALE',
    order: 4,
  },
  {
    id: 'stage_sec_boys',
    code: 'SEC_BOYS',
    arabicName: 'ثانوي بنين',
    englishName: 'Secondary Boys',
    gender: 'MALE',
    order: 5,
  },
  {
    id: 'stage_sec_girls',
    code: 'SEC_GIRLS',
    arabicName: 'ثانوي بنات',
    englishName: 'Secondary Girls',
    gender: 'FEMALE',
    order: 6,
  },
  {
    id: 'stage_university',
    code: 'UNIVERSITY',
    arabicName: 'جامعة',
    englishName: 'University',
    gender: 'COED',
    order: 7,
  },
  {
    id: 'stage_graduates',
    code: 'GRADUATES',
    arabicName: 'خريجين',
    englishName: 'Graduates',
    gender: 'COED',
    order: 8,
  },
];
