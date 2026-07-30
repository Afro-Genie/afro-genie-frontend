import React, { useState } from 'react';
import { moderationApi } from '../../services/moderationService';

const LyricsEditor: React.FC = () => {
  const [songId, setSongId] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = async () => {
    if (!songId.trim() || !lyrics.trim()) {
      setMessage({ type: 'error', text: 'Song ID and lyrics content are required.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await moderationApi.updateLyrics(songId.trim(), lyrics);
      setMessage({ type: 'success', text: 'Lyrics updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to update lyrics.' });
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Lyrics Editor</h1>

      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl">
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">Song ID</label>
          <input
            type="text"
            value={songId}
            onChange={(e) => setSongId(e.target.value)}
            placeholder="Enter the song ID..."
            className="w-full bg-gray-700 text-white rounded px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">Lyrics Content</label>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Paste or type the lyrics content..."
            className="w-full bg-gray-700 text-white rounded px-3 py-2 h-80 font-mono text-sm"
          />
        </div>

        {message && (
          <div className={`mb-4 px-4 py-2 rounded text-sm ${
            message.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={() => { setLyrics(''); setSongId(''); setMessage(null); }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Clear
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={saving || !songId.trim() || !lyrics.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Lyrics'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Confirm Update</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to update the lyrics for song ID <strong className="text-white">{songId}</strong>? This action will overwrite the current lyrics.
            </p>
            <div className="flex space-x-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LyricsEditor;
