import React from 'react';
import { X } from 'lucide-react';

interface Song {
  id: string;
  title: string;
}

interface AddTracksModalProps {
  releaseTitle: string;
  availableSongs: Song[];
  onClose: () => void;
  onSubmit: (songIds: string[]) => Promise<void>;
}

const AddTracksModal: React.FC<AddTracksModalProps> = ({ releaseTitle, availableSongs, onClose, onSubmit }) => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(selectedIds);
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
          <div>
            <h2 className="text-xl font-semibold text-white">Add Tracks</h2>
            <p className="text-sm text-gray-400 mt-1">{releaseTitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {availableSongs.length === 0 ? (
          <p className="text-gray-400 text-center py-8">All songs are already in this release.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {availableSongs.map((song) => (
              <label
                key={song.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(song.id)}
                  onChange={() => toggle(song.id)}
                  className="w-4 h-4 rounded border-gray-600 text-green-600 focus:ring-green-500 bg-gray-700"
                />
                <span className="text-sm text-gray-200">{song.title}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedIds.length === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            {submitting ? 'Adding...' : `Add ${selectedIds.length} Track(s)`}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTracksModal;
