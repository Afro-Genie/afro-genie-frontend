// Industry-Standard API Integration System
// Supports multiple data sources with admin controls, rate limiting, caching, and validation

import {
  saveSyncJob,
  updateSyncJob,
  getAllSyncJobs,
  getSyncJob,
  type SyncJobData,
} from "./firebaseService";

interface APIConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requests: number;
    per: number; // seconds
  };
  enabled: boolean;
  priority: number; // 1 = highest priority
  timeout: number; // milliseconds
  retryAttempts: number;
}

interface DataSource {
  id: string;
  name: string;
  type: "artist" | "song" | "genre" | "lyrics";
  config: APIConfig;
  lastSync?: Date;
  status: "active" | "inactive" | "error";
  errorCount: number;
}

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  genre?: string;
  image?: string;
  lyrics?: string;
  language?: string;
  source: string;
  confidence: number; // 0-1
  metadata: Record<string, any>;
}

interface SyncJob {
  id: string;
  type: "manual" | "scheduled" | "auto";
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  startTime: Date;
  endTime?: Date;
  results: {
    artists: number;
    songs: number;
    genres: number;
    errors: number;
  };
  resultData: {
    artists: SearchResult[];
    songs: SearchResult[];
    genres: SearchResult[];
  };
  logs?: string[];
}

class APIManager {
  private configs: Map<string, APIConfig> = new Map();
  private dataSources: Map<string, DataSource> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: number }> =
    new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> =
    new Map();
  private syncJobs: Map<string, SyncJob> = new Map();
  private currentJobLog?: string[];

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs() {
    // Genius API
    this.addConfig({
      id: "genius",
      name: "Genius",
      baseUrl: "https://api.genius.com",
      rateLimit: { requests: 60, per: 60 },
      enabled: true,
      priority: 1,
      timeout: 10000,
      retryAttempts: 3,
    });

    // MusicBrainz API
    this.addConfig({
      id: "musicbrainz",
      name: "MusicBrainz",
      baseUrl: "https://musicbrainz.org/ws/2",
      rateLimit: { requests: 1, per: 1 },
      enabled: true,
      priority: 2,
      timeout: 15000,
      retryAttempts: 2,
    });

    // TheAudioDB API
    this.addConfig({
      id: "theaudiodb",
      name: "TheAudioDB",
      baseUrl: "https://theaudiodb.com/api/v1/json",
      rateLimit: { requests: 10, per: 60 },
      enabled: true,
      priority: 3,
      timeout: 10000,
      retryAttempts: 2,
    });

    // Last.fm API
    this.addConfig({
      id: "lastfm",
      name: "Last.fm",
      baseUrl: "https://ws.audioscrobbler.com/2.0",
      rateLimit: { requests: 5, per: 1 },
      enabled: true,
      priority: 4,
      timeout: 10000,
      retryAttempts: 2,
    });
  }

  addConfig(config: APIConfig) {
    this.configs.set(config.id, config);
  }

  updateConfig(id: string, updates: Partial<APIConfig>) {
    const config = this.configs.get(id);
    if (config) {
      this.configs.set(id, { ...config, ...updates });
    }
  }

  removeConfig(id: string) {
    this.configs.delete(id);
    this.dataSources.delete(id);
  }

  getConfigs(): APIConfig[] {
    return Array.from(this.configs.values());
  }

  setAPIKey(apiId: string, apiKey: string) {
    const config = this.configs.get(apiId);
    if (config) {
      this.configs.set(apiId, { ...config, apiKey });
    }
  }

  // Rate limiting
  private canMakeRequest(apiId: string): boolean {
    const config = this.configs.get(apiId);
    if (!config || !config.enabled) return false;

    const limiter = this.rateLimiters.get(apiId);
    const now = Date.now();

    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(apiId, {
        count: 1,
        resetTime: now + config.rateLimit.per * 1000,
      });
      return true;
    }

    if (limiter.count < config.rateLimit.requests) {
      limiter.count++;
      return true;
    }

    return false;
  }

  // Caching
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any, ttl: number = 300000) {
    // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  // Generic API request with retry logic
  private async makeRequest(
    apiId: string,
    endpoint: string,
    params: Record<string, any> = {},
    options: RequestInit = {},
  ): Promise<any> {
    const config = this.configs.get(apiId);
    if (!config) throw new Error(`API config not found: ${apiId}`);

    // Check rate limit and wait if needed
    if (!this.canMakeRequest(apiId)) {
      // Wait a bit before throwing to allow rate limit to reset
      const limiter = this.rateLimiters.get(apiId);
      if (limiter) {
        const waitTime = limiter.resetTime - Date.now();
        if (waitTime > 0 && waitTime < 60000) {
          // Wait max 60 seconds
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
      // Check again after waiting
      if (!this.canMakeRequest(apiId)) {
        throw new Error(`Rate limit exceeded for ${apiId}`);
      }
    }

    // Route through dev proxy to avoid CORS for browser calls
    let proxiedBase: string;
    let fullPath: string;

    if (apiId === "genius") {
      proxiedBase = "/proxy/genius";
      fullPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    } else if (apiId === "musicbrainz") {
      proxiedBase = "/proxy/musicbrainz";
      // MusicBrainz base is /ws/2, so we need to prepend that
      fullPath = endpoint.startsWith("/ws/2")
        ? endpoint
        : `/ws/2${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    } else if (apiId === "lastfm") {
      proxiedBase = "/proxy/lastfm";
      // Last.fm API requires /2.0/ path
      if (endpoint === "/" || endpoint === "") {
        fullPath = "/2.0/";
      } else if (endpoint.startsWith("/2.0")) {
        fullPath = endpoint;
      } else {
        fullPath = `/2.0${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
      }
    } else if (apiId === "theaudiodb") {
      proxiedBase = "/proxy/theaudiodb";
      // TheAudioDB v1 format: /api/v1/json/{API_KEY}/{endpoint}
      const apiKey = config.apiKey || "123";
      fullPath = `/api/v1/json/${apiKey}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    } else {
      // Fallback to direct URL (shouldn't happen for browser-based calls)
      proxiedBase = config.baseUrl;
      fullPath = endpoint;
    }

    // Build final URL with query params
    // For proxy paths, construct relative URL
    let finalUrl: string;
    if (proxiedBase.startsWith("/")) {
      // Use proxy path - build URL manually
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      finalUrl = `${proxiedBase}${fullPath}${queryString ? `?${queryString}` : ""}`;
    } else {
      // Fallback: use absolute URL (shouldn't happen in browser)
      const url = new URL(fullPath, proxiedBase);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
      finalUrl = url.toString();
    }

    const headers: HeadersInit = {
      "User-Agent": "AfroGenie/1.0 (contact@afrogenie.com)",
      ...options.headers,
    };

    if (config.apiKey) {
      if (apiId === "genius") {
        // Authorization header is injected by proxy, but we can set it here too
        headers["Authorization"] = `Bearer ${config.apiKey}`;
      } else if (apiId === "lastfm") {
        // API key is injected by proxy, but add it here as fallback
        // Append to query string if not already present
        if (proxiedBase.startsWith("/")) {
          const separator = finalUrl.includes("?") ? "&" : "?";
          finalUrl = `${finalUrl}${separator}api_key=${encodeURIComponent(config.apiKey)}`;
        }
      }
      // TheAudioDB key is in the path, MusicBrainz doesn't need a key
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(finalUrl, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Try to get error message from response
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorText = await response.text();
            if (errorText) {
              // Check if it's HTML (error page)
              if (errorText.trim().startsWith("<")) {
                errorMessage = `HTTP ${response.status}: Received HTML error page`;
              } else {
                // Try to parse as JSON for error details
                try {
                  const errorJson = JSON.parse(errorText);
                  errorMessage =
                    errorJson.error?.message ||
                    errorJson.message ||
                    errorMessage;
                } catch {
                  errorMessage = `HTTP ${response.status}: ${errorText.substring(0, 100)}`;
                }
              }
            }
          } catch {
            // Ignore errors when reading response
          }
          throw new Error(errorMessage);
        }

        // Check content-type before parsing
        const contentType = response.headers.get("content-type") || "";
        const isJson =
          contentType.includes("application/json") ||
          contentType.includes("text/json");

        // Get response text first
        const responseText = await response.text();

        // Handle empty responses
        if (!responseText || responseText.trim().length === 0) {
          throw new Error(`Empty response from ${apiId}`);
        }

        // Check if response is HTML (error page)
        if (responseText.trim().startsWith("<")) {
          throw new Error(
            `Received HTML instead of JSON from ${apiId} (likely an error page)`,
          );
        }

        // Parse JSON
        if (
          isJson ||
          responseText.trim().startsWith("{") ||
          responseText.trim().startsWith("[")
        ) {
          try {
            return JSON.parse(responseText);
          } catch (parseError) {
            throw new Error(
              `Invalid JSON response from ${apiId}: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            );
          }
        } else {
          throw new Error(
            `Unexpected content-type from ${apiId}: ${contentType}`,
          );
        }
      } catch (error) {
        lastError = error as Error;
        if (attempt < config.retryAttempts - 1) {
          // Exponential backoff with jitter
          const delay = 1000 * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Request failed");
  }

  // Search methods for different APIs
  async searchGenius(
    query: string,
    type: "song" | "artist" = "song",
  ): Promise<SearchResult[]> {
    const cacheKey = `genius_${type}_${query}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.makeRequest("genius", "/search", { q: query });
      const results: SearchResult[] = data.response.hits.map((hit: any) => ({
        id: `genius_${hit.result.id}`,
        title: hit.result.title,
        artist: hit.result.primary_artist.name,
        image: hit.result.song_art_image_url,
        source: "genius",
        confidence: 0.9,
        metadata: {
          url: hit.result.url,
          type: hit.result.type,
          full_title: hit.result.full_title,
        },
      }));

      this.setCachedData(cacheKey, results, 600000); // 10 minutes
      return results;
    } catch (error) {
      console.error("Genius search error:", error);
      return [];
    }
  }

  async searchMusicBrainz(
    query: string,
    entity: "artist" | "release" = "artist",
  ): Promise<SearchResult[]> {
    const cacheKey = `musicbrainz_${entity}_${query}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.makeRequest("musicbrainz", `/${entity}`, {
        query,
        fmt: "json",
        limit: 10,
      });

      const results: SearchResult[] = data[`${entity}s`].map((item: any) => ({
        id: `mb_${item.id}`,
        title: item.title || item.name,
        artist:
          entity === "artist"
            ? item.name
            : item["artist-credit"]?.[0]?.name || "Unknown",
        source: "musicbrainz",
        confidence: 0.8,
        metadata: {
          id: item.id,
          type: entity,
          country: item.area?.name,
          tags: item.tags?.map((t: any) => t.name) || [],
        },
      }));

      this.setCachedData(cacheKey, results, 1800000); // 30 minutes
      return results;
    } catch (error) {
      console.error("MusicBrainz search error:", error);
      return [];
    }
  }

  async searchLastFM(
    query: string,
    method: "artist.search" | "track.search" = "artist.search",
  ): Promise<SearchResult[]> {
    const cacheKey = `lastfm_${method}_${query}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const config = this.configs.get("lastfm");
      // Last.fm requires an API key
      if (!config?.apiKey) {
        console.warn("Last.fm API key not configured. Requests may fail.");
      }

      const data = await this.makeRequest("lastfm", "/", {
        method,
        artist: method === "artist.search" ? query : undefined,
        track: method === "track.search" ? query : undefined,
        format: "json",
        limit: 10,
      });

      const results: SearchResult[] = [];
      const items =
        data.results?.[
          method === "artist.search" ? "artistmatches" : "trackmatches"
        ]?.[method === "artist.search" ? "artist" : "track"] || [];

      items.forEach((item: any) => {
        results.push({
          id: `lastfm_${item.mbid || item.name}`,
          title: item.name,
          artist: method === "artist.search" ? item.name : item.artist,
          image: item.image?.[2]?.["#text"], // Large image
          source: "lastfm",
          confidence: 0.7,
          metadata: {
            mbid: item.mbid,
            listeners: item.listeners,
            playcount: item.playcount,
          },
        });
      });

      this.setCachedData(cacheKey, results, 600000); // 10 minutes
      return results;
    } catch (error) {
      console.error("Last.fm search error:", error);
      return [];
    }
  }

  // TheAudioDB v1 search
  async searchTheAudioDB(
    query: string,
    type: "artist" | "song" | "genre" = "artist",
  ): Promise<SearchResult[]> {
    const cacheKey = `theaudiodb_${type}_${query}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const config = this.configs.get("theaudiodb");
      // TheAudioDB requires a valid API key (not the placeholder '123')
      if (!config?.apiKey || config.apiKey === "123") {
        console.warn(
          "TheAudioDB API key not configured. Using placeholder may result in empty responses.",
        );
      }

      let endpoint = "/";
      let params: Record<string, any> = {};

      if (type === "artist") {
        // https://www.theaudiodb.com/api/v1/json/{API_KEY}/search.php?s=ARTIST
        endpoint = "/search.php";
        params = { s: query };
      } else if (type === "song") {
        // https://www.theaudiodb.com/api/v1/json/{API_KEY}/searchtrack.php?s=QUERY
        endpoint = "/searchtrack.php";
        params = { s: query };
      } else {
        // No direct genre search in v1; return empty for genre queries
        return [];
      }

      const data = await this.makeRequest("theaudiodb", endpoint, params);

      // Handle empty or null responses from TheAudioDB
      if (
        !data ||
        (typeof data === "object" && Object.keys(data).length === 0)
      ) {
        return [];
      }

      const results: SearchResult[] = [];

      if (type === "artist") {
        const artists = data?.artists || [];
        if (!Array.isArray(artists) || artists.length === 0) {
          return [];
        }
        artists.forEach((a: any) => {
          results.push({
            id: `tadb_artist_${a.idArtist}`,
            title: a.strArtist,
            artist: a.strArtist,
            image: a.strArtistThumb || a.strArtistFanart || undefined,
            source: "theaudiodb",
            confidence: 0.75,
            metadata: {
              country: a.strCountry,
              genre: a.strGenre,
              style: a.strStyle,
              mood: a.strMood,
            },
          });
        });
      } else if (type === "song") {
        const tracks = data?.track || [];
        if (!Array.isArray(tracks) || tracks.length === 0) {
          return [];
        }
        tracks.forEach((t: any) => {
          results.push({
            id: `tadb_track_${t.idTrack}`,
            title: t.strTrack,
            artist: t.strArtist,
            image: t.strTrackThumb || t.strAlbumThumb || undefined,
            source: "theaudiodb",
            confidence: 0.72,
            metadata: {
              album: t.strAlbum,
              year: t.intYearReleased,
              genre: t.strGenre,
            },
          });
        });
      }

      this.setCachedData(cacheKey, results, 600000);
      return results;
    } catch (error) {
      console.error("TheAudioDB search error:", error);
      return [];
    }
  }

  // Unified search across all enabled APIs
  async searchAll(
    query: string,
    type: "artist" | "song" | "genre" = "artist",
  ): Promise<SearchResult[]> {
    const enabledConfigs = Array.from(this.configs.values())
      .filter((config) => config.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Execute searches sequentially with delays to respect rate limits
    const allResults: SearchResult[] = [];

    for (const config of enabledConfigs) {
      try {
        // Add delay between API calls to respect rate limits
        if (allResults.length > 0) {
          // Wait based on the API's rate limit configuration
          const delay = Math.max(
            100,
            (config.rateLimit.per * 1000) / config.rateLimit.requests,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        let results: SearchResult[] = [];
        switch (config.id) {
          case "genius":
            results = await this.searchGenius(
              query,
              type === "artist" ? "artist" : "song",
            );
            break;
          case "musicbrainz":
            results = await this.searchMusicBrainz(
              query,
              type === "artist" ? "artist" : "release",
            );
            break;
          case "lastfm":
            results = await this.searchLastFM(
              query,
              type === "artist" ? "artist.search" : "track.search",
            );
            break;
          case "theaudiodb":
            results = await this.searchTheAudioDB(query, type);
            break;
          default:
            results = [];
        }

        allResults.push(...results);
      } catch (error) {
        const message = `Search error for ${config.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(message);
        this.currentJobLog?.push(message);
        // Continue with other APIs even if one fails
      }
    }

    // Deduplicate and merge results
    return this.deduplicateResults(allResults);
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const deduplicated: SearchResult[] = [];

    // Sort by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence);

    for (const result of results) {
      const key = `${result.title.toLowerCase()}_${result.artist.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(result);
      }
    }

    return deduplicated;
  }

  // Admin management methods
  getDataSourceStatus(): DataSource[] {
    return Array.from(this.dataSources.values());
  }

  updateDataSourceStatus(apiId: string, status: DataSource["status"]) {
    const source = this.dataSources.get(apiId);
    if (source) {
      this.dataSources.set(apiId, { ...source, status });
    }
  }

  getSyncJobs(): SyncJob[] {
    return Array.from(this.syncJobs.values());
  }

  async startSyncJob(
    type: "manual" | "scheduled" | "auto",
    query?: string,
    userId?: string,
  ): Promise<string> {
    const jobId = `sync_${Date.now()}`;
    const job: SyncJob = {
      id: jobId,
      type,
      status: "pending",
      progress: 0,
      startTime: new Date(),
      results: { artists: 0, songs: 0, genres: 0, errors: 0 },
      resultData: {
        artists: [],
        songs: [],
        genres: [],
      },
      logs: [],
    };

    this.syncJobs.set(jobId, job);

    // Save to Firebase
    try {
      await saveSyncJob({
        id: jobId,
        type,
        status: "pending",
        progress: 0,
        startTime: job.startTime,
        results: job.results,
        resultData: job.resultData,
        logs: job.logs || [],
        userId,
        query,
      });
    } catch (error) {
      console.error("Failed to save sync job to Firebase:", error);
    }

    // Run sync in background
    this.runSyncJob(jobId, query, userId);

    return jobId;
  }

  // Load sync jobs from Firebase
  async loadSyncJobsFromFirebase(userId?: string): Promise<void> {
    try {
      const firebaseJobs = await getAllSyncJobs(userId);
      firebaseJobs.forEach((jobData) => {
        const job: SyncJob = {
          id: jobData.id,
          type: jobData.type,
          status: jobData.status,
          progress: jobData.progress,
          startTime:
            jobData.startTime instanceof Date
              ? jobData.startTime
              : new Date(jobData.startTime),
          endTime: jobData.endTime
            ? jobData.endTime instanceof Date
              ? jobData.endTime
              : new Date(jobData.endTime)
            : undefined,
          results: jobData.results,
          resultData: {
            artists: jobData.resultData?.artists || [],
            songs: jobData.resultData?.songs || [],
            genres: jobData.resultData?.genres || [],
          },
          logs: jobData.logs || [],
        };
        this.syncJobs.set(job.id, job);
      });
    } catch (error) {
      console.error("Failed to load sync jobs from Firebase:", error);
    }
  }

  private async runSyncJob(jobId: string, query?: string, userId?: string) {
    const job = this.syncJobs.get(jobId);
    if (!job) return;

    job.status = "running";
    job.progress = 0;
    this.currentJobLog = job.logs;

    // Initialize result data arrays
    job.resultData = {
      artists: [],
      songs: [],
      genres: [],
    };

    // Update Firebase
    try {
      await updateSyncJob(jobId, {
        status: "running",
        progress: 0,
        resultData: job.resultData,
      });
    } catch (error) {
      console.error("Failed to update sync job in Firebase:", error);
    }

    try {
      const searchTerms = query
        ? [query]
        : [
            "Burna Boy",
            "Wizkid",
            "Davido",
            "Tiwa Savage",
            "Yemi Alade",
            "Afrobeats",
            "Highlife",
            "Amapiano",
            "Afro-pop",
          ];

      for (let i = 0; i < searchTerms.length; i++) {
        const term = searchTerms[i];
        job.progress = Math.round((i / searchTerms.length) * 100);

        // Search for artists
        const artistResults = await this.searchAll(term, "artist");
        job.results.artists += artistResults.length;
        job.resultData.artists.push(...artistResults);

        // Search for songs
        const songResults = await this.searchAll(term, "song");
        job.results.songs += songResults.length;
        job.resultData.songs.push(...songResults);

        // Search for genres
        const genreResults = await this.searchAll(term, "genre");
        job.results.genres += genreResults.length;
        job.resultData.genres.push(...genreResults);

        // Update Firebase periodically
        try {
          await updateSyncJob(jobId, {
            progress: job.progress,
            results: job.results,
            resultData: job.resultData,
          });
        } catch (error) {
          console.error(
            "Failed to update sync job progress in Firebase:",
            error,
          );
        }

        // Small delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Deduplicate results
      job.resultData.artists = this.deduplicateResults(job.resultData.artists);
      job.resultData.songs = this.deduplicateResults(job.resultData.songs);
      job.resultData.genres = this.deduplicateResults(job.resultData.genres);

      // Update counts after deduplication
      job.results.artists = job.resultData.artists.length;
      job.results.songs = job.resultData.songs.length;
      job.results.genres = job.resultData.genres.length;

      job.status = "completed";
      job.progress = 100;
      job.endTime = new Date();

      // Save final state to Firebase
      try {
        await updateSyncJob(jobId, {
          status: "completed",
          progress: 100,
          endTime: job.endTime,
          results: job.results,
          resultData: job.resultData,
        });
      } catch (error) {
        console.error("Failed to save completed sync job to Firebase:", error);
      }
    } catch (error) {
      job.status = "failed";
      job.results.errors++;
      job.logs?.push(
        `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      job.endTime = new Date();

      // Save failed state to Firebase
      try {
        await updateSyncJob(jobId, {
          status: "failed",
          endTime: job.endTime,
          results: job.results,
          logs: job.logs,
        });
      } catch (error) {
        console.error("Failed to save failed sync job to Firebase:", error);
      }
    }
    this.currentJobLog = undefined;
  }

  // Get all results from a sync job
  getSyncJobResults(jobId: string): SearchResult[] {
    const job = this.syncJobs.get(jobId);
    if (!job) return [];

    return [
      ...job.resultData.artists,
      ...job.resultData.songs,
      ...job.resultData.genres,
    ];
  }

  // Get results by type from a sync job
  getSyncJobResultsByType(
    jobId: string,
    type: "artist" | "song" | "genre",
  ): SearchResult[] {
    const job = this.syncJobs.get(jobId);
    if (!job) return [];

    switch (type) {
      case "artist":
        return job.resultData.artists;
      case "song":
        return job.resultData.songs;
      case "genre":
        return job.resultData.genres;
      default:
        return [];
    }
  }

  // Cache management
  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp,
        ttl: value.ttl,
      })),
    };
  }
}

export default APIManager;
