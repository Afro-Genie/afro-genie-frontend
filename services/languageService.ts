// Languages are sourced from the canonical list in constants.ts
// and backed by the backend /api/languages endpoint.

import type { Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';

let cachedLanguages: Language[] | null = null;

export const getAllLanguages = async (): Promise<Language[]> => {
  if (cachedLanguages) return cachedLanguages;
  cachedLanguages = SUPPORTED_LANGUAGES.filter(l => l.isActive);
  return cachedLanguages;
};

export const getLanguageByCode = async (code: string): Promise<Language | null> => {
  const langs = await getAllLanguages();
  return langs.find(l => l.code === code.toLowerCase()) || null;
};

export const addLanguage = async (language: Omit<Language, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const existing = await getLanguageByCode(language.code);
  if (existing) throw new Error(`Language with code "${language.code}" already exists`);
  cachedLanguages?.push({ ...language, code: language.code.toLowerCase(), isActive: true });
  return language.code;
};

export const updateLanguage = async (id: string, updates: Partial<Omit<Language, 'id'>>): Promise<void> => {
  if (!cachedLanguages) await getAllLanguages();
  const idx = cachedLanguages!.findIndex(l => l.code === id);
  if (idx !== -1) {
    cachedLanguages![idx] = { ...cachedLanguages![idx], ...updates };
  }
};

export const deleteLanguage = async (id: string): Promise<void> => {
  await updateLanguage(id, { isActive: false });
};

export const getDefaultLanguages = (): Language[] => [...SUPPORTED_LANGUAGES];

export const initializeDefaultLanguages = async (): Promise<void> => {
  if (!cachedLanguages) {
    cachedLanguages = SUPPORTED_LANGUAGES.filter(l => l.isActive);
  }
};
