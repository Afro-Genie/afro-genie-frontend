import { useState, useEffect, useCallback } from 'react';
import { artistApplicationApi } from '../services/api';
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
  refresh: () => Promise<void>;
}

export function usePendingRequests(): PendingRequestsState {
  const { user } = useAuth();
  const [artistApplication, setArtistApplication] = useState<PendingArtistApplication | null>(null);
  const [roleRequests, setRoleRequests] = useState<PendingRoleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    if (!user) {
      setArtistApplication(null);
      setRoleRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const artistRes = await artistApplicationApi.getStatus().catch(() => ({ application: null }));
      setArtistApplication(artistRes.application);
    } catch {
      // Non-fatal: we just won't show pending state
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  return {
    artistApplication,
    roleRequests,
    loading,
    refresh: fetchPending,
  };
}
