export interface CopticDate {
  day: number;
  month: number;
  monthName: string;
  year: number;
  formatted: string;
}

export const COPTIC_MONTHS = [
  'توت',
  'بابه',
  'هاتور',
  'كيهك',
  'طوبة',
  'أمشير',
  'برمهات',
  'برمودة',
  'بشنس',
  'بؤونة',
  'أبيب',
  'مسرى',
  'النسيء',
] as const;

/**
 * Calculates the Coptic date for any given Gregorian Date (accurate for 1900-2099 AD).
 */
export function getCopticDate(date: Date = new Date()): CopticDate {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth(); // 0-11
  const gDay = date.getDate();

  // Reference timestamp in UTC
  const utcDate = Date.UTC(gYear, gMonth, gDay);

  // Tout 1 calculation:
  // Tout 1 falls on September 11 (or September 12 if the previous Gregorian year was a leap year)
  const isGregorianLeap = (year: number) =>
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  // Coptic new year in this Gregorian year
  const tout1Day = isGregorianLeap(gYear) ? 12 : 11;
  const tout1Date = Date.UTC(gYear, 8, tout1Day); // September is month 8 (0-indexed)

  let cYear: number;
  let dayOfYear: number;

  if (utcDate >= tout1Date) {
    cYear = gYear - 283;
    dayOfYear = Math.floor((utcDate - tout1Date) / (1000 * 60 * 60 * 24));
  } else {
    cYear = gYear - 284;
    const prevTout1Day = isGregorianLeap(gYear - 1) ? 12 : 11;
    const prevTout1Date = Date.UTC(gYear - 1, 8, prevTout1Day);
    dayOfYear = Math.floor((utcDate - prevTout1Date) / (1000 * 60 * 60 * 24));
  }

  // 12 months of 30 days
  const cMonthIndex = Math.min(Math.floor(dayOfYear / 30), 12);
  const cDay = (dayOfYear % 30) + 1;
  const monthName = COPTIC_MONTHS[cMonthIndex] || 'توت';

  return {
    day: cDay,
    month: cMonthIndex + 1,
    monthName,
    year: cYear,
    formatted: `${cDay} ${monthName} ${cYear} ش`,
  };
}
