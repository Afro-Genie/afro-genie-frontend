import React from 'react';
import type { Song, FullSongData, DuplicateCheckResult } from '../../types';

interface DuplicateResolverProps {
  existingSong: Song;
  newData: FullSongData;
  onResolve: (strategy: 'skip' | 'replace' | 'merge' | 'create') => void;
  onCancel: () => void;
}

const DuplicateResolver: React.FC<DuplicateResolverProps> = ({
  existingSong,
  newData,
  onResolve,
  onCancel
}) => {
  const differences: string[] = [];

  if (existingSong.title !== newData.song.title) {
    differences.push('Title');
  }
  if (existingSong.artist !== newData.song.artist) {
    differences.push('Artist');
  }
  if (existingSong.image !== newData.song.image && newData.song.image) {
    differences.push('Image');
  }
  if (newData.lyrics && newData.lyrics.length > 0) {
    differences.push('Lyrics');
  }
  if (newData.metadata.album) {
    differences.push('Album');
  }
  if (newData.metadata.year) {
    differences.push('Year');
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a2922] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6">Duplicate Song Detected</h2>
        
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
          <p className="text-yellow-200 text-sm">
            A song with similar title and artist already exists in the database. 
            Please choose how to handle this duplicate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Existing Song */}
          <div className="bg-[#0d1612] rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              Existing in Database
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400">Title:</span>
                <p className="text-white font-medium">{existingSong.title}</p>
              </div>
              <div>
                <span className="text-gray-400">Artist:</span>
                <p className="text-white font-medium">{existingSong.artist}</p>
              </div>
              {existingSong.image && (
                <div>
                  <span className="text-gray-400">Image:</span>
                  <img src={existingSong.image} alt={existingSong.title} className="mt-2 w-32 h-32 object-cover rounded" />
                </div>
              )}
            </div>
          </div>

          {/* New Song Data */}
          <div className="bg-[#0d1612] rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              New from API
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400">Title:</span>
                <p className="text-white font-medium">{newData.song.title}</p>
              </div>
              <div>
                <span className="text-gray-400">Artist:</span>
                <p className="text-white font-medium">{newData.song.artist}</p>
              </div>
              {newData.song.image && (
                <div>
                  <span className="text-gray-400">Image:</span>
                  <img src={newData.song.image} alt={newData.song.title} className="mt-2 w-32 h-32 object-cover rounded" />
                </div>
              )}
              {newData.metadata.album && (
                <div>
                  <span className="text-gray-400">Album:</span>
                  <p className="text-white">{newData.metadata.album}</p>
                </div>
              )}
              {newData.metadata.year && (
                <div>
                  <span className="text-gray-400">Year:</span>
                  <p className="text-white">{newData.metadata.year}</p>
                </div>
              )}
              {newData.lyrics && (
                <div>
                  <span className="text-gray-400">Lyrics:</span>
                  <p className="text-white text-xs mt-1 line-clamp-3">{newData.lyrics.substring(0, 100)}...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Differences */}
        {differences.length > 0 && (
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-200 mb-2">Differences Found:</h4>
            <div className="flex flex-wrap gap-2">
              {differences.map((diff, idx) => (
                <span key={idx} className="px-2 py-1 bg-blue-800 text-blue-200 rounded text-xs">
                  {diff}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Choose an action:</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onResolve('skip')}
              className="p-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-left"
            >
              <div className="font-semibold mb-1">Skip</div>
              <div className="text-xs text-gray-400">Don't import this song</div>
            </button>

            <button
              onClick={() => onResolve('replace')}
              className="p-4 bg-red-900/50 hover:bg-red-900/70 border border-red-700 text-white rounded-lg transition-colors text-left"
            >
              <div className="font-semibold mb-1">Replace</div>
              <div className="text-xs text-gray-400">Overwrite existing with new data</div>
            </button>

            <button
              onClick={() => onResolve('merge')}
              className="p-4 bg-blue-900/50 hover:bg-blue-900/70 border border-blue-700 text-white rounded-lg transition-colors text-left"
            >
              <div className="font-semibold mb-1">Merge</div>
              <div className="text-xs text-gray-400">Combine data (prefer new if both exist)</div>
            </button>

            <button
              onClick={() => onResolve('create')}
              className="p-4 bg-green-900/50 hover:bg-green-900/70 border border-green-700 text-white rounded-lg transition-colors text-left"
            >
              <div className="font-semibold mb-1">Create New</div>
              <div className="text-xs text-gray-400">Import as separate entry</div>
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateResolver;


