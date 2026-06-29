import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/apiClient';
import type { Song, SongsListResponse } from './types';

const normalizeSongs = (payload: unknown): SongsListResponse | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as SongsListResponse;
  return Array.isArray(data.songs) ? data : null;
};

export default function SongsCatalogPage() {
  const [params, setParams] = useSearchParams();
  const [songs, setSongs] = useState<Song[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const page = Math.max(Number(params.get('page') || '1') || 1, 1);
  const lang = params.get('lang') || '';

  useEffect(() => {
    const loadSongs = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/songs', {
          params: {
            page,
            limit: 20,
            ...(lang ? { lang } : {})
          }
        });
        const data = normalizeSongs(res.data);
        setSongs(data?.songs || []);
        setTotalPages(data?.totalPages || 1);
      } catch {
        setSongs([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    void loadSongs();
  }, [page, lang]);

  const changePage = (nextPage: number) => {
    const newParams = new URLSearchParams(params);
    newParams.set('page', String(Math.max(nextPage, 1)));
    if (!lang) {
      newParams.delete('lang');
    }
    setParams(newParams);
  };

  const currentLang = useMemo(() => lang, [lang]);

  return (
    <div className="container">
      <div className="spread">
        <h1>Songs Catalog</h1>
        <div className="row">
          <span className="muted">Language</span>
          <select
            value={currentLang}
            onChange={(e) => {
              const newParams = new URLSearchParams(params);
              if (e.target.value) {
                newParams.set('lang', e.target.value);
              } else {
                newParams.delete('lang');
              }
              newParams.set('page', '1');
              setParams(newParams);
            }}
          >
            <option value="">All</option>
            <option value="yo">Yoruba</option>
            <option value="ig">Igbo</option>
            <option value="ha">Hausa</option>
            <option value="pcm">Pidgin</option>
            <option value="fr">French</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading catalog...</p>
      ) : (
        <div className="grid">
          {songs.map((song) => (
            <Link key={song.id} to={`/songs/${song.id}`} className="card song-card">
              <div className="title">{song.title}</div>
              <div className="meta">{song.artist?.name || 'Unknown artist'}</div>
              <div className="meta">{song.songLanguages?.[0]?.languageCode || 'N/A'}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="row" style={{ marginTop: '1rem' }}>
        <button onClick={() => changePage(page - 1)} disabled={page <= 1}>
          Prev
        </button>
        <span className="muted">Page {page}</span>
        <button onClick={() => changePage(page + 1)} disabled={page >= totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}
