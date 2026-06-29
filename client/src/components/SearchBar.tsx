import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/apiClient';
import type { SearchSuggestResponse, SuggestionItem } from '../pages/types';

const normalizeSuggestions = (payload: unknown): SuggestionItem[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const data = payload as SearchSuggestResponse;
  return Array.isArray(data.suggestions) ? data.suggestions : [];
};

export default function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!trimmed) {
      setSuggestions([]);
      setOpen(false);
      setActiveIdx(-1);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const res = await api.get('/api/search/suggest', { params: { q: trimmed } });
        const list = normalizeSuggestions(res.data);
        setSuggestions(list);
        setOpen(list.length > 0);
        setActiveIdx(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  const submitQuery = () => {
    if (!trimmed) {
      return;
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
  };

  const chooseSuggestion = (s: SuggestionItem) => {
    const label = s.document.title || s.document.name || '';
    if (s.type === 'artist') {
      navigate(`/search?q=${encodeURIComponent(label)}&type=artist`);
    } else {
      navigate(`/songs/${s.document.id}`);
    }
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="search-wrap">
      <input
        aria-label="Search songs or artists"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open && e.target.value.trim()) {
            setOpen(true);
          }
        }}
        onFocus={() => setOpen(suggestions.length > 0)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActiveIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((prev) => Math.max(prev - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (open && activeIdx >= 0 && activeIdx < suggestions.length) {
              chooseSuggestion(suggestions[activeIdx]);
              return;
            }
            submitQuery();
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder="Search songs, artists, languages..."
        style={{ width: '100%' }}
      />

      {open && suggestions.length > 0 && (
        <div className="search-dropdown" role="listbox">
          {suggestions.map((s, idx) => (
            <div
              key={`${s.type}-${s.document.id}-${idx}`}
              className={`search-item ${idx === activeIdx ? 'active' : ''}`}
              role="option"
              aria-selected={idx === activeIdx}
              onMouseDown={() => chooseSuggestion(s)}
            >
              <div>{s.document.title || s.document.name || 'Untitled'}</div>
              {s.document.artistName && <div className="muted">{s.document.artistName}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
