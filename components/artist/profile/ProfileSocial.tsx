import React, { useState, useEffect } from 'react';
import { Edit3, Save, X, ExternalLink } from 'lucide-react';

interface SocialLinks {
  instagram?: string;
  twitter?: string;
  youtube?: string;
  facebook?: string;
}

interface SpotifyResult {
  id: string;
  name: string;
  images?: { url: string }[];
  genres?: string[];
}

interface ProfileSocialProps {
  socialLinks: SocialLinks;
  spotifyArtistId?: string;
  onSaveSocial: (links: SocialLinks) => Promise<void>;
  onSaveSpotify: (id: string) => Promise<void>;
  onSpotifySearch: (query: string) => Promise<SpotifyResult[]>;
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
  spotifyArtistId,
  onSaveSocial,
  onSaveSpotify,
  onSpotifySearch,
  loading,
}) => {
  const [editingSocial, setEditingSocial] = useState(false);
  const [socialDraft, setSocialDraft] = useState(socialLinks);
  const [savingSocial, setSavingSocial] = useState(false);

  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyResult[]>([]);
  const [spotifySearching, setSpotifySearching] = useState(false);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);

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

  const handleSpotifySearch = async () => {
    if (!spotifyQuery.trim()) return;
    setSpotifySearching(true);
    try {
      const results = await onSpotifySearch(spotifyQuery);
      setSpotifyResults(results);
    } finally {
      setSpotifySearching(false);
    }
  };

  const handleSelectSpotify = async (result: SpotifyResult) => {
    await onSaveSpotify(result.id);
    setShowSpotifySearch(false);
    setSpotifyResults([]);
    setSpotifyQuery('');
  };

  const hasSocialLinks = Object.values(socialLinks).some((v) => v);

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Social Links & Spotify</h2>
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

        {/* Divider */}
        <div className="border-t border-gray-700/50" />

        {/* Spotify */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Spotify Artist</h3>
          {spotifyArtistId ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 border border-green-700/30 rounded-lg text-sm text-green-300">
                🎵 Linked
              </span>
              <code className="text-xs text-gray-500 font-mono">{spotifyArtistId}</code>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic mb-2">Not linked yet.</p>
          )}
          <button
            type="button"
            onClick={() => setShowSpotifySearch(!showSpotifySearch)}
            className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-750 transition-colors"
          >
            {showSpotifySearch ? 'Hide search' : 'Search Spotify'}
          </button>

          {showSpotifySearch && (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={spotifyQuery}
                  onChange={(e) => setSpotifyQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSpotifySearch())}
                  className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Search artist name..."
                />
                <button
                  type="button"
                  onClick={handleSpotifySearch}
                  disabled={spotifySearching}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                >
                  {spotifySearching ? '...' : 'Search'}
                </button>
              </div>

              {spotifyResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {spotifyResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelectSpotify(result)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
                    >
                      {result.images?.[0] ? (
                        <img src={result.images[0].url} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-700" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{result.name}</p>
                        {result.genres?.length ? (
                          <p className="text-xs text-gray-400 truncate">{result.genres.slice(0, 2).join(', ')}</p>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSocial;
