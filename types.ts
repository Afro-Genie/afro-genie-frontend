export interface Language {
  code: string;
  name: string;
}

export interface LyricInput {
  artist: string;
  title: string;
  lyrics: string;
  sourceLang: string;
  targetLang: string;
}

export interface AiAnalysisResult {
  translatedLyrics: string;
  culturalContext: string;
}

export interface Artist {
  id: string;
  name: string;
  genre: string;
  image: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  image: string;
}

export interface Genre {
  id: string;
  name: string;
  image: string;
}

export type Suggestion = 
  | { type: 'artist'; data: Artist }
  | { type: 'song'; data: Song }
  | { type: 'genre'; data: Genre };

export interface GenieSettings {
  id?: string;
  imageUrl: string;
  animationType: 'float' | 'bounce' | 'pulse' | 'spin' | 'none';
  animationDuration: number; // in seconds
  animationDelay: number; // in seconds
  opacity: number; // 0-100
  size: 'small' | 'medium' | 'large';
  updatedAt?: any;
}

export interface APISearchResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  image?: string;
  lyrics?: string;
  source: 'lyricfind' | 'genius' | 'musicbrainz' | 'lastfm';
  confidence: number;
  metadata: {
    genre?: string;
    language?: string;
    duration?: number;
    url?: string;
    [key: string]: any;
  };
}

export interface SongMetadata {
  album?: string;
  year?: number;
  genre?: string;
  language?: string;
  duration?: number;
  label?: string;
  [key: string]: any;
}

export interface ArtistInfo {
  name: string;
  genre?: string;
  image?: string;
  country?: string;
  bio?: string;
  [key: string]: any;
}

export interface FullSongData {
  song: Omit<Song, 'id'>;
  artist: Omit<Artist, 'id'>;
  lyrics: string;
  metadata: SongMetadata;
  images: {
    song?: string;
    artist?: string;
    album?: string;
  };
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingSong?: Song;
  differences?: string[];
  confidence?: number;
}

// Forum Types
export interface Topic {
  id?: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  category: string;
  songId?: string;
  artistId?: string;
  likes: number;
  shares: number;
  commentCount: number;
  createdAt?: any;
  updatedAt?: any;
  isPinned: boolean;
  isLocked: boolean;
  imageUrl?: string;
}

export interface TopicComment {
  id?: string;
  topicId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  likes: number;
  createdAt?: any;
  updatedAt?: any;
  parentCommentId?: string; // For nested replies
}

export interface ForumCategory {
  id?: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  topicCount: number;
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: any;
}

export interface UserProfileExtended {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin' | 'moderator';
  createdAt: any;
  lastLogin: any;
  postCount?: number;
  commentCount?: number;
  reputation?: number;
  badges?: UserBadge[];
}