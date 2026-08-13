import React from 'react';
import { Link } from 'react-router-dom';
import { X, Music, Lock, CalendarClock, Globe, ExternalLink } from 'lucide-react';
import ImageUpload from '../../ImageUpload';

interface AvailableSong {
  id: string;
  title: string;
  hasAudio?: boolean;
}

type ReleaseStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';

interface AddReleaseModalProps {
  editingRelease: {
    id: string;
    title: string;
    type: string;
    status: string;
    releaseDate: string | null;
    coverImageUrl?: string;
  } | null;
  availableSongs: AvailableSong[];
  initialTrackIds?: string[];
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    type: string;
    releaseDate?: string;
    coverImageUrl?: string;
    songIds: string[];
    status?: ReleaseStatus;
  }) => Promise<void>;
}

const STATUS_OPTIONS: { value: ReleaseStatus; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; hint: string }[] = [
  { value: 'DRAFT', label: 'Private draft', icon: Lock, hint: 'Only you can see it' },
  { value: 'SCHEDULED', label: 'Scheduled', icon: CalendarClock, hint: 'Goes live on the release date' },
  { value: 'PUBLISHED', label: 'Publish now', icon: Globe, hint: 'Live immediately to fans' },
];

const AddReleaseModal: React.FC<AddReleaseModalProps> = ({
  editingRelease,
  availableSongs,
  initialTrackIds = [],
  onClose,
  onSubmit,
}) => {
  const currentStatus = (editingRelease?.status ?? 'DRAFT') as ReleaseStatus;
  const [form, setForm] = React.useState({
    title: editingRelease?.title || '',
    type: editingRelease?.type || 'SINGLE',
    status: currentStatus,
    releaseDate: editingRelease?.releaseDate ? editingRelease.releaseDate.split('T')[0] : '',
    coverImageUrl: editingRelease?.coverImageUrl || '',
  });
  const [songIds, setSongIds] = React.useState<string[]>(initialTrackIds);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const allowedStatuses: ReleaseStatus[] = !editingRelease || currentStatus === 'DRAFT'
    ? ['DRAFT', 'SCHEDULED', 'PUBLISHED']
    : currentStatus === 'SCHEDULED'
      ? ['SCHEDULED', 'PUBLISHED']
      : ['PUBLISHED'];

  const toggleSong = (songId: string) => {
    setSongIds((ids) => (ids.includes(songId) ? ids.filter((id) => id !== songId) : [...ids, songId]));
    setError('');
  };

  const handleTypeChange = (type: string) => {
    setForm((f) => ({ ...f, type }));
    if (type === 'SINGLE') {
      setSongIds((ids) => (ids.length > 0 ? [ids[0]] : []));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (availableSongs.length > 0 && songIds.length === 0) {
      setError('Select at least one song to release.');
      return;
    }
    if (form.status === 'SCHEDULED') {
      if (!form.releaseDate) {
        setError('Choose a release date to schedule the release.');
        return;
      }
      if (new Date(form.releaseDate) <= new Date()) {
        setError('Release date must be in the future to schedule.');
        return;
      }
    }
    setSubmitting(true);
    setError('');
    try {
      const alreadyPublished = editingRelease?.status === 'PUBLISHED';
      let releaseDate: string | undefined;
      let status: ReleaseStatus | undefined;

      if (form.status === 'DRAFT') {
        status = 'DRAFT';
      } else if (form.status === 'SCHEDULED') {
        status = 'SCHEDULED';
        releaseDate = form.releaseDate;
      } else if (!alreadyPublished) {
        // Publish now: for a brand new release stamp today; for an existing
        // draft/scheduled release the backend records the publish moment.
        status = 'PUBLISHED';
        releaseDate = editingRelease ? undefined : new Date().toISOString().split('T')[0];
      }
      // For an already-published release, leave status and date untouched.

      await onSubmit({
        title: form.title,
        type: form.type,
        releaseDate,
        coverImageUrl: form.coverImageUrl || undefined,
        songIds,
        status,
      });
    } finally {
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const isSingle = form.type === 'SINGLE';
  const alreadyPublished = editingRelease?.status === 'PUBLISHED';
  const liveSongId = alreadyPublished ? initialTrackIds[0] : undefined;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  let submitLabel = 'Create Release';
  if (form.status === 'DRAFT') submitLabel = 'Save Draft';
  else if (form.status === 'SCHEDULED') submitLabel = editingRelease ? 'Update & Schedule' : 'Schedule Release';
  else submitLabel = editingRelease ? 'Publish Now' : 'Publish Now';
  if (alreadyPublished) submitLabel = 'Save Changes';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            {editingRelease ? 'Edit Release' : 'Create Release'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {alreadyPublished && (
          <div className="mb-4 flex items-start gap-2 bg-green-900/20 border border-green-500/40 rounded-lg p-3">
            <Globe size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-green-300 font-medium">This release is already live</p>
              <p className="text-xs text-green-400/80 mt-0.5">Changes appear on your public pages immediately.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder={isSingle ? 'e.g. My First Single' : 'e.g. My Debut Album'}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type *</label>
            <select
              value={form.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="SINGLE">Single</option>
              <option value="EP">EP</option>
              <option value="ALBUM">Album</option>
            </select>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-300 mb-1">Public availability *</span>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const allowed = allowedStatuses.includes(opt.value);
                const selected = form.status === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    disabled={!allowed}
                    onClick={() => {
                      setForm((f) => ({ ...f, status: opt.value }));
                      setError('');
                    }}
                    className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                      selected
                        ? 'bg-green-500/10 border-green-500/60'
                        : 'bg-gray-700/40 border-gray-600'
                    } ${allowed ? 'cursor-pointer hover:border-green-500/40' : 'opacity-40 cursor-not-allowed'}`}
                  >
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${selected ? 'text-green-300' : 'text-gray-300'}`}>
                      <Icon size={13} className={selected ? 'text-green-400' : 'text-gray-500'} />
                      {opt.label}
                    </span>
                    <span className="text-[10px] leading-tight text-gray-500">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {form.status === 'SCHEDULED' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Release Date *</label>
              <input
                type="date"
                value={form.releaseDate}
                min={minDate}
                onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">Must be in the future. The release goes live on this date.</p>
            </div>
          )}

          {form.status === 'PUBLISHED' && !alreadyPublished && (
            <div className="bg-green-900/20 border border-green-500/40 rounded-lg p-3">
              <p className="text-xs text-green-300 flex items-center gap-1.5">
                <Globe size={13} />
                Release goes live to fans immediately.
              </p>
            </div>
          )}

          {form.status === 'DRAFT' && (
            <div className="bg-gray-700/40 border border-gray-600 rounded-lg p-3">
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Lock size={13} />
                Saved privately. Publish it later from your Music page.
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-300">
                {isSingle ? 'Select Song *' : 'Select Songs *'}
              </label>
              {songIds.length > 0 && (
                <span className="text-xs text-green-400">
                  {songIds.length} {songIds.length === 1 ? 'song' : 'songs'} selected
                </span>
              )}
            </div>

            {availableSongs.length === 0 ? (
              <p className="text-sm text-gray-400 bg-gray-700/40 border border-gray-700 rounded-lg p-3">
                No songs in your catalog yet. Add a song first, then come back to release it.
              </p>
            ) : isSingle ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {availableSongs.map((song) => {
                  const selected = songIds[0] === song.id;
                  return (
                    <button
                      type="button"
                      key={song.id}
                      onClick={() => {
                        setSongIds(selected ? [] : [song.id]);
                        setError('');
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        selected
                          ? 'bg-green-500/10 border-green-500/60 text-white'
                          : 'bg-gray-700/40 border-gray-600 text-gray-200 hover:border-green-500/40'
                      }`}
                    >
                      <Music size={16} className={`flex-shrink-0 ${selected ? 'text-green-400' : 'text-gray-400'}`} />
                      <span className="flex-1 min-w-0 truncate text-sm">{song.title}</span>
                      {song.hasAudio && (
                        <span className="text-[10px] text-green-400 bg-green-900/40 px-1.5 py-0.5 rounded flex-shrink-0">
                          Audio
                        </span>
                      )}
                      <span className={`text-xs flex-shrink-0 ${selected ? 'text-green-400' : 'text-gray-500'}`}>
                        {selected ? 'Selected' : 'Select'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {availableSongs.map((song) => {
                  const selected = songIds.includes(song.id);
                  return (
                    <label
                      key={song.id}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selected
                          ? 'bg-green-500/10 border-green-500/60 text-white'
                          : 'bg-gray-700/40 border-gray-600 text-gray-200 hover:border-green-500/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSong(song.id)}
                        className="w-4 h-4 accent-green-500 flex-shrink-0"
                      />
                      <span className="flex-1 min-w-0 truncate text-sm">{song.title}</span>
                      {song.hasAudio && (
                        <span className="text-[10px] text-green-400 bg-green-900/40 px-1.5 py-0.5 rounded flex-shrink-0">
                          Audio
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 mt-2">{error}</p>
            )}
          </div>

          <ImageUpload
            label="Cover Image"
            currentUrl={form.coverImageUrl || undefined}
            onUploaded={(url) => setForm({ ...form, coverImageUrl: url })}
          />

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors ${
                form.status === 'PUBLISHED' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {submitting ? 'Saving...' : submitLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>

          {liveSongId && (
            <Link
              to={`/songs/${liveSongId}`}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm text-green-400 hover:text-white bg-green-600/10 hover:bg-green-600 border border-green-600/40 rounded-lg transition-colors"
            >
              <ExternalLink size={15} />
              View live song in the app
            </Link>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddReleaseModal;
