import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/apiClient';
import type { SearchHit, SearchResponse } from './types';

type SearchTab = 'all' | 'song' | 'artist';

export default function SearchResultsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const currentTab = (params.get('type') || 'all') as SearchTab;
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    const runSearch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/search', {
          params: {
            q,
            type: currentTab
          }
        });
        const data = res.data as SearchResponse;

        if (currentTab === 'song') {
          setResults(data.songs?.hits || []);
        } else if (currentTab === 'artist') {
          setResults(data.artists?.hits || []);
        } else {
          setResults([...(data.songs?.hits || []), ...(data.artists?.hits || [])]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    void runSearch();
  }, [q, currentTab]);

  const tabs = useMemo(
    () => [
      { key: 'all', label: 'All' },
      { key: 'song', label: 'Songs' },
      { key: 'artist', label: 'Artists' }
    ],
    []
  );

  return (
    <div className="container">
      <h1>Search Results</h1>
      <p className="muted">Query: {q || 'No query provided'}</p>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${currentTab === tab.key ? 'active' : ''}`}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('type', tab.key);
              setParams(next);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p>Searching...</p>}

      <div className="grid">
        {results.map((item) => (
          <Link
            key={item.document.id}
            to={item.document.title ? `/songs/${item.document.id}` : `/search?q=${encodeURIComponent(item.document.name || '')}&type=artist`}
            className="card song-card"
          >
            <div className="title">{item.document.title || item.document.name || 'Untitled'}</div>
            {item.document.artistName && <div className="meta">{item.document.artistName}</div>}
            <div className="meta">{item.document.title ? 'song' : 'artist'}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
