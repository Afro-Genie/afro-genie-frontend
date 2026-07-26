import React from 'react';
import { ListMusic, Users } from 'lucide-react';

interface Release {
  id: string;
  title: string;
  type: string;
  status: string;
  trackCount: number;
  description?: string;
  followerCount?: number;
}

interface PlaylistListProps {
  singles: Release[];
  loading?: boolean;
  onAddTracks: (releaseId: string) => void;
}

const PlaylistList: React.FC<PlaylistListProps> = ({ singles, loading, onAddTracks }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-800/50 border border-gray-700/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (singles.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-12 text-center text-gray-400">
        <ListMusic className="w-12 h-12 mx-auto mb-3 text-gray-600" />
        <p>No singles or EPs yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {singles.map((release) => (
        <div
          key={release.id}
          className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:border-green-500/30 hover:bg-gray-800/80 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-green-600 group-hover:to-green-700 transition-all">
              <ListMusic size={32} className="text-gray-400 group-hover:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white mb-1 group-hover:text-green-400 transition-colors truncate">
                {release.title}
              </h3>
              <p className="text-sm text-gray-400 mb-1">{release.type}</p>
              {release.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{release.description}</p>
              )}
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Tracks:</span>
                  <span className="font-medium text-white">{release.trackCount}</span>
                </div>
                {release.followerCount !== undefined && (
                  <div className="flex items-center gap-1">
                    <Users size={14} className="text-gray-400" />
                    <span className="font-medium text-white">{release.followerCount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users size={14} className="text-gray-400" />
                  <span className={`font-medium ${
                    release.status === 'PUBLISHED' ? 'text-green-400' :
                    release.status === 'SCHEDULED' ? 'text-blue-400' :
                    'text-yellow-400'
                  }`}>{release.status}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onAddTracks(release.id)}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
            >
              + Tracks
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlaylistList;
