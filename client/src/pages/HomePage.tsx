import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/apiClient';
import type { Song, SongsListResponse } from './types';

const LANG_TABS: Array<{ code: string; label: string }> = [
  { code: '', label: 'All' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'ig', label: 'Igbo' },
  { code: 'ha', label: 'Hausa' },
  { code: 'pcm', label: 'Pidgin' },
  { code: 'fr', label: 'French' }
];

const normalizeSongs = (payload: unknown): Song[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const data = payload as SongsListResponse;
  return Array.isArray(data.songs) ? data.songs : [];
};

export default function HomePage() {
  const [lang, setLang] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSongs = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/songs', {
          params: {
            sortBy: 'views',
            limit: 12,
            ...(lang ? { lang } : {})
          }
        });
        setSongs(normalizeSongs(res.data));
      } catch {
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };

    void loadSongs();
  }, [lang]);

  return (
    <div className="container">
      <h1>Discover African Lyrics</h1>
      <p className="muted">Trending tracks and translations by language.</p>

      <div className="tabs">
        {LANG_TABS.map((tab) => (
          <button
            key={tab.code || 'all'}
            className={`tab ${tab.code === lang ? 'active' : ''}`}
            onClick={() => setLang(tab.code)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading songs...</p>
      ) : (
        <div className="grid">
          {songs.map((song) => (
            <Link key={song.id} to={`/songs/${song.id}`} className="card song-card">
              <div className="title">{song.title}</div>
              <div className="meta">{song.artist?.name || 'Unknown artist'}</div>
              <div className="meta">
                Lang: {song.songLanguages?.[0]?.languageCode || 'N/A'} • Views: {song.viewCount || song.views || 0}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
