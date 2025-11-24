import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getArtist, syncArtistFromSpotify, getAllSongs } from '../services/firebaseService';
import { spotifyService } from '../services/spotifyService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { useConfirm } from '../hooks/useConfirm';
import Notification from '../components/Notification';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
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

        // Get artist's songs
        const allSongs = await getAllSongs();
        const artistSongs = allSongs.filter(song => song.artistId === id);
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
      <div className="min-h-screen bg-[#122118] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!artist) {
    return null;
  }

  // Use Spotify data if available, otherwise use database data
  const displayImage = spotifyArtist?.images?.[0]?.url || artist.image;
  const displayGenres = spotifyArtist?.genres || artist.genres || [artist.genre].filter(Boolean);
  const displayPopularity = spotifyArtist?.popularity || artist.popularity;
  const displayFollowers = spotifyArtist?.followers?.total || artist.followers;
  const displayBio = artist.bio || (spotifyArtist ? 'Information from Spotify' : '');

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white mb-4 flex items-center gap-2 transition-colors"
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
                        {displayGenres.map((genre, index) => (
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
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      {syncing ? (
                        <>
                          <LoadingSpinner />
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

                {/* External Links */}
                {(spotifyArtist?.external_urls?.spotify || artist.externalUrl) && (
                  <div className="flex gap-3">
                    <a
                      href={spotifyArtist?.external_urls?.spotify || artist.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.08-1.26 11.04-1.02 15.24 1.621.539.3.719 1.02.42 1.56-.3.421-1.02.599-1.559.3z"/>
                      </svg>
                      <span>Listen on Spotify</span>
                    </a>
                  </div>
                )}
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
                  to={`/song/${song.id}`}
                  className="group bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-green-500/50 transition-all"
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

