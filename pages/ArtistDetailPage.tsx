import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getArtist, syncArtistFromSpotify } from '../services/firebaseService';
import { apiRequest } from '../services/api';
import { spotifyService } from '../services/spotifyService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { useConfirm } from '../hooks/useConfirm';
import { normalizeArtistData } from '../lib/compat';
import Notification from '../components/Notification';
import ConfirmDialog from '../components/ConfirmDialog';
import { DetailPageSkeleton } from '../components/PageSkeletons';
import type { Artist, Song } from '../types';

const ArtistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { notification, showNotification, hideNotification } = useNotification();
  const { confirmState, confirm, closeConfirm } = useConfirm();
  
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [spotifyArtist, setSpotifyArtist] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      setLoading(true);
      try {
        // Get artist from database
        const artistData = await getArtist(id);
        if (!artistData) {
          showNotification({
            message: 'Artist not found',
            type: 'error'
          });
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        setArtist(artistData);

        // If artist has Spotify ID, fetch latest data from Spotify
        if (artistData.spotifyId) {
          try {
            const spotifyData = await spotifyService.getArtist(artistData.spotifyId);
            setSpotifyArtist(spotifyData);
          } catch (error) {
            console.error('Error fetching Spotify data:', error);
          }
        } else {
          // Try to find artist on Spotify
          try {
            const spotifyResults = await spotifyService.searchArtist(artistData.name, 1);
            if (spotifyResults.length > 0) {
              setSpotifyArtist(spotifyResults[0]);
            }
          } catch (error) {
            console.error('Error searching Spotify:', error);
          }
        }

        // Get artist's songs from backend using artistId filter
        const songsResult = await apiRequest<{ songs: any[]; total: number }>(`/catalog/songs?artistId=${encodeURIComponent(id)}&limit=100`);
        const artistSongs = (songsResult.songs || []).map((s: any) => ({
          ...s,
          artist: s.artist || s.artistName,
        }));
        setSongs(artistSongs);
      } catch (error: any) {
        showNotification({
          message: `Error loading artist: ${error.message}`,
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, showNotification]);

  const handleSyncWithSpotify = async () => {
    if (!artist) return;

    const hasConfirmed = await confirm({
      title: 'Update Artist Information',
      message: `This will update "${artist.name}" with the latest information from Spotify. Continue?`,
      confirmText: 'Update',
      cancelText: 'Cancel',
      type: 'info'
    });

    if (!hasConfirmed) return;

    setSyncing(true);
    try {
      // If we have a Spotify artist but no spotifyId in database, search for it
      let spotifyId = artist.spotifyId;
      
      if (!spotifyId && spotifyArtist) {
        spotifyId = spotifyArtist.id;
      } else if (!spotifyId) {
        // Search for artist on Spotify
        const results = await spotifyService.searchArtist(artist.name, 1);
        if (results.length === 0) {
          showNotification({
            message: 'Artist not found on Spotify',
            type: 'error'
          });
          return;
        }
        spotifyId = results[0].id;
      }

      // Sync with Spotify
      if (!spotifyId) {
        throw new Error('Could not determine Spotify artist ID');
      }

      await syncArtistFromSpotify(artist.id, spotifyId);
      
      // Refresh artist data
      const updatedArtist = await getArtist(artist.id);
      if (updatedArtist) {
        setArtist(updatedArtist);
        
        // Fetch latest Spotify data
        const spotifyData = await spotifyService.getArtist(spotifyId);
        setSpotifyArtist(spotifyData);
      }

      showNotification({
        message: 'Artist information updated successfully!',
        type: 'success'
      });
    } catch (error: any) {
      showNotification({
        message: `Error syncing with Spotify: ${error.message}`,
        type: 'error'
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#122118]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DetailPageSkeleton />
        </div>
      </div>
    );
  }

  if (!artist) {
    return null;
  }

  // Use database data first (Last.fm enriched), fall back to Spotify
  const normalizedDb = normalizeArtistData(artist);
  const dbImage = normalizedDb.image || artist.image;
  const displayImage = dbImage || spotifyArtist?.images?.[0]?.url;
  const dbGenres = normalizedDb.genres?.length
    ? normalizedDb.genres
    : [normalizedDb.genre || artist.genre].filter(Boolean);
  const displayGenres = dbGenres.length > 0
    ? dbGenres
    : spotifyArtist?.genres || [];
  const displayPopularity = normalizedDb.popularity || artist.popularity || (spotifyArtist?.popularity ?? 0);
  const displayFollowers = normalizedDb.followers || artist.followers || (spotifyArtist?.followers?.total ?? 0);
  const displayBio = normalizedDb.bio || artist.bio || (spotifyArtist ? 'Information from Spotify' : '');

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
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
              {/* Artist Image */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl overflow-hidden bg-gray-700 shadow-2xl">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={artist.name}
                      className="w-full h-full object-cover"
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

              {/* Artist Info */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                      {artist.name}
                    </h1>
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

                  {/* Sync Button - Admin Only */}
                  {isAdmin && (
                    <button
                      onClick={handleSyncWithSpotify}
                      disabled={syncing}
                      className="flex items-center justify-center gap-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                    >
                      {syncing ? (
                        <>
                          <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-pulse" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Update from Spotify</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {displayPopularity !== undefined && (
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <p className="text-sm text-gray-400 mb-1">Popularity</p>
                      <p className="text-2xl font-bold text-white">{displayPopularity}</p>
                      <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${displayPopularity}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {displayFollowers !== undefined && (
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

                {/* Artist profile is fully in-app */}
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

      {/* Notification */}
      <Notification notification={notification} onClose={hideNotification} />

      {/* Confirm Dialog */}
      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.options.title}
          message={confirmState.options.message}
          confirmText={confirmState.options.confirmText}
          cancelText={confirmState.options.cancelText}
          type={confirmState.options.type}
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
        />
      )}
    </div>
  );
};

export default ArtistDetailPage;

