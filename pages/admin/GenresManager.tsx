import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { useConfirm } from '../../hooks/useConfirm';
import { useAuth } from '../../context/AuthContext';
import { toMediaUrl } from '../../lib/apiBase';
import { uploadImage } from '../../services/uploadService';
import Notification from '../../components/Notification';
import ConfirmDialog from '../../components/ConfirmDialog';
import AdminPagination from '../../components/admin/AdminPagination';
import MediaImage from '../../components/MediaImage';
import { AdminListPageSkeleton } from '../../components/PageSkeletons';

interface AdminGenre {
  id: string;
  name: string;
  imageUrl: string;
  songCount: number;
}

const toQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
  const query = search.toString();
  return query ? `?${query}` : '';
};

const GenreImage: React.FC<{ src: string; name: string }> = ({ src, name }) => (
  <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-700">
    <MediaImage
      src={src}
      alt={name}
      className="w-full h-full object-cover"
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
        </div>
      }
      fallbackClassName="bg-gray-700"
    />
  </div>
);

const GenresManager: React.FC = () => {
  const { authFetch } = useAuth();
  const { notification, showNotification, hideNotification } = useNotification();
  const { confirmState, confirm } = useConfirm();

  const [genres, setGenres] = useState<AdminGenre[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'songs'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalGenres, setTotalGenres] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [genresInUse, setGenresInUse] = useState(0);
  const [totalSongLinks, setTotalSongLinks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [editingGenre, setEditingGenre] = useState<AdminGenre | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', image: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const itemsPerPage = 20;
  const requestSequence = useRef(0);

  const fetchData = useCallback(async (forceFresh = false) => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    try {
      const fresh = forceFresh ? { _ts: Date.now() } : {};
      const [genresResponse, totalsResponse] = await Promise.all([
        authFetch('/api/admin/genres' + toQuery({
          page: currentPage,
          limit: itemsPerPage,
          search: searchQuery.trim() || undefined,
          sortBy,
          sortOrder,
          ...fresh,
        })),
        authFetch('/api/admin/genres' + toQuery({ page: 1, limit: 1, ...fresh })),
      ]);
      if (sequence !== requestSequence.current) return;

      const genresData = Array.isArray(genresResponse?.data) ? genresResponse.data : [];
      setGenres(genresData.map((genre: any) => ({
        id: genre.id,
        name: genre.name,
        imageUrl: genre.imageUrl || '',
        songCount: genre._count?.songs ?? 0,
      })));

      setTotalGenres(Number(totalsResponse?.total) || 0);
      setFilteredTotal(Number(genresResponse?.total) || 0);
      setGenresInUse(Number(genresResponse?.genresInUse) || 0);
      setTotalSongLinks(Number(genresResponse?.totalSongLinks) || 0);
      const responseTotalPages = Math.max(1, Number(genresResponse?.totalPages) || 1);
      setTotalPages(responseTotalPages);
      if (currentPage > responseTotalPages) {
        setCurrentPage(responseTotalPages);
        return;
      }
    } catch (error: any) {
      if (sequence !== requestSequence.current) return;
      showNotification({
        message: `Error loading genres: ${error.message}`,
        type: 'error'
      });
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [authFetch, currentPage, itemsPerPage, searchQuery, showNotification, sortBy, sortOrder]);

  useEffect(() => {
    const delay = searchQuery.trim() ? 250 : 0;
    const timer = window.setTimeout(() => void fetchData(), delay);
    return () => window.clearTimeout(timer);
  }, [fetchData, searchQuery]);

  const openAdd = () => {
    setEditingGenre(null);
    setFormData({ name: '', image: '' });
    setImageFile(null);
    setImagePreview('');
    setShowAddForm(true);
  };

  const openEdit = (genre: AdminGenre) => {
    setEditingGenre(genre);
    setFormData({ name: genre.name, image: genre.imageUrl });
    setImageFile(null);
    setImagePreview(genre.imageUrl ? toMediaUrl(genre.imageUrl) : '');
    setShowAddForm(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setShowAddForm(false);
    setEditingGenre(null);
  };

  const handleSave = async () => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      showNotification({ message: 'Genre name is required', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = formData.image.trim();
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, `genres/${Date.now()}-${imageFile.name}`);
      }

      if (editingGenre) {
        await authFetch('/api/admin/genres/' + editingGenre.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName, imageUrl }),
        });
        showNotification({ message: 'Genre updated successfully!', type: 'success' });
      } else {
        await authFetch('/api/admin/genres', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName, imageUrl: imageUrl || undefined }),
        });
        showNotification({ message: 'Genre added successfully!', type: 'success' });
      }

      setShowAddForm(false);
      setEditingGenre(null);
      setFormData({ name: '', image: '' });
      setImageFile(null);
      setImagePreview('');
      void fetchData(true);
    } catch (error: any) {
      showNotification({ message: `Error saving genre: ${error.message}`, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (genre: AdminGenre) => {
    const hasConfirmed = await confirm({
      title: 'Delete Genre',
      message: genre.songCount > 0
        ? `Are you sure you want to delete "${genre.name}"? ${genre.songCount} song${genre.songCount === 1 ? '' : 's'} will lose this genre tag. This action cannot be undone.`
        : `Are you sure you want to delete "${genre.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!hasConfirmed) return;

    try {
      await authFetch('/api/admin/genres/' + genre.id, { method: 'DELETE' });
      showNotification({ message: 'Genre deleted successfully!', type: 'success' });
      void fetchData(true);
    } catch (error: any) {
      showNotification({ message: `Error deleting genre: ${error.message}`, type: 'error' });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSortBy('name');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <AdminListPageSkeleton rows={8} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Genres Management</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Manage music genres in your database</p>
        </div>
        <button
          onClick={openAdd}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px] sm:w-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Genre
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Total Genres</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{totalGenres}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Filtered Results</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{filteredTotal}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Genres in Use</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{genresInUse}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Song Links</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{totalSongLinks}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by genre name..."
                className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Sort */}
          <div>
            <label htmlFor="genre-sort-by" className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
            <div className="flex gap-2">
              <select
                id="genre-sort-by"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'name' | 'songs');
                  setCurrentPage(1);
                }}
                className="flex-1 select-chevron px-3 pr-10 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="name">Name</option>
                <option value="songs">Songs</option>
              </select>
              <button
                onClick={() => {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  setCurrentPage(1);
                }}
                className="px-3 py-2.5 min-w-[44px] bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white transition-colors"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Reset Filters */}
        {searchQuery && (
          <button
            onClick={resetFilters}
            className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset Filters
          </button>
        )}
      </div>

      {/* Genres List - Mobile Card View / Desktop Table View */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {genres.length === 0 ? (
          <div className="p-6 sm:p-12 text-center">
            <div className="text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-lg font-semibold text-white mb-2">No Genres Found</p>
              <p>Try adjusting your search or add a new genre</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-900 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Genre
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Songs
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {genres.map((genre) => (
                    <tr
                      key={genre.id}
                      className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => openEdit(genre)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(genre); } }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Edit ${genre.name}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <GenreImage src={genre.imageUrl} name={genre.name} />
                          <div className="font-medium text-white">{genre.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-green-600/20 text-green-300 rounded-full">
                          {genre.songCount} song{genre.songCount === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEdit(genre)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(genre)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-700">
              {genres.map((genre) => (
                <div key={genre.id} className="p-4 hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => openEdit(genre)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') openEdit(genre); }}>
                  <div className="flex items-start gap-3 mb-3">
                    <GenreImage src={genre.imageUrl} name={genre.name} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1 line-clamp-1">{genre.name}</h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-600/20 text-green-300 rounded-full">
                        {genre.songCount} song{genre.songCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(genre)}
                      className="flex-1 min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(genre)}
                      className="flex-1 min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredTotal}
          itemsPerPage={itemsPerPage}
          itemLabel="genres"
          onPageChange={setCurrentPage}
        />
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeForm}>
          <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editingGenre ? 'Edit genre' : 'Add genre'}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editingGenre ? 'Edit Genre' : 'Add New Genre'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-white" aria-label="Close">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="genre-name" className="mb-1 block text-sm font-medium text-gray-300">Genre Name</label>
                <input
                  id="genre-name"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Afrobeat"
                />
              </div>
              <div>
                <label htmlFor="genre-image" className="mb-1 block text-sm font-medium text-gray-300">Image URL (optional)</label>
                <input
                  id="genre-image"
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData((f) => ({ ...f, image: e.target.value }))}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label htmlFor="genre-image-upload" className="mb-1 block text-sm font-medium text-gray-300">Or Upload Image</label>
                <input
                  id="genre-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <MediaImage src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg" />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeForm} disabled={submitting} className="min-h-[44px] rounded-lg border border-gray-600 px-4 text-gray-200 hover:bg-gray-700 disabled:opacity-50">Cancel</button>
              <button onClick={() => void handleSave()} disabled={submitting} className="min-h-[44px] rounded-lg bg-green-600 px-5 font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                {submitting ? 'Saving…' : editingGenre ? 'Save changes' : 'Add Genre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      <Notification notification={notification} onClose={hideNotification} />

      {/* Confirm Dialog */}
      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.options.title}
          message={confirmState.options.message}
          confirmText={confirmState.options.confirmText}
          cancelText={confirmState.options.cancelText}
          type={confirmState.options.type}
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
        />
      )}
    </div>
  );
};

export default GenresManager;
