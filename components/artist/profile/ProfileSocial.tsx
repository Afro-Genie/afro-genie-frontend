import React, { useState, useEffect } from 'react';
import { Edit3, Save, X, ExternalLink } from 'lucide-react';

interface SocialLinks {
  instagram?: string;
  twitter?: string;
  youtube?: string;
  facebook?: string;
}

interface ProfileSocialProps {
  socialLinks: SocialLinks;
  onSaveSocial: (links: SocialLinks) => Promise<void>;
  loading?: boolean;
}

const SOCIAL_FIELDS = [
  { key: 'instagram' as const, label: 'Instagram', color: 'text-pink-400', prefix: '@' },
  { key: 'twitter' as const, label: 'Twitter / X', color: 'text-sky-400', prefix: '@' },
  { key: 'youtube' as const, label: 'YouTube', color: 'text-red-400', prefix: '' },
  { key: 'facebook' as const, label: 'Facebook', color: 'text-blue-400', prefix: '' },
];

const ProfileSocial: React.FC<ProfileSocialProps> = ({
  socialLinks,
  onSaveSocial,
  loading,
}) => {
  const [editingSocial, setEditingSocial] = useState(false);
  const [socialDraft, setSocialDraft] = useState(socialLinks);
  const [savingSocial, setSavingSocial] = useState(false);

  useEffect(() => {
    setSocialDraft(socialLinks);
  }, [socialLinks]);

  const handleSaveSocial = async () => {
    setSavingSocial(true);
    try {
      await onSaveSocial(socialDraft);
      setEditingSocial(false);
    } finally {
      setSavingSocial(false);
    }
  };

  const hasSocialLinks = Object.values(socialLinks).some((v) => v);

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Social Links</h2>
        {!editingSocial && (
          <button
            onClick={() => {
              setSocialDraft(socialLinks);
              setEditingSocial(true);
            }}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-6 space-y-6">
        {/* Social Links */}
        {loading ? (
          <div className="space-y-3">
            {SOCIAL_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <div className="h-4 w-4 bg-gray-700/50 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-700/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : editingSocial ? (
          <div className="space-y-3">
            {SOCIAL_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-400 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={socialDraft[f.key] || ''}
                  onChange={(e) => setSocialDraft({ ...socialDraft, [f.key]: e.target.value })}
                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={f.prefix ? `${f.prefix}username` : 'URL'}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingSocial(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSaveSocial}
                disabled={savingSocial}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                {savingSocial ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : hasSocialLinks ? (
          <div className="space-y-2">
            {SOCIAL_FIELDS.map((f) => {
              const value = socialLinks[f.key];
              if (!value) return null;
              const displayValue = f.prefix && !value.startsWith(f.prefix) ? `${f.prefix}${value}` : value;
              const url = f.key === 'youtube' || f.key === 'facebook'
                ? value
                : `https://${f.key}.com/${value.replace(/^@/, '')}`;
              return (
                <a
                  key={f.key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors group"
                >
                  <span className={`font-medium ${f.color}`}>{f.label}</span>
                  <span className="text-gray-500">{displayValue}</span>
                  <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </a>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No social links added yet.</p>
        )}
      </div>
    </div>
  );
};

export default ProfileSocial;