import React, { useState, useEffect } from 'react';
import { Edit3, Save, X } from 'lucide-react';

interface ProfileAboutProps {
  bio: string;
  onSave: (bio: string) => Promise<void>;
  loading?: boolean;
}

const ProfileAbout: React.FC<ProfileAboutProps> = ({ bio, onSave, loading }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(bio);
  }, [bio]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(bio);
    setEditing(false);
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">About</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-700/50 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-700/50 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-gray-700/50 rounded animate-pulse" />
          </div>
        ) : editing ? (
          <div className="space-y-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Tell the world about yourself..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : bio ? (
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{bio}</p>
        ) : (
          <p className="text-sm text-gray-500 italic">No bio yet. Click edit to add one.</p>
        )}
      </div>
    </div>
  );
};

export default ProfileAbout;
