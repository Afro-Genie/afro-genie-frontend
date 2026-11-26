import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../hooks/useNotification';
import { useConfirm } from '../../hooks/useConfirm';
import { getGenres } from '../../lib/apiClient';
import { toMediaUrl } from '../../lib/apiBase';
import { uploadImage } from '../../services/uploadService';
import Notification from '../../components/Notification';
import ConfirmDialog from '../../components/ConfirmDialog';
import AdminPagination from '../../components/admin/AdminPagination';
import MediaImage from '../../components/MediaImage';
import { AdminListPageSkeleton } from '../../components/PageSkeletons';

interface AdminArtist {
  id: string;
  name: string;
  bio: string;
  imageUrl: string;
  genres: string[];
  verified: boolean;
  suspended: boolean;
  isFeatured: boolean;
  popularity: number;
  followers: number;
  songCount: number;
  email: string;
}

interface ArtistFormData {
  name: string;
  bio: string;
  image: string;
  genres: string[];
  popularity: string;
  followers: string;
  externalUrl: string;
}

const emptyForm: ArtistFormData = {
  name: '',
  bio: '',
  image: '',
  genres: [],
  popularity: '0',
  followers: '0',
  externalUrl: '',
};

const toQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
  const query = search.toString();
  return query ? `?${query}` : '';
};

const ArtistImage: React.FC<{ src: string; name: string }> = ({ src, name }) => (
  <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-700">
    <MediaImage
      src={src}
      alt={name}
      className="w-full h-full object-cover"
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
      }
      fallbackClassName="bg-gray-700"
    />
  </div>
);

const ArtistsManager: React.FC = () => {
  const { authFetch } = useAuth();
  const { notification, showNotification, hideNotification } = useNotification();
  const { confirmState, confirm } = useConfirm();

  const [artists, setArtists] = useState<AdminArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'true' | 'false'>('all');
  const [suspendedFilter, setSuspendedFilter] = useState<'all' | 'true' | 'false'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'popularity' | 'followers' | 'songs'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalArtists, setTotalArtists] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [featuredCount, setFeaturedCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [genreOptions, setGenreOptions] = useState<string[]>([]);
  const [editingArtist, setEditingArtist] = useState<AdminArtist | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<ArtistFormData>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const itemsPerPage = 20;
  const requestSequence = useRef(0);

  useEffect(() => {
    getGenres()
      .then((response: any) => {
        const list = Array.isArray(response) ? response : [];
        setGenreOptions(list.map((g: any) => g.name).filter(Boolean).sort());
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async (forceFresh = false) => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    try {
      const fresh = forceFresh ? { _ts: Date.now() } : {};
      const filters = {
        search: searchQuery.trim() || undefined,
        genre: genreFilter === 'all' ? undefined : genreFilter,
        verified: verifiedFilter === 'all' ? undefined : verifiedFilter,
        suspended: suspendedFilter === 'all' ? undefined : suspendedFilter,
        sortBy,
        sortOrder,
      };
      const [listResponse, totalsResponse] = await Promise.all([
        authFetch('/api/admin/artists' + toQuery({ page: currentPage, limit: itemsPerPage, ...filters, ...fresh })),
        authFetch('/api/admin/artists' + toQuery({ page: 1, limit: 1, ...fresh })),
      ]);
      if (sequence !== requestSequence.current) return;

      const artistsData = Array.isArray(listResponse?.artists) ? listResponse.artists : [];
      setArtists(artistsData.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        bio: artist.bio || '',
        imageUrl: artist.imageUrl || '',
        genres: Array.isArray(artist.genres) ? artist.genres : [],
        verified: Boolean(artist.verified),
        suspended: Boolean(artist.suspended),
        isFeatured: Boolean(artist.isFeatured),
        popularity: Number(artist.popularity) || 0,
        followers: Number(artist.followers) || 0,
        songCount: artist._count?.songs ?? 0,
        email: artist.user?.email || '',
      })));

      setTotalArtists(Number(totalsResponse?.total) || 0);
      setFilteredTotal(Number(listResponse?.total) || 0);
      setVerifiedCount(Number(listResponse?.verifiedCount) || 0);
      setSuspendedCount(Number(listResponse?.suspendedCount) || 0);
      setFeaturedCount(Number(listResponse?.featuredCount) || 0);
      const responseTotalPages = Math.max(1, Number(listResponse?.totalPages) || 1);
      setTotalPages(responseTotalPages);
      if (currentPage > responseTotalPages) {
        setCurrentPage(responseTotalPages);
        return;
      }
    } catch (error: any) {
      if (sequence !== requestSequence.current) return;
      showNotification({
        message: `Error loading artists: ${error.message}`,
        type: 'error'
      });
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [authFetch, currentPage, genreFilter, itemsPerPage, searchQuery, showNotification, sortBy, sortOrder, suspendedFilter, verifiedFilter]);

  useEffect(() => {
    const delay = searchQuery.trim() ? 250 : 0;
    const timer = window.setTimeout(() => void fetchData(), delay);
    return () => window.clearTimeout(timer);
  }, [fetchData, searchQuery]);

  const openAdd = () => {
    setEditingArtist(null);
    setFormData(emptyForm);
    setImageFile(null);
    setImagePreview('');
    setShowAddForm(true);
  };

  const openEdit = (artist: AdminArtist) => {
    setEditingArtist(artist);
    setFormData({
      name: artist.name,
      bio: artist.bio,
      image: artist.imageUrl,
      genres: artist.genres,
      popularity: String(artist.popularity),
      followers: String(artist.followers),
      externalUrl: '',
    });
    setImageFile(null);
    setImagePreview(artist.imageUrl ? toMediaUrl(artist.imageUrl) : '');
    setShowAddForm(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setShowAddForm(false);
    setEditingArtist(null);
  };

  const handleSave = async () => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      showNotification({ message: 'Artist name is required', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = formData.image.trim();
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, `artists/${Date.now()}-${imageFile.name}`);
      }

      const payload = {
        name: trimmedName,
        bio: formData.bio.trim(),
        imageUrl: imageUrl || undefined,
        genres: formData.genres,
        popularity: Math.max(0, Number(formData.popularity) || 0),
        followers: Math.max(0, Number(formData.followers) || 0),
        externalUrl: formData.externalUrl.trim() || undefined,
        verified: editingArtist?.verified ?? false,
      };

      if (editingArtist) {
        await authFetch('/api/artists/' + editingArtist.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showNotification({ message: 'Artist updated successfully!', type: 'success' });
      } else {
        await authFetch('/api/artists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showNotification({ message: 'Artist added successfully!', type: 'success' });
      }

      setShowAddForm(false);
      setEditingArtist(null);
      setFormData(emptyForm);
      setImageFile(null);
      setImagePreview('');
      void fetchData(true);
    } catch (error: any) {
      showNotification({ message: `Error saving artist: ${error.message}`, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (artist: AdminArtist, action: 'verify' | 'feature') => {
    try {
      await authFetch(`/api/admin/artists/${artist.id}/${action}`, { method: 'PATCH' });
      const label = action === 'verify'
        ? (artist.verified ? 'Artist unverified!' : 'Artist verified!')
        : (artist.isFeatured ? 'Artist removed from featured!' : 'Artist featured!');
      showNotification({ message: label, type: 'success' });
      void fetchData(true);
    } catch (error: any) {
      showNotification({ message: `Error updating artist: ${error.message}`, type: 'error' });
    }
  };

  const handleToggleSuspend = async (artist: AdminArtist) => {
    if (!artist.suspended) {
      const hasConfirmed = await confirm({
        title: 'Suspend Artist',
        message: `Suspend "${artist.name}"? They will be hidden from search and public listings until unsuspended.`,
        confirmText: 'Suspend',
        cancelText: 'Cancel',
        type: 'warning'
      });
      if (!hasConfirmed) return;
    }

    try {
      await authFetch(`/api/admin/artists/${artist.id}/suspend`, { method: 'PATCH' });
      showNotification({
        message: artist.suspended ? 'Artist unsuspended!' : 'Artist suspended!',
        type: 'success'
      });
      void fetchData(true);
    } catch (error: any) {
      showNotification({ message: `Error updating artist: ${error.message}`, type: 'error' });
    }
  };

  const handleDelete = async (artist: AdminArtist) => {
    const hasConfirmed = await confirm({
      title: 'Delete Artist',
      message: `Are you sure you want to delete "${artist.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!hasConfirmed) return;

    try {
      await authFetch('/api/admin/artists/' + artist.id, { method: 'DELETE' });
      showNotification({ message: 'Artist deleted successfully!', type: 'success' });
      void fetchData(true);
    } catch (error: any) {
      showNotification({ message: `Error deleting artist: ${error.message}`, type: 'error' });
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

  const toggleFormGenre = (genre: string) => {
    setFormData((f) => ({
      ...f,
      genres: f.genres.includes(genre)
        ? f.genres.filter((g) => g !== genre)
        : [...f.genres, genre],
    }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setGenreFilter('all');
    setVerifiedFilter('all');
    setSuspendedFilter('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const formGenreOptions = Array.from(new Set([...genreOptions, ...formData.genres])).sort();

  const renderStatusBadges = (artist: AdminArtist) => (
    <div className="flex flex-wrap gap-1">
      {artist.verified && (
        <span className="px-2 py-0.5 text-xs font-medium bg-green-600/20 text-green-300 rounded-full">Verified</span>
      )}
      {artist.isFeatured && (
        <span className="px-2 py-0.5 text-xs font-medium bg-purple-600/20 text-purple-300 rounded-full">Featured</span>
      )}
      {artist.suspended && (
        <span className="px-2 py-0.5 text-xs font-medium bg-red-600/20 text-red-300 rounded-full">Suspended</span>
      )}
      {!artist.verified && !artist.isFeatured && !artist.suspended && (
        <span className="px-2 py-0.5 text-xs font-medium bg-gray-600/30 text-gray-400 rounded-full">Standard</span>
      )}
    </div>
  );

  const renderActions = (artist: AdminArtist) => (
    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => openEdit(artist)}
        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
      >
        Edit
      </button>
      <button
        onClick={() => void handleToggle(artist, 'verify')}
        className={`px-3 py-1 text-white text-sm font-semibold rounded transition-colors ${artist.verified ? 'bg-gray-600 hover:bg-gray-500' : 'bg-green-600 hover:bg-green-700'}`}
        title={artist.verified ? 'Remove verification' : 'Verify artist'}
      >
        {artist.verified ? 'Unverify' : 'Verify'}
      </button>
      <button
        onClick={() => void handleToggle(artist, 'feature')}
        className={`px-3 py-1 text-white text-sm font-semibold rounded transition-colors ${artist.isFeatured ? 'bg-gray-600 hover:bg-gray-500' : 'bg-purple-600 hover:bg-purple-700'}`}
        title={artist.isFeatured ? 'Remove from featured' : 'Feature artist'}
      >
        {artist.isFeatured ? 'Unfeature' : 'Feature'}
      </button>
      <button
        onClick={() => void handleToggleSuspend(artist)}
        className={`px-3 py-1 text-white text-sm font-semibold rounded transition-colors ${artist.suspended ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}
        title={artist.suspended ? 'Unsuspend artist' : 'Suspend artist'}
      >
        {artist.suspended ? 'Unsuspend' : 'Suspend'}
      </button>
      <button
        onClick={() => void handleDelete(artist)}
        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
      >
        Delete
      </button>
    </div>
  );

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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Artists Management</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Manage artists in your database</p>
        </div>
        <button
          onClick={openAdd}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px] sm:w-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Artist
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Total Artists</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{totalArtists}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Filtered Results</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{filteredTotal}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Verified</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{verifiedCount}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Featured</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{featuredCount}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Suspended</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{suspendedCount}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
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
                placeholder="Search by name or email..."
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

          {/* Genre Filter */}
          <div>
            <label htmlFor="artist-genre-filter" className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
            <select
              id="artist-genre-filter"
              value={genreFilter}
              onChange={(e) => {
                setGenreFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full select-chevron px-3 pr-10 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Genres</option>
              {genreOptions.map((genre) => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          {/* Verified Filter */}
          <div>
            <label htmlFor="artist-verified-filter" className="block text-sm font-medium text-gray-300 mb-2">Verified</label>
            <select
              id="artist-verified-filter"
              value={verifiedFilter}
              onChange={(e) => {
                setVerifiedFilter(e.target.value as 'all' | 'true' | 'false');
                setCurrentPage(1);
              }}
              className="w-full select-chevron px-3 pr-10 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All</option>
              <option value="true">Verified</option>
              <option value="false">Not Verified</option>
            </select>
          </div>

          {/* Suspended Filter */}
          <div>
            <label htmlFor="artist-status-filter" className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              id="artist-status-filter"
              value={suspendedFilter}
              onChange={(e) => {
                setSuspendedFilter(e.target.value as 'all' | 'true' | 'false');
                setCurrentPage(1);
              }}
              className="w-full select-chevron px-3 pr-10 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All</option>
              <option value="false">Active</option>
              <option value="true">Suspended</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label htmlFor="artist-sort-by" className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
            <div className="flex gap-2">
              <select
                id="artist-sort-by"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as typeof sortBy);
                  setCurrentPage(1);
                }}
                className="flex-1 select-chevron px-3 pr-10 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="createdAt">Newest</option>
                <option value="name">Name</option>
                <option value="popularity">Popularity</option>
                <option value="followers">Followers</option>
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
                {sortOrder === 'asc' ? 'Asc' : 'Desc'}
              </button>
            </div>
          </div>
        </div>

        {/* Reset Filters */}
        {(searchQuery || genreFilter !== 'all' || verifiedFilter !== 'all' || suspendedFilter !== 'all') && (
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

      {/* Artists List - Mobile Card View / Desktop Table View */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {artists.length === 0 ? (
          <div className="p-6 sm:p-12 text-center">
            <div className="text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-lg font-semibold text-white mb-2">No Artists Found</p>
              <p>Try adjusting your filters or add a new artist</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-900 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Artist
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Genres
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Songs
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Followers
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {artists.map((artist) => (
                    <tr
                      key={artist.id}
                      className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => openEdit(artist)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(artist); } }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Edit ${artist.name}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <ArtistImage src={artist.imageUrl} name={artist.name} />
                          <div className="min-w-0">
                            <div className="font-medium text-white">{artist.name}</div>
                            {artist.email && <div className="text-xs text-gray-400 truncate">{artist.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {artist.genres.length > 0 ? artist.genres.map((genre) => (
                            <span key={genre} className="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                              {genre}
                            </span>
                          )) : (
                            <span className="text-xs text-gray-500">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{artist.songCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{artist.followers.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatusBadges(artist)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderActions(artist)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-700">
              {artists.map((artist) => (
                <div key={artist.id} className="p-4 hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => openEdit(artist)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') openEdit(artist); }}>
                  <div className="flex items-start gap-3 mb-3">
                    <ArtistImage src={artist.imageUrl} name={artist.name} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1 line-clamp-1">{artist.name}</h3>
                      {artist.email && <p className="text-xs text-gray-400 truncate mb-1">{artist.email}</p>}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {artist.genres.map((genre) => (
                          <span key={genre} className="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                            {genre}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>{artist.songCount} songs</span>
                        <span>{artist.followers.toLocaleString()} followers</span>
                      </div>
                      <div className="mt-2">{renderStatusBadges(artist)}</div>
                    </div>
                  </div>
                  {renderActions(artist)}
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
          itemLabel="artists"
          onPageChange={setCurrentPage}
        />
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeForm}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editingArtist ? 'Edit artist' : 'Add artist'}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editingArtist ? 'Edit Artist' : 'Add New Artist'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-white" aria-label="Close">âœ•</button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="artist-name" className="mb-1 block text-sm font-medium text-gray-300">Artist Name</label>
                <input
                  id="artist-name"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Burna Boy"
                />
              </div>
              <div>
                <label htmlFor="artist-bio" className="mb-1 block text-sm font-medium text-gray-300">Bio (optional)</label>
                <textarea
                  id="artist-bio"
                  value={formData.bio}
                  onChange={(e) => setFormData((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Short artist biography..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Genres</label>
                {formGenreOptions.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-600 bg-gray-700 p-3 space-y-2">
                    {formGenreOptions.map((genre) => (
                      <label key={genre} className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.genres.includes(genre)}
                          onChange={() => toggleFormGenre(genre)}
                          className="h-4 w-4 rounded border-gray-500 bg-gray-600 text-green-500 focus:ring-green-500"
                        />
                        {genre}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No genres available. Add genres in Genres Management first.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="artist-popularity" className="mb-1 block text-sm font-medium text-gray-300">Popularity</label>
                  <input
                    id="artist-popularity"
                    type="number"
                    min={0}
                    value={formData.popularity}
                    onChange={(e) => setFormData((f) => ({ ...f, popularity: e.target.value }))}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label htmlFor="artist-followers" className="mb-1 block text-sm font-medium text-gray-300">Followers</label>
                  <input
                    id="artist-followers"
                    type="number"
                    min={0}
                    value={formData.followers}
                    onChange={(e) => setFormData((f) => ({ ...f, followers: e.target.value }))}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="artist-external-url" className="mb-1 block text-sm font-medium text-gray-300">External URL (optional)</label>
                <input
                  id="artist-external-url"
                  type="url"
                  value={formData.externalUrl}
                  onChange={(e) => setFormData((f) => ({ ...f, externalUrl: e.target.value }))}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://open.spotify.com/artist/..."
                />
              </div>
              <div>
                <label htmlFor="artist-image" className="mb-1 block text-sm font-medium text-gray-300">Image URL (optional)</label>
                <input
                  id="artist-image"
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData((f) => ({ ...f, image: e.target.value }))}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label htmlFor="artist-image-upload" className="mb-1 block text-sm font-medium text-gray-300">Or Upload Image</label>
                <input
                  id="artist-image-upload"
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
                {submitting ? 'Savingâ€¦' : editingArtist ? 'Save changes' : 'Add Artist'}
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

export default ArtistsManager;

