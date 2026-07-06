import React, { useState, useEffect } from 'react';
import { 
  getAllArtists, 
  getAllSongs, 
  getAllGenres, 
  addArtist, 
  addSong, 
  addGenre,
  updateArtist,
  updateSong,
  updateGenre,
  deleteArtist,
  deleteSong,
  deleteGenre,
  uploadArtistImage,
  uploadSongImage,
  uploadGenreImage
} from '../../services/firebaseService';
import { 
  MusicNoteIcon, 
  ArtistIcon, 
  GenreIcon, 
  PlusIcon,
  EditIcon,
  DeleteIcon,
  SearchIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
  SaveIcon,
  CancelIcon,
  UploadIcon,
  ImageIcon
} from '../../components/icons/FlatIcons';
import { AdminTabbedPageSkeleton } from '../../components/PageSkeletons';
import type { Artist, Song, Genre } from '../../types';

type ContentType = 'artists' | 'songs' | 'genres';
type ViewMode = 'grid' | 'list';

interface FormData {
  name: string;
  title: string;
  artist: string;
  artistId: string;
  genre: string;
  image: string;
  lyrics: string;
  language: string;
}

const UnifiedManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ContentType>('artists');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [artists, setArtists] = useState<Artist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    title: '',
    artist: '',
    artistId: '',
    genre: '',
    image: '',
    lyrics: '',
    language: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [fetchedArtists, fetchedSongs, fetchedGenres] = await Promise.all([
        getAllArtists(),
        getAllSongs(),
        getAllGenres()
      ]);
      setArtists(fetchedArtists);
      setSongs(fetchedSongs);
      setGenres(fetchedGenres);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      artist: '',
      artistId: '',
      genre: '',
      image: '',
      lyrics: '',
      language: ''
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'artists') {
      setFormData({
        name: item.name,
        title: '',
        artist: '',
        artistId: '',
        genre: item.genre,
        image: item.image,
        lyrics: '',
        language: ''
      });
    } else if (activeTab === 'songs') {
      setFormData({
        name: '',
        title: item.title,
        artist: item.artist,
        artistId: item.artistId,
        genre: '',
        image: item.image,
        lyrics: item.lyrics || '',
        language: item.language || ''
      });
    } else if (activeTab === 'genres') {
      setFormData({
        name: item.name,
        title: '',
        artist: '',
        artistId: '',
        genre: '',
        image: item.image,
        lyrics: '',
        language: ''
      });
    }
    setShowForm(true);
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Are you sure you want to delete this ${activeTab.slice(0, -1)}?`)) return;
    if (!item?.id) {
      alert('This item has no ID (try refreshing the page).');
      await fetchAllData();
      return;
    }

    try {
      if (activeTab === 'artists') {
        await deleteArtist(item.id);
        setArtists(artists.filter(a => a.id !== item.id));
      } else if (activeTab === 'songs') {
        await deleteSong(item.id);
        setSongs(songs.filter(s => s.id !== item.id));
      } else if (activeTab === 'genres') {
        await deleteGenre(item.id);
        setGenres(genres.filter(g => g.id !== item.id));
      }
    } catch (error: any) {
      console.error('Error deleting item:', error);
      const msg = error?.code === 'permission-denied'
        ? 'You do not have permission to delete this item. Admin access is required.'
        : (error?.message || 'Delete failed. Check the console for details.');
      alert(msg);
    }
  };

  const handleImageUpload = async (file: File, type: ContentType) => {
    try {
      let downloadURL = '';
      if (type === 'artists') {
        downloadURL = await uploadArtistImage(file);
      } else if (type === 'songs') {
        downloadURL = await uploadSongImage(file);
      } else if (type === 'genres') {
        downloadURL = await uploadGenreImage(file);
      }
      setFormData(prev => ({ ...prev, image: downloadURL }));
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (activeTab === 'artists') {
        const artistData = {
          name: formData.name,
          genre: formData.genre,
          image: formData.image
        };
        
        if (editingItem) {
          await updateArtist(editingItem.id, artistData);
          setArtists(artists.map(a => a.id === editingItem.id ? { ...a, ...artistData } : a));
        } else {
          const newId = await addArtist(artistData);
          setArtists([...artists, { id: newId, ...artistData } as Artist]);
        }
      } else if (activeTab === 'songs') {
        const songData = {
          title: formData.title,
          artist: formData.artist,
          artistId: formData.artistId,
          image: formData.image,
          lyrics: formData.lyrics,
          language: formData.language
        };
        
        if (editingItem) {
          await updateSong(editingItem.id, songData);
          setSongs(songs.map(s => s.id === editingItem.id ? { ...s, ...songData } : s));
        } else {
          const newId = await addSong(songData);
          setSongs([...songs, { id: newId, ...songData } as Song]);
        }
      } else if (activeTab === 'genres') {
        const genreData = {
          name: formData.name,
          image: formData.image
        };
        
        if (editingItem) {
          await updateGenre(editingItem.id, genreData);
          setGenres(genres.map(g => g.id === editingItem.id ? { ...g, ...genreData } : g));
        } else {
          const newId = await addGenre(genreData);
          setGenres([...genres, { id: newId, ...genreData } as Genre]);
        }
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentData = () => {
    const data = activeTab === 'artists' ? artists : activeTab === 'songs' ? songs : genres;
    return data.filter(item => {
      const searchTerm = searchQuery.toLowerCase();
      if (activeTab === 'artists') {
        return item.name.toLowerCase().includes(searchTerm);
      } else if (activeTab === 'songs') {
        return item.title.toLowerCase().includes(searchTerm) || item.artist.toLowerCase().includes(searchTerm);
      } else if (activeTab === 'genres') {
        return item.name.toLowerCase().includes(searchTerm);
      }
      return false;
    });
  };

  const renderGridItem = (item: any) => (
    <div key={item.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-green-500/50 transition-all duration-300 group">
      <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden mb-3">
        {item.image ? (
          <img src={item.image} alt={item.name || item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {activeTab === 'artists' && <ArtistIcon className="w-12 h-12 text-gray-400" />}
            {activeTab === 'songs' && <MusicNoteIcon className="w-12 h-12 text-gray-400" />}
            {activeTab === 'genres' && <GenreIcon className="w-12 h-12 text-gray-400" />}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold text-white truncate">
          {activeTab === 'songs' ? item.title : item.name}
        </h3>
        {activeTab === 'songs' && (
          <p className="text-sm text-gray-400 truncate">{item.artist}</p>
        )}
        {activeTab === 'artists' && (
          <p className="text-sm text-gray-400 truncate">{item.genre}</p>
        )}
      </div>
      
      <div className="flex items-center justify-between mt-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => handleEdit(item)}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <EditIcon className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={() => handleDelete(item)}
          className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          <DeleteIcon className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );

  const renderListItem = (item: any) => (
    <div key={item.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-green-500/50 transition-all duration-300 group">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
          {item.image ? (
            <img src={item.image} alt={item.name || item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {activeTab === 'artists' && <ArtistIcon className="w-8 h-8 text-gray-400" />}
              {activeTab === 'songs' && <MusicNoteIcon className="w-8 h-8 text-gray-400" />}
              {activeTab === 'genres' && <GenreIcon className="w-8 h-8 text-gray-400" />}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">
            {activeTab === 'songs' ? item.title : item.name}
          </h3>
          {activeTab === 'songs' && (
            <p className="text-sm text-gray-400 truncate">{item.artist}</p>
          )}
          {activeTab === 'artists' && (
            <p className="text-sm text-gray-400 truncate">{item.genre}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleEdit(item)}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <EditIcon className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => handleDelete(item)}
            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <DeleteIcon className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminTabbedPageSkeleton />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <GridIcon className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Unified Content Manager</h1>
            </div>
            <div className="text-white/80">
              <span className="text-sm">Master Control Panel</span>
            </div>
          </div>
          <div className="text-white">
            <span className="text-sm">Manage All Content</span>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Tabs */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-2 border border-white/10">
          <div className="flex space-x-2">
            {(['artists', 'songs', 'genres'] as ContentType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-green-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab === 'artists' && <ArtistIcon className="w-5 h-5" />}
                {tab === 'songs' && <MusicNoteIcon className="w-5 h-5" />}
                {tab === 'genres' && <GenreIcon className="w-5 h-5" />}
                <span className="capitalize">{tab}</span>
                <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                  {tab === 'artists' ? artists.length : tab === 'songs' ? songs.length : genres.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              {/* View Mode */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:text-white'
                  }`}
                >
                  <GridIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:text-white'
                  }`}
                >
                  <ListIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Add Button */}
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add {activeTab.slice(0, -1)}</span>
            </button>
          </div>
        </div>

        {/* Content Grid/List */}
        <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6' : 'space-y-4'}`}>
          {getCurrentData().map(item => 
            viewMode === 'grid' ? renderGridItem(item) : renderListItem(item)
          )}
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingItem ? 'Edit' : 'Add'} {activeTab.slice(0, -1)}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <CancelIcon className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Image</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-24 bg-gray-700 rounded-lg overflow-hidden">
                      {formData.image ? (
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, activeTab);
                        }}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
                      >
                        <UploadIcon className="w-5 h-5" />
                        <span>Upload Image</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                {activeTab === 'artists' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Artist Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                      <input
                        type="text"
                        value={formData.genre}
                        onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                  </>
                )}

                {activeTab === 'songs' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Song Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Artist</label>
                      <input
                        type="text"
                        value={formData.artist}
                        onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                      <input
                        type="text"
                        value={formData.language}
                        onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Yoruba, English, Swahili"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Lyrics</label>
                      <textarea
                        value={formData.lyrics}
                        onChange={(e) => setFormData(prev => ({ ...prev, lyrics: e.target.value }))}
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 h-32 resize-none"
                        placeholder="Enter song lyrics..."
                      />
                    </div>
                  </>
                )}

                {activeTab === 'genres' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Genre Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <SaveIcon className="w-5 h-5" />
                    <span>{submitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedManager;







