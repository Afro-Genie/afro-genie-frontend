// Lyric API Service - Multi-API integration with fallback mechanism
// Supports LyricFind (primary), Genius (fallback), and others

import type {
  APISearchResult,
  FullSongData,
  ArtistInfo,
  SongMetadata,
} from "../types";

interface LyricFindSearchResponse {
  response: {
    track: Array<{
      track_id: string;
      track_title: string;
      artist_name: string;
      album_title?: string;
      release_date?: string;
      track_artwork?: string;
    }>;
  };
}

interface LyricFindLyricsResponse {
  response: {
    track: {
      track_id: string;
      track_title: string;
      artist_name: string;
      lyrics: string;
      language?: string;
    };
  };
}

interface GeniusSearchResponse {
  response: {
    hits: Array<{
      result: {
        id: number;
        title: string;
        primary_artist: {
          name: string;
          image_url: string;
        };
        song_art_image_url: string;
        url: string;
        release_date_for_display?: string;
      };
    }>;
  };
}

class LyricAPIService {
  private lyricFindApiKey: string;
  private lyricFindUsername: string;
  private geniusAccessToken: string;
  private readonly LYRICFIND_BASE_URL = "https://api.lyricfind.com";
  private readonly GENIUS_BASE_URL = "https://api.genius.com";

  constructor() {
    // Get from environment variables (loaded via vite.config.ts define)
    // These are available at build time from .env.local
    this.lyricFindApiKey = "";
    this.lyricFindUsername = "";
    this.geniusAccessToken = "";

    // Try to get from window if injected, or use empty (will be set via API calls with proxy)
    // API keys are handled server-side via proxy in vite.config.ts
  }

  // African artist detection keywords
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

  // Calculate African relevance score
  private calculateAfricanScore(
    artist: string,
    genre?: string,
    metadata?: any,
  ): number {
    let score = 0;
    const lowerArtist = artist.toLowerCase();
    const lowerGenre = genre?.toLowerCase() || "";
    const lowerMetadata = JSON.stringify(metadata || {}).toLowerCase();

    // Check artist name
    for (const keyword of this.AFRICAN_KEYWORDS) {
      if (lowerArtist.includes(keyword)) {
        score += 10;
      }
    }

    // Check genre
    for (const afroGenre of this.AFRICAN_GENRES) {
      if (lowerGenre.includes(afroGenre)) {
        score += 15;
      }
    }

    // Check metadata
    for (const keyword of this.AFRICAN_KEYWORDS) {
      if (lowerMetadata.includes(keyword)) {
        score += 5;
      }
    }

    return score;
  }

  // LyricFind API - Search
  private async searchLyricFind(query: string): Promise<APISearchResult[]> {
    try {
      // API key and username are injected by the proxy from environment variables
      const url = new URL("/search", this.LYRICFIND_BASE_URL);
      url.searchParams.append("query", query);
      url.searchParams.append("output", "json");
      // Note: apikey and username are added by the proxy automatically

      const response = await fetch(
        `/proxy/lyricfind${url.pathname}${url.search}`,
        {
          headers: {
            "User-Agent": "AfroGenie/1.0",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`LyricFind API error: ${response.status}`);
      }

      const data: LyricFindSearchResponse = await response.json();
      const results: APISearchResult[] = [];

      if (data.response?.track) {
        for (const track of data.response.track) {
          const genre = track.album_title || "";
          const africanScore = this.calculateAfricanScore(
            track.artist_name,
            genre,
          );

          results.push({
            id: `lyricfind_${track.track_id}`,
            title: track.track_title,
            artist: track.artist_name,
            album: track.album_title,
            year: track.release_date
              ? parseInt(track.release_date.split("-")[0])
              : undefined,
            image: track.track_artwork,
            source: "lyricfind",
            confidence: 0.9,
            metadata: {
              track_id: track.track_id,
              release_date: track.release_date,
              african_score: africanScore,
            },
          });
        }
      }

      return results;
    } catch (error) {
      console.error("LyricFind search error:", error);
      throw error;
    }
  }

  // LyricFind API - Get Lyrics
  private async getLyricFindLyrics(trackId: string): Promise<string> {
    try {
      // API key and username are injected by the proxy from environment variables
      const url = new URL("/lyric", this.LYRICFIND_BASE_URL);
      url.searchParams.append("track_id", trackId);
      url.searchParams.append("output", "json");
      // Note: apikey and username are added by the proxy automatically

      const response = await fetch(
        `/proxy/lyricfind${url.pathname}${url.search}`,
        {
          headers: {
            "User-Agent": "AfroGenie/1.0",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`LyricFind API error: ${response.status}`);
      }

      const data: LyricFindLyricsResponse = await response.json();
      return data.response?.track?.lyrics || "";
    } catch (error) {
      console.error("LyricFind lyrics error:", error);
      throw error;
    }
  }

  // Genius API - Search (enhanced from existing)
  private async searchGenius(query: string): Promise<APISearchResult[]> {
    try {
      // Authorization header is injected by the proxy from environment variables
      const response = await fetch(
        `/proxy/genius/search?q=${encodeURIComponent(query)}&per_page=20`,
        {
          headers: {
            "User-Agent": "AfroGenie/1.0",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Genius API error: ${response.status}`);
      }

      const data: GeniusSearchResponse = await response.json();
      const results: APISearchResult[] = [];

      if (data.response?.hits) {
        for (const hit of data.response.hits) {
          const result = hit.result;
          const africanScore = this.calculateAfricanScore(
            result.primary_artist.name,
          );

          results.push({
            id: `genius_${result.id}`,
            title: result.title,
            artist: result.primary_artist.name,
            image: result.song_art_image_url,
            source: "genius",
            confidence: 0.85,
            metadata: {
              url: result.url,
              release_date: result.release_date_for_display,
              artist_image: result.primary_artist.image_url,
              african_score: africanScore,
            },
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Genius search error:", error);
      throw error;
    }
  }

  // Genius API - Get Lyrics via song page extraction
  private async getGeniusLyrics(songId: string): Promise<string> {
    try {
      // Fetch the Genius song page to extract lyrics
      const response = await fetch(`/proxy/genius/songs/${songId}`, {
        headers: { "User-Agent": "AfroGenie/1.0" },
      });

      if (!response.ok) {
        return "";
      }

      const data = await response.json();
      const songUrl = data?.response?.song?.url;
      if (!songUrl) {
        return "";
      }

      // Fetch the song page HTML and extract lyrics
      const pageResponse = await fetch(songUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AfroGenie/1.0)" },
      });

      if (!pageResponse.ok) {
        return "";
      }

      const html = await pageResponse.text();
      const lyricsMatch = html.match(
        /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/,
      );
      if (lyricsMatch) {
        return lyricsMatch[1]
          .replace(/<br\s*\/?>/g, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, " ")
          .trim();
      }

      return "";
    } catch (error) {
      console.warn("Genius lyrics fetch failed:", error);
      return "";
    }
  }

  // Unified search with fallback
  async searchSongs(
    query: string,
    focusAfrican: boolean = false,
  ): Promise<APISearchResult[]> {
    const allResults: APISearchResult[] = [];

    // Try LyricFind first (primary)
    try {
      const lyricFindResults = await this.searchLyricFind(query);
      allResults.push(...lyricFindResults);
    } catch (error) {
      console.warn("LyricFind search failed, trying fallback:", error);
    }

    // Try Genius (fallback)
    try {
      const geniusResults = await this.searchGenius(query);
      allResults.push(...geniusResults);
    } catch (error) {
      console.warn("Genius search failed:", error);
    }

    // Filter and prioritize African artists if requested
    if (focusAfrican) {
      allResults.sort((a, b) => {
        const scoreA = (a.metadata.african_score as number) || 0;
        const scoreB = (b.metadata.african_score as number) || 0;
        return scoreB - scoreA;
      });

      // Prioritize results with African score > 0
      const africanResults = allResults.filter(
        (r) => (r.metadata.african_score as number) > 0,
      );
      const otherResults = allResults.filter(
        (r) => (r.metadata.african_score as number) === 0,
      );
      return [...africanResults, ...otherResults];
    }

    // Deduplicate and sort by confidence
    return this.deduplicateResults(allResults);
  }

  // Deduplicate results
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

  // Fetch full song data with lyrics
  async fetchFullSongData(result: APISearchResult): Promise<FullSongData> {
    let lyrics = result.lyrics || "";

    // Fetch lyrics if not already present
    if (!lyrics) {
      try {
        if (result.source === "lyricfind") {
          const trackId = result.metadata.track_id as string;
          lyrics = await this.getLyricFindLyrics(trackId);
        } else if (result.source === "genius") {
          const songId = result.id.replace("genius_", "");
          lyrics = await this.getGeniusLyrics(songId);
        }
      } catch (error) {
        console.error(`Failed to fetch lyrics from ${result.source}:`, error);
      }
    }

    // Build full song data
    const fullData: FullSongData = {
      song: {
        title: result.title,
        artist: result.artist,
        artistId: "", // Will be set after artist is created
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
    // This would integrate with MusicBrainz or other APIs
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
    // Extract metadata from search result or fetch additional data
    return {
      genre: "",
      language: "",
    };
  }
}

export default new LyricAPIService();
