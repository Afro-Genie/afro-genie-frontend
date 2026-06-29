import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/apiClient';
import type { Song, Translation, TranslationsGroupedResponse } from './types';

interface TranslationJobStatus {
  jobId: string;
  state: string;
  failedReason?: string;
  userMessage?: string;
}

const normalizeSong = (payload: unknown): Song | null => {
  if (payload && typeof payload === 'object') {
    if ('song' in (payload as Record<string, unknown>)) {
      return ((payload as { song: Song }).song ?? null) as Song | null;
    }
    return payload as Song;
  }
  return null;
};

const flattenTranslations = (payload: unknown): Translation[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const data = payload as TranslationsGroupedResponse;
  if (!data.translations || typeof data.translations !== 'object') {
    return [];
  }

  return Object.values(data.translations)
    .flatMap((group) => (Array.isArray(group) ? group : []))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const detectSourceLang = (song: Song | null): string => {
  return song?.songLanguages?.[0]?.languageCode || 'en';
};

export default function TranslationPage() {
  const { id = '' } = useParams();
  const [song, setSong] = useState<Song | null>(null);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    const load = async () => {
      try {
        const [songRes, transRes] = await Promise.all([
          api.get(`/api/songs/${id}`),
          api.get(`/api/translations/${id}`)
        ]);
        const nextSong = normalizeSong(songRes.data);
        setSong(nextSong);
        setTranslations(flattenTranslations(transRes.data));
        setError(null);
      } catch {
        setError('Failed to load song details.');
      }
    };

    void load();
  }, [id]);

  const approved = useMemo(
    () => translations.find((t) => String(t.status || '').toUpperCase() === 'APPROVED'),
    [translations]
  );

  const pollJob = async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 30;

    const pollOnce = async (): Promise<void> => {
      attempts += 1;
      const statusRes = await api.get(`/api/translations/status/${jobId}`);
      const status = statusRes.data as TranslationJobStatus;
      const state = String(status.state || '').toLowerCase();

      if (state === 'completed') {
        const transRes = await api.get(`/api/translations/${id}`);
        setTranslations(flattenTranslations(transRes.data));
        setIsTranslating(false);
        return;
      }

      if (state === 'failed' || attempts >= maxAttempts) {
        setIsTranslating(false);
        setError(status.userMessage || status.failedReason || 'Translation failed.');
        if (attempts >= maxAttempts) {
          setError('Translation request timed out.');
        }
        return;
      }

      window.setTimeout(() => {
        void pollOnce();
      }, 3000);
    };

    await pollOnce();
  };

  const requestTranslation = async () => {
    if (!id || isTranslating) {
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const sourceLang = detectSourceLang(song);
      const targetLang = 'en';
      const res = await api.post('/api/translations/request', { songId: id, sourceLang, targetLang });
      const payload = res.data as { status?: 'existing' | 'queued'; jobId?: string; translation?: Translation };
      const existingTranslation = payload.translation;

      if (payload.status === 'existing' && existingTranslation) {
        setTranslations((prev) => [existingTranslation, ...prev]);
        setIsTranslating(false);
        return;
      }

      const jobId = payload.jobId;
      if (!jobId) {
        throw new Error('No job id returned');
      }
      await pollJob(jobId);
    } catch {
      setIsTranslating(false);
      setError('Could not start translation.');
    }
  };

  const castVote = async (translationId: string, value: 1 | -1) => {
    setError(`Voting is not available in the current Express API yet (${translationId}:${value}).`);
  };

  const originalLyrics = song?.lyrics?.[0]?.content || 'Original lyrics not available yet.';

  return (
    <div className="container">
      {song ? (
        <>
          <h1>{song.title}</h1>
          <p className="muted">{song.artist?.name || 'Unknown artist'}</p>

          {approved ? (
            <div className="side-by-side">
              <section className="card">
                <h3>Original Lyrics</h3>
                <pre className="lyrics">{originalLyrics}</pre>
              </section>
              <section className="card">
                <h3>Approved Translation</h3>
                <pre className="lyrics">{approved.translatedLyrics || 'No text available.'}</pre>
                <div className="row" style={{ marginTop: '0.75rem' }}>
                  <button onClick={() => castVote(approved.id, 1)}>Upvote</button>
                  <button onClick={() => castVote(approved.id, -1)}>Downvote</button>
                  <span className="muted">Voting endpoint pending backend implementation</span>
                </div>
              </section>
            </div>
          ) : (
            <section className="card">
              <p>No approved translation yet for this song.</p>
              <button className="primary" onClick={requestTranslation} disabled={isTranslating}>
                {isTranslating ? 'Translating...' : 'Translate'}
              </button>
            </section>
          )}

          {error && <p style={{ color: '#ff7b72' }}>{error}</p>}
        </>
      ) : (
        <p>{error || 'Loading song...'}</p>
      )}
    </div>
  );
}
