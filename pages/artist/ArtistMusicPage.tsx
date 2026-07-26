import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../../services/api';
import MusicStats from '../../components/artist/music/MusicStats';
import SongsTable from '../../components/artist/music/SongsTable';
import AlbumGrid from '../../components/artist/music/AlbumGrid';
import PlaylistList from '../../components/artist/music/PlaylistList';
import AddSongModal from '../../components/artist/music/AddSongModal';
import AddReleaseModal from '../../components/artist/music/AddReleaseModal';
import AddTracksModal from '../../components/artist/music/AddTracksModal';

interface Song {
  id: string;
  title: string;
  views: number;
  requestCount: number;
  imageUrl?: string;
  lyricsStatus?: string;
  rawText?: string;
  genres?: string[];
  languages?: string[];
  createdAt: string;
}

interface Release {
  id: string;
  title: string;
  type: string;
  status: string;
  releaseDate: string;
  coverImageUrl?: string;
  trackCount: number;
  tracks?: { songId: string }[];
}

type Tab = 'songs' | 'albums' | 'playlists';

const ArtistMusicPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('songs');
  const [songs, setSongs] = useState<Song[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSongModal, setShowSongModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);

  const [showTrackModal, setShowTrackModal] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [songsData, releasesData] = await Promise.all([
        apiRequest('/artists/me/songs'),
        apiRequest('/artists/me/releases'),
      ]);
      const songsResult = songsData as any;
      const releasesResult = releasesData as any;
      setSongs(songsResult?.songs ?? (Array.isArray(songsResult) ? songsResult : []));
      setReleases(releasesResult?.releases ?? (Array.isArray(releasesResult) ? releasesResult : []));
    } catch (error) {
      console.error('Error fetching music data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddSong = () => {
    setEditingSong(null);
    setShowSongModal(true);
  };

  const handleEditSong = (song: Song) => {
    setEditingSong(song);
    setShowSongModal(true);
  };

  const handleSongSubmit = async (payload: { title: string; lyrics?: { rawText: string }; genres: string[]; languages: string[] }) => {
    try {
      if (editingSong) {
        await apiRequest(`/artists/me/songs/${editingSong.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/artists/me/songs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowSongModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving song:', error);
    }
  };

  const handleDeleteSong = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this song?')) return;
    try {
      await apiRequest(`/artists/me/songs/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting song:', error);
    }
  };

  const handleAddRelease = () => {
    setEditingRelease(null);
    setShowReleaseModal(true);
  };

  const handleEditRelease = (release: Release) => {
    setEditingRelease(release);
    setShowReleaseModal(true);
  };

  const handleReleaseSubmit = async (payload: { title: string; type: string; releaseDate?: string; coverImageUrl?: string }) => {
    try {
      if (editingRelease) {
        await apiRequest(`/artists/me/releases/${editingRelease.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/artists/me/releases', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowReleaseModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving release:', error);
    }
  };

  const handleAddTracksSubmit = async (songIds: string[]) => {
    if (!showTrackModal) return;
    try {
      await apiRequest(`/artists/me/releases/${showTrackModal}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ songIds }),
      });
      setShowTrackModal(null);
      fetchData();
    } catch (error) {
      console.error('Error adding tracks:', error);
    }
  };

  const totalStreams = songs.reduce((sum, s) => sum + s.views, 0);
  const albums = releases.filter((r) => r.type === 'ALBUM');
  const singlesEps = releases.filter((r) => r.type === 'SINGLE' || r.type === 'EP');

  const releaseForTrackModal = releases.find((r) => r.id === showTrackModal);
  const trackSongIds = new Set(releaseForTrackModal?.tracks?.map((t) => t.songId) ?? []);
  const availableSongs = songs.filter((s) => !trackSongIds.has(s.id));

  const tabs: { key: Tab; label: string }[] = [
    { key: 'songs', label: 'Songs' },
    { key: 'albums', label: 'Albums' },
    { key: 'playlists', label: 'Singles & EPs' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Music</h1>
          <p className="text-gray-400 mt-1">Manage your catalog, releases, and playlists</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddSong}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            + Song
          </button>
          <button
            onClick={handleAddRelease}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            + Release
          </button>
        </div>
      </div>

      {/* Stats */}
      <MusicStats
        totalReleases={releases.length}
        totalStreams={totalStreams}
        totalSongs={songs.length}
        loading={loading}
      />

      {/* Tabs */}
      <div className="border-b border-gray-700/50">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'songs' && (
        <SongsTable
          songs={songs}
          loading={loading}
          onAdd={handleAddSong}
          onEdit={handleEditSong}
          onDelete={handleDeleteSong}
        />
      )}

      {activeTab === 'albums' && (
        <AlbumGrid releases={albums} loading={loading} />
      )}

      {activeTab === 'playlists' && (
        <PlaylistList
          singles={singlesEps}
          loading={loading}
          onAddTracks={(id) => setShowTrackModal(id)}
        />
      )}

      {/* Modals */}
      {showSongModal && (
        <AddSongModal
          editingSong={editingSong}
          onClose={() => setShowSongModal(false)}
          onSubmit={handleSongSubmit}
        />
      )}

      {showReleaseModal && (
        <AddReleaseModal
          editingRelease={editingRelease}
          onClose={() => setShowReleaseModal(false)}
          onSubmit={handleReleaseSubmit}
        />
      )}

      {showTrackModal && releaseForTrackModal && (
        <AddTracksModal
          releaseTitle={releaseForTrackModal.title}
          availableSongs={availableSongs}
          onClose={() => setShowTrackModal(null)}
          onSubmit={handleAddTracksSubmit}
        />
      )}
    </div>
  );
};

export default ArtistMusicPage;
