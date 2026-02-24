import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllSongs, getUserFavorites, getUserHistory } from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';
import ChevronDownIcon from './icons/ChevronDownIcon';
import LoadingSpinner from './LoadingSpinner';

const LeftSidebar: React.FC = () => {
  const { user } = useAuth();
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get trending songs (most recent)
        const allSongs = await getAllSongs();
        setTrendingSongs(allSongs.slice(0, 5));

        // Get user-specific data if logged in
        if (user) {
          const [userFavorites, userHistory] = await Promise.all([
            getUserFavorites(user.uid),
            getUserHistory(user.uid, 5)
          ]);
          setFavorites(userFavorites);
          setHistory(userHistory);
        }
      } catch (error) {
        console.error('Error fetching sidebar data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);
  return (
    <div className="flex flex-col space-y-6 sm:space-y-8">
      <section>
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Trending Now</h2>
        {loading ? (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        ) : (
          <ul className="space-y-2">
            {trendingSongs.map((song, index) => (
              <li key={song.id} className={index === 0 ? "bg-green-500/20 rounded-lg" : ""}>
                <Link
                  to={`/song/${song.id}`}
                  className="block py-2 px-4 text-gray-300 hover:text-white font-semibold text-sm sm:text-base min-h-[44px] flex items-center"
                  onClick={() => {
                    // Close mobile sidebar when navigating
                    if (window.innerWidth < 1024) {
                      // This will be handled by the parent component
                    }
                  }}
                >
                  {index + 1}. {song.title} - {song.artist}
                </Link>
              </li>
            ))}
            {trendingSongs.length === 0 && (
              <li className="text-gray-400 text-sm py-2 px-4">No songs available</li>
            )}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Explore by Genre</h2>
        <Link to="/search" className="block bg-[#2a3c30] hover:bg-[#3a4c40] p-4 rounded-lg transition-colors">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Genres</h3>
            <ChevronDownIcon className="h-5 w-5" />
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Afrobeats, Amapiano, Highlife, Kizomba, Gospel
          </p>
        </Link>
      </section>

      {user ? (
        <>
          <section>
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Personal Library</h2>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link to="/songs" className="block py-2 px-4 hover:bg-white/10 rounded-lg min-h-[44px] flex items-center text-sm sm:text-base">
                  Favorites ({favorites.length})
                </Link>
              </li>
              <li>
                <Link to="/songs" className="block py-2 px-4 hover:bg-white/10 rounded-lg min-h-[44px] flex items-center text-sm sm:text-base">
                  History ({history.length})
                </Link>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Community & Contribution</h2>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/request-translation" className="block py-2 px-4 hover:bg-white/10 rounded-lg min-h-[44px] flex items-center text-sm sm:text-base">Request Translation</Link></li>
              <li><Link to="#" className="block py-2 px-4 hover:bg-white/10 rounded-lg min-h-[44px] flex items-center text-sm sm:text-base">Review Translations</Link></li>
            </ul>
          </section>
        </>
      ) : (
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Get Started</h2>
          <ul className="space-y-2 text-gray-300">
            <li><Link to="/request-translation" className="block py-2 px-4 hover:bg-white/10 rounded-lg min-h-[44px] flex items-center text-sm sm:text-base">Request Translation</Link></li>
            <li><Link to="#" className="block py-2 px-4 hover:bg-white/10 rounded-lg min-h-[44px] flex items-center text-sm sm:text-base">Sign In to Save Favorites</Link></li>
          </ul>
        </section>
      )}
    </div>
  );
};

export default LeftSidebar;