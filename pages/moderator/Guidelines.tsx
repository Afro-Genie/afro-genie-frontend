import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { moderationApi, Guideline } from '../../services/moderationService';

const Guidelines: React.FC = () => {
  const { isAdmin } = useAuth();
  const [guideline, setGuideline] = useState<Guideline | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await moderationApi.getGuidelines();
        setGuideline(result);
        setContent(result?.content || '');
      } catch (err) {
        console.error('Failed to load guidelines:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await moderationApi.updateGuidelines(content);
      setGuideline(result);
      setEditing(false);
      setMessage({ type: 'success', text: 'Guidelines updated successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to update guidelines.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Community Guidelines</h1>
      <p className="text-gray-400 mb-6">
        {guideline?.version ? `Version ${guideline.version}` : 'No guidelines set yet.'}
        {guideline?.updatedAt && ` · Last updated ${new Date(guideline.updatedAt).toLocaleDateString()}`}
      </p>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm ${
          message.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6">
        {editing ? (
          <>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 h-96 font-mono text-sm"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button onClick={() => { setEditing(false); setContent(guideline?.content || ''); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
              <button onClick={handleSave} disabled={saving || !content.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
              {guideline?.content || 'No community guidelines have been set yet.'}
            </div>
            {isAdmin && (
              <div className="mt-6 flex justify-end">
                <button onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded">Edit Guidelines</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Guidelines;
