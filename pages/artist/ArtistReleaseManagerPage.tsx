import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import {
  PlusIcon,
  EditIcon,
  MusicNoteIcon,
  CancelIcon,
  SaveIcon,
} from '../../components/icons/FlatIcons';

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

interface Song {
  id: string;
  title: string;
}

type ReleaseType = 'SINGLE' | 'EP' | 'ALBUM';
type ReleaseStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';

const statusStyles: Record<ReleaseStatus, string> = {
  DRAFT: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
  SCHEDULED: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  PUBLISHED: 'bg-green-900/50 text-green-300 border-green-700/50',
};

const ArtistReleaseManagerPage: React.FC = () => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showTrackModal, setShowTrackModal] = useState<string | null>(null);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '',
    type: 'SINGLE' as ReleaseType,
    releaseDate: '',
    coverImageUrl: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [releasesData, songsData] = await Promise.all([
        apiRequest<{ data: Release[] } | Release[]>('/artists/me/releases'),
        apiRequest<{ data: Song[] } | Song[]>('/artists/me/songs'),
      ]);
      setReleases(Array.isArray(releasesData) ? releasesData : releasesData.data ?? []);
      setAllSongs(Array.isArray(songsData) ? songsData : songsData.data ?? []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingRelease(null);
    setForm({ title: '', type: 'SINGLE', releaseDate: '', coverImageUrl: '' });
    setShowModal(true);
  };

  const openEditModal = (release: Release) => {
    setEditingRelease(release);
    setForm({
      title: release.title,
      type: release.type as ReleaseType,
      releaseDate: release.releaseDate ? release.releaseDate.split('T')[0] : '',
      coverImageUrl: release.coverImageUrl || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        type: form.type,
        releaseDate: form.releaseDate || undefined,
        coverImageUrl: form.coverImageUrl || undefined,
      };

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

      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving release:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const openTrackModal = (releaseId: string) => {
    const release = releases.find((r) => r.id === releaseId);
    if (!release) return;

    const trackSongIds = new Set(release.tracks?.map((t) => t.songId) ?? []);
    setAvailableSongs(allSongs.filter((s) => !trackSongIds.has(s.id)));
    setSelectedSongIds([]);
    setShowTrackModal(releaseId);
  };

  const handleAddTracks = async () => {
    if (!showTrackModal || selectedSongIds.length === 0) return;
    setSubmitting(true);
    try {
      await apiRequest(`/artists/me/releases/${showTrackModal}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ songIds: selectedSongIds }),
      });
      setShowTrackModal(null);
      fetchData();
    } catch (error) {
      console.error('Error adding tracks:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Releases</h1>
          <p className="text-gray-400 mt-1">Manage your releases</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Create Release
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : releases.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <MusicNoteIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p>No releases yet. Create your first release!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {releases.map((release) => (
              <div key={release.id} className="p-6 hover:bg-gray-700/20 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {release.coverImageUrl ? (
                      <img
                        src={release.coverImageUrl}
                        alt={release.title}
                        className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <MusicNoteIcon className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-medium text-white truncate">
                          {release.title}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-700 text-gray-300">
                          {release.type}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                            statusStyles[release.status as ReleaseStatus] || statusStyles.DRAFT
                          }`}
                        >
                          {release.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {release.releaseDate
                          ? `Release: ${new Date(release.releaseDate).toLocaleDateString()}`
                          : 'No date set'}
                        {' · '}
                        {release.trackCount} track{release.trackCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openTrackModal(release.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Tracks
                    </button>
                    <button
                      onClick={() => openEditModal(release)}
                      className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                      title="Edit"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {editingRelease ? 'Edit Release' : 'Create Release'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <CancelIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as ReleaseType })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="SINGLE">Single</option>
                  <option value="EP">EP</option>
                  <option value="ALBUM">Album</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Release Date</label>
                <input
                  type="date"
                  value={form.releaseDate}
                  onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={form.coverImageUrl}
                  onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://example.com/cover.jpg"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                >
                  <SaveIcon className="w-4 h-4" />
                  {submitting ? 'Saving...' : editingRelease ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTrackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Add Tracks</h2>
              <button
                onClick={() => setShowTrackModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <CancelIcon className="w-5 h-5" />
              </button>
            </div>

            {availableSongs.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                All songs are already in this release
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {availableSongs.map((song) => (
                  <label
                    key={song.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSongIds.includes(song.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSongIds([...selectedSongIds, song.id]);
                        } else {
                          setSelectedSongIds(selectedSongIds.filter((id) => id !== song.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-600 text-green-600 focus:ring-green-500 bg-gray-700"
                    />
                    <span className="text-sm text-gray-200">{song.title}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAddTracks}
                disabled={submitting || selectedSongIds.length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                {submitting ? 'Adding...' : `Add ${selectedSongIds.length} Track(s)`}
              </button>
              <button
                onClick={() => setShowTrackModal(null)}
                className="px-4 py-2.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistReleaseManagerPage;
