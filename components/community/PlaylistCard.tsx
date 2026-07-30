import React, { useState } from 'react';
import type { ExplorePlaylists } from '../../types';

interface PlaylistCardProps {
  playlist: ExplorePlaylists;
  onLike?: (playlistId: string) => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = React.memo(({ playlist, onLike }) => {
  const [liked, setLiked] = useState(false);

  const handleLike = () => {
    setLiked(!liked);
    onLike?.(playlist.id);
  };

  return (
    <div className="bg-gray-800/50 hover:bg-gray-700/50 transition-colors duration-200 rounded-lg overflow-hidden border border-gray-700 group">
      <div className="relative w-full h-36 overflow-hidden">
        {playlist.imageUrl ? (
          <img src={playlist.imageUrl} alt={playlist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-900 to-gray-800 flex items-center justify-center">
            <svg className="w-12 h-12 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-white font-semibold text-sm truncate">{playlist.name}</h3>
        <p className="text-gray-400 text-xs mt-0.5 truncate">{playlist.creatorName || 'Unknown'}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
          </span>
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-xs transition-colors ${
              liked ? 'text-green-500' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {playlist.likeCount + (liked ? 1 : 0)}
          </button>
        </div>
      </div>
    </div>
  );
});

export default PlaylistCard;
