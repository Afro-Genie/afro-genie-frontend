import { useEffect, useState } from 'react';

interface HealthResponse {
  status: string;
  uptime: number;
  version: string;
  checks: {
    database: string;
    redis: string;
  };
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error('Failed to fetch health endpoint');
        }
        const data = (await response.json()) as HealthResponse;
        setHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    void loadHealth();
  }, []);

  return (
    <main style={{ fontFamily: 'ui-sans-serif, system-ui', margin: '2rem' }}>
      <h1>Afro Genie Client</h1>
      <p>Vite React app with dev proxy to Express server.</p>
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
      {health && (
        <pre>{JSON.stringify(health, null, 2)}</pre>
      )}
    </main>
  );
}

export default App;
