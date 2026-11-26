
import type { Language } from './types';

// Single canonical language list — all other files should import from here.
// Backend codes must match the Prisma Language seed and AI detection prompt.
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', isActive: true },
  { code: 'yo', name: 'Yoruba', isActive: true },
  { code: 'ig', name: 'Igbo', isActive: true },
  { code: 'ha', name: 'Hausa', isActive: true },
  { code: 'pcm', name: 'Nigerian Pidgin', isActive: true },
  { code: 'sw', name: 'Swahili', isActive: true },
  { code: 'fr', name: 'French', isActive: true },
  { code: 'es', name: 'Spanish', isActive: true },
  { code: 'pt', name: 'Portuguese', isActive: true },
  { code: 'ar', name: 'Arabic', isActive: true },
  { code: 'zu', name: 'Zulu', isActive: true },
  { code: 'am', name: 'Amharic', isActive: true },
];

// Language code → flag emoji mapping (for HomePage and other UI surfaces)
export const LANGUAGE_FLAGS: Record<string, string> = {
  en: '\u{1F1EC}\u{1F1E7}',
  yo: '\u{1F1F3}\u{1F1EC}',
  ig: '\u{1F1F3}\u{1F1EC}',
  ha: '\u{1F1F3}\u{1F1EC}',
  pcm: '\u{1F1F3}\u{1F1EC}',
  sw: '\u{1F1F0}\u{1F1EA}',
  fr: '\u{1F1EB}\u{1F1F7}',
  es: '\u{1F1EA}\u{1F1F8}',
  pt: '\u{1F1F5}\u{1F1F9}',
  ar: '\u{1F1F8}\u{1F1E6}',
  zu: '\u{1F1FF}\u{1F1E6}',
  am: '\u{1F1E6}\u{1F1EA}',
};

// Normalize Prisma uppercase status enums to lowercase frontend labels
export type TranslationStatusValue = 'pending' | 'approved' | 'rejected' | 'published';

export function normalizeTranslationStatus(status?: string | null): TranslationStatusValue {
  if (!status) return 'pending';
  const lower = status.toLowerCase();
  if (lower === 'approved' || lower === 'rejected' || lower === 'published') {
    return lower as TranslationStatusValue;
  }
  return 'pending';
}

// Normalize a raw translation object from the backend, converting status casing
// and ensuring all expected fields exist.
export function normalizeTranslation(raw: any): any {
  if (!raw) return raw;
  return {
    ...raw,
    status: normalizeTranslationStatus(raw.status),
  };
}
