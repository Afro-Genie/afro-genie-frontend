import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import { SearchIcon, CheckIcon } from '../../components/icons/FlatIcons';

interface Artist {
  id: string;
  stageName: string;
  email: string;
  songsCount: number;
  verified: boolean;
  suspended: boolean;
  featured: boolean;
}

const PAGE_SIZE = 10;

const ArtistManagementPage: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ data: Artist[] } | Artist[]>('/admin/artists');
      setArtists(Array.isArray(data) ? data : data.data ?? []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArtists = artists.filter(
    (a) =>
      a.stageName.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredArtists.length / PAGE_SIZE);
  const paginatedArtists = filteredArtists.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const handleToggle = async (id: string, action: 'verify' | 'suspend' | 'feature') => {
    setToggling(`${id}-${action}`);
    try {
      await apiRequest(`/admin/artists/${id}/${action}`, { method: 'PATCH' });
      fetchArtists();
    } catch (error) {
      console.error(`Error toggling ${action}:`, error);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Artist Management</h1>
        <p className="text-gray-400 mt-1">Manage artist accounts</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search artists by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : paginatedArtists.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No artists found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Songs
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Verified
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Suspended
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Featured
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {paginatedArtists.map((artist) => (
                  <tr key={artist.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{artist.stageName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{artist.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{artist.songsCount}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggle(artist.id, 'verify')}
                        disabled={toggling === `${artist.id}-verify`}
                        className={`inline-flex items-center justify-center w-10 h-6 rounded-full transition-colors ${
                          artist.verified
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-600 hover:bg-gray-500'
                        } disabled:opacity-50`}
                        title={artist.verified ? 'Verified (click to unverify)' : 'Not verified (click to verify)'}
                      >
                        {artist.verified && <CheckIcon className="w-4 h-4 text-white" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggle(artist.id, 'suspend')}
                        disabled={toggling === `${artist.id}-suspend`}
                        className={`inline-flex items-center justify-center w-10 h-6 rounded-full transition-colors ${
                          artist.suspended
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-gray-600 hover:bg-gray-500'
                        } disabled:opacity-50`}
                        title={artist.suspended ? 'Suspended (click to unsuspend)' : 'Active (click to suspend)'}
                      >
                        {artist.suspended && <CheckIcon className="w-4 h-4 text-white" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggle(artist.id, 'feature')}
                        disabled={toggling === `${artist.id}-feature`}
                        className={`inline-flex items-center justify-center w-10 h-6 rounded-full transition-colors ${
                          artist.featured
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-gray-600 hover:bg-gray-500'
                        } disabled:opacity-50`}
                        title={artist.featured ? 'Featured (click to unfeature)' : 'Not featured (click to feature)'}
                      >
                        {artist.featured && <CheckIcon className="w-4 h-4 text-white" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistManagementPage;
