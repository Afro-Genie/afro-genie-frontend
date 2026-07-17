import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useClickOutside from '../hooks/useClickOutside';
import SearchIcon from './icons/SearchIcon';
import { trackEvent } from '../services/telemetryService';

interface SearchBarProps {
  variant?: 'header' | 'homepage';
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ variant = 'header', isOpen, onOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useClickOutside(containerRef, () => {
    if (variant === 'header' && isOpen && onClose) {
      onClose();
    }
  });

  useEffect(() => {
    if (variant === 'header' && isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, variant]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const handleSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    trackEvent('search_submitted', { query: trimmed, source: 'bar_cta' });
    navigate(`/search/${encodeURIComponent(trimmed)}`);
    setQuery('');
    onClose?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose?.();
    }
  };

  if (variant === 'homepage') {
    return (
      <div className="w-full max-w-3xl mx-auto" ref={containerRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <SearchIcon className="h-6 w-6 text-gray-300" />
          </div>
          <input
            data-testid="search-bar"
            type="text"
            placeholder="Search for artist, song, or genre"
            className="w-full min-h-[44px] bg-white/10 backdrop-blur-md text-white placeholder-gray-300 text-base sm:text-lg rounded-full py-4 pl-16 pr-32 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
          <button
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors min-h-[36px]"
          >
            Search
          </button>
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={onOpen}
        className="p-2 rounded-md text-gray-300 hover:bg-[#2a3c30] hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Open search"
      >
        <SearchIcon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="animate-slide-in-from-left flex-1 min-w-0">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          data-testid="search-bar"
          type="text"
          placeholder="Search artists, songs, genres..."
          className="bg-[#2a3c30] text-white placeholder-gray-400 rounded-md py-2.5 min-h-[44px] pl-10 pr-24 w-full text-base focus:outline-none focus:ring-2 focus:ring-green-400"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            handleKeyDown(e);
            if (e.key === 'Enter') handleSearch();
          }}
        />
        <button
          onClick={handleSearch}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors min-h-[32px] whitespace-nowrap"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
