import React from 'react';
import { Music } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  views: number;
  requestCount: number;
  durationMs?: number;
  imageUrl?: string;
}

interface TopTracksProps {
  tracks: Track[];
  loading?: boolean;
}

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

const TopTracks: React.FC<TopTracksProps> = ({ tracks, loading }) => {
  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <div className="h-6 w-48 bg-gray-700 rounded mb-6 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-gray-700/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const top5 = tracks.slice(0, 5);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-6">Your Top Tracks</h2>

      {top5.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No tracks yet. Add your first song in Music.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">#</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Title</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Streams</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Requests</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {top5.map((track, index) => (
                <tr
                  key={track.id}
                  className="border-b border-gray-700/30 hover:bg-gray-700/30 transition-colors"
                >
                  <td className="py-4 px-4 text-center font-semibold text-green-400">{index + 1}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded flex items-center justify-center flex-shrink-0">
                        {track.imageUrl ? (
                          <img src={track.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <Music className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <p className="font-medium text-white truncate">{track.title}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-300">{track.views.toLocaleString()}</td>
                  <td className="py-4 px-4 text-gray-300">{track.requestCount.toLocaleString()}</td>
                  <td className="py-4 px-4 text-gray-300">{formatDuration(track.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TopTracks;
