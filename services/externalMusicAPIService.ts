// External Music APIs Service
// This service integrates with free music APIs to fetch African/Nigerian music data

interface GeniusSearchResult {
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
    };
  }>;
}

interface GeniusSong {
  song: {
    id: number;
    title: string;
    primary_artist: {
      name: string;
      image_url: string;
    };
    song_art_image_url: string;
    lyrics: string;
    url: string;
  };
}

interface MusicBrainzArtist {
  id: string;
  name: string;
  'life-span': {
    begin: string;
    end?: string;
  };
  area?: {
    name: string;
  };
  tags?: Array<{
    name: string;
    count: number;
  }>;
}

interface MusicBrainzRelease {
  id: string;
  title: string;
  'artist-credit': Array<{
    name: string;
    artist: {
      id: string;
      name: string;
    };
  }>;
  'release-group': {
    'primary-type': string;
    'secondary-types': string[];
  };
  date: string;
}

class ExternalMusicAPIService {
  private geniusAccessToken: string;
  private readonly MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
  private readonly GENIUS_BASE_URL = 'https://api.genius.com';

  constructor(geniusAccessToken?: string) {
    this.geniusAccessToken = geniusAccessToken || '';
  }

  // Genius API Methods
  async searchGenius(query: string, type: 'song' | 'artist' = 'song'): Promise<GeniusSearchResult> {
    if (!this.geniusAccessToken) {
      throw new Error('Genius API token required');
    }

    const response = await fetch(
      `${this.GENIUS_BASE_URL}/search?q=${encodeURIComponent(query)}&per_page=10`,
      {
        headers: {
          'Authorization': `Bearer ${this.geniusAccessToken}`,
          'User-Agent': 'AfroGenie/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Genius API error: ${response.status}`);
    }

    return await response.json();
  }

  async getGeniusSong(songId: number): Promise<GeniusSong> {
    if (!this.geniusAccessToken) {
      throw new Error('Genius API token required');
    }

    const response = await fetch(
      `${this.GENIUS_BASE_URL}/songs/${songId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.geniusAccessToken}`,
          'User-Agent': 'AfroGenie/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Genius API error: ${response.status}`);
    }

    return await response.json();
  }

  // MusicBrainz API Methods
  async searchMusicBrainzArtist(query: string): Promise<{ artists: MusicBrainzArtist[] }> {
    const response = await fetch(
      `${this.MUSICBRAINZ_BASE_URL}/artist?query=${encodeURIComponent(query)}&fmt=json&limit=10`,
      {
        headers: {
          'User-Agent': 'AfroGenie/1.0 (contact@afrogenie.com)'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`MusicBrainz API error: ${response.status}`);
    }

    return await response.json();
  }

  async searchMusicBrainzRelease(query: string): Promise<{ releases: MusicBrainzRelease[] }> {
    const response = await fetch(
      `${this.MUSICBRAINZ_BASE_URL}/release?query=${encodeURIComponent(query)}&fmt=json&limit=10`,
      {
        headers: {
          'User-Agent': 'AfroGenie/1.0 (contact@afrogenie.com)'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`MusicBrainz API error: ${response.status}`);
    }

    return await response.json();
  }

  // Combined search methods for African/Nigerian music
  async searchNigerianArtists(query: string): Promise<{
    genius: GeniusSearchResult;
    musicbrainz: { artists: MusicBrainzArtist[] };
  }> {
    const [geniusResults, musicbrainzResults] = await Promise.allSettled([
      this.searchGenius(`${query} Nigerian artist`),
      this.searchMusicBrainzArtist(`${query} Nigeria`)
    ]);

    return {
      genius: geniusResults.status === 'fulfilled' ? geniusResults.value : { hits: [] },
      musicbrainz: musicbrainzResults.status === 'fulfilled' ? musicbrainzResults.value : { artists: [] }
    };
  }

  async searchAfricanMusic(query: string): Promise<{
    genius: GeniusSearchResult;
    musicbrainz: { releases: MusicBrainzRelease[] };
  }> {
    const [geniusResults, musicbrainzResults] = await Promise.allSettled([
      this.searchGenius(`${query} African music`),
      this.searchMusicBrainzRelease(`${query} Africa`)
    ]);

    return {
      genius: geniusResults.status === 'fulfilled' ? geniusResults.value : { hits: [] },
      musicbrainz: musicbrainzResults.status === 'fulfilled' ? musicbrainzResults.value : { releases: [] }
    };
  }

  // Helper methods to format data for your app
  formatGeniusResults(results: GeniusSearchResult): Array<{
    id: string;
    title: string;
    artist: string;
    image: string;
    url: string;
    source: 'genius';
  }> {
    return results.hits.map(hit => ({
      id: `genius_${hit.result.id}`,
      title: hit.result.title,
      artist: hit.result.primary_artist.name,
      image: hit.result.song_art_image_url,
      url: hit.result.url,
      source: 'genius' as const
    }));
  }

  formatMusicBrainzArtists(artists: MusicBrainzArtist[]): Array<{
    id: string;
    name: string;
    country: string;
    tags: string[];
    source: 'musicbrainz';
  }> {
    return artists.map(artist => ({
      id: `mb_${artist.id}`,
      name: artist.name,
      country: artist.area?.name || 'Unknown',
      tags: artist.tags?.map(tag => tag.name) || [],
      source: 'musicbrainz' as const
    }));
  }

  // Popular Nigerian artists for seeding
  getPopularNigerianArtists(): string[] {
    return [
      'Burna Boy',
      'Wizkid',
      'Davido',
      'Tiwa Savage',
      'Yemi Alade',
      'Mr Eazi',
      'Tekno',
      'Kizz Daniel',
      'Fireboy DML',
      'Omah Lay',
      'Rema',
      'Joeboy',
      'Ayra Starr',
      'Tems',
      'Asake',
      'Ruger',
      'BNXN',
      'Lojay',
      'Oxlade',
      'CKay'
    ];
  }

  // Popular African genres
  getAfricanGenres(): string[] {
    return [
      'Afrobeats',
      'Afro-fusion',
      'Afro-pop',
      'Highlife',
      'Juju',
      'Fuji',
      'Apala',
      'Afro-house',
      'Amapiano',
      'Kizomba',
      'Kuduro',
      'Coupe Decale',
      'Bongo Flava',
      'Gqom',
      'Afro-swing',
      'Afro-trap',
      'Afro-soul',
      'Afro-gospel',
      'Afro-reggae',
      'Afro-dancehall'
    ];
  }
}

export default ExternalMusicAPIService;






