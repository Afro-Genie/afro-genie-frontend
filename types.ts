export interface Language {
  id?: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
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
  culturalContext?: string; // Optional - now only added by humans
}

export interface Artist {
  id: string;
  name: string;
  genre: string;
  image: string;
  // Spotify integration fields
  spotifyId?: string;
  bio?: string;
  popularity?: number;
  followers?: number;
  externalUrl?: string; // Spotify profile URL
  genres?: string[]; // Multiple genres from Spotify
  updatedAt?: any;
  spotifySyncedAt?: any; // Last time synced with Spotify
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  image: string;
  createdBy?: string; // User ID who created the song
  createdAt?: any;
  updatedAt?: any;
  // Additional fields for categorization and sorting
  views?: number; // Number of times song has been viewed
  year?: number; // Release year
  genre?: string; // Primary genre
  genres?: string[]; // Multiple genres
  language?: string; // Primary language
  languages?: string[]; // Multiple languages
  album?: string; // Album name
  releaseDate?: string; // Release date
  popularity?: number; // Popularity score
  requestCount?: number; // Number of translation requests
  lyrics?: string;
  spotifyUrl?: string;
  spotifyId?: string | null;
  source?: 'DB' | 'SPOTIFY' | 'HYBRID';
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

// Forum Types (unified: supports both flat legacy and nested API shapes)
export interface Topic {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  category: string | { id: string; name: string };
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
  author?: { id: string; displayName: string; photoUrl?: string; role?: string };
  forumCategory?: { id: string; name: string };
  userVote?: 'UPVOTE' | 'DOWNVOTE' | null;
}

export interface TopicComment {
  id: string;
  topicId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  likes: number;
  createdAt?: any;
  updatedAt?: any;
  parentCommentId?: string;
  user?: { id: string; displayName: string; photoUrl?: string; role?: string };
  replies?: TopicComment[];
  _count?: { replies: number };
}

export interface ForumCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order?: number;
  topicCount: number;
  memberCount?: number;
  isMember?: boolean;
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
  role: 'user' | 'admin' | 'moderator' | 'artist';
  createdAt: any;
  lastLogin: any;
  postCount?: number;
  commentCount?: number;
  reputation?: number;
  badges?: UserBadge[];
  // Artist-specific fields
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

// Community (new API-based types)
export interface CommunityCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order?: number;
  memberCount: number;
  topicCount: number;
  isMember?: boolean;
}

export interface CommunityTopic {
  id: string;
  title: string;
  content: string;
  forumCategoryId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  category: string | { id: string; name: string };
  likes: number;
  shares: number;
  commentCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt?: string;
  songId?: string;
  artistId?: string;
  imageUrl?: string;
  userVote?: 'UPVOTE' | 'DOWNVOTE' | null;
  author?: { id: string; displayName: string; photoUrl?: string; role?: string };
  forumCategory?: { id: string; name: string };
}

export interface CommunityComment {
  id: string;
  topicId: string;
  userId: string;
  parentCommentId?: string;
  content: string;
  likes: number;
  createdAt: string;
  updatedAt?: string;
  user: { id: string; displayName: string; photoUrl?: string; role?: string };
  _count?: { replies: number };
  replies?: CommunityComment[];
}

export type TranslationViewMode =
  | 'tabs'
  | 'side-by-side'
  | 'top-bottom'
  | 'hover'
  | 'split-screen'
  | 'inline'
  | 'toggle';

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
  reviewedAt?: any;
  rejectionReason?: string;
  upvotes?: number; // Count of upvotes
  downvotes?: number; // Count of downvotes
  createdAt?: any;
  updatedAt?: any;
}

export interface TranslationVote {
  id?: string;
  translationId: string;
  userId: string;
  voteType: 'upvote' | 'downvote';
  createdAt?: any;
}

export interface TranslationCorrection {
  id?: string;
  translationId: string;
  userId: string;
  originalText: string; // The text being corrected
  suggestedText: string; // The suggested correction
  reason?: string; // Optional explanation
  status?: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: any;
  createdAt?: any;
}

export interface TranslationRequest {
  id?: string;
  songId: string;
  songTitle: string;
  artist: string;
  userId: string;
  userEmail: string;
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any;
  notes?: string;
}

export interface SongRequest {
  id?: string;
  songTitle: string;
  artist: string;
  userId: string;
  userEmail: string;
  searchQuery?: string; // The original search query that triggered this request
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any;
  notes?: string;
}

export interface AppNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type?: 'request-completed' | 'system';
  sourceCollection?: 'songRequests' | 'translationRequests';
  sourceId?: string | null;
  read: boolean;
  createdAt?: any;
}