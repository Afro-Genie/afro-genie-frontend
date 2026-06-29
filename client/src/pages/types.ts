export interface SongLanguage {
  languageCode: string;
  percentage: number;
}

export interface SongArtist {
  id: string;
  name: string;
}

export interface SongLyric {
  content: string;
}

export interface Song {
  id: string;
  title: string;
  artistId?: string;
  artist?: SongArtist;
  songLanguages?: SongLanguage[];
  views?: number;
  viewCount?: number;
  lyrics?: SongLyric[];
}

export interface SongsListResponse {
  songs: Song[];
  data: Song[];
  total: number;
  page: number;
  totalPages: number;
  nextCursor: string | null;
}

export interface Translation {
  id: string;
  songId: string;
  userId: string;
  sourceLang: string;
  targetLang: string;
  originalLyrics: string;
  translatedLyrics: string;
  culturalContext: string | null;
  aiModel: string | null;
  promptVersion: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
}

export interface TranslationsGroupedResponse {
  songId: string;
  translations: Record<string, Translation[]>;
}

export interface SearchHitDocument {
  id: string;
  title?: string;
  name?: string;
  artistName?: string;
  artistId?: string;
  imageUrl?: string;
}

export interface SearchHit {
  document: SearchHitDocument;
  textMatch?: number;
  highlights?: unknown[];
}

export interface SearchResultBucket {
  found: number;
  page: number;
  hits: SearchHit[];
}

export interface SearchResponse {
  query: string;
  type: 'song' | 'artist' | 'genre' | 'all';
  page: number;
  limit: number;
  tookMs: number;
  songs?: SearchResultBucket;
  artists?: SearchResultBucket;
  genres?: SearchResultBucket;
}

export interface SuggestionItem {
  type: 'song' | 'artist';
  textMatch?: number;
  highlights?: unknown[];
  document: SearchHitDocument;
}

export interface SearchSuggestResponse {
  query: string;
  tookMs: number;
  suggestions: SuggestionItem[];
}
