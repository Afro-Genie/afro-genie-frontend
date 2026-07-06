// Firebase has been replaced by the Express backend API.
// This file now routes all operations through services/api.ts

import { artistsApi, songsApi, translationsApi, apiRequest } from './api';
import type { Artist, Song, Genre, GenieSettings, Topic, TopicComment, ForumCategory, Translation, TranslationRequest, SongRequest, TranslationVote, TranslationCorrection, AppNotification } from '../types';

const BROKEN_IMAGE_HOSTS = new Set(['images.afrogenie.dev']);

const sanitizeImageUrl = (raw: unknown): string => {
  if (typeof raw !== 'string') {
    return '';
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (BROKEN_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())) {
      return '';
    }
    return trimmed;
  } catch {
    return '';
  }
};

// Artist Operations
export const addArtist = async (artist: Omit<Artist, 'id'>) => {
  const result = await artistsApi.create(artist);
  return result.id;
};

export const getArtist = async (artistId: string) => {
  try {
    const result = await artistsApi.get(artistId);
    return normalizeArtist(result);
  } catch {
    return null;
  }
};

export const getAllArtists = async (params?: { limit?: number; search?: string; genre?: string }) => {
  try {
    const result = await artistsApi.getAll({ limit: params?.limit ?? 200, search: params?.search, genre: params?.genre });
    return (result.data || []).map((a: any) => normalizeArtist(a)).filter(Boolean);
  } catch {
    return [];
  }
};

export const getArtistByName = async (name: string): Promise<Artist | null> => {
  try {
    const result = await artistsApi.getAll({ search: name, limit: 1 });
    const match = (result.data || []).find(
      (a: any) => a.name?.toLowerCase() === name.toLowerCase()
    );
    return normalizeArtist(match);
  } catch {
    return null;
  }
};

export const syncArtistFromSpotify = async (artistId: string, spotifyArtistId: string): Promise<void> => {
  const { spotifyService } = await import('./spotifyService');
  try {
    const spotifyArtist = await spotifyService.getArtist(spotifyArtistId);
    await artistsApi.update(artistId, {
      spotifyId: spotifyArtist.id,
      name: spotifyArtist.name,
      image: spotifyArtist.images?.[0]?.url || '',
      genres: spotifyArtist.genres || [],
      popularity: spotifyArtist.popularity,
      externalUrl: spotifyArtist.external_urls?.spotify,
    });
  } catch (error) {
    console.error('Error syncing artist from Spotify:', error);
    throw error;
  }
};

export const updateArtist = async (artistId: string, updates: Partial<Omit<Artist, 'id'>>) => {
  await artistsApi.update(artistId, updates);
};

export const deleteArtist = async (artistId: string) => {
  await artistsApi.delete(artistId);
};

// Song Operations
export const addSong = async (song: Omit<Song, 'id'>) => {
  const result = await songsApi.create(song);
  return result.id;
};

const normalizeSong = (s: any): Song | null => {
  if (!s) return null;
  return {
    id: s.id,
    title: s.title,
    artist: s.artist?.name || s.artist || '',
    artistId: s.artistId,
    image: sanitizeImageUrl(s.imageUrl || s.coverImageUrl || s.image || ''),
    createdBy: s.createdBy,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    views: s.views,
    year: s.releaseYear,
    genre: s.genres?.[0]?.genre?.name || (Array.isArray(s.genres) ? s.genres[0] : '') || '',
    genres: Array.isArray(s.genres) ? s.genres.map((g: any) => g.genre?.name || g).filter(Boolean) : [],
    language: s.primaryLanguage || s.languages?.[0] || '',
    languages: s.languages || [],
    album: s.albumName,
    releaseDate: s.releaseDate,
    popularity: s.popularity,
    requestCount: s.requestCount,
  };
};

const normalizeArtist = (a: any): Artist | null => {
  if (!a) return null;
  return {
    id: a.id,
    name: a.name,
    genre: a.genres?.[0] || '',
    image: sanitizeImageUrl(a.imageUrl || a.image || ''),
    spotifyId: a.spotifyId,
    bio: a.bio,
    popularity: a.popularity,
    followers: a.followers,
    externalUrl: a.externalUrl,
    genres: a.genres,
    updatedAt: a.updatedAt,
    spotifySyncedAt: a.spotifySyncedAt,
  };
};

export const getSong = async (songId: string) => {
  try {
    const result = await songsApi.get(songId);
    return normalizeSong(result);
  } catch {
    return null;
  }
};

export const getSongsByArtist = async (artistId: string) => {
  try {
    const result = await songsApi.getAll({ artistId, limit: 200 });
    const raw = result.songs || result.data || [];
    return raw.map((s: any) => normalizeSong(s)).filter(Boolean);
  } catch {
    return [];
  }
};

export const getAllSongs = async () => {
  try {
    const result = await songsApi.getAll({ limit: 500 });
    const raw = result.songs || result.data || [];
    return raw.map((s: any) => normalizeSong(s)).filter(Boolean);
  } catch {
    return [];
  }
};

export const updateSong = async (songId: string, updates: Partial<Omit<Song, 'id'>>) => {
  await songsApi.update(songId, updates);
};

export const deleteSong = async (songId: string) => {
  await songsApi.delete(songId);
};

// Genre Operations
export const addGenre = async (genre: Omit<Genre, 'id'>) => {
  console.warn('addGenre: Not yet implemented in backend API');
  return 'stub-id';
};

export const getAllGenres = async () => {
  try {
    const result = await apiRequest<any>('/songs', { method: 'GET' });
    return [];
  } catch {
    return [];
  }
};

export const updateGenre = async (genreId: string, updates: any) => {
  console.warn('updateGenre: Not yet implemented in backend API');
};

export const deleteGenre = async (genreId: string) => {
  console.warn('deleteGenre: Not yet implemented in backend API');
};

// Translation Operations
export const saveTranslation = async (translation: Omit<Translation, 'id' | 'createdAt' | 'updatedAt'>) => {
  const result = await translationsApi.request(translation.songId, translation.sourceLang, translation.targetLang);
  return result.translation?.id || result.jobId || 'stub-id';
};

export const getTranslation = async (translationId: string) => {
  console.warn('getTranslation: Not directly supported by backend API');
  return null;
};

export const getUserTranslations = async (userId: string) => {
  console.warn('getUserTranslations: Not yet implemented');
  return [];
};

export const getLatestTranslationForSong = async (songId: string) => {
  console.warn('getLatestTranslationForSong: Not directly supported');
  return null;
};

export const getAllTranslations = async (
  filters?: {
    status?: 'pending' | 'approved' | 'rejected' | 'published';
    source?: 'manual' | 'api' | 'user_request';
    songId?: string;
    userId?: string;
  },
  limitCount?: number
) => {
  if (filters?.songId) {
    try {
      const result = await translationsApi.getForSong(filters.songId);
      const all: Translation[] = [];
      if (result.translations) {
        Object.values(result.translations).forEach((group: any) => {
          if (Array.isArray(group)) all.push(...group);
        });
      }
      return all;
    } catch {
      return [];
    }
  }
  console.warn('getAllTranslations: Only songId filter is supported');
  return [];
};

export const getTranslationsForSong = async (songId: string) => {
  try {
    const result = await translationsApi.getForSong(songId);
    const all: Translation[] = [];
    if (result.translations) {
      Object.values(result.translations as Record<string, any>).forEach((group: any) => {
        if (Array.isArray(group)) all.push(...group);
      });
    }
    return all;
  } catch {
    return [];
  }
};

export const updateTranslation = async (
  translationId: string,
  data: Partial<Omit<Translation, 'id' | 'createdAt'>>
) => {
  console.warn('updateTranslation: Not yet implemented in backend API');
};

export const getSuspectTranslations = async () => {
  console.warn('getSuspectTranslations: Not yet implemented');
  return [];
};

export const deleteTranslation = async (translationId: string) => {
  console.warn('deleteTranslation: Not yet implemented in backend API');
};

export const approveTranslation = async (translationId: string, reviewedBy: string) => {
  console.warn('approveTranslation: Not yet implemented in backend API');
};

export const rejectTranslation = async (
  translationId: string,
  reviewedBy: string,
  reason?: string
) => {
  console.warn('rejectTranslation: Not yet implemented in backend API');
};

// Translation Voting Operations
export const voteTranslation = async (
  translationId: string,
  userId: string,
  voteType: 'upvote' | 'downvote'
): Promise<void> => {
  console.warn('voteTranslation: Not yet implemented in backend API');
};

export const getUserVote = async (translationId: string, userId: string): Promise<'upvote' | 'downvote' | null> => {
  return null;
};

// Translation Correction Operations
export const submitTranslationCorrection = async (
  correction: Omit<TranslationCorrection, 'id' | 'createdAt' | 'status'>
): Promise<string> => {
  console.warn('submitTranslationCorrection: Not yet implemented');
  return 'stub-id';
};

export const getTranslationCorrections = async (translationId: string): Promise<TranslationCorrection[]> => {
  return [];
};

export const updateCorrectionStatus = async (
  correctionId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string
): Promise<void> => {
  console.warn('updateCorrectionStatus: Not yet implemented');
};

// Translation Request Operations
export const createTranslationRequest = async (request: Omit<TranslationRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
  console.warn('createTranslationRequest: Not yet implemented in backend API');
  return 'stub-id';
};

export const getTranslationRequests = async (status?: TranslationRequest['status']) => {
  return [];
};

export const getTranslationRequest = async (requestId: string): Promise<TranslationRequest | null> => {
  return null;
};

export const updateTranslationRequest = async (
  requestId: string,
  updates: Partial<Omit<TranslationRequest, 'id'>>
) => {
  console.warn('updateTranslationRequest: Not yet implemented');
};

export const getPendingTranslationRequestCount = async (): Promise<number> => {
  return 0;
};

// Song Request Operations
export const createSongRequest = async (request: Omit<SongRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
  console.warn('createSongRequest: Not yet implemented');
  return 'stub-id';
};

export const getSongRequests = async (status?: SongRequest['status']) => {
  return [];
};

export const getSongRequest = async (requestId: string): Promise<SongRequest | null> => {
  return null;
};

export const updateSongRequest = async (
  requestId: string,
  updates: Partial<Omit<SongRequest, 'id'>>
) => {
  console.warn('updateSongRequest: Not yet implemented');
};

export const getPendingSongRequestCount = async (): Promise<number> => {
  return 0;
};

// Notification Operations
export const getUnreadNotifications = async (userId: string): Promise<AppNotification[]> => {
  return [];
};

export const subscribeToUnreadNotifications = (
  userId: string,
  onUpdate: (items: AppNotification[]) => void
) => {
  onUpdate([]);
  return () => {};
};

export const markNotificationAsRead = async (notificationId: string) => {
  console.warn('markNotificationAsRead: Not yet implemented');
};

// Annotation Operations
export interface Annotation {
  id?: string;
  songId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  comment: string;
  createdAt?: any;
}

export const addAnnotation = async (annotation: Omit<Annotation, 'id' | 'createdAt'>) => {
  console.warn('addAnnotation: Not yet implemented');
  return 'stub-id';
};

export const getSongAnnotations = async (songId: string) => {
  return [];
};

// Favorites Operations
export interface Favorite {
  id?: string;
  userId: string;
  songId: string;
  createdAt?: any;
}

export const addToFavorites = async (userId: string, songId: string) => {
  console.warn('addToFavorites: Not yet implemented');
  return 'stub-id';
};

export const removeFromFavorites = async (favoriteId: string) => {
  console.warn('removeFromFavorites: Not yet implemented');
};

export const getUserFavorites = async (userId: string) => {
  return [];
};

// History Operations
export interface History {
  id?: string;
  userId: string;
  songId: string;
  viewedAt?: any;
}

export const addToHistory = async (userId: string, songId: string) => {
  console.warn('addToHistory: Not yet implemented');
  return 'stub-id';
};

export const getUserHistory = async (userId: string, limitCount: number = 20) => {
  return [];
};

// Storage Operations
export const uploadImage = async (file: File, path: string) => {
  console.warn('uploadImage: File upload not yet implemented in backend API');
  return '';
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
  role: 'user' | 'admin' | 'moderator' | 'artist';
  createdAt?: any;
  lastLogin?: any;
  artistProfile?: {
    stageName: string;
    genre: string;
    bio: string;
    location?: string;
    website?: string;
    socialLinks?: {
      instagram?: string;
      twitter?: string;
      facebook?: string;
      youtube?: string;
    };
    verified: boolean;
    verifiedAt?: any;
  };
}

export const getAllUsers = async () => {
  console.warn('getAllUsers: Not yet implemented in backend API');
  return [];
};

export const getUserProfile = async (userId: string) => {
  console.warn('getUserProfile: Not yet implemented in backend API');
  return null;
};

export const updateUserRole = async (userId: string, role: 'user' | 'admin' | 'moderator' | 'artist') => {
  console.warn('updateUserRole: Not yet implemented in backend API');
};

export const deleteUser = async (userId: string) => {
  console.warn('deleteUser: Not yet implemented in backend API');
};

// Genie Settings Operations
const GENIE_SETTINGS_DOC_ID = 'main';

export const getGenieSettings = async (): Promise<GenieSettings | null> => {
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
  console.warn('updateGenieSettings: Not yet implemented in backend API');
};

export const uploadGenieImage = async (file: File) => {
  return uploadImage(file, `genie/${Date.now()}_${file.name}`);
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
    const allArtists = await getAllArtists();
    const normalizedArtistName = artistData.name.toLowerCase().trim();
    let artistId = '';

    const existingArtist = allArtists.find(
      (a: any) => a.name?.toLowerCase().trim() === normalizedArtistName
    );

    if (existingArtist) {
      artistId = existingArtist.id;
      if (artistData.image && artistData.image !== existingArtist.image) {
        await updateArtist(artistId, { image: artistData.image });
      }
    } else {
      artistId = await addArtist(artistData);
    }

    const songWithArtistId = { ...songData, artistId };
    const songId = await addSong(songWithArtistId);

    let translationId: string | undefined;
    if (lyrics && lyrics.trim().length > 0) {
      translationId = await saveTranslation({
        songId,
        userId,
        originalLyrics: lyrics,
        translatedLyrics: lyrics,
        culturalContext: metadata?.culturalContext || '',
        sourceLang,
        targetLang,
        source: 'api',
        status: 'approved',
      });
    }

    return { songId, artistId, translationId, success: true };
  } catch (error: any) {
    console.error('Error saving full song package:', error);
    return { songId: '', artistId: '', success: false, error: error.message || 'Failed to save song package' };
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
    if (!existingSong) throw new Error('Song not found');

    await updateSong(existingSongId, songData);

    if (existingSong.artistId && Object.keys(artistData).length > 0) {
      await updateArtist(existingSong.artistId, artistData);
    }

    return { songId: existingSongId, artistId: existingSong.artistId, success: true };
  } catch (error: any) {
    console.error('Error updating song package:', error);
    return { songId: existingSongId, artistId: '', success: false, error: error.message || 'Failed to update song package' };
  }
};

// Forum Operations

// Topic Operations
export const createTopic = async (topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'shares' | 'commentCount' | 'isPinned' | 'isLocked'>) => {
  console.warn('createTopic: Forum not yet migrated to backend API');
  return 'stub-id';
};

export const getTopic = async (topicId: string): Promise<Topic | null> => {
  console.warn('getTopic: Forum not yet migrated');
  return null;
};

export const getTopics = async (
  category?: string,
  sortBy: 'latest' | 'mostLiked' | 'mostCommented' = 'latest',
  limitCount: number = 20
): Promise<Topic[]> => {
  return [];
};

export const getTopicsBySong = async (songId: string): Promise<Topic[]> => {
  return [];
};

export const getTopicsByArtist = async (artistId: string): Promise<Topic[]> => {
  return [];
};

export const getUserTopics = async (userId: string): Promise<Topic[]> => {
  return [];
};

export const updateTopic = async (topicId: string, updates: Partial<Omit<Topic, 'id'>>) => {
  console.warn('updateTopic: Forum not yet migrated');
};

export const deleteTopic = async (topicId: string) => {
  console.warn('deleteTopic: Forum not yet migrated');
};

export const pinTopic = async (topicId: string, pinned: boolean) => {
  console.warn('pinTopic: Forum not yet migrated');
};

export const lockTopic = async (topicId: string, locked: boolean) => {
  console.warn('lockTopic: Forum not yet migrated');
};

// Comment Operations
export const addComment = async (comment: Omit<TopicComment, 'id' | 'createdAt' | 'updatedAt' | 'likes'>) => {
  console.warn('addComment: Forum not yet migrated');
  return 'stub-id';
};

export const getTopicComments = async (topicId: string): Promise<TopicComment[]> => {
  return [];
};

export const updateComment = async (commentId: string, updates: Partial<Omit<TopicComment, 'id'>>) => {
  console.warn('updateComment: Forum not yet migrated');
};

export const deleteComment = async (commentId: string, topicId: string) => {
  console.warn('deleteComment: Forum not yet migrated');
};

// Like Operations
export const likeTopic = async (topicId: string, userId: string) => {
  console.warn('likeTopic: Forum not yet migrated');
  return false;
};

export const isTopicLiked = async (topicId: string, userId: string): Promise<boolean> => {
  return false;
};

export const likeComment = async (commentId: string, userId: string) => {
  console.warn('likeComment: Forum not yet migrated');
  return false;
};

export const isCommentLiked = async (commentId: string, userId: string): Promise<boolean> => {
  return false;
};

// Share Operations
export const shareTopic = async (topicId: string, userId: string) => {
  console.warn('shareTopic: Forum not yet migrated');
};

// Category Operations
export const getCategories = async (): Promise<ForumCategory[]> => {
  return [];
};

export const getCategory = async (categoryId: string): Promise<ForumCategory | null> => {
  return null;
};

export const createCategory = async (category: Omit<ForumCategory, 'id' | 'topicCount'>) => {
  console.warn('createCategory: Forum not yet migrated');
  return 'stub-id';
};

export const updateCategory = async (categoryId: string, updates: Partial<Omit<ForumCategory, 'id'>>) => {
  console.warn('updateCategory: Forum not yet migrated');
};

export const deleteCategory = async (categoryId: string) => {
  console.warn('deleteCategory: Forum not yet migrated');
};

export const incrementCategoryTopicCount = async (categoryId: string) => {
  console.warn('incrementCategoryTopicCount: Forum not yet migrated');
};

export const decrementCategoryTopicCount = async (categoryId: string) => {
  console.warn('decrementCategoryTopicCount: Forum not yet migrated');
};

// User Stats Operations
export const incrementUserPostCount = async (userId: string) => {
  console.warn('incrementUserPostCount: Not yet migrated');
};

export const incrementUserCommentCount = async (userId: string) => {
  console.warn('incrementUserCommentCount: Not yet migrated');
};

export const getUserStats = async (userId: string) => {
  return { postCount: 0, commentCount: 0, reputation: 0, badges: [] };
};

// Search Operations
export const searchTopics = async (searchTerm: string, limitCount: number = 20): Promise<Topic[]> => {
  return [];
};

export const searchLyrics = async (searchTerm: string, limitCount: number = 10): Promise<Array<Translation & { songTitle?: string; artistName?: string }>> => {
  return [];
};

export const uploadTopicImage = async (file: File, topicId: string) => {
  return uploadImage(file, `topics/${topicId}/${file.name}`);
};

// Sync Job Operations
export interface SyncJobData {
  id: string;
  type: 'manual' | 'scheduled' | 'auto';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: any;
  endTime?: any;
  results: { artists: number; songs: number; genres: number; errors: number };
  resultData: { artists: any[]; songs: any[]; genres: any[] };
  logs?: string[];
  userId?: string;
  query?: string;
}

export const saveSyncJob = async (jobData: SyncJobData): Promise<string> => {
  console.warn('saveSyncJob: Not yet migrated');
  return jobData.id;
};

export const updateSyncJob = async (jobId: string, updates: Partial<SyncJobData>): Promise<void> => {
  console.warn('updateSyncJob: Not yet migrated');
};

export const getSyncJob = async (jobId: string): Promise<SyncJobData | null> => {
  return null;
};

export const getAllSyncJobs = async (userId?: string): Promise<SyncJobData[]> => {
  return [];
};

export const deleteSyncJob = async (jobId: string): Promise<void> => {
  console.warn('deleteSyncJob: Not yet migrated');
};

// Artist-specific operations
export const getArtistSongs = async (userId: string): Promise<Song[]> => {
  console.warn('getArtistSongs: Using simplified implementation');
  return [];
};

export const addSongAsArtist = async (
  songData: Omit<Song, 'id'>,
  artistId: string,
  userId: string
): Promise<string> => {
  const result = await songsApi.create({ ...songData, artistId });
  return result.id;
};

export const updateArtistSong = async (
  songId: string,
  updates: Partial<Omit<Song, 'id'>>,
  userId: string
): Promise<void> => {
  await songsApi.update(songId, updates);
};

export const deleteArtistSong = async (songId: string, userId: string): Promise<void> => {
  await songsApi.delete(songId);
};

export const getArtistAnalytics = async (userId: string): Promise<{
  totalSongs: number;
  totalTranslations: number;
  totalViews: number;
  songs: Array<{ id: string; title: string; views: number; translations: number }>;
}> => {
  return { totalSongs: 0, totalTranslations: 0, totalViews: 0, songs: [] };
};

export const updateArtistProfile = async (
  userId: string,
  profileData: {
    stageName: string;
    genre: string;
    bio: string;
    location?: string;
    website?: string;
    socialLinks?: { instagram?: string; twitter?: string; facebook?: string; youtube?: string };
    photoURL?: string;
  }
): Promise<void> => {
  console.warn('updateArtistProfile: Not fully implemented in backend API');
};
