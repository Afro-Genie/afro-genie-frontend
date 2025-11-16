import React, { useState, useEffect } from 'react';
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

interface APIManagementProps {
  onDataImported: () => void;
}

const APIManagement: React.FC<APIManagementProps> = ({ onDataImported }) => {
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

  useEffect(() => {
    // Refresh data periodically
    const interval = setInterval(() => {
      setDataSources(apiManager.getDataSourceStatus());
      setSyncJobs(apiManager.getSyncJobs());
      setCacheStats(apiManager.getCacheStats());
    }, 5000);

    return () => clearInterval(interval);
  }, [apiManager]);

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
    const jobId = await apiManager.startSyncJob(type, searchQuery);
    setSyncJobs(apiManager.getSyncJobs());
    return jobId;
  };

  const handleImportResult = async (result: any) => {
    try {
      // This would integrate with your Firebase service
      // await addArtist({ name: result.artist, genre: 'Afrobeats', image: result.image });
      console.log('Importing:', result);
      onDataImported();
    } catch (error) {
      console.error('Import error:', error);
    }
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
            <button
              onClick={() => handleSync('manual')}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <PlayIcon className="w-5 h-5" />
              <span>Start Sync</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search Type</label>
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

          {searchResults.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Search Results ({searchResults.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((result, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-white truncate">{result.title}</h5>
                        <p className="text-sm text-gray-400 truncate">{result.artist}</p>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                            {result.source}
                          </span>
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                            {Math.round(result.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleImportResult(result)}
                        className="ml-2 p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        <PlusIcon className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
              syncJobs.map(job => (
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
                    <div className="text-sm text-gray-400">
                      {job.startTime.toLocaleString()}
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
                  </div>
                </div>
              ))
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
    </div>
  );
};

export default APIManagement;






