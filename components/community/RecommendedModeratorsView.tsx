import React, { useState, useEffect, useCallback } from 'react';
import { communityApi } from '../../services/communityService';
import ModeratorProfileCard from './ModeratorProfileCard';
import type { RecommendedModerator } from '../../types';

function ModeratorGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 bg-gray-700 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-700 rounded w-24" />
              <div className="h-3 bg-gray-700 rounded w-16" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="bg-gray-800 rounded p-2">
                <div className="h-3 bg-gray-700 rounded w-10 mb-1" />
                <div className="h-4 bg-gray-700 rounded w-6" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const RecommendedModeratorsView: React.FC = React.memo(() => {
  const [moderators, setModerators] = useState<RecommendedModerator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await communityApi.getRecommendedModerators(20);
      setModerators(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load moderators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return <ModeratorGridSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
        <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={fetch} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">Retry</button>
      </div>
    );
  }

  if (moderators.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-800/50 rounded-lg border border-gray-700">
        <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <p className="text-gray-400 text-lg mb-1">No moderators found</p>
        <p className="text-gray-500 text-sm">Check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">Top contributors who help keep the community safe and organized.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {moderators.map(mod => (
          <ModeratorProfileCard key={mod.id} moderator={mod} />
        ))}
      </div>
    </div>
  );
});

export default RecommendedModeratorsView;
