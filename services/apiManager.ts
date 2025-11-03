// Industry-Standard API Integration System
// Supports multiple data sources with admin controls, rate limiting, caching, and validation

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
  type: 'artist' | 'song' | 'genre' | 'lyrics';
  config: APIConfig;
  lastSync?: Date;
  status: 'active' | 'inactive' | 'error';
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
  type: 'manual' | 'scheduled' | 'auto';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  results: {
    artists: number;
    songs: number;
    genres: number;
    errors: number;
  };
  logs?: string[];
}

class APIManager {
  private configs: Map<string, APIConfig> = new Map();
  private dataSources: Map<string, DataSource> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private syncJobs: Map<string, SyncJob> = new Map();
  private currentJobLog?: string[];

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs() {
    // Genius API
    this.addConfig({
      id: 'genius',
      name: 'Genius',
      baseUrl: 'https://api.genius.com',
      rateLimit: { requests: 60, per: 60 },
      enabled: true,
      priority: 1,
      timeout: 10000,
      retryAttempts: 3
    });

    // MusicBrainz API
    this.addConfig({
      id: 'musicbrainz',
      name: 'MusicBrainz',
      baseUrl: 'https://musicbrainz.org/ws/2',
      rateLimit: { requests: 1, per: 1 },
      enabled: true,
      priority: 2,
      timeout: 15000,
      retryAttempts: 2
    });

    // TheAudioDB API
    this.addConfig({
      id: 'theaudiodb',
      name: 'TheAudioDB',
      baseUrl: 'https://theaudiodb.com/api/v1/json',
      rateLimit: { requests: 10, per: 60 },
      enabled: true,
      priority: 3,
      timeout: 10000,
      retryAttempts: 2
    });

    // Last.fm API
    this.addConfig({
      id: 'lastfm',
      name: 'Last.fm',
      baseUrl: 'https://ws.audioscrobbler.com/2.0',
      rateLimit: { requests: 5, per: 1 },
      enabled: true,
      priority: 4,
      timeout: 10000,
      retryAttempts: 2
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
        resetTime: now + (config.rateLimit.per * 1000)
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

  private setCachedData(key: string, data: any, ttl: number = 300000) { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Generic API request with retry logic
  private async makeRequest(
    apiId: string,
    endpoint: string,
    params: Record<string, any> = {},
    options: RequestInit = {}
  ): Promise<any> {
    const config = this.configs.get(apiId);
    if (!config) throw new Error(`API config not found: ${apiId}`);

    if (!this.canMakeRequest(apiId)) {
      throw new Error(`Rate limit exceeded for ${apiId}`);
    }

    // For TheAudioDB v1, API key is a path segment between base and endpoint
    // Route through dev proxy to avoid CORS for browser calls
    const proxiedBase = (
      apiId === 'genius' ? '/proxy/genius' :
      apiId === 'musicbrainz' ? '/proxy/musicbrainz' :
      apiId === 'lastfm' ? '/proxy/lastfm' :
      config.baseUrl
    );

    const baseForThisRequest = apiId === 'theaudiodb'
      ? `${proxiedBase}/${config.apiKey || '123'}`
      : proxiedBase;

    const url = new URL(endpoint, baseForThisRequest);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    const headers: HeadersInit = {
      'User-Agent': 'AfroGenie/1.0 (contact@afrogenie.com)',
      ...options.headers
    };

    if (config.apiKey) {
      if (apiId === 'genius') {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      } else if (apiId === 'lastfm') {
        url.searchParams.append('api_key', config.apiKey);
      } else if (apiId === 'theaudiodb') {
        // Key is already in the path for v1; nothing to add here
      }
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(url.toString(), {
          ...options,
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        if (attempt < config.retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  // Search methods for different APIs
  async searchGenius(query: string, type: 'song' | 'artist' = 'song'): Promise<SearchResult[]> {
    const cacheKey = `genius_${type}_${query}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.makeRequest('genius', '/search', { q: query });
      const results: SearchResult[] = data.response.hits.map((hit: any) => ({
        id: `genius_${hit.result.id}`,
        title: hit.result.title,
        artist: hit.result.primary_artist.name,
        image: hit.result.song_art_image_url,
        source: 'genius',
        confidence: 0.9,
        metadata: {
          url: hit.result.url,
          type: hit.result.type,
          full_title: hit.result.full_title
        }
      }));

      this.setCachedData(cacheKey, results, 600000); // 10 minutes
      return results;
    } catch (error) {
      console.error('Genius search error:', error);
      return [];
    }
  }

  async searchMusicBrainz(query: string, entity: 'artist' | 'release' = 'artist'): Promise<SearchResult[]> {
    const cacheKey = `musicbrainz_${entity}_${query}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.makeRequest('musicbrainz', `/${entity}`, {
        query,
        fmt: 'json',
        limit: 10
      });

      const results: SearchResult[] = data[`${entity}s`].map((item: any) => ({
        id: `mb_${item.id}`,
        title: item.title || item.name,
        artist: entity === 'artist' ? item.name : item['artist-credit']?.[0]?.name || 'Unknown',
        source: 'musicbrainz',
        confidence: 0.8,
        metadata: {
          id: item.id,
          type: entity,
          country: item.area?.name,
          tags: item.tags?.map((t: any) => t.name) || []
        }
      }));

      this.setCachedData(cacheKey, results, 1800000); // 30 minutes
      return results;
    } catch (error) {
      console.error('MusicBrainz search error:', error);
      return [];
    }
  }

  async searchLastFM(query: string, method: 'artist.search' | 'track.search' = 'artist.search'): Promise<SearchResult[]> {
    const cacheKey = `lastfm_${method}_${query}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.makeRequest('lastfm', '/', {
        method,
        artist: method === 'artist.search' ? query : undefined,
        track: method === 'track.search' ? query : undefined,
        format: 'json',
        limit: 10
      });

      const results: SearchResult[] = [];
      const items = data.results?.[method === 'artist.search' ? 'artistmatches' : 'trackmatches']?.[method === 'artist.search' ? 'artist' : 'track'] || [];

      items.forEach((item: any) => {
        results.push({
          id: `lastfm_${item.mbid || item.name}`,
          title: item.name,
          artist: method === 'artist.search' ? item.name : item.artist,
          image: item.image?.[2]?.['#text'], // Large image
          source: 'lastfm',
          confidence: 0.7,
          metadata: {
            mbid: item.mbid,
            listeners: item.listeners,
            playcount: item.playcount
          }
        });
      });

      this.setCachedData(cacheKey, results, 600000); // 10 minutes
      return results;
    } catch (error) {
      console.error('Last.fm search error:', error);
      return [];
    }
  }

  // TheAudioDB v1 search
  async searchTheAudioDB(query: string, type: 'artist' | 'song' | 'genre' = 'artist'): Promise<SearchResult[]> {
    const cacheKey = `theaudiodb_${type}_${query}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      let endpoint = '/';
      let params: Record<string, any> = {};

      if (type === 'artist') {
        // https://www.theaudiodb.com/api/v1/json/123/search.php?s=ARTIST
        endpoint = '/search.php';
        params = { s: query };
      } else if (type === 'song') {
        // https://www.theaudiodb.com/api/v1/json/123/searchtrack.php?s=QUERY
        endpoint = '/searchtrack.php';
        params = { s: query };
      } else {
        // No direct genre search in v1; return empty for genre queries
        return [];
      }

      const data = await this.makeRequest('theaudiodb', endpoint, params);

      const results: SearchResult[] = [];

      if (type === 'artist') {
        const artists = data?.artists || [];
        artists.forEach((a: any) => {
          results.push({
            id: `tadb_artist_${a.idArtist}`,
            title: a.strArtist,
            artist: a.strArtist,
            image: a.strArtistThumb || a.strArtistFanart || undefined,
            source: 'theaudiodb',
            confidence: 0.75,
            metadata: {
              country: a.strCountry,
              genre: a.strGenre,
              style: a.strStyle,
              mood: a.strMood
            }
          });
        });
      } else if (type === 'song') {
        const tracks = data?.track || [];
        tracks.forEach((t: any) => {
          results.push({
            id: `tadb_track_${t.idTrack}`,
            title: t.strTrack,
            artist: t.strArtist,
            image: t.strTrackThumb || t.strAlbumThumb || undefined,
            source: 'theaudiodb',
            confidence: 0.72,
            metadata: {
              album: t.strAlbum,
              year: t.intYearReleased,
              genre: t.strGenre
            }
          });
        });
      }

      this.setCachedData(cacheKey, results, 600000);
      return results;
    } catch (error) {
      console.error('TheAudioDB search error:', error);
      return [];
    }
  }

  // Unified search across all enabled APIs
  async searchAll(query: string, type: 'artist' | 'song' | 'genre' = 'artist'): Promise<SearchResult[]> {
    const enabledConfigs = Array.from(this.configs.values())
      .filter(config => config.enabled)
      .sort((a, b) => a.priority - b.priority);

    const searchPromises = enabledConfigs.map(async (config) => {
      try {
        switch (config.id) {
          case 'genius':
            return await this.searchGenius(query, type === 'artist' ? 'artist' : 'song');
          case 'musicbrainz':
            return await this.searchMusicBrainz(query, type === 'artist' ? 'artist' : 'release');
          case 'lastfm':
            return await this.searchLastFM(query, type === 'artist' ? 'artist.search' : 'track.search');
          case 'theaudiodb':
            return await this.searchTheAudioDB(query, type);
          default:
            return [];
        }
      } catch (error) {
        const message = `Search error for ${config.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(message);
        this.currentJobLog?.push(message);
        return [];
      }
    });

    const results = await Promise.allSettled(searchPromises);
    const allResults = results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => (result as PromiseFulfilledResult<SearchResult[]>).value);

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

  updateDataSourceStatus(apiId: string, status: DataSource['status']) {
    const source = this.dataSources.get(apiId);
    if (source) {
      this.dataSources.set(apiId, { ...source, status });
    }
  }

  getSyncJobs(): SyncJob[] {
    return Array.from(this.syncJobs.values());
  }

  async startSyncJob(type: 'manual' | 'scheduled' | 'auto', query?: string): Promise<string> {
    const jobId = `sync_${Date.now()}`;
    const job: SyncJob = {
      id: jobId,
      type,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      results: { artists: 0, songs: 0, genres: 0, errors: 0 },
      logs: []
    };

    this.syncJobs.set(jobId, job);

    // Run sync in background
    this.runSyncJob(jobId, query);

    return jobId;
  }

  private async runSyncJob(jobId: string, query?: string) {
    const job = this.syncJobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    job.progress = 0;
    this.currentJobLog = job.logs;

    try {
      const searchTerms = query ? [query] : [
        'Burna Boy', 'Wizkid', 'Davido', 'Tiwa Savage', 'Yemi Alade',
        'Afrobeats', 'Highlife', 'Amapiano', 'Afro-pop'
      ];

      for (let i = 0; i < searchTerms.length; i++) {
        const term = searchTerms[i];
        job.progress = (i / searchTerms.length) * 100;

        // Search for artists
        const artistResults = await this.searchAll(term, 'artist');
        job.results.artists += artistResults.length;

        // Search for songs
        const songResults = await this.searchAll(term, 'song');
        job.results.songs += songResults.length;

        // Search for genres
        const genreResults = await this.searchAll(term, 'genre');
        job.results.genres += genreResults.length;

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      job.status = 'completed';
      job.progress = 100;
      job.endTime = new Date();
    } catch (error) {
      job.status = 'failed';
      job.results.errors++;
      job.logs?.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
      job.endTime = new Date();
    }
    this.currentJobLog = undefined;
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
        ttl: value.ttl
      }))
    };
  }
}

export default APIManager;
