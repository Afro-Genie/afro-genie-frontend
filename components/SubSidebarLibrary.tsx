import React from 'react';
import { Link } from 'react-router-dom';
import { Star, History, ArrowLeft, Music } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MAX_ITEMS = 5;

interface SubSidebarLibraryProps {
  onBack: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}

const SubSidebarLibrary: React.FC<SubSidebarLibraryProps> = ({
  onBack,
  onNavigate,
  isMobile = false,
}) => {
  const { user, authFetch } = useAuth();
  const [favorites, setFavorites] = React.useState<any[]>([]);
  const [history, setHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        const [favsResult, histResult] = await Promise.allSettled([
          authFetch('/api/users/favorites'),
          authFetch('/api/users/history'),
        ]);

        if (cancelled) return;

        const favsRaw = favsResult.status === 'fulfilled' ? favsResult.value : [];
        const histRaw = histResult.status === 'fulfilled' ? histResult.value : [];

        const favsArr = Array.isArray(favsRaw) ? favsRaw : favsRaw?.favorites ?? [];
        const histArr = Array.isArray(histRaw) ? histRaw : histRaw?.history ?? [];

        setFavorites(favsArr.slice(0, MAX_ITEMS));
        setHistory(histArr.slice(0, MAX_ITEMS));
      } catch (error) {
        console.error('Error fetching library data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();

    return () => { cancelled = true; };
  }, [user, authFetch]);

  const getSongTitle = (item: any) => item.songTitle || item.title || 'Unknown';
  const getArtistName = (item: any) => item.artistName || item.artist || '';
  const getSongId = (item: any) => item.songId || item.id || '';

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
        <h2 className="text-lg font-semibold">Personal Library</h2>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6 no-scrollbar">
        {/* Favourites Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="text-sm font-semibold text-gray-300">Favourites</h3>
            <span className="text-xs text-gray-500">({favorites.length}/{MAX_ITEMS})</span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-gray-800/70 animate-pulse" />
              ))}
            </div>
          ) : favorites.length > 0 ? (
            <ul className="space-y-2">
              {favorites.map((item) => {
                const id = getSongId(item);
                return (
                  <li key={item.id || id}>
                    <Link
                      to={`/songs/${id}`}
                      onClick={onNavigate}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Music className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{getSongTitle(item)}</p>
                        <p className="text-xs text-gray-400 truncate">{getArtistName(item)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 py-4">No favourites yet</p>
          )}
        </section>

        {/* History Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-300">History</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-gray-800/70 animate-pulse" />
              ))}
            </div>
          ) : history.length > 0 ? (
            <ul className="space-y-2">
              {history.map((item) => {
                const id = getSongId(item);
                return (
                  <li key={item.id || id}>
                    <Link
                      to={`/songs/${id}`}
                      onClick={onNavigate}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Music className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{getSongTitle(item)}</p>
                        <p className="text-xs text-gray-400 truncate">{getArtistName(item)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 py-4">No history yet</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default SubSidebarLibrary;
