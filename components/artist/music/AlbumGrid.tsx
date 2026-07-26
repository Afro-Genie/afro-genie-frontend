import React from 'react';
import { Music } from 'lucide-react';

interface Release {
  id: string;
  title: string;
  type: string;
  status: string;
  releaseDate: string;
  coverImageUrl?: string;
  trackCount: number;
}

interface AlbumGridProps {
  releases: Release[];
  loading?: boolean;
}

const AlbumGrid: React.FC<AlbumGridProps> = ({ releases, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-72 bg-gray-800/50 border border-gray-700/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-12 text-center text-gray-400">
        <Music className="w-12 h-12 mx-auto mb-3 text-gray-600" />
        <p>No releases yet. Create your first release!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {releases.map((release) => {
        const year = release.releaseDate ? new Date(release.releaseDate).getFullYear() : '—';
        return (
          <div
            key={release.id}
            className="group bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:border-green-500/30 hover:bg-gray-800/80 transition-all cursor-pointer"
          >
            <div className="w-full aspect-square bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-lg transition-all overflow-hidden">
              {release.coverImageUrl ? (
                <img src={release.coverImageUrl} alt={release.title} className="w-full h-full object-cover" />
              ) : (
                <Music size={48} className="text-white/50" />
              )}
            </div>
            <h3 className="font-semibold text-white truncate group-hover:text-green-400 transition-colors">
              {release.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{year}</p>
            <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Type</span>
                <span className="font-medium text-gray-300">{release.type}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Tracks</span>
                <span className="font-medium text-white">{release.trackCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Status</span>
                <span className={`font-medium ${
                  release.status === 'PUBLISHED' ? 'text-green-400' :
                  release.status === 'SCHEDULED' ? 'text-blue-400' :
                  'text-yellow-400'
                }`}>{release.status}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AlbumGrid;
