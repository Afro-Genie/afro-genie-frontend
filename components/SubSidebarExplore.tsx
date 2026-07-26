import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Users, Music, Search } from 'lucide-react';
import { featureFlags } from '../config/featureFlags';
import CulturalContextList from './CulturalContextList';

interface SubSidebarExploreProps {
  onBack: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
  culturalContext?: string;
}

const GENRES = [
  { name: 'Afrobeats', slug: 'afrobeats' },
  { name: 'Amapiano', slug: 'amapiano' },
  { name: 'Highlife', slug: 'highlife' },
  { name: 'Kizomba', slug: 'kizomba' },
  { name: 'Gospel', slug: 'gospel' },
  { name: 'Coupe Decale', slug: 'coupe-decale' },
  { name: 'Bongo Flava', slug: 'bongo-flava' },
  { name: 'Genge', slug: 'genge' },
];

const SubSidebarExplore: React.FC<SubSidebarExploreProps> = ({
  onBack,
  onNavigate,
  isMobile = false,
  culturalContext = '',
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCulturalContext, setShowCulturalContext] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/search/${encodeURIComponent(q)}`);
    onNavigate?.();
  };

  if (showCulturalContext) {
    return (
      <CulturalContextList
        culturalContext={culturalContext}
        onBack={() => setShowCulturalContext(false)}
        onNavigate={onNavigate}
        isMobile={isMobile}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white">
      {/* Header */}
      <div className="flex items-center gap-3 h-16 px-4 border-b border-[#282828] flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">Explore</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Search */}
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs, artists..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
            />
          </div>
        </form>

        {/* By Genre */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-green-500" />
            <h3 className="text-sm font-semibold text-gray-300">By Genre</h3>
          </div>
          <ul className="space-y-1">
            {GENRES.map((genre) => (
              <li key={genre.slug}>
                <Link
                  to={featureFlags.genrePages ? `/genre/${genre.slug}` : `/search?q=${genre.slug}`}
                  onClick={onNavigate}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Music className="w-4 h-4 text-gray-500" />
                  {genre.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Top Artists */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-300">Top Artists</h3>
          </div>
          <Link
            to="/artists"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Users className="w-4 h-4 text-gray-500" />
            View All Artists
          </Link>
        </section>

        {/* Cultural Context */}
        {culturalContext && culturalContext.trim() && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-300">Cultural Context</h3>
            </div>
            <button
              onClick={() => setShowCulturalContext(true)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Globe className="w-4 h-4 text-gray-500" />
              View Full List
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

export default SubSidebarExplore;
