import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getAllTranslations,
  getAllSongs,
  getAllArtists,
  saveTranslation,
  updateTranslation,
  deleteTranslation,
  approveTranslation,
  rejectTranslation,
  saveFullSongPackage,
  updateFullSongPackage,
  addSong,
  getSong
} from '../../services/firebaseService';
import lyricAPIService from '../../services/lyricAPIService';
import lyricDataProcessor from '../../services/lyricDataProcessor';
import DuplicateResolver from '../../components/admin/DuplicateResolver';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { Translation, Song, Artist, APISearchResult, FullSongData } from '../../types';

type TabType = 'all' | 'manual' | 'api' | 'requests' | 'translations';

interface ImportProgress {
  total: number;
  completed: number;
  current?: string;
  errors: string[];
}

const LyricsManager: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(true);
  
  // All Lyrics tab state
  const [allTranslations, setAllTranslations] = useState<Translation[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'published'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'api' | 'user_request'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Manual Upload tab state
  const [manualForm, setManualForm] = useState({
    songId: '',
    title: '',
    artist: '',
    artistId: '',
    originalLyrics: '',
    translatedLyrics: '',
    culturalContext: '',
    sourceLang: 'en',
    targetLang: 'en',
    linkToExisting: false
  });
  
  // API Import tab state
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [focusAfrican, setFocusAfrican] = useState(true);
  const [apiSearchResults, setApiSearchResults] = useState<APISearchResult[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [duplicateResolve, setDuplicateResolve] = useState<{
    existingSong: any;
    newData: FullSongData;
    resultId: string;
  } | null>(null);
  
  // User Requests tab state
  const [pendingRequests, setPendingRequests] = useState<Translation[]>([]);
  
  // Translations tab state
  const [allTranslationRecords, setAllTranslationRecords] = useState<Translation[]>([]);
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [translationsData, songsData, artistsData] = await Promise.all([
        getAllTranslations(),
        getAllSongs(),
        getAllArtists()
      ]);
      
      setAllTranslations(translationsData);
      setSongs(songsData);
      setArtists(artistsData);
      
      if (activeTab === 'requests') {
        const pending = translationsData.filter(t => t.status === 'pending' || !t.status);
        setPendingRequests(pending);
      }
      
      if (activeTab === 'translations') {
        setAllTranslationRecords(translationsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSongTitle = (songId: string) => {
    const song = songs.find(s => s.id === songId);
    return song ? song.title : 'Unknown Song';
  };

  const getSongArtist = (songId: string) => {
    const song = songs.find(s => s.id === songId);
    return song ? song.artist : 'Unknown Artist';
  };

  const filteredTranslations = allTranslations.filter(t => {
    const matchesSearch = !searchQuery || 
      getSongTitle(t.songId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSongArtist(t.songId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.originalLyrics.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter || (!t.status && statusFilter === 'pending');
    const matchesSource = sourceFilter === 'all' || t.source === sourceFilter || (!t.source && sourceFilter === 'all');
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  const handleBulkApprove = async () => {
    if (!user || selectedIds.size === 0) return;
    
    for (const id of selectedIds) {
      try {
        await approveTranslation(id, user.uid);
      } catch (error) {
        console.error(`Error approving ${id}:`, error);
      }
    }
    
    setSelectedIds(new Set());
    fetchData();
  };

  const handleBulkReject = async () => {
    if (!user || selectedIds.size === 0) return;
    
    const reason = prompt('Enter rejection reason (optional):');
    
    for (const id of selectedIds) {
      try {
        await rejectTranslation(id, user.uid, reason || undefined);
      } catch (error) {
        console.error(`Error rejecting ${id}:`, error);
      }
    }
    
    setSelectedIds(new Set());
    fetchData();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} translation(s)?`)) return;
    
    for (const id of selectedIds) {
      try {
        await deleteTranslation(id);
      } catch (error) {
        console.error(`Error deleting ${id}:`, error);
      }
    }
    
    setSelectedIds(new Set());
    fetchData();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      let songId = manualForm.songId;
      
      // Create song if linking to new
      if (!manualForm.linkToExisting || !songId) {
        const newSong = await addSong({
          title: manualForm.title,
          artist: manualForm.artist,
          artistId: manualForm.artistId || '',
          image: '',
          lyrics: '',
          language: manualForm.sourceLang
        });
        songId = newSong.id;
      }
      
      // Save translation
      await saveTranslation({
        songId,
        userId: user.uid,
        originalLyrics: manualForm.originalLyrics,
        translatedLyrics: manualForm.translatedLyrics,
        culturalContext: manualForm.culturalContext,
        sourceLang: manualForm.sourceLang,
        targetLang: manualForm.targetLang,
        status: 'approved',
        source: 'manual'
      });
      
      // Reset form
      setManualForm({
        songId: '',
        title: '',
        artist: '',
        artistId: '',
        originalLyrics: '',
        translatedLyrics: '',
        culturalContext: '',
        sourceLang: 'en',
        targetLang: 'en',
        linkToExisting: false
      });
      
      alert('Lyrics saved successfully!');
      fetchData();
    } catch (error: any) {
      alert('Error saving lyrics: ' + error.message);
    }
  };

  const handleApiSearch = async () => {
    if (!apiSearchQuery.trim()) return;
    
    setLoading(true);
    try {
      const results = await lyricAPIService.searchSongs(apiSearchQuery, focusAfrican);
      setApiSearchResults(results);
    } catch (error: any) {
      alert('Search failed: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleApiImport = async () => {
    if (selectedSongs.size === 0 || !user) {
      alert('Please select songs to import and ensure you are logged in');
      return;
    }

    setImporting(true);
    const selectedResults = apiSearchResults.filter(r => selectedSongs.has(r.id));
    const progress: ImportProgress = {
      total: selectedResults.length,
      completed: 0,
      errors: []
    };
    setProgress(progress);

    for (let i = 0; i < selectedResults.length; i++) {
      const result = selectedResults[i];
      progress.current = `${result.title} by ${result.artist}`;
      setProgress({ ...progress });

      try {
        const fullData = await lyricAPIService.fetchFullSongData(result);
        const duplicateCheck = await lyricDataProcessor.checkForDuplicates(fullData);

        if (duplicateCheck.isDuplicate && duplicateCheck.existingSong) {
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

    if (!duplicateResolve) {
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
    if (!user) return;
    
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
          user.uid
        );
      } else {
        saveResult = await saveFullSongPackage(
          prepared.song,
          prepared.artist,
          prepared.lyrics,
          user.uid,
          fullData.metadata.language || 'en',
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
    alert(`Import complete! ${progress.completed} songs imported, ${progress.errors.length} errors.`);
    setSelectedSongs(new Set());
    fetchData();
  };

  const handleDuplicateResolve = async (strategy: 'skip' | 'replace' | 'merge' | 'create') => {
    if (!duplicateResolve || !user || !progress) return;

    const { existingSong, newData, resultId } = duplicateResolve;
    const result = apiSearchResults.find(r => r.id === resultId);
    if (!result) {
      setDuplicateResolve(null);
      return;
    }

    const currentProgress = { ...progress };

    try {
      if (strategy === 'skip') {
        currentProgress.errors.push(`Skipped ${result.title} - duplicate`);
      } else if (strategy === 'replace') {
        await importSong(result, newData, currentProgress, 'replace', existingSong);
      } else if (strategy === 'merge') {
        await importSong(result, newData, currentProgress, 'merge', existingSong);
      } else if (strategy === 'create') {
        const modifiedData = {
          ...newData,
          song: { ...newData.song, title: `${newData.song.title} (2)` }
        };
        await importSong(result, modifiedData, currentProgress, 'new');
      }
    } catch (error: any) {
      currentProgress.errors.push(`${result.title}: ${error.message}`);
    }

    setProgress({ ...currentProgress });
    setDuplicateResolve(null);
    
    // Continue with remaining imports
    const remainingResults = apiSearchResults.filter(r => 
      selectedSongs.has(r.id) && r.id !== resultId
    );

    if (remainingResults.length === 0) {
      finishImport(currentProgress);
    } else {
      // Continue importing
      for (const remainingResult of remainingResults) {
        try {
          const fullData = await lyricAPIService.fetchFullSongData(remainingResult);
          const duplicateCheck = await lyricDataProcessor.checkForDuplicates(fullData);

          if (duplicateCheck.isDuplicate && duplicateCheck.existingSong) {
            setDuplicateResolve({
              existingSong: duplicateCheck.existingSong,
              newData: fullData,
              resultId: remainingResult.id
            });
            return;
          }

          await importSong(remainingResult, fullData, currentProgress, 'new');
        } catch (error: any) {
          currentProgress.errors.push(`${remainingResult.title}: ${error.message}`);
          setProgress({ ...currentProgress });
        }
      }
      finishImport(currentProgress);
    }
  };

  const handleApproveRequest = async (translationId: string) => {
    if (!user) return;
    try {
      await approveTranslation(translationId, user.uid);
      fetchData();
    } catch (error: any) {
      alert('Error approving request: ' + error.message);
    }
  };

  const handleRejectRequest = async (translationId: string) => {
    if (!user) return;
    const reason = prompt('Enter rejection reason (optional):');
    try {
      await rejectTranslation(translationId, user.uid, reason || undefined);
      fetchData();
    } catch (error: any) {
      alert('Error rejecting request: ' + error.message);
    }
  };

  const handleEditTranslation = async (translation: Translation) => {
    setEditingTranslation(translation);
  };

  const handleSaveTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTranslation) return;
    
    try {
      await updateTranslation(editingTranslation.id!, {
        originalLyrics: editingTranslation.originalLyrics,
        translatedLyrics: editingTranslation.translatedLyrics,
        culturalContext: editingTranslation.culturalContext,
        sourceLang: editingTranslation.sourceLang,
        targetLang: editingTranslation.targetLang
      });
      setEditingTranslation(null);
      fetchData();
      alert('Translation updated successfully!');
    } catch (error: any) {
      alert('Error updating translation: ' + error.message);
    }
  };

  if (loading && activeTab === 'all') {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Lyrics Manager</h1>
          <p className="text-gray-400 mt-1">Unified interface for managing all lyrics and translations</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 rounded-lg p-2 flex space-x-2">
        {[
          { id: 'all', label: 'All Lyrics' },
          { id: 'manual', label: 'Manual Upload' },
          { id: 'api', label: 'API Import' },
          { id: 'requests', label: 'User Requests' },
          { id: 'translations', label: 'Translations' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-green-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* All Lyrics Tab */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-400 mb-1">Where to Find Imported Data</h4>
                <p className="text-sm text-gray-300">
                  All imported songs, artists, and genres from API sync jobs are stored here. Songs imported with lyrics appear in this "All Lyrics" tab. 
                  You can filter by source (API, Manual, User Request) using the filters below. Imported data is also accessible from the Artists, Songs, and Genres sections in the admin panel.
                </p>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Search songs, artists, or lyrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="published">Published</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Sources</option>
                <option value="manual">Manual</option>
                <option value="api">API</option>
                <option value="user_request">User Request</option>
              </select>
              {selectedIds.size > 0 && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleBulkApprove}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                  >
                    Approve ({selectedIds.size})
                  </button>
                  <button
                    onClick={handleBulkReject}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md"
                  >
                    Reject ({selectedIds.size})
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
                  >
                    Delete ({selectedIds.size})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredTranslations.length && filteredTranslations.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filteredTranslations.map(t => t.id!)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-white">Song</th>
                  <th className="px-4 py-3 text-left text-white">Artist</th>
                  <th className="px-4 py-3 text-left text-white">Source</th>
                  <th className="px-4 py-3 text-left text-white">Status</th>
                  <th className="px-4 py-3 text-left text-white">Languages</th>
                  <th className="px-4 py-3 text-left text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredTranslations.map((translation) => (
                  <tr key={translation.id} className="hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(translation.id!)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedIds);
                          if (e.target.checked) {
                            newSelected.add(translation.id!);
                          } else {
                            newSelected.delete(translation.id!);
                          }
                          setSelectedIds(newSelected);
                        }}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3 text-white">{getSongTitle(translation.songId)}</td>
                    <td className="px-4 py-3 text-gray-300">{getSongArtist(translation.songId)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        translation.source === 'manual' ? 'bg-blue-600' :
                        translation.source === 'api' ? 'bg-purple-600' :
                        translation.source === 'user_request' ? 'bg-orange-600' :
                        'bg-gray-600'
                      } text-white`}>
                        {translation.source || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        translation.status === 'approved' ? 'bg-green-600' :
                        translation.status === 'pending' || !translation.status ? 'bg-yellow-600' :
                        translation.status === 'rejected' ? 'bg-red-600' :
                        'bg-gray-600'
                      } text-white`}>
                        {translation.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {translation.sourceLang} → {translation.targetLang}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTranslation(translation)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTranslation(translation.id!).then(() => fetchData())}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTranslations.length === 0 && (
              <div className="p-8 text-center text-gray-400">No lyrics found</div>
            )}
          </div>
        </div>
      )}

      {/* Manual Upload Tab */}
      {activeTab === 'manual' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Manual Upload</h2>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="link-existing"
                checked={manualForm.linkToExisting}
                onChange={(e) => setManualForm({ ...manualForm, linkToExisting: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="link-existing" className="text-gray-300">Link to existing song</label>
            </div>

            {manualForm.linkToExisting ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Select Song</label>
                <select
                  value={manualForm.songId}
                  onChange={(e) => setManualForm({ ...manualForm, songId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  required
                >
                  <option value="">Select a song...</option>
                  {songs.map(song => (
                    <option key={song.id} value={song.id}>{song.title} by {song.artist}</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Song Title</label>
                    <input
                      type="text"
                      value={manualForm.title}
                      onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      required={!manualForm.linkToExisting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Artist</label>
                    <input
                      type="text"
                      value={manualForm.artist}
                      onChange={(e) => setManualForm({ ...manualForm, artist: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      required={!manualForm.linkToExisting}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Artist ID (optional)</label>
                  <input
                    type="text"
                    value={manualForm.artistId}
                    onChange={(e) => setManualForm({ ...manualForm, artistId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Source Language</label>
                <select
                  value={manualForm.sourceLang}
                  onChange={(e) => setManualForm({ ...manualForm, sourceLang: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                >
                  <option value="en">English</option>
                  <option value="yo">Yoruba</option>
                  <option value="ig">Igbo</option>
                  <option value="ha">Hausa</option>
                  <option value="pidgin">Nigerian Pidgin</option>
                  <option value="sw">Swahili</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Target Language</label>
                <select
                  value={manualForm.targetLang}
                  onChange={(e) => setManualForm({ ...manualForm, targetLang: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Original Lyrics</label>
              <textarea
                value={manualForm.originalLyrics}
                onChange={(e) => setManualForm({ ...manualForm, originalLyrics: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Translated Lyrics</label>
              <textarea
                value={manualForm.translatedLyrics}
                onChange={(e) => setManualForm({ ...manualForm, translatedLyrics: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cultural Context (optional)</label>
              <textarea
                value={manualForm.culturalContext}
                onChange={(e) => setManualForm({ ...manualForm, culturalContext: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
            >
              Save Lyrics
            </button>
          </form>
        </div>
      )}

      {/* API Import Tab */}
      {activeTab === 'api' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">API Import</h2>
            <div className="flex gap-4 items-end mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={apiSearchQuery}
                  onChange={(e) => setApiSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleApiSearch()}
                  placeholder="Enter song title or artist name..."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="focus-african"
                  checked={focusAfrican}
                  onChange={(e) => setFocusAfrican(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="focus-african" className="text-gray-300">Focus on African Artists</label>
              </div>
              <button
                onClick={handleApiSearch}
                disabled={loading || !apiSearchQuery.trim()}
                className="px-6 py-3 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-white font-semibold rounded-lg"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {apiSearchResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Found {apiSearchResults.length} results</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedSongs(new Set(apiSearchResults.map(r => r.id)))}
                      className="text-sm text-green-400 hover:text-green-300"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedSongs(new Set())}
                      className="text-sm text-gray-400 hover:text-gray-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {apiSearchResults.map((result) => (
                    <div
                      key={result.id}
                      className={`bg-gray-700 rounded-lg p-4 border-2 ${
                        selectedSongs.has(result.id) ? 'border-green-500' : 'border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedSongs.has(result.id)}
                          onChange={() => {
                            const newSelected = new Set(selectedSongs);
                            if (newSelected.has(result.id)) {
                              newSelected.delete(result.id);
                            } else {
                              newSelected.add(result.id);
                            }
                            setSelectedSongs(newSelected);
                          }}
                          className="mt-1 w-4 h-4"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{result.title}</h3>
                          <p className="text-sm text-gray-400">{result.artist}</p>
                          <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded mt-2 inline-block">
                            {result.source}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedSongs.size > 0 && (
                  <button
                    onClick={handleApiImport}
                    disabled={importing}
                    className="w-full px-6 py-3 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-white font-bold rounded-lg"
                  >
                    {importing ? 'Importing...' : `Import ${selectedSongs.size} Song(s)`}
                  </button>
                )}
              </div>
            )}
          </div>

          {progress && importing && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Import Progress</h3>
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
          )}
        </div>
      )}

      {/* User Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold text-white mb-4">Pending User Requests ({pendingRequests.length})</h2>
            {pendingRequests.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No pending requests</div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{getSongTitle(request.songId)}</h3>
                        <p className="text-gray-400">{getSongArtist(request.songId)}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Requested by user: {request.userId} | {request.sourceLang} → {request.targetLang}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveRequest(request.id!)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id!)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Original Lyrics</h4>
                        <div className="bg-gray-800 rounded p-3 text-sm text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {request.originalLyrics}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Translated Lyrics</h4>
                        <div className="bg-gray-800 rounded p-3 text-sm text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {request.translatedLyrics}
                        </div>
                      </div>
                    </div>
                    {request.culturalContext && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Cultural Context</h4>
                        <div className="bg-gray-800 rounded p-3 text-sm text-gray-300 whitespace-pre-wrap">
                          {request.culturalContext}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Translations Tab */}
      {activeTab === 'translations' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold text-white mb-4">All Translations ({allTranslationRecords.length})</h2>
            {editingTranslation ? (
              <form onSubmit={handleSaveTranslation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Original Lyrics</label>
                  <textarea
                    value={editingTranslation.originalLyrics}
                    onChange={(e) => setEditingTranslation({ ...editingTranslation, originalLyrics: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Translated Lyrics</label>
                  <textarea
                    value={editingTranslation.translatedLyrics}
                    onChange={(e) => setEditingTranslation({ ...editingTranslation, translatedLyrics: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Cultural Context</label>
                  <textarea
                    value={editingTranslation.culturalContext}
                    onChange={(e) => setEditingTranslation({ ...editingTranslation, culturalContext: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTranslation(null)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                {allTranslationRecords.map((translation) => (
                  <div key={translation.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{getSongTitle(translation.songId)}</h3>
                        <p className="text-gray-400">{getSongArtist(translation.songId)}</p>
                        <p className="text-sm text-gray-500">{translation.sourceLang} → {translation.targetLang}</p>
                      </div>
                      <button
                        onClick={() => handleEditTranslation(translation)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

export default LyricsManager;

