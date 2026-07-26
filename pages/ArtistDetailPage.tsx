import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getArtistById, apiFetch } from '../lib/apiClient';
import { normalizeArtistData } from '../lib/compat';
import Notification from '../components/Notification';
import { DetailPageSkeleton } from '../components/PageSkeletons';
import type { Artist, Song } from '../types';

const ArtistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const artistData = await getArtistById(id) as Artist;
        if (!artistData) {
          setError('Artist not found');
          setTimeout(() => navigate('/'), 2000);
          return;
        }
        setArtist(artistData);

        const songsResult = await apiFetch(
          `/api/catalog/songs?artistId=${encodeURIComponent(id)}&limit=100`
        ) as { songs: any[]; total: number };
        const artistSongs = (songsResult.songs || []).map((s: any) => ({
          ...s,
          artist: s.artist || s.artistName,
        }));
        setSongs(artistSongs);
      } catch (err: any) {
        setError(err.message || 'Error loading artist');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#122118]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DetailPageSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#122118] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">{error}</p>
          <button onClick={() => navigate(-1)} className="text-green-400 hover:text-green-300">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!artist) return null;

  const normalizedDb = normalizeArtistData(artist);
  const dbImage = normalizedDb.image || (artist as any).imageUrl || (artist as any).profileImageUrl || artist.image || '';
  const displayImage = dbImage;
  const dbGenres = normalizedDb.genres?.length
    ? normalizedDb.genres
    : [normalizedDb.genre || (artist as any).genre].filter(Boolean);
  const displayGenres = dbGenres.length > 0 ? dbGenres : [];
  const displayPopularity = normalizedDb.popularity || (artist as any).popularity || 0;
  const displayFollowers = normalizedDb.followers || (artist as any).followers || 0;
  const rawBio = normalizedDb.bio || (artist as any).bio || '';
  const displayBio = rawBio.replace(/\s*Read more on Last\.fm\s*$/i, '').trim();
  const isVerified = (artist as any).verified;
  const isSuspended = (artist as any).suspended;

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-[#122118]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate(-1)}
            className="min-h-[44px] text-gray-400 hover:text-white mb-4 flex items-center gap-2 transition-colors px-2 py-2 -ml-2 rounded-lg hover:bg-gray-800/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="bg-gray-800 rounded-2xl p-12 border border-gray-700 text-center">
            <svg className="w-20 h-20 mx-auto text-gray-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <h1 className="text-3xl font-bold text-white mb-3">
              {artist.name || (artist as any).stageName}
            </h1>
            <p className="text-gray-400 text-lg">This artist profile is currently unavailable.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="min-h-[44px] text-gray-400 hover:text-white mb-4 flex items-center gap-2 transition-colors px-2 py-2 -ml-2 rounded-lg hover:bg-gray-800/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {/* Artist Header */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700 mb-8">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              <div className="flex-shrink-0">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl overflow-hidden bg-gray-700 shadow-2xl">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-4xl md:text-5xl font-bold text-white">
                        {artist.name || (artist as any).stageName}
                      </h1>
                      {isVerified && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-900/50 text-green-300 border border-green-700/50 rounded-full text-sm font-medium flex-shrink-0">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                    {displayGenres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {displayGenres.map((genre: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-green-600/20 text-green-300 rounded-full text-sm font-medium border border-green-600/30"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {displayPopularity !== undefined && displayPopularity > 0 && (
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <p className="text-sm text-gray-400 mb-1">Popularity</p>
                      <p className="text-2xl font-bold text-white">{displayPopularity}</p>
                      <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${displayPopularity}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {displayFollowers !== undefined && displayFollowers > 0 && (
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <p className="text-sm text-gray-400 mb-1">Followers</p>
                      <p className="text-2xl font-bold text-white">
                        {displayFollowers.toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Songs</p>
                    <p className="text-2xl font-bold text-white">{songs.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        {displayBio && (
          <div className="bg-gray-800 rounded-xl p-6 md:p-8 border border-gray-700 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">About</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {displayBio}
            </p>
          </div>
        )}

        {/* Songs Section */}
        <div className="bg-gray-800 rounded-xl p-6 md:p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">
            Songs ({songs.length})
          </h2>

          {songs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No songs available for this artist yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {songs.map((song) => (
                <Link
                  key={song.id}
                  to={`/songs/${song.id}`}
                  className="group flex flex-col bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 min-h-[48px] border border-gray-600 hover:border-green-500/50 transition-all"
                >
                  <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-600">
                    {song.image ? (
                      <img
                        src={song.image}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors mb-1">
                    {song.title}
                  </h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistDetailPage;
