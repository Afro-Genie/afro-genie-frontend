import React, { useState, useEffect, useMemo } from 'react';
import { 
  SearchIcon, 
  PlusIcon, 
  EditIcon, 
  DeleteIcon,
  PlayIcon,
  PauseIcon,
  RefreshIcon,
  SettingsIcon,
  StatsIcon,
  CheckIcon,
  XIcon,
  AlertIcon
} from '../../components/icons/FlatIcons';
import APIManager from '../../services/apiManager';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { addArtist, addSong, addGenre, saveFullSongPackage } from '../../services/firebaseService';
import lyricAPIService from '../../services/lyricAPIService';
import type { APISearchResult, FullSongData } from '../../types';

interface APIManagementProps {
  onDataImported: () => void;
}

const APIManagement: React.FC<APIManagementProps> = ({ onDataImported }) => {
  const { user } = useAuth();
  const [apiManager] = useState(() => new APIManager());
  const [configs, setConfigs] = useState(apiManager.getConfigs());
  const [dataSources, setDataSources] = useState(apiManager.getDataSourceStatus());
  const [syncJobs, setSyncJobs] = useState(apiManager.getSyncJobs());
  const [cacheStats, setCacheStats] = useState(apiManager.getCacheStats());
  
  const [activeTab, setActiveTab] = useState<'config' | 'search' | 'sync' | 'cache'>('config');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'artist' | 'song' | 'genre'>('artist');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  // New state for enhanced features
  const [dataSource, setDataSource] = useState<'manual' | 'sync'>('manual');
  const [selectedSyncJob, setSelectedSyncJob] = useState<string | null>(null);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<FullSongData | null>(null);
  const [fetchingLyrics, setFetchingLyrics] = useState(false);
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [importProgress, setImportProgress] = useState<string>('');

  // Filter state
  const [filters, setFilters] = useState({
    sources: [] as string[],
    minConfidence: 0,
    maxConfidence: 100,
    artistFilter: '',
    genreFilter: '',
    sortBy: 'confidence' as 'confidence' | 'title' | 'artist' | 'source',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    // Load sync jobs from Firebase on mount
    const loadJobs = async () => {
      if (user) {
        await apiManager.loadSyncJobsFromFirebase(user.uid);
        setSyncJobs(apiManager.getSyncJobs());
      }
    };
    loadJobs();

    // Refresh data periodically
    const interval = setInterval(async () => {
      setDataSources(apiManager.getDataSourceStatus());
      // Reload sync jobs from Firebase to get latest updates
      if (user) {
        await apiManager.loadSyncJobsFromFirebase(user.uid);
      }
      setSyncJobs(apiManager.getSyncJobs());
      setCacheStats(apiManager.getCacheStats());
    }, 5000);

    return () => clearInterval(interval);
  }, [apiManager, user]);

  const handleConfigUpdate = (configId: string, updates: any) => {
    apiManager.updateConfig(configId, updates);
    setConfigs(apiManager.getConfigs());
  };

  const handleAPIKeyUpdate = (configId: string, apiKey: string) => {
    apiManager.setAPIKey(configId, apiKey);
    setApiKeys(prev => ({ ...prev, [configId]: apiKey }));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    try {
      const results = await apiManager.searchAll(searchQuery, searchType);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSync = async (type: 'manual' | 'scheduled' | 'auto' = 'manual') => {
    const jobId = await apiManager.startSyncJob(type, searchQuery, user?.uid);
    setSyncJobs(apiManager.getSyncJobs());
    return jobId;
  };

  // Get current results (from manual search or sync job)
  const currentResults = useMemo(() => {
    if (dataSource === 'sync' && selectedSyncJob) {
      return apiManager.getSyncJobResultsByType(selectedSyncJob, searchType);
    }
    return searchResults;
  }, [dataSource, selectedSyncJob, searchType, searchResults]);

  // Apply filters to results
  const filteredResults = useMemo(() => {
    let filtered = [...currentResults];

    // Filter by source
    if (filters.sources.length > 0) {
      filtered = filtered.filter(r => filters.sources.includes(r.source));
    }

    // Filter by confidence
    const confidencePercent = (r: any) => Math.round((r.confidence || 0) * 100);
    filtered = filtered.filter(r => {
      const conf = confidencePercent(r);
      return conf >= filters.minConfidence && conf <= filters.maxConfidence;
    });

    // Filter by artist name
    if (filters.artistFilter) {
      const artistLower = filters.artistFilter.toLowerCase();
      filtered = filtered.filter(r => 
        (r.artist || '').toLowerCase().includes(artistLower)
      );
    }

    // Filter by genre
    if (filters.genreFilter) {
      const genreLower = filters.genreFilter.toLowerCase();
      filtered = filtered.filter(r => 
        (r.metadata?.genre || '').toLowerCase().includes(genreLower) ||
        (r.genre || '').toLowerCase().includes(genreLower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (filters.sortBy) {
        case 'confidence':
          aVal = a.confidence || 0;
          bVal = b.confidence || 0;
          break;
        case 'title':
          aVal = (a.title || '').toLowerCase();
          bVal = (b.title || '').toLowerCase();
          break;
        case 'artist':
          aVal = (a.artist || '').toLowerCase();
          bVal = (b.artist || '').toLowerCase();
          break;
        case 'source':
          aVal = (a.source || '').toLowerCase();
          bVal = (b.source || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (filters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  }, [currentResults, filters]);

  // Preview handlers
  const handlePreview = async (result: any) => {
    setPreviewItem(result);
    setPreviewData(null);
    
    if (searchType === 'song') {
      // For songs, we'll fetch lyrics on demand when user clicks "Fetch Lyrics"
    }
  };

  const handleFetchLyrics = async () => {
    if (!previewItem || !user) return;
    
    setFetchingLyrics(true);
    try {
      const apiResult: APISearchResult = {
        id: previewItem.id,
        title: previewItem.title,
        artist: previewItem.artist,
        image: previewItem.image,
        source: previewItem.source || 'genius',
        confidence: previewItem.confidence || 0.85,
        metadata: previewItem.metadata || {}
      };

      const fullData = await lyricAPIService.fetchFullSongData(apiResult);
      setPreviewData(fullData);
    } catch (error: any) {
      alert(`Failed to fetch lyrics: ${error.message}`);
    } finally {
      setFetchingLyrics(false);
    }
  };

  // Import handlers
  const handleImportResult = async (result: any, withLyrics: boolean = false) => {
    if (!user) {
      alert('Please log in to import items');
      return;
    }

    setImporting(prev => new Set(prev).add(result.id));
    setImportProgress('Starting import...');

    try {
      if (searchType === 'artist') {
        await addArtist({
          name: result.artist || result.title,
          genre: result.metadata?.genre || 'Afrobeats',
          image: result.image || ''
        });
        setImportProgress('Artist imported successfully');
      } else if (searchType === 'song') {
        if (withLyrics && previewData) {
          // Import with lyrics
          const saveResult = await saveFullSongPackage(
            previewData.song,
            previewData.artist,
            previewData.lyrics || '',
            user.uid,
            previewData.metadata?.language || 'en',
            'en',
            previewData.metadata
          );

          if (!saveResult.success) {
            throw new Error(saveResult.error || 'Failed to save song package');
          }
          setImportProgress('Song with lyrics imported successfully');
        } else {
          // Import without lyrics
          await addSong({
            title: result.title,
            artist: result.artist,
            artistId: '',
            image: result.image || '',
            lyrics: '',
            language: 'English'
          });
          setImportProgress('Song imported successfully');
        }
      } else if (searchType === 'genre') {
        await addGenre({
          name: result.title || result.name,
          image: result.image || ''
        });
        setImportProgress('Genre imported successfully');
      }

      // Remove from results
      setSearchResults(prev => prev.filter(r => r.id !== result.id));
      setSelectedResults(prev => {
        const newSet = new Set(prev);
        newSet.delete(result.id);
        return newSet;
      });
      
      // Show success message with location info
      const itemType = searchType === 'artist' ? 'artist' : searchType === 'song' ? 'song' : 'genre';
      alert(`Successfully imported ${itemType}!\n\nYou can find it in:\n- Songs section (for songs with lyrics)\n- Artists/Songs/Genres sections in the admin panel`);
      
      onDataImported();
    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Import failed: ${error.message || 'Unknown error'}`);
    } finally {
      setImporting(prev => {
        const newSet = new Set(prev);
        newSet.delete(result.id);
        return newSet;
      });
      setImportProgress('');
    }
  };

  const handleBulkImport = async () => {
    if (!user || selectedResults.size === 0) return;

    const itemsToImport = filteredResults.filter(r => selectedResults.has(r.id));
    setImportProgress(`Importing ${itemsToImport.length} items...`);

    for (const item of itemsToImport) {
      try {
        await handleImportResult(item, false);
      } catch (error) {
        console.error(`Failed to import ${item.title}:`, error);
      }
    }

    setSelectedResults(new Set());
    setImportProgress('');
    alert(`Bulk import complete! ${itemsToImport.length} items processed.\n\nYou can find imported items in:\n- Songs section (for songs with lyrics)\n- Artists/Songs/Genres sections in the admin panel`);
  };

  const toggleResultSelection = (resultId: string) => {
    setSelectedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const clearCache = () => {
    apiManager.clearCache();
    setCacheStats(apiManager.getCacheStats());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'inactive': return 'text-gray-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckIcon className="w-4 h-4" />;
      case 'inactive': return <XIcon className="w-4 h-4" />;
      case 'error': return <AlertIcon className="w-4 h-4" />;
      default: return <XIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">API Management System</h2>
        <div className="flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6 text-blue-400" />
          <span className="text-blue-400 text-sm font-medium">Industry Standard</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        {[
          { id: 'config', label: 'Configuration', icon: SettingsIcon },
          { id: 'search', label: 'Search & Import', icon: SearchIcon },
          { id: 'sync', label: 'Sync Jobs', icon: RefreshIcon },
          { id: 'cache', label: 'Cache Management', icon: StatsIcon }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">API Configuration</h3>
            <button
              onClick={() => setConfigs(apiManager.getConfigs())}
              className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshIcon className="w-5 h-5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {configs.map(config => (
              <div key={config.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${config.enabled ? 'bg-green-400' : 'bg-gray-400'}`} />
                    <h4 className="text-lg font-semibold text-white">{config.name}</h4>
                    <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                      Priority {config.priority}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingConfig(editingConfig === config.id ? null : config.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <EditIcon className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleConfigUpdate(config.id, { enabled: !config.enabled })}
                      className={`p-2 rounded-lg transition-colors ${
                        config.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {config.enabled ? <PauseIcon className="w-4 h-4 text-white" /> : <PlayIcon className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Base URL</label>
                    <p className="text-sm text-gray-400">{config.baseUrl}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Rate Limit</label>
                    <p className="text-sm text-gray-400">{config.rateLimit.requests} requests per {config.rateLimit.per}s</p>
                  </div>

                  {editingConfig === config.id && (
                    <div className="space-y-3 pt-3 border-t border-gray-700">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
                        <input
                          type="password"
                          value={apiKeys[config.id] || ''}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, [config.id]: e.target.value }))}
                          placeholder="Enter API key..."
                          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            handleAPIKeyUpdate(config.id, apiKeys[config.id] || '');
                            setEditingConfig(null);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingConfig(null)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Import Tab */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Search & Import</h3>
            <div className="flex items-center space-x-2">
              <select
                value={dataSource}
                onChange={(e) => {
                  setDataSource(e.target.value as 'manual' | 'sync');
                  setSelectedSyncJob(null);
                  setSearchResults([]);
                }}
                className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual">Manual Search</option>
                <option value="sync">Sync Job Results</option>
              </select>
              {dataSource === 'manual' && (
                <button
                  onClick={() => handleSync('manual')}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <PlayIcon className="w-5 h-5" />
                  <span>Start Sync</span>
                </button>
              )}
            </div>
          </div>

          {dataSource === 'manual' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Search Type</label>
                  <select
                    value={searchType}
                    onChange={(e) => {
                      setSearchType(e.target.value as any);
                      setSearchResults([]);
                    }}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="artist">Artists</option>
                    <option value="song">Songs</option>
                    <option value="genre">Genres</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Search Query</label>
                  <div className="relative">
                    <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${searchType}...`}
                      className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={handleSearch}
                    disabled={searchLoading || !searchQuery.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {searchLoading ? <LoadingSpinner /> : 'Search'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Sync Job</label>
              <select
                value={selectedSyncJob || ''}
                onChange={(e) => {
                  setSelectedSyncJob(e.target.value || null);
                  setSearchType('artist'); // Reset to artist type
                }}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a sync job --</option>
                {syncJobs
                  .filter(job => job.status === 'completed')
                  .map(job => (
                    <option key={job.id} value={job.id}>
                      {job.type.charAt(0).toUpperCase() + job.type.slice(1)} Sync - {job.startTime.toLocaleString()} ({job.results.artists + job.results.songs + job.results.genres} results)
                    </option>
                  ))}
              </select>
              {selectedSyncJob && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Result Type</label>
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as any)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="artist">Artists</option>
                    <option value="song">Songs</option>
                    <option value="genre">Genres</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          {(currentResults.length > 0 || filteredResults.length > 0) && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white">Filters</h4>
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  {showAdvancedFilters ? 'Hide' : 'Show'} Advanced
                </button>
              </div>

              {/* Basic Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Source APIs</label>
                  <div className="flex flex-wrap gap-2">
                    {['genius', 'musicbrainz', 'lastfm', 'theaudiodb'].map(source => (
                      <label key={source} className="flex items-center space-x-1 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={filters.sources.includes(source)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({ ...prev, sources: [...prev.sources, source] }));
                            } else {
                              setFilters(prev => ({ ...prev, sources: prev.sources.filter(s => s !== source) }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="capitalize">{source}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confidence: {filters.minConfidence}% - {filters.maxConfidence}%
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.minConfidence}
                      onChange={(e) => setFilters(prev => ({ ...prev, minConfidence: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.maxConfidence}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxConfidence: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                      className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="confidence">Confidence</option>
                      <option value="title">Title</option>
                      <option value="artist">Artist</option>
                      <option value="source">Source</option>
                    </select>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                      className="px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                    >
                      {filters.sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Artist</label>
                    <input
                      type="text"
                      value={filters.artistFilter}
                      onChange={(e) => setFilters(prev => ({ ...prev, artistFilter: e.target.value }))}
                      placeholder="Artist name..."
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Genre</label>
                    <input
                      type="text"
                      value={filters.genreFilter}
                      onChange={(e) => setFilters(prev => ({ ...prev, genreFilter: e.target.value }))}
                      placeholder="Genre..."
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {filteredResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-white">
                  Results ({filteredResults.length} of {currentResults.length})
                </h4>
                {selectedResults.size > 0 && (
                  <button
                    onClick={handleBulkImport}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Import Selected ({selectedResults.size})</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResults.map((result, index) => (
                  <div
                    key={result.id || index}
                    className={`bg-gray-800 rounded-lg p-4 border-2 ${
                      selectedResults.has(result.id) ? 'border-green-500' : 'border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedResults.has(result.id)}
                        onChange={() => toggleResultSelection(result.id)}
                        className="mt-1 w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-white truncate">{result.title}</h5>
                        <p className="text-sm text-gray-400 truncate">{result.artist}</p>
                        <div className="flex items-center mt-2 space-x-2 flex-wrap gap-1">
                          <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                            {result.source}
                          </span>
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                            {Math.round((result.confidence || 0) * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          {searchType === 'song' && (
                            <button
                              onClick={() => handlePreview(result)}
                              className="text-sm text-blue-400 hover:text-blue-300"
                            >
                              Preview
                            </button>
                          )}
                          <button
                            onClick={() => handleImportResult(result, false)}
                            disabled={importing.has(result.id)}
                            className="text-sm text-green-400 hover:text-green-300 disabled:opacity-50"
                          >
                            {importing.has(result.id) ? 'Importing...' : 'Import'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentResults.length === 0 && dataSource === 'manual' && !searchLoading && (
            <div className="text-center py-8 text-gray-400">
              <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No results yet. Perform a search to see results.</p>
            </div>
          )}

          {dataSource === 'sync' && !selectedSyncJob && (
            <div className="text-center py-8 text-gray-400">
              <RefreshIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a completed sync job to view its results.</p>
            </div>
          )}
        </div>
      )}

      {/* Sync Jobs Tab */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Sync Jobs</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSync('manual')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Manual Sync
              </button>
              <button
                onClick={() => handleSync('scheduled')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Scheduled Sync
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {syncJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <RefreshIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No sync jobs yet</p>
              </div>
            ) : (
              syncJobs.map(job => {
                const isExpanded = expandedJobs.has(job.id);
                const jobResults = apiManager.getSyncJobResults(job.id);
                const hasResults = job.status === 'completed' && jobResults.length > 0;

                return (
                  <div key={job.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          job.status === 'completed' ? 'bg-green-400' :
                          job.status === 'running' ? 'bg-blue-400' :
                          job.status === 'failed' ? 'bg-red-400' : 'bg-gray-400'
                        }`} />
                        <h4 className="text-lg font-semibold text-white">
                          {job.type.charAt(0).toUpperCase() + job.type.slice(1)} Sync
                        </h4>
                        <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                          {job.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-400">
                          {job.startTime.toLocaleString()}
                        </div>
                        {hasResults && (
                          <button
                            onClick={() => toggleJobExpansion(job.id)}
                            className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                          >
                            {isExpanded ? 'Hide Results' : 'View Results'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm text-gray-300 mb-1">
                          <span>Progress</span>
                          <span>{Math.round(job.progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-400">{job.results.artists}</div>
                          <div className="text-gray-400">Artists</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-400">{job.results.songs}</div>
                          <div className="text-gray-400">Songs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-purple-400">{job.results.genres}</div>
                          <div className="text-gray-400">Genres</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-400">{job.results.errors}</div>
                          <div className="text-gray-400">Errors</div>
                        </div>
                      </div>

                      {/* Expanded Results */}
                      {isExpanded && hasResults && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-md font-semibold text-white">
                              Results ({jobResults.length} total)
                            </h5>
                            {selectedResults.size > 0 && (
                              <button
                                onClick={handleBulkImport}
                                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                              >
                                <PlusIcon className="w-4 h-4" />
                                <span>Import Selected ({selectedResults.size})</span>
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                            {jobResults.map((result, index) => (
                              <div
                                key={result.id || index}
                                className={`bg-gray-700 rounded-lg p-3 border-2 ${
                                  selectedResults.has(result.id) ? 'border-green-500' : 'border-gray-600'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedResults.has(result.id)}
                                    onChange={() => toggleResultSelection(result.id)}
                                    className="mt-1 w-4 h-4"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h6 className="font-semibold text-white text-sm truncate">{result.title}</h6>
                                    <p className="text-xs text-gray-400 truncate">{result.artist}</p>
                                    <div className="flex items-center mt-1 space-x-1">
                                      <span className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded">
                                        {result.source}
                                      </span>
                                      <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
                                        {Math.round((result.confidence || 0) * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Cache Management Tab */}
      {activeTab === 'cache' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Cache Management</h3>
            <button
              onClick={clearCache}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Clear Cache
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">{cacheStats.size}</div>
                <div className="text-gray-400">Cached Entries</div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {Math.round(cacheStats.entries.reduce((acc, entry) => acc + entry.age, 0) / cacheStats.entries.length / 1000)}s
                </div>
                <div className="text-gray-400">Avg Age</div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {Math.round(cacheStats.entries.reduce((acc, entry) => acc + entry.ttl, 0) / cacheStats.entries.length / 1000)}s
                </div>
                <div className="text-gray-400">Avg TTL</div>
              </div>
            </div>
          </div>

          {cacheStats.entries.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Cache Entries</h4>
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  {cacheStats.entries.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border-b border-gray-700 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{entry.key}</div>
                        <div className="text-xs text-gray-400">
                          Age: {Math.round(entry.age / 1000)}s | TTL: {Math.round(entry.ttl / 1000)}s
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        entry.age < entry.ttl ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Preview: {previewItem.title}</h3>
              <button
                onClick={() => {
                  setPreviewItem(null);
                  setPreviewData(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Song Info */}
              <div className="flex items-start gap-4">
                {previewItem.image && (
                  <img
                    src={previewItem.image}
                    alt={previewItem.title}
                    className="w-24 h-24 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white">{previewItem.title}</h4>
                  <p className="text-gray-400">{previewItem.artist}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                      {previewItem.source}
                    </span>
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                      {Math.round((previewItem.confidence || 0) * 100)}%
                    </span>
                  </div>
                  {previewItem.metadata?.album && (
                    <p className="text-sm text-gray-400 mt-1">Album: {previewItem.metadata.album}</p>
                  )}
                  {previewItem.metadata?.year && (
                    <p className="text-sm text-gray-400">Year: {previewItem.metadata.year}</p>
                  )}
                </div>
              </div>

              {/* Lyrics Section */}
              {!previewData && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-300 mb-4">Lyrics not loaded yet. Click the button below to fetch lyrics.</p>
                  <button
                    onClick={handleFetchLyrics}
                    disabled={fetchingLyrics}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {fetchingLyrics ? (
                      <>
                        <LoadingSpinner />
                        <span className="ml-2">Fetching Lyrics...</span>
                      </>
                    ) : (
                      'Fetch Lyrics'
                    )}
                  </button>
                </div>
              )}

              {previewData && (
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h5 className="font-semibold text-white mb-2">Lyrics</h5>
                    <div className="text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {previewData.lyrics || 'No lyrics available'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        handleImportResult(previewItem, true);
                        setPreviewItem(null);
                        setPreviewData(null);
                      }}
                      disabled={importing.has(previewItem.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {importing.has(previewItem.id) ? 'Importing...' : 'Import with Lyrics'}
                    </button>
                    <button
                      onClick={() => {
                        handleImportResult(previewItem, false);
                        setPreviewItem(null);
                        setPreviewData(null);
                      }}
                      disabled={importing.has(previewItem.id)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {importing.has(previewItem.id) ? 'Importing...' : 'Import without Lyrics'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIManagement;






