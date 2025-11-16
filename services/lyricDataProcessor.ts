// Lyric Data Processor - Normalize, detect duplicates, and merge data

import { getAllSongs, getAllArtists } from './firebaseService';
import { uploadImage } from './firebaseService';
import type { FullSongData, DuplicateCheckResult, Song, Artist } from '../types';

class LyricDataProcessor {
  // Calculate Levenshtein distance for fuzzy matching
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[len2][len1];
  }

  // Normalize string for comparison
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  // Check for duplicates
  async checkForDuplicates(songData: FullSongData): Promise<DuplicateCheckResult> {
    try {
      const allSongs = await getAllSongs();
      const normalizedTitle = this.normalizeString(songData.song.title);
      const normalizedArtist = this.normalizeString(songData.song.artist);

      for (const existingSong of allSongs) {
        const existingTitle = this.normalizeString(existingSong.title);
        const existingArtist = this.normalizeString(existingSong.artist);

        // Exact match
        if (existingTitle === normalizedTitle && existingArtist === normalizedArtist) {
          const differences = this.findDifferences(existingSong, songData);
          return {
            isDuplicate: true,
            existingSong,
            differences,
            confidence: 1.0
          };
        }

        // Fuzzy match (title similarity)
        const titleDistance = this.levenshteinDistance(existingTitle, normalizedTitle);
        if (titleDistance <= 3 && existingArtist === normalizedArtist) {
          const differences = this.findDifferences(existingSong, songData);
          return {
            isDuplicate: true,
            existingSong,
            differences,
            confidence: 1.0 - (titleDistance / 10)
          };
        }
      }

      return {
        isDuplicate: false
      };
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return {
        isDuplicate: false
      };
    }
  }

  // Find differences between existing and new data
  private findDifferences(existing: Song, newData: FullSongData): string[] {
    const differences: string[] = [];

    if (existing.title !== newData.song.title) {
      differences.push(`Title: "${existing.title}" vs "${newData.song.title}"`);
    }

    if (existing.artist !== newData.song.artist) {
      differences.push(`Artist: "${existing.artist}" vs "${newData.song.artist}"`);
    }

    if (existing.image !== newData.song.image && newData.song.image) {
      differences.push('Image: Different images available');
    }

    if (newData.lyrics && newData.lyrics.length > 0) {
      differences.push('Lyrics: New lyrics available');
    }

    if (newData.metadata.album) {
      differences.push(`Album: "${newData.metadata.album}"`);
    }

    if (newData.metadata.year) {
      differences.push(`Year: ${newData.metadata.year}`);
    }

    return differences;
  }

  // Merge song data based on strategy
  mergeSongData(
    existing: Song,
    newData: FullSongData,
    strategy: 'replace' | 'merge'
  ): Omit<Song, 'id'> {
    if (strategy === 'replace') {
      return {
        title: newData.song.title,
        artist: newData.song.artist,
        artistId: existing.artistId, // Keep existing artistId
        image: newData.song.image || existing.image
      };
    }

    // Merge strategy: prefer new data but keep existing if new is empty
    return {
      title: newData.song.title || existing.title,
      artist: newData.song.artist || existing.artist,
      artistId: existing.artistId,
      image: newData.song.image || existing.image
    };
  }

  // Upload images to Firebase Storage
  async uploadImages(images: { song?: string; artist?: string; album?: string }): Promise<{
    song?: string;
    artist?: string;
    album?: string;
  }> {
    const uploaded: { song?: string; artist?: string; album?: string } = {};

    // Note: This assumes images are URLs. If they're File objects, we'd need different handling
    // For now, we'll just return the URLs as-is since they're already hosted
    // If we need to download and re-upload, that would require additional logic

    return {
      song: images.song,
      artist: images.artist,
      album: images.album
    };
  }

  // Normalize API data to FullSongData format
  normalizeAPIData(apiResult: any, source: string): FullSongData {
    // This is a generic normalizer - specific APIs should be handled in lyricAPIService
    // This is a fallback for any additional processing needed
    return apiResult as FullSongData;
  }

  // Find or create artist
  async findOrCreateArtist(artistData: Omit<Artist, 'id'>): Promise<{ id: string; isNew: boolean }> {
    try {
      const allArtists = await getAllArtists();
      const normalizedName = this.normalizeString(artistData.name);

      // Check for existing artist
      for (const artist of allArtists) {
        if (this.normalizeString(artist.name) === normalizedName) {
          return { id: artist.id, isNew: false };
        }
      }

      // Artist doesn't exist - will be created by the save function
      return { id: '', isNew: true };
    } catch (error) {
      console.error('Error finding artist:', error);
      return { id: '', isNew: true };
    }
  }

  // Prepare data for saving
  async prepareForSave(
    data: FullSongData,
    strategy: 'new' | 'replace' | 'merge',
    existingSong?: Song
  ): Promise<{
    song: Omit<Song, 'id'>;
    artist: Omit<Artist, 'id'>;
    lyrics: string;
    metadata: any;
  }> {
    // Upload images
    const uploadedImages = await this.uploadImages(data.images);

    // Merge song data if needed
    let songData: Omit<Song, 'id'>;
    if (existingSong && (strategy === 'replace' || strategy === 'merge')) {
      songData = this.mergeSongData(existingSong, data, strategy);
    } else {
      songData = {
        ...data.song,
        image: uploadedImages.song || data.song.image
      };
    }

    // Update artist image
    const artistData: Omit<Artist, 'id'> = {
      ...data.artist,
      image: uploadedImages.artist || data.artist.image
    };

    return {
      song: songData,
      artist: artistData,
      lyrics: data.lyrics,
      metadata: {
        ...data.metadata,
        album_image: uploadedImages.album
      }
    };
  }
}

export default new LyricDataProcessor();

