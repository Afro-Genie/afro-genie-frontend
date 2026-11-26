import { artistsApi, songsApi, translationsApi } from '../services/api';
import { normalizeArtist } from './apiHelpers';
import type { Artist, Song, BulkSaveResult } from '../types';

export const saveFullSongPackage = async (
  songData: Omit<Song, 'id'>,
  artistData: Omit<Artist, 'id'>,
  lyrics: string,
  _userId: string,
  sourceLang: string = 'en',
  targetLang: string = 'en',
  metadata?: any
): Promise<BulkSaveResult> => {
  try {
    // Find or create artist
    const artistResult = await artistsApi.getAll({ limit: 200, search: artistData.name });
    const allArtists = (artistResult.data || []).map((a: any) => normalizeArtist(a)).filter(Boolean);
    const normalizedArtistName = artistData.name.toLowerCase().trim();
    let artistId = '';

    const existingArtist = allArtists.find(
      (a: any) => a.name?.toLowerCase().trim() === normalizedArtistName
    );

    if (existingArtist) {
      artistId = existingArtist.id;
      if (artistData.image && artistData.image !== existingArtist.image) {
        await artistsApi.update(artistId, { image: artistData.image });
      }
    } else {
      const created = await artistsApi.create(artistData);
      artistId = created.id;
    }

    // Create song
    const songWithArtistId = { ...songData, artistId };
    const songResult = await songsApi.create(songWithArtistId);
    const songId = songResult.id;

    // Save translation if lyrics provided
    let translationId: string | undefined;
    if (lyrics && lyrics.trim().length > 0) {
      if (lyrics.trim().length > 0) {
        const translationResult = await translationsApi.directSave({
          songId,
          originalLyrics: lyrics,
          translatedLyrics: lyrics,
          sourceLang,
          targetLang,
          culturalContext: metadata?.culturalContext || '',
          status: 'APPROVED',
        });
        translationId = translationResult.translation?.id || 'saved';
      }
    }

    return { songId, artistId, translationId, success: true };
  } catch (error: any) {
    console.error('Error saving full song package:', error);
    return { songId: '', artistId: '', success: false, error: error.message || 'Failed to save song package' };
  }
};

export const updateFullSongPackage = async (
  existingSongId: string,
  songData: Partial<Omit<Song, 'id'>>,
  artistData: Partial<Omit<Artist, 'id'>>,
  _lyrics?: string,
  _userId?: string,
  _sourceLang?: string,
  _targetLang?: string
): Promise<BulkSaveResult> => {
  try {
    const raw = await songsApi.get(existingSongId);
    if (!raw) throw new Error('Song not found');

    await songsApi.update(existingSongId, songData);

    if (raw.artistId && Object.keys(artistData).length > 0) {
      await artistsApi.update(raw.artistId, artistData);
    }

    return { songId: existingSongId, artistId: raw.artistId, success: true };
  } catch (error: any) {
    console.error('Error updating song package:', error);
    return { songId: existingSongId, artistId: '', success: false, error: error.message || 'Failed to update song package' };
  }
};
