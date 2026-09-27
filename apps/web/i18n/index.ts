import { ar, TranslationDictionary } from './ar';
import { en } from './en';

export type Locale = 'ar' | 'en';

export const dictionaries: Record<Locale, TranslationDictionary> = {
  ar,
  en,
};

export const defaultLocale: Locale = 'ar';

export function getDictionary(locale: Locale = defaultLocale): TranslationDictionary {
  return dictionaries[locale] || dictionaries.ar;
}

export { ar, en };
