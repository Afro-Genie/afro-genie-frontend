import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../../services/api';
import MusicStats from '../../components/artist/music/MusicStats';
import SongsTable from '../../components/artist/music/SongsTable';
import AlbumGrid from '../../components/artist/music/AlbumGrid';
import PlaylistList from '../../components/artist/music/PlaylistList';
import AddSongModal from '../../components/artist/music/AddSongModal';
import AddReleaseModal from '../../components/artist/music/AddReleaseModal';
import ConfirmDialog from '../../components/ConfirmDialog';

interface Song {
  id: string;
  title: string;
  views: number;
  requestCount: number;
  imageUrl?: string;
  audioUrl?: string;
  released?: boolean;
  durationMs?: number;
  release?: { id: string; title: string; status: string } | null;
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
  releaseDate: string | null;
  coverImageUrl?: string;
  trackCount: number;
  tracks?: { songId: string; title: string }[];
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

  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [releaseToDelete, setReleaseToDelete] = useState<Release | null>(null);

  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotice = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  }, []);

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
      showNotice('Failed to load music data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotice]);

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

  const handleSongSubmit = async (payload: {
    title: string;
    lyrics?: { rawText: string };
    genres: string[];
    languages: string[];
    audioUrl?: string;
    audioDurationMs?: number;
    imageUrl?: string;
  }) => {
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
      showNotice(editingSong ? 'Song updated' : 'Song added to your catalog');
    } catch (error) {
      console.error('Error saving song:', error);
      showNotice('Failed to save song', 'error');
    }
  };

  const handleConfirmDeleteSong = async () => {
    if (!songToDelete) return;
    try {
      await apiRequest(`/artists/me/songs/${songToDelete.id}`, { method: 'DELETE' });
      setSongToDelete(null);
      fetchData();
      showNotice('Song deleted');
    } catch (error) {
      console.error('Error deleting song:', error);
      showNotice('Failed to delete song', 'error');
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

  const handleReleaseSubmit = async (payload: {
    title: string;
    type: string;
    releaseDate?: string;
    coverImageUrl?: string;
    songIds: string[];
    status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  }) => {
    try {
      await apiRequest(
        editingRelease
          ? `/artists/me/releases/${editingRelease.id}`
          : '/artists/me/releases',
        {
          method: editingRelease ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        },
      );
      setShowReleaseModal(false);
      fetchData();
      showNotice(editingRelease ? 'Release updated' : 'Release created');
    } catch (error) {
      console.error('Error saving release:', error);
      showNotice('Failed to save release', 'error');
    }
  };

  const handlePublishRelease = async (release: Release) => {
    try {
      await apiRequest(`/artists/me/releases/${release.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      fetchData();
      showNotice(`"${release.title}" is now live to fans`);
    } catch (error) {
      console.error('Error publishing release:', error);
      showNotice('Failed to publish release', 'error');
    }
  };

  const handleConfirmDeleteRelease = async () => {
    if (!releaseToDelete) return;
    try {
      await apiRequest(`/artists/me/releases/${releaseToDelete.id}`, { method: 'DELETE' });
      setReleaseToDelete(null);
      fetchData();
      showNotice('Release deleted');
    } catch (error) {
      console.error('Error deleting release:', error);
      showNotice('Failed to delete release', 'error');
    }
  };

  const totalStreams = songs.reduce((sum, s) => sum + s.views, 0);
  const albums = releases.filter((r) => r.type === 'ALBUM');
  const singlesEps = releases.filter((r) => r.type === 'SINGLE' || r.type === 'EP');

  // Songs available to add to a release: unassigned songs, plus the songs already
  // in the release currently being edited.
  const songsForReleaseModal = editingRelease
    ? songs.filter((s) => !s.release || s.release.id === editingRelease.id)
    : songs.filter((s) => !s.release);
  const releaseInitialTrackIds = editingRelease
    ? songs.filter((s) => s.release?.id === editingRelease.id).map((s) => s.id)
    : [];

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
          <p className="text-gray-400 mt-1">Upload your catalog, then release it to fans</p>
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

      {notice && (
        <div
          className={`px-4 py-3 rounded-lg border text-sm ${
            notice.type === 'success'
              ? 'bg-green-500/10 border-green-500/40 text-green-300'
              : 'bg-red-500/10 border-red-500/40 text-red-300'
          }`}
        >
          {notice.message}
        </div>
      )}

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
          onDelete={(id) => {
            const song = songs.find((s) => s.id === id);
            if (song) setSongToDelete(song);
          }}
        />
      )}

      {activeTab === 'albums' && (
        <AlbumGrid
          releases={albums}
          loading={loading}
          onEdit={handleEditRelease}
          onDelete={(release) => setReleaseToDelete(release)}
          onPublish={handlePublishRelease}
        />
      )}

      {activeTab === 'playlists' && (
        <PlaylistList
          singles={singlesEps}
          loading={loading}
          onEdit={handleEditRelease}
          onDelete={(release) => setReleaseToDelete(release)}
          onPublish={handlePublishRelease}
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
          availableSongs={songsForReleaseModal.map((s) => ({ id: s.id, title: s.title, hasAudio: Boolean(s.audioUrl) }))}
          initialTrackIds={releaseInitialTrackIds}
          onClose={() => setShowReleaseModal(false)}
          onSubmit={handleReleaseSubmit}
        />
      )}

      {songToDelete && (
        <ConfirmDialog
          isOpen={!!songToDelete}
          title="Delete Song"
          message={`Are you sure you want to delete "${songToDelete.title}"? This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          onConfirm={handleConfirmDeleteSong}
          onCancel={() => setSongToDelete(null)}
        />
      )}

      {releaseToDelete && (
        <ConfirmDialog
          isOpen={!!releaseToDelete}
          title="Delete Release"
          message={`Are you sure you want to delete "${releaseToDelete.title}"? Its songs will be removed from the release and return to private.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          onConfirm={handleConfirmDeleteRelease}
          onCancel={() => setReleaseToDelete(null)}
        />
      )}
    </div>
  );
};

export default ArtistMusicPage;
