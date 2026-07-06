import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import lyricAPIService from '../../services/lyricAPIService';
import lyricDataProcessor from '../../services/lyricDataProcessor';
import { saveFullSongPackage, updateFullSongPackage } from '../../services/firebaseService';
import DuplicateResolver from '../../components/admin/DuplicateResolver';
import type { APISearchResult, FullSongData, DuplicateCheckResult, Song } from '../../types';

interface ImportProgress {
  total: number;
  completed: number;
  current?: string;
  errors: string[];
}

const LyricImporter: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [focusAfrican, setFocusAfrican] = useState(true);
  const [searchResults, setSearchResults] = useState<APISearchResult[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [previewSong, setPreviewSong] = useState<APISearchResult | null>(null);
  const [previewData, setPreviewData] = useState<FullSongData | null>(null);
  const [duplicateResolve, setDuplicateResolve] = useState<{
    existingSong: any;
    newData: FullSongData;
    resultId: string;
  } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearchResults([]);
    setSelectedSongs(new Set());

    try {
      const results = await lyricAPIService.searchSongs(searchQuery, focusAfrican);
      setSearchResults(results);
    } catch (error: any) {
      alert('Search failed: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (songId: string) => {
    const newSelected = new Set(selectedSongs);
    if (newSelected.has(songId)) {
      newSelected.delete(songId);
    } else {
      newSelected.add(songId);
    }
    setSelectedSongs(newSelected);
  };

  const handlePreview = async (result: APISearchResult) => {
    setPreviewSong(result);
    setLoading(true);

    try {
      const fullData = await lyricAPIService.fetchFullSongData(result);
      setPreviewData(fullData);
    } catch (error: any) {
      alert('Failed to load preview: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const [pendingDuplicates, setPendingDuplicates] = useState<Map<string, { result: APISearchResult; fullData: FullSongData; duplicateCheck: DuplicateCheckResult }>>(new Map());
  const [isWaitingForDuplicate, setIsWaitingForDuplicate] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<ImportProgress | null>(null);

  const handleImport = async () => {
    if (selectedSongs.size === 0 || !user) {
      alert('Please select songs to import and ensure you are logged in');
      return;
    }

    setImporting(true);
    const selectedResults = searchResults.filter(r => selectedSongs.has(r.id));
    const progress: ImportProgress = {
      total: selectedResults.length,
      completed: 0,
      errors: []
    };
    setProgress(progress);
    setCurrentProgress(progress);
    setPendingDuplicates(new Map());

    for (let i = 0; i < selectedResults.length; i++) {
      const result = selectedResults[i];
      progress.current = `${result.title} by ${result.artist}`;
      setProgress({ ...progress });

      try {
        // Fetch full data
        const fullData = await lyricAPIService.fetchFullSongData(result);

        // Check for duplicates
        const duplicateCheck = await lyricDataProcessor.checkForDuplicates(fullData);

        if (duplicateCheck.isDuplicate && duplicateCheck.existingSong) {
          // Store duplicate for resolution
          setPendingDuplicates(prev => {
            const newMap = new Map(prev);
            newMap.set(result.id, { result, fullData, duplicateCheck });
            return newMap;
          });

          // Show duplicate resolver and wait
          setIsWaitingForDuplicate(true);
          setDuplicateResolve({
            existingSong: duplicateCheck.existingSong,
            newData: fullData,
            resultId: result.id
          });

          // Break and wait for user resolution
          break;
        }

        // No duplicate - proceed with import
        await importSong(result, fullData, progress, 'new');
      } catch (error: any) {
        progress.errors.push(`${result.title}: ${error.message}`);
        setProgress({ ...progress });
      }
    }

    // If no duplicates were found, finish import
    if (pendingDuplicates.size === 0 && !isWaitingForDuplicate) {
      finishImport(progress);
    }
  };

  const importSong = async (
    result: APISearchResult,
    fullData: FullSongData,
    progress: ImportProgress,
    strategy: 'new' | 'replace' | 'merge' = 'new',
    existingSong?: Song
  ) => {
    try {
      const prepared = await lyricDataProcessor.prepareForSave(fullData, strategy, existingSong);

      let saveResult;
      if (strategy === 'replace' || strategy === 'merge') {
        if (!existingSong) {
          throw new Error('Existing song required for replace/merge strategy');
        }
        saveResult = await updateFullSongPackage(
          existingSong.id,
          prepared.song,
          prepared.artist,
          prepared.lyrics,
          user!.uid
        );
      } else {
        saveResult = await saveFullSongPackage(
          prepared.song,
          prepared.artist,
          prepared.lyrics,
          user!.uid,
          'en',
          'en',
          prepared.metadata
        );
      }

      if (saveResult.success) {
        progress.completed++;
      } else {
        progress.errors.push(`${result.title}: ${saveResult.error}`);
      }
    } catch (error: any) {
      progress.errors.push(`${result.title}: ${error.message}`);
    }
    setProgress({ ...progress });
  };

  const finishImport = (progress: ImportProgress) => {
    setImporting(false);
    setProgress(null);
    setIsWaitingForDuplicate(false);
    alert(`Import complete! ${progress.completed} songs imported, ${progress.errors.length} errors.`);
    setSelectedSongs(new Set());
  };

  const handleDuplicateResolve = async (strategy: 'skip' | 'replace' | 'merge' | 'create') => {
    if (!duplicateResolve || !user || !currentProgress) return;

    const { existingSong, newData, resultId } = duplicateResolve;
    const pending = pendingDuplicates.get(resultId);
    if (!pending) {
      setDuplicateResolve(null);
      setIsWaitingForDuplicate(false);
      return;
    }

    const progress = currentProgress;

    try {
      if (strategy === 'skip') {
        progress.errors.push(`Skipped ${pending.result.title} - duplicate`);
      } else if (strategy === 'replace') {
        await importSong(pending.result, newData, progress, 'replace', existingSong);
      } else if (strategy === 'merge') {
        await importSong(pending.result, newData, progress, 'merge', existingSong);
      } else if (strategy === 'create') {
        const modifiedData = {
          ...newData,
          song: { ...newData.song, title: `${newData.song.title} (2)` }
        };
        await importSong(pending.result, modifiedData, progress, 'new');
      }
    } catch (error: any) {
      progress.errors.push(`${pending.result.title}: ${error.message}`);
      setProgress({ ...progress });
    }

    // Remove from pending and close resolver
    setPendingDuplicates(prev => {
      const newMap = new Map(prev);
      newMap.delete(resultId);
      return newMap;
    });
    setDuplicateResolve(null);
    setIsWaitingForDuplicate(false);

    // Continue with remaining imports
    const remainingResults = searchResults.filter(r => 
      selectedSongs.has(r.id) && 
      !pendingDuplicates.has(r.id) &&
      r.id !== resultId
    );

    if (remainingResults.length === 0) {
      finishImport(progress);
    } else {
      // Continue importing remaining songs
      for (const result of remainingResults) {
        try {
          const fullData = await lyricAPIService.fetchFullSongData(result);
          const duplicateCheck = await lyricDataProcessor.checkForDuplicates(fullData);

          if (duplicateCheck.isDuplicate && duplicateCheck.existingSong) {
            setPendingDuplicates(prev => {
              const newMap = new Map(prev);
              newMap.set(result.id, { result, fullData, duplicateCheck });
              return newMap;
            });
            setIsWaitingForDuplicate(true);
            setDuplicateResolve({
              existingSong: duplicateCheck.existingSong,
              newData: fullData,
              resultId: result.id
            });
            break;
          }

          await importSong(result, fullData, progress, 'new');
        } catch (error: any) {
          progress.errors.push(`${result.title}: ${error.message}`);
          setProgress({ ...progress });
        }
      }

      if (pendingDuplicates.size === 0) {
        finishImport(progress);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Lyric Importer</h1>
        <p className="text-gray-400">Search and import songs from multiple APIs with full data packages</p>
      </div>

      {/* Search Section */}
      <div className="bg-[#1a2922] rounded-lg p-6 mb-6 border border-gray-700">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search for Songs
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter song title or artist name..."
              className="w-full px-4 py-3 bg-[#0d1612] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="focus-african"
              checked={focusAfrican}
              onChange={(e) => setFocusAfrican(e.target.checked)}
              className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
            />
            <label htmlFor="focus-african" className="text-sm text-gray-300">
              Focus on African Artists
            </label>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="px-6 py-3 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {searchResults.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Results ({searchResults.length})
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {selectedSongs.size} selected
              </span>
              <button
                onClick={() => setSelectedSongs(new Set(searchResults.map(r => r.id)))}
                className="text-sm text-green-400 hover:text-green-300"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedSongs(new Set())}
                className="text-sm text-gray-400 hover:text-gray-300"
              >
                Clear Selection
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className={`bg-[#1a2922] rounded-lg p-4 border-2 transition-all ${
                  selectedSongs.has(result.id)
                    ? 'border-green-500'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedSongs.has(result.id)}
                    onChange={() => handleToggleSelect(result.id)}
                    className="mt-1 w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{result.title}</h3>
                        <p className="text-sm text-gray-400 truncate">{result.artist}</p>
                        {result.album && (
                          <p className="text-xs text-gray-500 mt-1">Album: {result.album}</p>
                        )}
                      </div>
                      {result.image && (
                        <img
                          src={result.image}
                          alt={result.title}
                          className="w-16 h-16 object-cover rounded flex-shrink-0"
                        />
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded">
                        {result.source}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(result.confidence * 100)}% match
                      </span>
                      {result.metadata.african_score && (
                        <span className="text-xs px-2 py-1 bg-green-900/50 text-green-300 rounded">
                          African: {(result.metadata.african_score as number).toFixed(0)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handlePreview(result)}
                      className="mt-3 text-sm text-green-400 hover:text-green-300"
                    >
                      Preview Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Import Button */}
          {selectedSongs.size > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleImport}
                disabled={importing || !user}
                className="px-8 py-3 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                {importing ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-pulse" />
                    Importing...
                  </span>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import {selectedSongs.size} Song{selectedSongs.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Progress Modal */}
      {progress && importing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a2922] rounded-xl p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Importing Songs</h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Progress</span>
                <span>{progress.completed} / {progress.total}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
            </div>
            {progress.current && (
              <p className="text-sm text-gray-300 mb-4">Processing: {progress.current}</p>
            )}
            {progress.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto">
                <p className="text-xs text-red-400 mb-2">Errors:</p>
                {progress.errors.map((error, idx) => (
                  <p key={idx} className="text-xs text-red-300">{error}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewSong && previewData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2922] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-white">Song Preview</h3>
              <button
                onClick={() => {
                  setPreviewSong(null);
                  setPreviewData(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-1">Title</h4>
                <p className="text-white">{previewData.song.title}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-1">Artist</h4>
                <p className="text-white">{previewData.song.artist}</p>
              </div>
              {previewData.metadata.album && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-1">Album</h4>
                  <p className="text-white">{previewData.metadata.album}</p>
                </div>
              )}
              {previewData.metadata.year && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-1">Year</h4>
                  <p className="text-white">{previewData.metadata.year}</p>
                </div>
              )}
              {previewData.lyrics && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-1">Lyrics</h4>
                  <div className="bg-[#0d1612] rounded p-3 text-sm text-gray-300 max-h-64 overflow-y-auto whitespace-pre-wrap">
                    {previewData.lyrics.substring(0, 500)}
                    {previewData.lyrics.length > 500 && '...'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Resolver */}
      {duplicateResolve && (
        <DuplicateResolver
          existingSong={duplicateResolve.existingSong}
          newData={duplicateResolve.newData}
          onResolve={handleDuplicateResolve}
          onCancel={() => setDuplicateResolve(null)}
        />
      )}
    </div>
  );
};

export default LyricImporter;

