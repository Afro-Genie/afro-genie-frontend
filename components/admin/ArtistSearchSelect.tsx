import React, { useMemo, useRef, useState, useEffect } from 'react';
import useClickOutside from '../../hooks/useClickOutside';
import type { Artist } from '../../types';

export interface ArtistSearchSelectProps {
  artists: Artist[];
  value: string;
  onChange: (artistId: string) => void;
  onArtistSelected?: (artist: Artist) => void;
  id?: string;
  disabled?: boolean;
}

const MAX_VISIBLE = 120;

const ArtistSearchSelect: React.FC<ArtistSearchSelectProps> = ({
  artists,
  value,
  onChange,
  onArtistSelected,
  id,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const selected = useMemo(() => artists.find((a) => a.id === value) ?? null, [artists, value]);

  useClickOutside(containerRef, () => {
    setOpen(false);
    setFilter('');
  });

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const sorted = [...artists].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    let list = !q ? sorted : sorted.filter((a) => a.name.toLowerCase().includes(q));
    if (selected && !list.some((a) => a.id === selected.id)) {
      list = [selected, ...list];
    }
    return list.slice(0, MAX_VISIBLE);
  }, [artists, filter, selected]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setFilter('');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handlePick = (artist: Artist) => {
    onChange(artist.id);
    onArtistSelected?.(artist);
    setFilter('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setFilter('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <p className="text-xs text-gray-500 mb-2">
        Link to catalog artist — type to filter names.
      </p>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id || 'artist-select'}-listbox`}
          disabled={disabled}
          readOnly={!open && Boolean(selected)}
          value={open ? filter : selected ? selected.name : filter}
          onChange={(e) => {
            setFilter(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setFilter('');
          }}
          placeholder={!selected || open ? 'Type artist name to filter…' : ''}
          className={`w-full min-h-[44px] pl-10 pr-10 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 ${!open && selected ? 'cursor-pointer' : ''}`}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-white disabled:opacity-50 min-w-[44px] justify-center"
            aria-label="Clear artist selection"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {selected && (
        <p className="mt-1.5 text-xs text-green-400/90">
          Linked: <span className="font-medium text-green-300">{selected.name}</span>
          <span className="text-gray-500 ml-1 font-mono">({selected.id.slice(0, 8)}…)</span>
        </p>
      )}

      {open && !disabled && (
        <ul
          id={`${id || 'artist-select'}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-600 bg-gray-800 shadow-xl py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400">No artists match “{filter.trim()}”.</li>
          ) : (
            <>
              {artists.length > 15 && !filter.trim() && (
                <li className="px-4 py-2 text-xs text-gray-500 border-b border-gray-700/80 sticky top-0 bg-gray-800">
                  {artists.length} artists — type to narrow results (showing first {filtered.length})
                </li>
              )}
              {filtered.map((artist) => (
                <li key={artist.id} role="option" aria-selected={artist.id === value}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePick(artist)}
                    className={`w-full text-left px-4 py-2.5 text-sm min-h-[44px] flex items-center gap-3 hover:bg-green-600/20 focus:bg-green-600/20 focus:outline-none ${
                      artist.id === value ? 'bg-green-600/15 text-green-300' : 'text-white'
                    }`}
                  >
                    {artist.image ? (
                      <img src={artist.image} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center text-xs text-gray-300">
                        {artist.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">
                      {artist.name}
                      {artist.genre ? <span className="text-gray-500 font-normal"> · {artist.genre}</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </div>
  );
};

export default ArtistSearchSelect;
