import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '../services/api';
import { toApiUrl } from '../lib/apiBase';

// ---------------------------------------------------------------------------
// Live GT balance via Server-Sent Events (Phase 1, GT economy).
//
// Opens one EventSource to GET /api/users/me/balance/stream (JWT passed via
// ?token= because EventSource can't set request headers). On every committed
// ledger transaction the backend pushes a `balance` event; the hook keeps the
// latest balance in state. A 30s polling fallback keeps things fresh when SSE
// is unavailable (proxies, auth hiccups), and the connection auto-reconnects
// with a 3s backoff.
// ---------------------------------------------------------------------------

export interface BalanceUpdateEvent {
  balance: number;
  delta: number;
  type: string;
  reason: string;
  timestamp: string;
}

type StreamStatus = 'idle' | 'connecting' | 'open' | 'error';

const RECONNECT_DELAY_MS = 3000;
const POLL_FALLBACK_MS = 30000;

export const useBalanceStream = (userId: string | null) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [lastEvent, setLastEvent] = useState<BalanceUpdateEvent | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<number | null>(null);

  const loadBalance = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(toApiUrl('/users/me/balance'), {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { balance: number };
        setBalance(data.balance);
      }
    } catch {
      // Transient failure: fall back to the last known balance.
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setBalance(null);
      setLastEvent(null);
      setStatus('idle');
      return;
    }

    setLastEvent(null);

    const token = getAccessToken();
    if (!token) {
      loadBalance();
      return;
    }

    let closed = false;

    const connect = () => {
      if (closed) return;
      setStatus('connecting');

      const url = toApiUrl(
        `/users/me/balance/stream?token=${encodeURIComponent(token)}`,
      );
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        if (closed) return;
        setStatus('open');
        loadBalance();
      };

      es.addEventListener('balance', (event) => {
        if (closed) return;
        try {
          const data = JSON.parse((event as MessageEvent).data) as BalanceUpdateEvent;
          if (typeof data.balance === 'number') {
            setLastEvent(data);
            setBalance(data.balance);
          }
        } catch {
          // Ignore malformed payloads.
        }
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (closed) return;
        setStatus('error');
        window.setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    pollRef.current = window.setInterval(loadBalance, POLL_FALLBACK_MS);

    return () => {
      closed = true;
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [userId, loadBalance]);

  return { balance, status, lastEvent, refresh: loadBalance };
};