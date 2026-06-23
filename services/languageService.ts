// Firebase has been removed. Languages are now managed in-memory with default values
// until the backend API provides language management endpoints.

import type { Language } from '../types';
import { detectLanguage } from './geminiService';
import { translationsApi } from './api';

const defaultLanguages: Language[] = [
  { code: 'en', name: 'English', isActive: true },
  { code: 'fr', name: 'French', isActive: true },
  { code: 'es', name: 'Spanish', isActive: true },
  { code: 'pt', name: 'Portuguese', isActive: true },
  { code: 'ar', name: 'Arabic', isActive: true },
  { code: 'sw', name: 'Swahili', isActive: true },
  { code: 'yo', name: 'Yoruba', isActive: true },
  { code: 'ig', name: 'Igbo', isActive: true },
  { code: 'ha', name: 'Hausa', isActive: true },
  { code: 'pidgin', name: 'Pidgin', isActive: true },
];

let cachedLanguages: Language[] | null = null;

export const getAllLanguages = async (): Promise<Language[]> => {
  if (cachedLanguages) return cachedLanguages;
  cachedLanguages = [...defaultLanguages];
  return cachedLanguages;
};

export const getLanguageByCode = async (code: string): Promise<Language | null> => {
  const langs = await getAllLanguages();
  return langs.find(l => l.code === code.toLowerCase() && l.isActive) || null;
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

export const detectLanguageWithAI = async (lyrics: string): Promise<string> => {
  try {
    const detectedCode = await detectLanguage(lyrics);

    if (detectedCode === 'en') {
      const lowerLyrics = lyrics.toLowerCase();
      if (/\b(dey|na|una|wey|abeg|wetin|pikin|sabi|don|komot)\b/.test(lowerLyrics)) {
        return 'pidgin';
      }
    }

    return detectedCode;
  } catch (error) {
    console.error('Error detecting language with AI:', error);
    const lowerLyrics = lyrics.toLowerCase();

    if (lowerLyrics.includes('ọ') || lowerLyrics.includes('ṣ') || lowerLyrics.includes('ẹ')) {
      return 'yo';
    }
    if (lowerLyrics.includes('ị') || lowerLyrics.includes('ụ')) {
      return 'ig';
    }
    if (lowerLyrics.includes('kw') && lowerLyrics.includes('na')) {
      return 'ha';
    }
    if (lowerLyrics.includes('dey') || lowerLyrics.includes('na so')) {
      return 'pidgin';
    }

    throw error;
  }
};

export const getDefaultLanguages = (): Language[] => [...defaultLanguages];

export const initializeDefaultLanguages = async (): Promise<void> => {
  if (!cachedLanguages) {
    cachedLanguages = [...defaultLanguages];
  }
};
