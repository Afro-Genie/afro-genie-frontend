import React, { useState, useEffect, useCallback } from 'react';
import { communityApi } from '../../services/communityService';
import CommunityContentCard from './CommunityContentCard';
import PlaylistCard from './PlaylistCard';
import type { ExploreData } from '../../types';

function ExploreGridSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3, 4].map(section => (
        <div key={section}>
          <div className="h-5 bg-gray-700 rounded w-32 mb-3 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden animate-pulse">
                <div className="h-28 bg-gray-700" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const ExploreView: React.FC = React.memo(() => {
  const [data, setData] = useState<ExploreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await communityApi.getExploreData();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load explore data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return <ExploreGridSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
        <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={fetch} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">Retry</button>
      </div>
    );
  }

  if (!data || (!data.albums.length && !data.genres.length && !data.tracks.length && !data.playlists.length)) {
    return (
      <div className="text-center py-16 bg-gray-800/50 rounded-lg border border-gray-700">
        <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <p className="text-gray-400 text-lg mb-1">No explore data yet</p>
        <p className="text-gray-500 text-sm">Data will appear as the community listens to more music.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {data.genres.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-3">Top Genres</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.genres.map(genre => (
              <CommunityContentCard
                key={genre.genreId}
                title={genre.genreName}
                stats={[{ label: 'plays', value: genre.playCount }]}
              />
            ))}
          </div>
        </section>
      )}

      {data.albums.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-3">Popular Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.albums.map(album => (
              <CommunityContentCard
                key={album.albumId}
                imageUrl={album.imageUrl}
                title={album.albumName}
                subtitle={album.artistName}
                stats={[{ label: 'plays', value: album.playCount }]}
              />
            ))}
          </div>
        </section>
      )}

      {data.tracks.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-3">Top Tracks</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.tracks.map(track => (
              <CommunityContentCard
                key={track.songId}
                imageUrl={track.imageUrl}
                title={track.title}
                subtitle={track.artistName}
                stats={[{ label: 'plays', value: track.playCount }]}
              />
            ))}
          </div>
        </section>
      )}

      {data.playlists.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-3">Playlists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.playlists.map(pl => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
});

export default ExploreView;
