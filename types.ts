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