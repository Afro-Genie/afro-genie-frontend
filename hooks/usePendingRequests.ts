import { useState, useEffect, useCallback, useRef } from 'react';
import { artistApplicationApi, roleRequestsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface PendingArtistApplication {
  id: string;
  status: string;
  stageName: string;
  createdAt: string;
}

export interface PendingRoleRequest {
  id: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface PendingRequestsState {
  artistApplication: PendingArtistApplication | null;
  roleRequests: PendingRoleRequest[];
  loading: boolean;
  roleRequestsError: string | null;
  refresh: () => Promise<void>;
}

export function usePendingRequests(): PendingRequestsState {
  const { user } = useAuth();
  const [artistApplication, setArtistApplication] = useState<PendingArtistApplication | null>(null);
  const [roleRequests, setRoleRequests] = useState<PendingRoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleRequestsError, setRoleRequestsError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchPending = useCallback(async (showLoading = true) => {
    const requestId = ++requestIdRef.current;
    if (!user) {
      setArtistApplication(null);
      setRoleRequests([]);
      setRoleRequestsError(null);
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    const [artistResult, roleRequestsResult] = await Promise.allSettled([
      artistApplicationApi.getStatus(),
      roleRequestsApi.getPending(),
    ]);

    if (requestId !== requestIdRef.current) return;

    setArtistApplication(
      artistResult.status === 'fulfilled' ? artistResult.value.application : null,
    );
    if (roleRequestsResult.status === 'fulfilled') {
      setRoleRequests(roleRequestsResult.value.requests);
      setRoleRequestsError(null);
    } else {
      setRoleRequests([]);
      setRoleRequestsError('Unable to check for pending moderator requests. Please retry.');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchPending();

    const refreshPending = () => {
      if (document.visibilityState === 'visible') {
        void fetchPending(false);
      }
    };
    const intervalId = window.setInterval(refreshPending, 30_000);
    window.addEventListener('focus', refreshPending);
    document.addEventListener('visibilitychange', refreshPending);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshPending);
      document.removeEventListener('visibilitychange', refreshPending);
    };
  }, [fetchPending]);

  return {
    artistApplication,
    roleRequests,
    loading,
    roleRequestsError,
    refresh: fetchPending,
  };
}
