import React from 'react';
import type { RecommendedModerator } from '../../types';

interface ModeratorProfileCardProps {
  moderator: RecommendedModerator;
}

const ModeratorProfileCard: React.FC<ModeratorProfileCardProps> = React.memo(({ moderator }) => {
  const initial = moderator.displayName?.[0]?.toUpperCase() || 'M';

  return (
    <div className="bg-gray-800/50 hover:bg-gray-700/50 transition-colors duration-200 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center gap-3 mb-3">
        {moderator.photoUrl ? (
          <img
            src={moderator.photoUrl}
            alt={moderator.displayName || 'Moderator'}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{initial}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">{moderator.displayName || 'Moderator'}</p>
          <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded-full font-medium">
            Moderator
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800 rounded p-2">
          <p className="text-gray-400">Tokens</p>
          <p className="text-white font-semibold">{moderator.tokenBalance}</p>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <p className="text-gray-400">Reports</p>
          <p className="text-white font-semibold">{moderator.reportsResolved}</p>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <p className="text-gray-400">Translations</p>
          <p className="text-white font-semibold">{moderator.translationsApproved}</p>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <p className="text-gray-400">Corrections</p>
          <p className="text-white font-semibold">{moderator.correctionsApproved}</p>
        </div>
      </div>
    </div>
  );
});

export default ModeratorProfileCard;
