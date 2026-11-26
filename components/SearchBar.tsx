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
          <input
            data-testid="search-bar"
            type="text"
            placeholder="Search for artist, song, or genre"
            className="w-full min-h-[44px] bg-white/10 backdrop-blur-md text-white placeholder-gray-300 text-base sm:text-lg rounded-full py-4 px-6 focus:outline-none focus:ring-1 focus:ring-green-500/30 border border-white/10 hover:border-white/20 transition-colors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
          <button
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <SearchIcon className="h-5 w-5" />
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
    <div ref={containerRef} className="animate-slide-in-from-left flex-1 min-w-0 max-w-full lg:max-w-[50%]">
      <div className="relative">
        <input
          ref={inputRef}
          data-testid="search-bar"
          type="text"
          placeholder="Search artists, songs, genres..."
          className="bg-[#2a3c30] text-white placeholder-gray-400 rounded-full py-2.5 min-h-[44px] pl-6 pr-16 w-full text-base focus:outline-none focus:ring-1 focus:ring-green-500/30 transition-colors border border-white/10 hover:border-white/20"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            handleKeyDown(e);
            if (e.key === 'Enter') handleSearch();
          }}
        />
        <button
          onClick={handleSearch}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <SearchIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onClose?.()}
          className="absolute right-14 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
          aria-label="Close search"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
