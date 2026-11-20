// Lyric API Service - LRCLIB only
// Uses lrclib.net API for all lyrics fetching

import type {
  APISearchResult,
  FullSongData,
  ArtistInfo,
  SongMetadata,
} from "../types";

const LRCLIB_BASE = 'https://lrclib.net/api';

export interface LrcLibTrack {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

class LyricAPIService {
  private readonly LRCLIB_BASE_URL = LRCLIB_BASE;

  // Calculate African relevance score
  private readonly AFRICAN_KEYWORDS = [
    "nigerian",
    "ghanaian",
    "south african",
    "kenyan",
    "tanzanian",
    "ugandan",
    "zimbabwean",
    "afrobeats",
    "afrobeat",
    "amapiano",
    "highlife",
    "afro-pop",
    "afro-fusion",
    "afro-house",
    "afro-swing",
  ];

  private readonly AFRICAN_GENRES = [
    "afrobeats",
    "afrobeat",
    "amapiano",
    "highlife",
    "afro-pop",
    "afro-fusion",
    "afro-house",
    "juju",
    "fuji",
    "apala",
    "kizomba",
    "kuduro",
    "bongo flava",
    "gqom",
    "afro-swing",
    "afro-trap",
  ];

  private calculateAfricanScore(
    artist: string,
    genre?: string,
    metadata?: any,
  ): number {
    let score = 0;
    const lowerArtist = artist.toLowerCase();
    const lowerGenre = genre?.toLowerCase() || "";
    const lowerMetadata = JSON.stringify(metadata || {}).toLowerCase();

    for (const keyword of this.AFRICAN_KEYWORDS) {
      if (lowerArtist.includes(keyword)) {
        score += 10;
      }
    }

    for (const afroGenre of this.AFRICAN_GENRES) {
      if (lowerGenre.includes(afroGenre)) {
        score += 15;
      }
    }

    for (const keyword of this.AFRICAN_KEYWORDS) {
      if (lowerMetadata.includes(keyword)) {
        score += 5;
      }
    }

    return score;
  }

  private async lrclibSearch(artist: string, title: string): Promise<LrcLibTrack[]> {
    const url = new URL('/search', this.LRCLIB_BASE_URL);
    url.searchParams.append('artist_name', artist);
    url.searchParams.append('track_name', title);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AfroGenie/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`LRCLIB API error: ${response.status}`);
    }

    const data = await response.json() as LrcLibTrack[];
    return data.filter((track) => !track.instrumental && (track.plainLyrics || track.syncedLyrics));
  }

  private async lrclibFetchLyrics(trackId: string): Promise<{ plain: string | null; synced: string | null }> {
    const url = new URL('/get', this.LRCLIB_BASE_URL);
    url.searchParams.append('id', trackId);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AfroGenie/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`LRCLIB API error: ${response.status}`);
    }

    const data = await response.json() as LrcLibTrack;
    return {
      plain: data.plainLyrics?.trim() || null,
      synced: data.syncedLyrics?.trim() || null,
    };
  }

  // Unified search using LRCLIB
  async searchSongs(
    query: string,
    focusAfrican: boolean = false,
  ): Promise<APISearchResult[]> {
    // Parse artist and title from query
    const parts = query.split(' - ').reverse();
    const title = parts[0] || query;
    const artist = parts.slice(1).join(' - ') || '';

    const tracks = await this.lrclibSearch(artist, title);
    const allResults: APISearchResult[] = [];

    for (const track of tracks) {
      const genre = track.albumName || "";
      const africanScore = this.calculateAfricanScore(
        track.artistName,
        genre,
        { trackName: track.trackName },
      );

      allResults.push({
        id: `lrclib_${track.id}`,
        title: track.trackName,
        artist: track.artistName,
        album: track.albumName,
        year: undefined,
        image: "",
        source: "lrclib",
        confidence: 0.9,
        metadata: {
          track_id: String(track.id),
          african_score: africanScore,
        },
      });
    }

    if (focusAfrican) {
      allResults.sort((a, b) => {
        const scoreA = (a.metadata.african_score as number) || 0;
        const scoreB = (b.metadata.african_score as number) || 0;
        return scoreB - scoreA;
      });

      const africanResults = allResults.filter(
        (r) => (r.metadata.african_score as number) > 0,
      );
      const otherResults = allResults.filter(
        (r) => (r.metadata.african_score as number) === 0,
      );
      return [...africanResults, ...otherResults];
    }

    return allResults;
  }

  private deduplicateResults(results: APISearchResult[]): APISearchResult[] {
    const seen = new Map<string, APISearchResult>();

    for (const result of results) {
      const key = `${result.title.toLowerCase()}_${result.artist.toLowerCase()}`;
      const existing = seen.get(key);

      if (!existing || result.confidence > existing.confidence) {
        seen.set(key, result);
      }
    }

    return Array.from(seen.values()).sort(
      (a, b) => b.confidence - a.confidence,
    );
  }

  // Fetch full song data with lyrics using LRCLIB
  async fetchFullSongData(result: APISearchResult): Promise<FullSongData> {
    let lyrics = "";

    if (result.source === "lrclib") {
      const trackId = result.metadata?.track_id as string;
      if (trackId) {
        try {
          const { synced } = await this.lrclibFetchLyrics(trackId);
          lyrics = synced || "";
        } catch (error) {
          console.error(`Failed to fetch lyrics from LRCLIB:`, error);
        }
      }
    }

    const fullData: FullSongData = {
      song: {
        title: result.title,
        artist: result.artist,
        artistId: "",
        image: result.image || "",
      },
      artist: {
        name: result.artist,
        genre: result.metadata.genre || "",
        image: result.metadata.artist_image || "",
      },
      lyrics: lyrics,
      metadata: {
        album: result.album,
        year: result.year,
        genre: result.metadata.genre,
        language: result.metadata.language,
        url: result.metadata.url,
      },
      images: {
        song: result.image,
        artist: result.metadata.artist_image,
        album: result.metadata.album_image,
      },
    };

    return fullData;
  }

  // Fetch artist info (placeholder - can be enhanced)
  async fetchArtistInfo(artistName: string): Promise<ArtistInfo> {
    return {
      name: artistName,
      genre: "",
      image: "",
    };
  }

  // Fetch song metadata
  async fetchSongMetadata(
    songId: string,
    source: string,
  ): Promise<SongMetadata> {
    return {
      genre: "",
      language: "",
    };
  }
}

export default new LyricAPIService();
