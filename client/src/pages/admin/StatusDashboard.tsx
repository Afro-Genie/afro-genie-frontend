import { useEffect, useState } from 'react';
import api from '../../lib/apiClient';

interface HealthResponse {
  status?: string;
  uptime?: number;
  version?: string;
  checks?: Record<string, string>;
}

export default function StatusDashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/health');
        setHealth(res.data as HealthResponse);
      } catch {
        setError('Could not load backend health status.');
      }
    };

    void load();
  }, []);

  return (
    <div className="container">
      <h1>Admin Status</h1>
      {error && <p style={{ color: '#ff7b72' }}>{error}</p>}
      {health && (
        <div className="card">
          <p>Status: {health.status || 'unknown'}</p>
          <p>Uptime: {Math.round(health.uptime || 0)}s</p>
          <p>Version: {health.version || 'n/a'}</p>
          <pre className="lyrics">{JSON.stringify(health.checks || {}, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
