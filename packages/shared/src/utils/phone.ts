/**
 * Phone Number Utilities for Egyptian & International Phone Numbers.
 * Supports normalization of Arabic-Indic numerals, cleaning, variant generation,
 * and canonical Egyptian formatting (+20...).
 */

/**
 * Converts Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digits to ASCII standard digits (0-9).
 */
export function normalizeArabicDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Cleans phone number by converting Arabic digits and stripping non-digit / non-plus characters.
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  const normalizedDigits = normalizeArabicDigits(phone);
  // Keep only digits and leading plus sign
  const hasPlus = normalizedDigits.trim().startsWith('+');
  const digitsOnly = normalizedDigits.replace(/\D/g, '');
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Normalizes phone numbers to standard searchable variants (+20..., 01..., 20..., 1...).
 * Essential for deduplication and flexible lookup in databases.
 */
export function getPhoneVariants(phone: string): string[] {
  const clean = cleanPhoneNumber(phone);
  if (!clean) return [];

  const variants = new Set<string>([clean]);

  if (clean.startsWith('+20')) {
    const withoutCode = clean.substring(3); // e.g. '10...'
    variants.add(`0${withoutCode}`); // '010...'
    variants.add(withoutCode); // '10...'
    variants.add(`20${withoutCode}`); // '2010...'
    variants.add(`0020${withoutCode}`); // '002010...'
  } else if (clean.startsWith('0020')) {
    const withoutCode = clean.substring(4);
    variants.add(`+20${withoutCode}`);
    variants.add(`0${withoutCode}`);
    variants.add(withoutCode);
    variants.add(`20${withoutCode}`);
  } else if (clean.startsWith('20') && clean.length >= 11) {
    const withoutCode = clean.substring(2);
    variants.add(`+20${withoutCode}`);
    variants.add(`0${withoutCode}`);
    variants.add(withoutCode);
  } else if (clean.startsWith('01')) {
    const withoutZero = clean.substring(1); // '10...'
    variants.add(`+20${withoutZero}`);
    variants.add(`20${withoutZero}`);
    variants.add(withoutZero);
  } else if (clean.startsWith('1') && clean.length === 10) {
    variants.add(`+20${clean}`);
    variants.add(`20${clean}`);
    variants.add(`0${clean}`);
  }

  return Array.from(variants);
}

/**
 * Formats a phone number into canonical Egyptian E.164 (+20...) if it matches Egyptian pattern.
 */
export function canonicalizeEgyptianPhone(phone: string): string {
  const clean = cleanPhoneNumber(phone);
  if (!clean) return '';

  if (clean.startsWith('+20')) {
    return clean;
  }
  if (clean.startsWith('0020')) {
    return `+20${clean.substring(4)}`;
  }
  if (clean.startsWith('20') && clean.length >= 11) {
    return `+${clean}`;
  }
  if (clean.startsWith('01') && clean.length === 11) {
    return `+20${clean.substring(1)}`;
  }
  if (clean.startsWith('1') && clean.length === 10) {
    return `+20${clean}`;
  }

  return clean.startsWith('+') ? clean : `+${clean}`;
}
