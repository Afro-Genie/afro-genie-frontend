import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/apiClient';
import { useAudioPlayer } from '../context/AudioContext';
import { SongListSkeleton, SquareGridSkeleton } from '../components/PageSkeletons';
import type { Song, Artist } from '../types';

interface GenreInfo {
  id: string;
  name: string;
  imageUrl?: string;
  _count?: { songs: number };
}

const GenreResultPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const decodedName = name ? decodeURIComponent(name) : '';

  const [genre, setGenre] = useState<GenreInfo | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { loadTrackById, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();

  useEffect(() => {
    if (!decodedName) return;

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [genreData, songsResult, artistsResult]: any[] = await Promise.all([
          apiFetch(`/api/genres/${encodeURIComponent(decodedName)}`).catch(() => null),
          apiFetch(`/api/songs?genre=${encodeURIComponent(decodedName)}&limit=100&sortBy=views&sortOrder=desc`),
          apiFetch(`/api/artists?genre=${encodeURIComponent(decodedName)}&limit=50&sortBy=popularity&sortOrder=desc`),
        ]);

        if (cancelled) return;

        if (genreData && !genreData.error) {
          setGenre(genreData);
        } else {
          setGenre({ id: decodedName, name: decodedName });
        }

        const fetchedSongs = (songsResult?.songs || songsResult || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          artist: typeof s.artist === 'object' ? s.artist?.name || '' : (s.artist || s.artistName || ''),
          artistId: typeof s.artist === 'object' ? s.artist?.id || s.artistId : s.artistId,
          image: s.imageUrl || s.image || '',
          views: s.views || 0,
          requestCount: s.requestCount || 0,
          spotifyId: s.spotifyId || null,
          genre: s.genre || '',
          year: s.year || null,
        }));
        setSongs(fetchedSongs);

        const fetchedArtists = (artistsResult?.data || artistsResult || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          genre: a.genres?.[0] || '',
          image: a.imageUrl || '',
          popularity: a.popularity || 0,
          followers: a.followers || 0,
          genres: a.genres || [],
        }));
        setArtists(fetchedArtists);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load genre results');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [decodedName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#122118]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 animate-pulse">
            <div className="h-10 w-48 rounded bg-gray-800/70 mb-3" />
            <div className="h-5 w-32 rounded bg-gray-800/60" />
          </div>
          <SongListSkeleton count={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#122118]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Error loading genre</h2>
            <p className="text-gray-400">{error}</p>
            <Link to="/" className="inline-block mt-4 text-green-400 hover:text-green-300 font-semibold">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const songCount = genre?._count?.songs ?? songs.length;

  return (
    <div className="min-h-screen bg-[#122118]">
      {/* Genre Header */}
      <section className="bg-gradient-to-br from-[#122118] via-[#1a2b22] to-[#122118] py-10 sm:py-16 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {genre?.imageUrl ? (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg border border-gray-700">
                <img
                  src={genre.imageUrl}
                  alt={genre.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-green-500/30 to-amber-500/30 flex items-center justify-center flex-shrink-0 border border-gray-700">
                <svg className="w-12 h-12 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            )}
            <div>
              <p className="text-sm text-green-400 font-semibold mb-1">Genre</p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
                {decodedName}
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                {songCount} {songCount === 1 ? 'song' : 'songs'}
                {artists.length > 0 && ` · ${artists.length} ${artists.length === 1 ? 'artist' : 'artists'}`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Songs Section */}
        {songs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">
              Songs in <span className="text-green-400">{decodedName}</span>
            </h2>
            <div className="space-y-2">
              {songs.map((song, index) => {
                const isThisPlaying = currentTrack?.id === song.spotifyId && isPlaying;
                return (
                  <div
                    key={song.id}
                    className="group flex items-center gap-3 p-3 sm:p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-700 hover:border-green-400/50 transition-all duration-300"
                  >
                    <div className="flex-shrink-0 w-8 sm:w-10 text-center">
                      {song.spotifyId ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (isThisPlaying) {
                              togglePlayPause();
                            } else {
                              loadTrackById(song.spotifyId!, song.title, song.artist);
                            }
                          }}
                          className="text-sm font-bold text-gray-500 hover:text-green-400 transition-colors w-full h-full flex items-center justify-center"
                          aria-label={isThisPlaying ? 'Pause' : `Play ${song.title}`}
                        >
                          {isThisPlaying ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                      ) : (
                        <span className="text-sm font-bold text-gray-500 group-hover:text-green-400 transition-colors">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <Link to={`/songs/${song.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500/20 to-amber-500/20 rounded-lg overflow-hidden">
                        {song.image ? (
                          <img src={song.image} alt={song.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-green-400 transition-colors line-clamp-1">
                          {song.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400 line-clamp-1">{song.artist}</p>
                      </div>
                    </Link>
                    <div className="hidden sm:flex flex-shrink-0 items-center gap-4 text-xs text-gray-400">
                      {song.views > 0 && (
                        <div className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>{song.views.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {songs.length === 0 && !loading && (
          <section className="mb-12">
            <div className="text-center py-16 bg-gray-800/30 rounded-xl border border-gray-700">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">No songs found</h3>
              <p className="text-gray-400">No songs are associated with this genre yet.</p>
            </div>
          </section>
        )}

        {/* Artists Section */}
        {artists.length > 0 && (
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">
              Artists in <span className="text-green-400">{decodedName}</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {artists.map((artist) => (
                <Link
                  to={`/artist/${artist.id}`}
                  key={artist.id}
                  className="group text-center"
                >
                  <div className="aspect-square rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-gradient-to-br from-green-500/20 to-amber-500/20 border border-gray-700 group-hover:border-green-400/50 mb-3">
                    {artist.image ? (
                      <img
                        src={artist.image}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors text-sm">
                    {artist.name}
                  </h3>
                  {artist.popularity > 0 && (
                    <p className="text-xs text-gray-400 mt-1">Popularity: {artist.popularity}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default GenreResultPage;
