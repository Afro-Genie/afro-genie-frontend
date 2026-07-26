import React from 'react';
import { Music, Trash2, Edit3 } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  views: number;
  requestCount: number;
  durationMs?: number;
  imageUrl?: string;
  release?: { title: string; status: string } | null;
  createdAt: string;
}

interface SongsTableProps {
  songs: Song[];
  loading?: boolean;
  onAdd: () => void;
  onEdit: (song: Song) => void;
  onDelete: (id: string) => void;
}

const formatDuration = (ms?: number): string => {
  if (!ms) return '—';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const SongsTable: React.FC<SongsTableProps> = ({ songs, loading, onAdd, onEdit, onDelete }) => {
  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
        <div className="p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-gray-700/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
        <h3 className="text-lg font-semibold text-white">Songs</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          + Add Song
        </button>
      </div>

      {songs.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          <Music className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p>No songs yet. Add your first song!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50 bg-gray-800/80">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">#</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Song Title</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Duration</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Streams</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Requests</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Released</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400"></th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song, index) => (
                <tr
                  key={song.id}
                  className="border-b border-gray-700/30 hover:bg-gray-700/30 transition-colors group"
                >
                  <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {song.imageUrl ? (
                          <img src={song.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                            <Music size={14} className="text-gray-500" />
                          </div>
                        )}
                        <span className="font-medium text-white truncate">{song.title}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{formatDuration(song.durationMs)}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{song.views.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-green-400">{song.requestCount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-400">
                      {song.release?.title ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(song)}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(song.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SongsTable;
