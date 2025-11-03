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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { Artist, Song, Genre } from '../types';

// Collections
const COLLECTIONS = {
  ARTISTS: 'artists',
  SONGS: 'songs',
  TRANSLATIONS: 'translations',
  ANNOTATIONS: 'annotations',
  FAVORITES: 'favorites',
  HISTORY: 'history',
  GENRES: 'genres',
  USERS: 'users'
};

// Artist Operations
export const addArtist = async (artist: Omit<Artist, 'id'>) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.ARTISTS), {
    ...artist,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getArtist = async (artistId: string) => {
  const docRef = doc(db, COLLECTIONS.ARTISTS, artistId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Artist;
  }
  return null;
};

export const getAllArtists = async () => {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.ARTISTS));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Artist));
};

export const updateArtist = async (artistId: string, updates: Partial<Omit<Artist, 'id'>>) => {
  const docRef = doc(db, COLLECTIONS.ARTISTS, artistId);
  await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteArtist = async (artistId: string) => {
  await deleteDoc(doc(db, COLLECTIONS.ARTISTS, artistId));
};

// Song Operations
export const addSong = async (song: Omit<Song, 'id'>) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.SONGS), {
    ...song,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getSong = async (songId: string) => {
  const docRef = doc(db, COLLECTIONS.SONGS, songId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Song;
  }
  return null;
};

export const getSongsByArtist = async (artistId: string) => {
  const q = query(
    collection(db, COLLECTIONS.SONGS),
    where('artistId', '==', artistId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Song));
};

export const getAllSongs = async () => {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.SONGS));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Song));
};

export const updateSong = async (songId: string, updates: Partial<Omit<Song, 'id'>>) => {
  const docRef = doc(db, COLLECTIONS.SONGS, songId);
  await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteSong = async (songId: string) => {
  await deleteDoc(doc(db, COLLECTIONS.SONGS, songId));
};

// Genre Operations
export const addGenre = async (genre: Omit<Genre, 'id'>) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.GENRES), {
    ...genre,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getAllGenres = async () => {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.GENRES));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
};

export const updateGenre = async (genreId: string, updates: any) => {
  const docRef = doc(db, COLLECTIONS.GENRES, genreId);
  await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteGenre = async (genreId: string) => {
  await deleteDoc(doc(db, COLLECTIONS.GENRES, genreId));
};

// Translation Operations
export interface Translation {
  id?: string;
  songId: string;
  userId: string;
  originalLyrics: string;
  translatedLyrics: string;
  culturalContext: string;
  sourceLang: string;
  targetLang: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const saveTranslation = async (translation: Omit<Translation, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.TRANSLATIONS), {
    ...translation,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const getTranslation = async (translationId: string) => {
  const docRef = doc(db, COLLECTIONS.TRANSLATIONS, translationId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Translation;
  }
  return null;
};

export const getUserTranslations = async (userId: string) => {
  const q = query(
    collection(db, COLLECTIONS.TRANSLATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Translation));
};

// Fetch latest translation for a song (most recent by createdAt)
export const getLatestTranslationForSong = async (songId: string) => {
  const q = query(
    collection(db, COLLECTIONS.TRANSLATIONS),
    where('songId', '==', songId),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const d = querySnapshot.docs[0];
    return { id: d.id, ...d.data() } as Translation;
  }
  return null;
};

// Annotation Operations
export interface Annotation {
  id?: string;
  songId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  comment: string;
  createdAt?: Timestamp;
}

export const addAnnotation = async (annotation: Omit<Annotation, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.ANNOTATIONS), {
    ...annotation,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getSongAnnotations = async (songId: string) => {
  const q = query(
    collection(db, COLLECTIONS.ANNOTATIONS),
    where('songId', '==', songId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Annotation));
};

// Favorites Operations
export interface Favorite {
  id?: string;
  userId: string;
  songId: string;
  createdAt?: Timestamp;
}

export const addToFavorites = async (userId: string, songId: string) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.FAVORITES), {
    userId,
    songId,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const removeFromFavorites = async (favoriteId: string) => {
  await deleteDoc(doc(db, COLLECTIONS.FAVORITES, favoriteId));
};

export const getUserFavorites = async (userId: string) => {
  const q = query(
    collection(db, COLLECTIONS.FAVORITES),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Favorite));
};

// History Operations
export interface History {
  id?: string;
  userId: string;
  songId: string;
  viewedAt?: Timestamp;
}

export const addToHistory = async (userId: string, songId: string) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.HISTORY), {
    userId,
    songId,
    viewedAt: serverTimestamp()
  });
  return docRef.id;
};

export const getUserHistory = async (userId: string, limitCount: number = 20) => {
  const q = query(
    collection(db, COLLECTIONS.HISTORY),
    where('userId', '==', userId),
    orderBy('viewedAt', 'desc'),
    limit(limitCount)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as History));
};

// Storage Operations
export const uploadImage = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};

export const uploadArtistImage = async (file: File, artistId: string) => {
  return uploadImage(file, `artists/${artistId}/${file.name}`);
};

export const uploadSongImage = async (file: File, songId: string) => {
  return uploadImage(file, `songs/${songId}/${file.name}`);
};

export const uploadGenreImage = async (file: File, genreId: string) => {
  return uploadImage(file, `genres/${genreId}/${file.name}`);
};

// User Profile Operations
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin' | 'moderator';
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

export const getAllUsers = async () => {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
};

export const getUserProfile = async (userId: string) => {
  const docRef = doc(db, COLLECTIONS.USERS, userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as UserProfile;
  }
  return null;
};

export const updateUserRole = async (userId: string, role: 'user' | 'admin' | 'moderator') => {
  const docRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(docRef, { role });
};

export const deleteUser = async (userId: string) => {
  await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
};

