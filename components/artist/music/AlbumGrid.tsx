import React from 'react';
import { Music, Pencil, Trash2, Globe } from 'lucide-react';
import { toMediaUrl } from '../../../lib/apiBase';

interface Release {
  id: string;
  title: string;
  type: string;
  status: string;
  releaseDate: string | null;
  coverImageUrl?: string;
  trackCount: number;
}

interface AlbumGridProps {
  releases: Release[];
  loading?: boolean;
  onEdit: (release: Release) => void;
  onDelete: (release: Release) => void;
  onPublish: (release: Release) => void;
}

const AlbumGrid: React.FC<AlbumGridProps> = ({ releases, loading, onEdit, onDelete, onPublish }) => {
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
            className="group bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:border-green-500/30 hover:bg-gray-800/80 transition-all"
          >
            <div className="relative w-full aspect-square bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-lg transition-all overflow-hidden">
              {release.coverImageUrl ? (
                <img src={toMediaUrl(release.coverImageUrl)} alt={release.title} className="w-full h-full object-cover" />
              ) : (
                <Music size={48} className="text-white/50" />
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(release)}
                  title="Edit release"
                  className="p-2 bg-gray-900/80 hover:bg-gray-900 text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(release)}
                  title="Delete release"
                  className="p-2 bg-gray-900/80 hover:bg-red-600/80 text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
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
            {!release.trackCount || release.trackCount > 0 ? (
              release.status !== 'PUBLISHED' ? (
                <button
                  type="button"
                  onClick={() => onPublish(release)}
                  title="Publish now"
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600/20 border border-green-600/40 text-green-400 hover:bg-green-600 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Globe size={14} />
                  {release.status === 'SCHEDULED' ? 'Publish now' : 'Publish to fans'}
                </button>
              ) : (
                <div className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-green-500/80 border border-green-500/20">
                  <Globe size={14} />
                  Live
                </div>
              )
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default AlbumGrid;
