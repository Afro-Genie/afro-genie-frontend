import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment,
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { Artist, Song, Genre, GenieSettings, Topic, TopicComment, ForumCategory } from '../types';

// Collections
const COLLECTIONS = {
  ARTISTS: 'artists',
  SONGS: 'songs',
  TRANSLATIONS: 'translations',
  ANNOTATIONS: 'annotations',
  FAVORITES: 'favorites',
  HISTORY: 'history',
  GENRES: 'genres',
  USERS: 'users',
  GENIE_SETTINGS: 'genieSettings',
  TOPICS: 'topics',
  TOPIC_COMMENTS: 'topicComments',
  TOPIC_LIKES: 'topicLikes',
  COMMENT_LIKES: 'commentLikes',
  TOPIC_SHARES: 'topicShares',
  FORUM_CATEGORIES: 'forumCategories',
  SYNC_JOBS: 'syncJobs'
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
  status?: 'pending' | 'approved' | 'rejected' | 'published';
  source?: 'manual' | 'api' | 'user_request';
  reviewedBy?: string; // Admin who reviewed
  reviewedAt?: Timestamp;
  rejectionReason?: string;
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

// Get all translations with optional filters
export const getAllTranslations = async (
  filters?: {
    status?: 'pending' | 'approved' | 'rejected' | 'published';
    source?: 'manual' | 'api' | 'user_request';
    songId?: string;
    userId?: string;
  },
  limitCount?: number
) => {
  let q = query(collection(db, COLLECTIONS.TRANSLATIONS));
  
  if (filters) {
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.source) {
      q = query(q, where('source', '==', filters.source));
    }
    if (filters.songId) {
      q = query(q, where('songId', '==', filters.songId));
    }
    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
  if (limitCount) {
    q = query(q, limit(limitCount));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Translation));
};

// Get all translations for a specific song
export const getTranslationsForSong = async (songId: string) => {
  const q = query(
    collection(db, COLLECTIONS.TRANSLATIONS),
    where('songId', '==', songId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Translation));
};

// Update translation
export const updateTranslation = async (
  translationId: string,
  data: Partial<Omit<Translation, 'id' | 'createdAt'>>
) => {
  const docRef = doc(db, COLLECTIONS.TRANSLATIONS, translationId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

// Delete translation
export const deleteTranslation = async (translationId: string) => {
  await deleteDoc(doc(db, COLLECTIONS.TRANSLATIONS, translationId));
};

// Approve translation
export const approveTranslation = async (translationId: string, reviewedBy: string) => {
  const docRef = doc(db, COLLECTIONS.TRANSLATIONS, translationId);
  await updateDoc(docRef, {
    status: 'approved',
    reviewedBy,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

// Reject translation
export const rejectTranslation = async (
  translationId: string,
  reviewedBy: string,
  reason?: string
) => {
  const docRef = doc(db, COLLECTIONS.TRANSLATIONS, translationId);
  await updateDoc(docRef, {
    status: 'rejected',
    reviewedBy,
    reviewedAt: serverTimestamp(),
    rejectionReason: reason || '',
    updatedAt: serverTimestamp()
  });
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

// Genie Settings Operations
const GENIE_SETTINGS_DOC_ID = 'main';

export const getGenieSettings = async (): Promise<GenieSettings | null> => {
  const docRef = doc(db, COLLECTIONS.GENIE_SETTINGS, GENIE_SETTINGS_DOC_ID);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as GenieSettings;
  }
  
  // Return default settings if none exist
  return {
    imageUrl: '/Images/gene.png',
    animationType: 'float',
    animationDuration: 3,
    animationDelay: 0,
    opacity: 20,
    size: 'large'
  };
};

export const updateGenieSettings = async (settings: Partial<GenieSettings>) => {
  const docRef = doc(db, COLLECTIONS.GENIE_SETTINGS, GENIE_SETTINGS_DOC_ID);
  await setDoc(docRef, {
    ...settings,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const uploadGenieImage = async (file: File) => {
  const timestamp = Date.now();
  const fileName = `genie_${timestamp}_${file.name}`;
  return uploadImage(file, `genie/${fileName}`);
};

// Bulk Save Operations for API Imports
export interface BulkSaveResult {
  songId: string;
  artistId: string;
  translationId?: string;
  success: boolean;
  error?: string;
}

export const saveFullSongPackage = async (
  songData: Omit<Song, 'id'>,
  artistData: Omit<Artist, 'id'>,
  lyrics: string,
  userId: string,
  sourceLang: string = 'en',
  targetLang: string = 'en',
  metadata?: any
): Promise<BulkSaveResult> => {
  try {
    // Find or create artist
    const allArtists = await getAllArtists();
    const normalizedArtistName = artistData.name.toLowerCase().trim();
    let artistId = '';
    let isNewArtist = false;

    const existingArtist = allArtists.find(
      a => a.name.toLowerCase().trim() === normalizedArtistName
    );

    if (existingArtist) {
      artistId = existingArtist.id;
      // Update artist if new image provided
      if (artistData.image && artistData.image !== existingArtist.image) {
        await updateArtist(artistId, { image: artistData.image });
      }
    } else {
      artistId = await addArtist(artistData);
      isNewArtist = true;
    }

    // Create song with artistId
    const songWithArtistId = {
      ...songData,
      artistId
    };
    const songId = await addSong(songWithArtistId);

    // Save lyrics as translation
    let translationId: string | undefined;
    if (lyrics && lyrics.trim().length > 0) {
      translationId = await saveTranslation({
        songId,
        userId,
        originalLyrics: lyrics,
        translatedLyrics: lyrics, // Will be translated later if needed
        culturalContext: metadata?.culturalContext || '',
        sourceLang,
        targetLang,
        source: 'api',
        status: 'approved'
      });
    }

    return {
      songId,
      artistId,
      translationId,
      success: true
    };
  } catch (error: any) {
    console.error('Error saving full song package:', error);
    return {
      songId: '',
      artistId: '',
      success: false,
      error: error.message || 'Failed to save song package'
    };
  }
};

export const updateFullSongPackage = async (
  existingSongId: string,
  songData: Partial<Omit<Song, 'id'>>,
  artistData: Partial<Omit<Artist, 'id'>>,
  lyrics?: string,
  userId?: string,
  sourceLang?: string,
  targetLang?: string
): Promise<BulkSaveResult> => {
  try {
    const existingSong = await getSong(existingSongId);
    if (!existingSong) {
      throw new Error('Song not found');
    }

    // Update song
    await updateSong(existingSongId, songData);

    // Update artist if provided
    if (existingSong.artistId && Object.keys(artistData).length > 0) {
      await updateArtist(existingSong.artistId, artistData);
    }

    // Update or create translation if lyrics provided
    let translationId: string | undefined;
    if (lyrics && userId) {
      const existingTranslation = await getLatestTranslationForSong(existingSongId);
      if (existingTranslation) {
        // Update existing translation
        const translationRef = doc(db, COLLECTIONS.TRANSLATIONS, existingTranslation.id!);
        await updateDoc(translationRef, {
          originalLyrics: lyrics,
          updatedAt: serverTimestamp()
        });
        translationId = existingTranslation.id;
      } else {
        // Create new translation
        translationId = await saveTranslation({
          songId: existingSongId,
          userId,
          originalLyrics: lyrics,
          translatedLyrics: lyrics,
          culturalContext: '',
          sourceLang: sourceLang || 'en',
          targetLang: targetLang || 'en',
          source: 'api',
          status: 'approved'
        });
      }
    }

    return {
      songId: existingSongId,
      artistId: existingSong.artistId,
      translationId,
      success: true
    };
  } catch (error: any) {
    console.error('Error updating song package:', error);
    return {
      songId: existingSongId,
      artistId: '',
      success: false,
      error: error.message || 'Failed to update song package'
    };
  }
};

// ==================== FORUM OPERATIONS ====================

// Topic Operations
export const createTopic = async (topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'shares' | 'commentCount' | 'isPinned' | 'isLocked'>) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.TOPICS), {
    ...topic,
    likes: 0,
    shares: 0,
    commentCount: 0,
    isPinned: false,
    isLocked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  // Increment user post count
  if (topic.authorId) {
    await incrementUserPostCount(topic.authorId);
  }
  
  // Increment category topic count
  await incrementCategoryTopicCount(topic.category);
  
  return docRef.id;
};

export const getTopic = async (topicId: string): Promise<Topic | null> => {
  const docRef = doc(db, COLLECTIONS.TOPICS, topicId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Topic;
  }
  return null;
};

export const getTopics = async (
  category?: string,
  sortBy: 'latest' | 'mostLiked' | 'mostCommented' = 'latest',
  limitCount: number = 20
): Promise<Topic[]> => {
  let q;
  
  if (category) {
    q = query(
      collection(db, COLLECTIONS.TOPICS),
      where('category', '==', category),
      orderBy('isPinned', 'desc'),
      orderBy(sortBy === 'mostLiked' ? 'likes' : sortBy === 'mostCommented' ? 'commentCount' : 'createdAt', 'desc'),
      limit(limitCount)
    );
  } else {
    q = query(
      collection(db, COLLECTIONS.TOPICS),
      orderBy('isPinned', 'desc'),
      orderBy(sortBy === 'mostLiked' ? 'likes' : sortBy === 'mostCommented' ? 'commentCount' : 'createdAt', 'desc'),
      limit(limitCount)
    );
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic));
};

export const getTopicsBySong = async (songId: string): Promise<Topic[]> => {
  const q = query(
    collection(db, COLLECTIONS.TOPICS),
    where('songId', '==', songId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic));
};

export const getTopicsByArtist = async (artistId: string): Promise<Topic[]> => {
  const q = query(
    collection(db, COLLECTIONS.TOPICS),
    where('artistId', '==', artistId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic));
};

export const getUserTopics = async (userId: string): Promise<Topic[]> => {
  const q = query(
    collection(db, COLLECTIONS.TOPICS),
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic));
};

export const updateTopic = async (topicId: string, updates: Partial<Omit<Topic, 'id'>>) => {
  const docRef = doc(db, COLLECTIONS.TOPICS, topicId);
  await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteTopic = async (topicId: string) => {
  // Get topic to decrement counts
  const topic = await getTopic(topicId);
  if (topic) {
    if (topic.authorId) {
      // Note: We don't decrement post count on delete, but could if needed
    }
    // Decrement category count
    await decrementCategoryTopicCount(topic.category);
  }
  
  await deleteDoc(doc(db, COLLECTIONS.TOPICS, topicId));
};

export const pinTopic = async (topicId: string, pinned: boolean) => {
  await updateTopic(topicId, { isPinned: pinned });
};

export const lockTopic = async (topicId: string, locked: boolean) => {
  await updateTopic(topicId, { isLocked: locked });
};

// Comment Operations
export const addComment = async (comment: Omit<TopicComment, 'id' | 'createdAt' | 'updatedAt' | 'likes'>) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.TOPIC_COMMENTS), {
    ...comment,
    likes: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  // Increment topic comment count
  const topicRef = doc(db, COLLECTIONS.TOPICS, comment.topicId);
  await updateDoc(topicRef, {
    commentCount: increment(1),
    updatedAt: serverTimestamp()
  });
  
  // Increment user comment count
  if (comment.userId) {
    await incrementUserCommentCount(comment.userId);
  }
  
  return docRef.id;
};

export const getTopicComments = async (topicId: string): Promise<TopicComment[]> => {
  const q = query(
    collection(db, COLLECTIONS.TOPIC_COMMENTS),
    where('topicId', '==', topicId),
    orderBy('createdAt', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopicComment));
};

export const updateComment = async (commentId: string, updates: Partial<Omit<TopicComment, 'id'>>) => {
  const docRef = doc(db, COLLECTIONS.TOPIC_COMMENTS, commentId);
  await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteComment = async (commentId: string, topicId: string) => {
  // Decrement topic comment count
  const topicRef = doc(db, COLLECTIONS.TOPICS, topicId);
  await updateDoc(topicRef, {
    commentCount: increment(-1),
    updatedAt: serverTimestamp()
  });
  
  await deleteDoc(doc(db, COLLECTIONS.TOPIC_COMMENTS, commentId));
};

// Like Operations
export const likeTopic = async (topicId: string, userId: string) => {
  // Check if already liked
  const likeQuery = query(
    collection(db, COLLECTIONS.TOPIC_LIKES),
    where('topicId', '==', topicId),
    where('userId', '==', userId)
  );
  const existingLikes = await getDocs(likeQuery);
  
  if (!existingLikes.empty) {
    // Already liked, unlike it
    existingLikes.docs.forEach(doc => deleteDoc(doc.ref));
    const topicRef = doc(db, COLLECTIONS.TOPICS, topicId);
    await updateDoc(topicRef, {
      likes: increment(-1),
      updatedAt: serverTimestamp()
    });
    return false; // Unliked
  } else {
    // Add like
    await addDoc(collection(db, COLLECTIONS.TOPIC_LIKES), {
      topicId,
      userId,
      createdAt: serverTimestamp()
    });
    const topicRef = doc(db, COLLECTIONS.TOPICS, topicId);
    await updateDoc(topicRef, {
      likes: increment(1),
      updatedAt: serverTimestamp()
    });
    return true; // Liked
  }
};

export const isTopicLiked = async (topicId: string, userId: string): Promise<boolean> => {
  const likeQuery = query(
    collection(db, COLLECTIONS.TOPIC_LIKES),
    where('topicId', '==', topicId),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(likeQuery);
  return !snapshot.empty;
};

export const likeComment = async (commentId: string, userId: string) => {
  // Check if already liked
  const likeQuery = query(
    collection(db, COLLECTIONS.COMMENT_LIKES),
    where('commentId', '==', commentId),
    where('userId', '==', userId)
  );
  const existingLikes = await getDocs(likeQuery);
  
  if (!existingLikes.empty) {
    // Already liked, unlike it
    existingLikes.docs.forEach(doc => deleteDoc(doc.ref));
    const commentRef = doc(db, COLLECTIONS.TOPIC_COMMENTS, commentId);
    await updateDoc(commentRef, {
      likes: increment(-1),
      updatedAt: serverTimestamp()
    });
    return false; // Unliked
  } else {
    // Add like
    await addDoc(collection(db, COLLECTIONS.COMMENT_LIKES), {
      commentId,
      userId,
      createdAt: serverTimestamp()
    });
    const commentRef = doc(db, COLLECTIONS.TOPIC_COMMENTS, commentId);
    await updateDoc(commentRef, {
      likes: increment(1),
      updatedAt: serverTimestamp()
    });
    return true; // Liked
  }
};

export const isCommentLiked = async (commentId: string, userId: string): Promise<boolean> => {
  const likeQuery = query(
    collection(db, COLLECTIONS.COMMENT_LIKES),
    where('commentId', '==', commentId),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(likeQuery);
  return !snapshot.empty;
};

// Share Operations
export const shareTopic = async (topicId: string, userId: string) => {
  await addDoc(collection(db, COLLECTIONS.TOPIC_SHARES), {
    topicId,
    userId,
    createdAt: serverTimestamp()
  });
  
  const topicRef = doc(db, COLLECTIONS.TOPICS, topicId);
  await updateDoc(topicRef, {
    shares: increment(1),
    updatedAt: serverTimestamp()
  });
};

// Category Operations
export const getCategories = async (): Promise<ForumCategory[]> => {
  const q = query(
    collection(db, COLLECTIONS.FORUM_CATEGORIES),
    orderBy('order', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ForumCategory));
};

export const getCategory = async (categoryId: string): Promise<ForumCategory | null> => {
  const docRef = doc(db, COLLECTIONS.FORUM_CATEGORIES, categoryId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as ForumCategory;
  }
  return null;
};

export const createCategory = async (category: Omit<ForumCategory, 'id' | 'topicCount'>) => {
  const docRef = await addDoc(collection(db, COLLECTIONS.FORUM_CATEGORIES), {
    ...category,
    topicCount: 0
  });
  return docRef.id;
};

export const updateCategory = async (categoryId: string, updates: Partial<Omit<ForumCategory, 'id'>>) => {
  const docRef = doc(db, COLLECTIONS.FORUM_CATEGORIES, categoryId);
  await updateDoc(docRef, updates);
};

export const deleteCategory = async (categoryId: string) => {
  await deleteDoc(doc(db, COLLECTIONS.FORUM_CATEGORIES, categoryId));
};

export const incrementCategoryTopicCount = async (categoryId: string) => {
  const categoryRef = doc(db, COLLECTIONS.FORUM_CATEGORIES, categoryId);
  await updateDoc(categoryRef, {
    topicCount: increment(1)
  });
};

export const decrementCategoryTopicCount = async (categoryId: string) => {
  const categoryRef = doc(db, COLLECTIONS.FORUM_CATEGORIES, categoryId);
  await updateDoc(categoryRef, {
    topicCount: increment(-1)
  });
};

// User Stats Operations
export const incrementUserPostCount = async (userId: string) => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    const currentCount = userDoc.data().postCount || 0;
    await updateDoc(userRef, {
      postCount: currentCount + 1
    });
  } else {
    await setDoc(userRef, {
      postCount: 1
    }, { merge: true });
  }
};

export const incrementUserCommentCount = async (userId: string) => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    const currentCount = userDoc.data().commentCount || 0;
    await updateDoc(userRef, {
      commentCount: currentCount + 1
    });
  } else {
    await setDoc(userRef, {
      commentCount: 1
    }, { merge: true });
  }
};

export const getUserStats = async (userId: string) => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    const data = userDoc.data();
    return {
      postCount: data.postCount || 0,
      commentCount: data.commentCount || 0,
      reputation: data.reputation || 0,
      badges: data.badges || []
    };
  }
  return {
    postCount: 0,
    commentCount: 0,
    reputation: 0,
    badges: []
  };
};

// Search Operations
export const searchTopics = async (searchTerm: string, limitCount: number = 20): Promise<Topic[]> => {
  // Note: Firestore doesn't support full-text search natively
  // This is a simple implementation - for production, consider Algolia or similar
  const allTopics = await getTopics(undefined, 'latest', 100);
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  return allTopics
    .filter(topic => 
      topic.title.toLowerCase().includes(lowerSearchTerm) ||
      topic.content.toLowerCase().includes(lowerSearchTerm)
    )
    .slice(0, limitCount);
};

// Upload topic image
export const uploadTopicImage = async (file: File, topicId: string) => {
  const timestamp = Date.now();
  const fileName = `topic_${topicId}_${timestamp}_${file.name}`;
  return uploadImage(file, `topics/${topicId}/${fileName}`);
};

// Sync Job Operations
export interface SyncJobData {
  id: string;
  type: 'manual' | 'scheduled' | 'auto';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: any; // Timestamp
  endTime?: any; // Timestamp
  results: {
    artists: number;
    songs: number;
    genres: number;
    errors: number;
  };
  resultData: {
    artists: any[];
    songs: any[];
    genres: any[];
  };
  logs?: string[];
  userId?: string;
  query?: string;
}

export const saveSyncJob = async (jobData: SyncJobData): Promise<string> => {
  const docRef = await setDoc(doc(db, COLLECTIONS.SYNC_JOBS, jobData.id), {
    ...jobData,
    startTime: jobData.startTime instanceof Date ? Timestamp.fromDate(jobData.startTime) : jobData.startTime,
    endTime: jobData.endTime instanceof Date ? Timestamp.fromDate(jobData.endTime) : (jobData.endTime || null),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return jobData.id;
};

export const updateSyncJob = async (jobId: string, updates: Partial<SyncJobData>): Promise<void> => {
  const updateData: any = {
    ...updates,
    updatedAt: serverTimestamp()
  };
  
  // Convert Date objects to Timestamps
  if (updates.startTime instanceof Date) {
    updateData.startTime = Timestamp.fromDate(updates.startTime);
  }
  if (updates.endTime instanceof Date) {
    updateData.endTime = Timestamp.fromDate(updates.endTime);
  }
  
  await updateDoc(doc(db, COLLECTIONS.SYNC_JOBS, jobId), updateData);
};

export const getSyncJob = async (jobId: string): Promise<SyncJobData | null> => {
  const docRef = doc(db, COLLECTIONS.SYNC_JOBS, jobId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      startTime: data.startTime?.toDate() || new Date(),
      endTime: data.endTime?.toDate() || undefined
    } as SyncJobData;
  }
  return null;
};

export const getAllSyncJobs = async (userId?: string): Promise<SyncJobData[]> => {
  let q = query(collection(db, COLLECTIONS.SYNC_JOBS), orderBy('startTime', 'desc'), limit(100));
  
  if (userId) {
    q = query(collection(db, COLLECTIONS.SYNC_JOBS), where('userId', '==', userId), orderBy('startTime', 'desc'), limit(100));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      startTime: data.startTime?.toDate() || new Date(),
      endTime: data.endTime?.toDate() || undefined
    } as SyncJobData;
  });
};

export const deleteSyncJob = async (jobId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTIONS.SYNC_JOBS, jobId));
};

