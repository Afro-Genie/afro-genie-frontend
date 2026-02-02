import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Language } from '../types';
import { detectLanguage } from './geminiService';

const COLLECTIONS = {
  LANGUAGES: 'languages'
};

/**
 * Get all active languages from Firestore
 */
export const getAllLanguages = async (): Promise<Language[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.LANGUAGES),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Language));
  } catch (error) {
    console.error('Error fetching languages:', error);
    // Return default languages if query fails
    return getDefaultLanguages();
  }
};

/**
 * Get language by code
 */
export const getLanguageByCode = async (code: string): Promise<Language | null> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.LANGUAGES),
      where('code', '==', code.toLowerCase()),
      where('isActive', '==', true),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Language;
    }
    return null;
  } catch (error) {
    console.error('Error fetching language by code:', error);
    return null;
  }
};

/**
 * Add a new language (admin only)
 */
export const addLanguage = async (language: Omit<Language, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // Check if language with same code already exists
    const existing = await getLanguageByCode(language.code);
    if (existing) {
      throw new Error(`Language with code "${language.code}" already exists`);
    }

    const docRef = await addDoc(collection(db, COLLECTIONS.LANGUAGES), {
      ...language,
      code: language.code.toLowerCase(),
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error adding language:', error);
    throw error;
  }
};

/**
 * Update a language
 */
export const updateLanguage = async (id: string, updates: Partial<Omit<Language, 'id'>>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.LANGUAGES, id);
    await updateDoc(docRef, {
      ...updates,
      code: updates.code?.toLowerCase(),
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    console.error('Error updating language:', error);
    throw error;
  }
};

/**
 * Soft delete a language (set isActive to false)
 */
export const deleteLanguage = async (id: string): Promise<void> => {
  try {
    await updateLanguage(id, { isActive: false });
  } catch (error: any) {
    console.error('Error deleting language:', error);
    throw error;
  }
};

/**
 * Detect language using AI (Gemini) with Google Translate API as fallback
 * This function tries Gemini first, then falls back to other methods if needed
 */
export const detectLanguageWithAI = async (lyrics: string): Promise<string> => {
  try {
    // Primary method: Use Gemini AI for detection
    const detectedCode = await detectLanguage(lyrics);

    // Heuristic override: If AI detects 'en' (English), but strong Pidgin markers are present,
    // override to 'pidgin'. AI often classifies Pidgin as English.
    if (detectedCode === 'en') {
      const lowerLyrics = lyrics.toLowerCase();
      // Strong markers that almost certainly indicate Pidgin in a Nigerian context
      if (
        /\b(dey|na|una|wey|abeg|wetin|pikin|sabi|don|komot)\b/.test(lowerLyrics)
      ) {
        return 'pidgin';
      }
    }

    return detectedCode;
  } catch (error) {
    console.error('Error detecting language with AI:', error);

    // TODO: Add Google Translate API as fallback
    // For now, we can use a simple heuristic based on common patterns
    // Google Translate API would require: @google-cloud/translate package and API key

    // Fallback: Simple pattern matching for common languages
    const lowerLyrics = lyrics.toLowerCase();

    // Check for common African language patterns
    if (lowerLyrics.includes('ọ') || lowerLyrics.includes('ṣ') || lowerLyrics.includes('ẹ')) {
      return 'yo'; // Yoruba
    }
    if (lowerLyrics.includes('ị') || lowerLyrics.includes('ụ')) {
      return 'ig'; // Igbo
    }
    if (lowerLyrics.includes('kw') && lowerLyrics.includes('na')) {
      return 'ha'; // Hausa
    }
    if (lowerLyrics.includes('dey') || lowerLyrics.includes('na so')) {
      return 'pidgin'; // Nigerian Pidgin
    }

    // If all else fails, throw the original error
    throw error;
  }
};

/**
 * Get default languages (fallback if database is empty)
 */
export const getDefaultLanguages = (): Language[] => {
  return [
    { code: 'en', name: 'English', isActive: true },
    { code: 'fr', name: 'French', isActive: true },
    { code: 'es', name: 'Spanish', isActive: true },
    { code: 'pt', name: 'Portuguese', isActive: true },
    { code: 'ar', name: 'Arabic', isActive: true },
    { code: 'sw', name: 'Swahili', isActive: true },
    { code: 'yo', name: 'Yoruba', isActive: true },
    { code: 'ig', name: 'Igbo', isActive: true },
    { code: 'ha', name: 'Hausa', isActive: true },
    { code: 'pidgin', name: 'Pidgin', isActive: true }
  ];
};

/**
 * Initialize default languages in database (if collection is empty)
 */
export const initializeDefaultLanguages = async (): Promise<void> => {
  try {
    const existingLanguages = await getAllLanguages();
    if (existingLanguages.length === 0) {
      const defaultLangs = getDefaultLanguages();
      for (const lang of defaultLangs) {
        await addLanguage(lang);
      }
    }
  } catch (error) {
    console.error('Error initializing default languages:', error);
  }
};

