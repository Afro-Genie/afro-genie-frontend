import React from 'react';
import { X } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  rawText?: string;
  genres?: string[];
  languages?: string[];
}

interface AddSongModalProps {
  editingSong: Song | null;
  onClose: () => void;
  onSubmit: (payload: { title: string; lyrics?: { rawText: string }; genres: string[]; languages: string[] }) => Promise<void>;
}

const AddSongModal: React.FC<AddSongModalProps> = ({ editingSong, onClose, onSubmit }) => {
  const [form, setForm] = React.useState({
    title: editingSong?.title || '',
    rawText: editingSong?.rawText || '',
    genres: editingSong?.genres?.join(', ') || '',
    languages: editingSong?.languages?.join(', ') || '',
  });
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        title: form.title,
        lyrics: form.rawText ? { rawText: form.rawText } : undefined,
        genres: form.genres ? form.genres.split(',').map((g) => g.trim()).filter(Boolean) : [],
        languages: form.languages ? form.languages.split(',').map((l) => l.trim()).filter(Boolean) : [],
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {editingSong ? 'Edit Song' : 'Add New Song'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
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
            <label className="block text-sm font-medium text-gray-300 mb-1">Lyrics</label>
            <textarea
              value={form.rawText}
              onChange={(e) => setForm({ ...form, rawText: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Paste raw lyrics here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Genres (comma-separated)</label>
            <input
              type="text"
              value={form.genres}
              onChange={(e) => setForm({ ...form, genres: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. Afrobeats, Afro-pop"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Languages (comma-separated)</label>
            <input
              type="text"
              value={form.languages}
              onChange={(e) => setForm({ ...form, languages: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. English, Yoruba"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              {submitting ? 'Saving...' : editingSong ? 'Update Song' : 'Add Song'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSongModal;
