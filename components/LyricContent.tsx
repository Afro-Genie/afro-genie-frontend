import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlaybackSettings } from '../context/PlaybackSettingsContext';
import { getSongById, getSongTranslations } from '../lib/apiClient';
import { SUPPORTED_LANGUAGES } from '../constants';
import HeartIcon from './icons/HeartIcon';
import ShareIcon from './icons/ShareIcon';
import SpotifyPlayer from './SpotifyPlayer';
import CulturalContextCarousel from './CulturalContextCarousel';
import type { Song } from '../types';

// Strip LRC timestamp prefixes like [01:23.45] or [01:23.456] from lyrics text
const stripTimestamps = (text: string): string => {
  return text.replace(/^\[\d{1,3}:\d{2}\.\d{2,3}\]\s*/gm, '');
};

interface LyricContentProps {
  onCulturalContextLoaded?: (context: string) => void;
}

const LyricContent: React.FC<LyricContentProps> = ({ onCulturalContextLoaded }) => {
    const { user: currentUser, authFetch } = useAuth();
    const { fontSize } = usePlaybackSettings();
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const { id: songIdParam } = useParams<{ id: string }>();
    const songId = useMemo(() => songIdParam ?? '', [songIdParam]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [artist, setArtist] = useState<string>('');
    const [songSpotifyId, setSongSpotifyId] = useState<string | null>(null);
    const [originalLyrics, setOriginalLyrics] = useState<string>('');
    const [translatedLyrics, setTranslatedLyrics] = useState<string>('');
    const [culturalContext, setCulturalContext] = useState<string>('');
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteId, setFavoriteId] = useState<string | null>(null);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [song, setSong] = useState<Song | null>(null);
    const [requestLoading, setRequestLoading] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [translationLoading, setTranslationLoading] = useState(false);
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);
    const [sourceLang, setSourceLang] = useState<string>('en');
    const [targetLang, setTargetLang] = useState<string>('en');
    const [existingTranslationId, setExistingTranslationId] = useState<string | null>(null);
    const [languages, setLanguages] = useState<Array<{ code: string; name: string }>>([]);
    const [detectingLanguage, setDetectingLanguage] = useState(false);

    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [sourceProvider, setSourceProvider] = useState<string | null>(null);
    const [songSource, setSongSource] = useState<string | null>(null);

    const isSpotifyImageUrl = (url?: string): boolean => {
        if (!url || typeof url !== 'string') return false;
        try {
            const parsed = new URL(url);
            return parsed.hostname === 'i.scdn.co';
        } catch {
            return false;
        }
    };

    const formattedCulturalContext = useMemo(() => {
        if (!culturalContext) return '';
        return culturalContext
            // Normalize markdown-like symbols that sometimes leak from AI output
            .replace(/^\s*#{1,6}\s*/gm, '')
            .replace(/^\s*[-*]\s+/gm, '• ')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }, [culturalContext]);

    const extractTranslations = (payload: any): any[] => {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.translations)) return payload.translations;
        if (payload.translations && typeof payload.translations === 'object') {
            return Object.values(payload.translations).flatMap((group: any) =>
                Array.isArray(group) ? group : []
            );
        }
        return [];
    };

    const pickTranslationText = (translation: any) =>
        translation?.translatedLyrics ||
        translation?.translation ||
        translation?.result?.translatedLyrics ||
        '';

    // Normalize and rank translations by quality (PUBLISHED > APPROVED > PENDING)
    const normalizeAndRankTranslations = (translations: any[]): any[] => {
        const statusRank: Record<string, number> = {
            PUBLISHED: 3,
            APPROVED: 2,
            PENDING: 1,
            REJECTED: 0,
        };
        return [...translations].sort((a, b) => {
            const rankA = statusRank[String(a.status || '').toUpperCase()] ?? 0;
            const rankB = statusRank[String(b.status || '').toUpperCase()] ?? 0;
            if (rankB !== rankA) return rankB - rankA;
            // Prefer translations with non-empty translatedLyrics
            const aHasText = pickTranslationText(a) ? 1 : 0;
            const bHasText = pickTranslationText(b) ? 1 : 0;
            if (bHasText !== aHasText) return bHasText - aHasText;
            // Fall back to most recent
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
    };

    // Resolve source language: stored metadata first, then song language, then 'en'
    const resolveSourceLang = (translation: any, songMeta: Song | null): string => {
        if (translation?.sourceLang) return translation.sourceLang;
        if (songMeta?.language) {
            const code = songMeta.language.toLowerCase().split(',')[0].trim();
            if (code) return code;
        }
        return 'en';
    };

    // Load languages from database
    useEffect(() => {
        const loadLanguages = async () => {
            try {
                const fetchedLanguages = await authFetch('/api/languages').catch(() => []);

                const rawLangs = Array.isArray(fetchedLanguages) ? fetchedLanguages : fetchedLanguages?.languages ?? [];
                const nameMap = new Map();
                rawLangs.forEach((lang: any) => {
                    const normalizedName = (lang.name || '').trim().toLowerCase();
                    if (!nameMap.has(normalizedName)) {
                        nameMap.set(normalizedName, lang);
                    }
                });

                const codeMap = new Map();
                Array.from(nameMap.values()).forEach((lang: any) => {
                    const normalizedCode = (lang.code || '').trim().toLowerCase();
                    if (!codeMap.has(normalizedCode)) {
                        codeMap.set(normalizedCode, lang);
                    }
                });

                const uniqueLanguages = Array.from(codeMap.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
                setLanguages(uniqueLanguages.map((lang: any) => ({ code: lang.code.toLowerCase(), name: lang.name })));
            } catch (error) {
                console.error('Error loading languages:', error);
                // Fallback to canonical language list
                setLanguages(SUPPORTED_LANGUAGES.filter(l => l.isActive).map(l => ({ code: l.code, name: l.name })));
            }
        };
        loadLanguages();
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!songId) return;
            setLoading(true);
            setError('');
            try {
                const songResponse = await getSongById(songId);
                const normalizedSong: Song | null = songResponse
                    ? {
                        id: songResponse.id,
                        title: songResponse.title,
                        artist: songResponse.artist?.name || songResponse.artistName || '',
                        artistId: songResponse.artistId || songResponse.artist?.id || '',
                        image: songResponse.coverImageUrl || songResponse.imageUrl || songResponse.image || '',
                        language: songResponse.primaryLanguage || songResponse.languages?.[0] || '',
                    }
                    : null;

                if (!normalizedSong) {
                    if (!cancelled) {
                        setError('Song not found');
                        setTitle('Song');
                        setArtist('');
                    }
                } else if (!cancelled) {
                    setTitle(normalizedSong.title);
                    setArtist(normalizedSong.artist);
                    setSongSpotifyId(songResponse.spotifyId || null);

                    if (!normalizedSong.image || !isSpotifyImageUrl(normalizedSong.image)) {
                        try {
                            const searchData = await authFetch('/api/search/spotify-image?artist=' + encodeURIComponent(normalizedSong.artist) + '&track=' + encodeURIComponent(normalizedSong.title)).catch(() => null);
                            if (searchData?.imageUrl && !cancelled) {
                                setSong({ ...normalizedSong, image: searchData.imageUrl });
                            } else {
                                setSong({ ...normalizedSong, image: '' });
                            }
                        } catch {
                            setSong({ ...normalizedSong, image: '' });
                        }
                    } else {
                        setSong(normalizedSong);
                    }
                }

                const songSource = songResponse?.source || null;
                if (songSource && !cancelled) {
                    setSongSource(songSource);
                }
                const songLyrics = songResponse?.lyrics?.[0]?.content || '';
                const lyricsSource = songResponse?.lyrics?.[0]?.sourceProvider || null;
                if (lyricsSource && !cancelled) {
                    setSourceProvider(lyricsSource);
                }

                const translationResponse = await getSongTranslations(songId).catch(() => null);
                const availableTranslations = normalizeAndRankTranslations(extractTranslations(translationResponse));
                // Pick the best translation: one with non-empty translated text preferred
                const bestTranslation = availableTranslations.find((t: any) => pickTranslationText(t)) || availableTranslations[0] || null;

                if (bestTranslation && !cancelled) {
                    setOriginalLyrics(bestTranslation.originalLyrics || songLyrics || 'No lyrics available yet for this song.');
                    setTranslatedLyrics(pickTranslationText(bestTranslation) || 'No translation available yet. Use "Translate Lyrics" to generate one.');
                    setCulturalContext(bestTranslation.culturalContext || '');
                    setExistingTranslationId(bestTranslation.id || bestTranslation.translationId || null);

                    // Resolve source language: translation metadata > song metadata > 'en'
                    setSourceLang(resolveSourceLang(bestTranslation, normalizedSong));
                    if (bestTranslation.targetLang) {
                        setTargetLang(bestTranslation.targetLang);
                    }
                } else if (!cancelled) {
                    setOriginalLyrics(songLyrics || 'No lyrics available yet for this song.');
                    setTranslatedLyrics('No translation available yet. Use "Translate Lyrics" to generate one.');
                    setExistingTranslationId(null);
                    // Resolve source language from song metadata
                    setSourceLang(resolveSourceLang(null, normalizedSong));
                }

                // Add to history if user is logged in
                if (currentUser && songId) {
                    await authFetch('/api/users/history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ songId }),
                    }).catch(() => undefined);
                }

                // Check if song is in favorites
                if (currentUser) {
                    const favoritesData = await authFetch('/api/users/favorites').catch(() => []);
                    const favs = Array.isArray(favoritesData) ? favoritesData : favoritesData?.favorites ?? [];
                    const fav = favs.find((f: any) => f.songId === songId);
                    if (fav && !cancelled) {
                        setIsFavorite(true);
                        setFavoriteId(fav.id || null);
                    }
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || 'Failed to load song');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [songId, currentUser]);

    // Notify parent when cultural context is loaded
    useEffect(() => {
        if (culturalContext && onCulturalContextLoaded) {
            onCulturalContextLoaded(culturalContext);
        }
    }, [culturalContext, onCulturalContextLoaded]);

    const FAVORITES_LIMIT = 5;

    const handleFavoriteToggle = async () => {
        if (!currentUser) {
            setNotification({ message: 'Please sign in to add favorites', type: 'error' });
            setTimeout(() => setNotification(null), 4000);
            return;
        }
        if (!songId) return;

        setFavoriteLoading(true);
        try {
            if (isFavorite && favoriteId) {
                await authFetch('/api/users/favorites/' + favoriteId, { method: 'DELETE' });
                setIsFavorite(false);
                setFavoriteId(null);
                setNotification({ message: 'Removed from favorites', type: 'success' });
                setTimeout(() => setNotification(null), 3000);
            } else {
                const favoritesData = await authFetch('/api/users/favorites').catch(() => []);
                const favs = Array.isArray(favoritesData) ? favoritesData : favoritesData?.favorites ?? [];
                if (favs.length >= FAVORITES_LIMIT) {
                    setNotification({ message: `Favorites limit reached (${FAVORITES_LIMIT}). Remove one first.`, type: 'error' });
                    setTimeout(() => setNotification(null), 4000);
                    setFavoriteLoading(false);
                    return;
                }
                const result = await authFetch('/api/users/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ songId }),
                });
                const newFavId = result?.id || result?.favoriteId || songId;
                setIsFavorite(true);
                setFavoriteId(newFavId);
                setNotification({ message: 'Added to favorites', type: 'success' });
                setTimeout(() => setNotification(null), 3000);
            }
        } catch (err: any) {
            setNotification({ message: err.message || 'Failed to update favorite', type: 'error' });
            setTimeout(() => setNotification(null), 4000);
        } finally {
            setFavoriteLoading(false);
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: `${title} by ${artist}`,
                text: 'Check out this song on AfroGenie!',
                url: url
            });
        } else {
            navigator.clipboard.writeText(url);
            setNotification({ message: 'Link copied to clipboard!', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const handleRequestTranslation = async () => {
        if (!songId || !title || !artist) return;

        setRequestLoading(true);
        try {
            // Resolve source language: song metadata first, then default
            const resolvedSource = resolveSourceLang(null, song) || sourceLang || 'en';
            const resolvedTarget = targetLang || 'en';

            await authFetch('/api/translations/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    songId,
                    sourceLang: resolvedSource,
                    targetLang: resolvedTarget,
                }),
            });
            setNotification({
                message: 'Request received. Estimated turnaround: 5-10 minutes.\nThanks for contributing to AfroGenie.',
                type: 'success'
            });
            // Auto-hide after 4 seconds
            setTimeout(() => setNotification(null), 4000);
        } catch (err: any) {
            setNotification({ message: 'Failed to submit request: ' + err.message, type: 'error' });
            // Auto-hide after 5 seconds for errors
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setRequestLoading(false);
        }
    };

    const handleGenerateTranslation = async () => {
        if (!songId || !title || !artist || !originalLyrics || originalLyrics === 'No lyrics available yet for this song.') {
            setNotification({ message: 'Original lyrics are required for translation', type: 'error' });
            setTimeout(() => setNotification(null), 4000);
            return;
        }

        // Check if translation already exists and is not empty
        const hasValidTranslation = translatedLyrics &&
            translatedLyrics.trim() &&
            translatedLyrics !== 'No translation available yet. Use "Translate Lyrics" to generate one.';

        if (hasValidTranslation) {
            setNotification({ message: 'Translation already exists. Please reset it first to generate a new translation.', type: 'error' });
            setTimeout(() => setNotification(null), 4000);
            return;
        }

        setTranslationLoading(true);
        let detectedSourceLang = 'en';

        try {
            if (!currentUser) {
                setShowLoginPrompt(true);
                throw new Error('Please sign in to generate translations');
            }

            // Start elapsed timer for UI feedback
            startElapsedTimer();

            // Language detection: stored metadata first, then lyric-based detection
            setDetectingLanguage(true);
            try {
                // Priority 1: Use stored song metadata language if available
                const storedLang = resolveSourceLang(null, song);
                if (storedLang && storedLang !== 'en') {
                    detectedSourceLang = storedLang;
                    setSourceLang(detectedSourceLang);

                    const langData = await authFetch('/api/languages/' + detectedSourceLang).catch(() => null);
                    const langName = langData?.name || detectedSourceLang;
                    setNotification({
                        message: `Source language from song metadata: ${langName}`,
                        type: 'success'
                    });
                    setTimeout(() => setNotification(null), 3000);
                } else {
                    // Priority 2: AI lyric-based detection
                    const detectResult = await authFetch('/api/translations/detect-language', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lyrics: originalLyrics }),
                    });
                    detectedSourceLang = detectResult?.languageCode || detectResult?.language || detectResult?.langCode || 'en';
                    setSourceLang(detectedSourceLang);

                    const langData = await authFetch('/api/languages/' + detectedSourceLang).catch(() => null);
                    const langName = langData?.name || detectedSourceLang;

                    setNotification({
                        message: `Detected source language: ${langName}`,
                        type: 'success'
                    });
                    setTimeout(() => setNotification(null), 3000);
                }
            } catch (detectError) {
                console.error('Language detection failed:', detectError);
                // Priority 3: Use song metadata or default to 'en'
                detectedSourceLang = resolveSourceLang(null, song) || sourceLang || 'en';
                setSourceLang(detectedSourceLang);

                setNotification({
                    message: 'Language detection unavailable. Using song metadata or default.',
                    type: 'error'
                });
                setTimeout(() => setNotification(null), 4000);
            } finally {
                setDetectingLanguage(false);
            }

            if (detectedSourceLang === targetLang) {
                console.log('Source matches target, proceeding anyway for context-aware translation');
            }

            // Attempt AI translation
            let requestResult;
            try {
                requestResult = await authFetch('/api/translations/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        songId,
                        sourceLang: detectedSourceLang || 'auto',
                        targetLang,
                    }),
                });
            } catch (requestError: any) {
                // If the translation service is unavailable, offer the request path instead
                const errorMsg = String(requestError?.message || '').toLowerCase();
                if (errorMsg.includes('500') || errorMsg.includes('internal server') || errorMsg.includes('budget') || errorMsg.includes('capacity')) {
                    setNotification({
                        message: 'AI translation is temporarily unavailable. You can request a translation and our team will process it.',
                        type: 'error'
                    });
                    setTimeout(() => setNotification(null), 6000);
                    return;
                }
                throw requestError;
            }

            const jobId = requestResult?.jobId || requestResult?.id;

            const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
            let resolvedTranslationText =
                pickTranslationText(requestResult?.translation) ||
                pickTranslationText(requestResult?.result) ||
                requestResult?.translatedLyrics ||
                '';
            let resolvedTranslationId = requestResult?.translation?.id || null;

            if (!resolvedTranslationText && jobId) {
                // Poll up to 90 attempts × 2s = 3 minutes for background AI translation
                const MAX_POLL_ATTEMPTS = 90;
                const POLL_INTERVAL_MS = 2000;

                for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
                    let pollResult;
                    try {
                        pollResult = await authFetch('/api/translations/status/' + jobId);
                    } catch (pollError) {
                        // Polling failure is not fatal — retry on next attempt
                        await sleep(POLL_INTERVAL_MS);
                        continue;
                    }
                    const jobState = String(pollResult?.state || pollResult?.status || '').toLowerCase();

                    if (jobState === 'failed' || jobState === 'error') {
                        throw new Error(pollResult?.failedReason || pollResult?.error || 'Translation job failed after multiple attempts.');
                    }

                    // When job is completed, fetch the translation directly
                    if (jobState === 'completed' || jobState === 'finished') {
                        const songTranslations = await getSongTranslations(songId).catch(() => null);
                        const allTranslations = normalizeAndRankTranslations(extractTranslations(songTranslations));
                        const matching = allTranslations.find((t: any) => {
                            const text = pickTranslationText(t);
                            return text && t.sourceLang === detectedSourceLang && t.targetLang === targetLang;
                        }) || allTranslations.find((t: any) => pickTranslationText(t)) || allTranslations[0];
                        if (matching) {
                            resolvedTranslationText = pickTranslationText(matching);
                            resolvedTranslationId = matching.id || matching.translationId || resolvedTranslationId;
                        }
                        if (resolvedTranslationText) break;
                    }

                    // Still processing — show status update at progress milestones
                    if (attempt === 15) {
                        setNotification({
                            message: 'Translation is still processing… this may take a minute for longer songs.',
                            type: 'info'
                        });
                    }

                    await sleep(POLL_INTERVAL_MS);
                }
            }

            if (!resolvedTranslationText) {
                // Don't throw — show a non-error status so the user can retry later
                setNotification({
                    message: 'Translation is still being generated. Please check back in a few minutes.',
                    type: 'info'
                });
                setTimeout(() => setNotification(null), 8000);
                return;
            }

            setExistingTranslationId(resolvedTranslationId || existingTranslationId);

            // Update local state
            setTranslatedLyrics(resolvedTranslationText);
            setSourceLang(detectedSourceLang);
            setShowLanguageSelector(false);

            setNotification({
                message: 'Translation generated successfully!',
                type: 'success'
            });
            setTimeout(() => setNotification(null), 4000);
        } catch (err: any) {
            console.error('Translation generation error:', err);
            stopElapsedTimer();
            if (String(err?.message || '').toLowerCase().includes('session expired')) {
                setShowLoginPrompt(true);
            }
            // Provide specific error messages based on failure reason
            const msg = String(err?.message || '').toLowerCase();
            let userMessage = 'Failed to generate translation';
            if (msg.includes('rate') || msg.includes('429') || msg.includes('quota')) {
                userMessage = 'Translation service is experiencing high demand. Please try again in a few minutes.';
            } else if (msg.includes('budget') || msg.includes('token') || msg.includes('capacity')) {
                userMessage = 'Translation service has reached its usage limit. Please try again later or request a human translation.';
            } else if (msg.includes('no lyrics') || msg.includes('lyrics required')) {
                userMessage = 'No lyrics found for this song. Please ensure lyrics are available before translating.';
            } else if (msg.includes('failed after') || msg.includes('timeout')) {
                userMessage = 'Translation timed out. The song may be too long or the service is busy. Please try again.';
            } else if (msg.includes('session expired') || msg.includes('unauthorized')) {
                userMessage = 'Your session has expired. Please sign in again.';
            } else if (err.message) {
                userMessage = `Failed to generate translation: ${err.message}`;
            }
            setNotification({ message: userMessage, type: 'error' });
            setTimeout(() => setNotification(null), 6000);
        } finally {
            stopElapsedTimer();
            setTranslationLoading(false);
            setDetectingLanguage(false);
        }
    };



    const handleResetTranslation = async () => {
        if (!existingTranslationId) {
            setNotification({ message: 'No translation to reset', type: 'error' });
            setTimeout(() => setNotification(null), 4000);
            return;
        }

        if (!window.confirm('Are you sure you want to reset the translation? This will clear the translated lyrics and allow you to generate a new translation.')) {
            return;
        }

        try {
            await authFetch('/api/translations/' + existingTranslationId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ translatedLyrics: '' }),
            });

            setTranslatedLyrics('No translation available yet. Use "Translate Lyrics" to generate one.');
            setNotification({
                message: 'Translation reset. You can now generate a new translation.',
                type: 'success'
            });
            setTimeout(() => setNotification(null), 4000);
        } catch (err: any) {
            setNotification({
                message: 'Failed to reset translation: ' + (err.message || 'Unknown error'),
                type: 'error'
            });
            setTimeout(() => setNotification(null), 5000);
        }
    };

    // Strip timestamps from lyrics for clean display
    const cleanOriginalLyrics = useMemo(() => stripTimestamps(originalLyrics), [originalLyrics]);
    const cleanTranslatedLyrics = useMemo(() => stripTimestamps(translatedLyrics), [translatedLyrics]);

    const hasNoLyrics = cleanOriginalLyrics === 'No lyrics available yet for this song.' || !cleanOriginalLyrics.trim();
    const hasNoTranslation = cleanTranslatedLyrics === 'No translation available yet. Use "Translate Lyrics" to generate one.' || !cleanTranslatedLyrics.trim();
    const hasOriginalLyrics = !hasNoLyrics;
    const canGenerateTranslation = hasOriginalLyrics && hasNoTranslation;

    // Estimate translation time based on lyrics character count (Gemini 3.5 Flash characteristics)
    const estimateTranslationTime = (chars: number): { seconds: number; label: string } => {
        if (chars < 1000) return { seconds: 10, label: '~10 seconds' };
        if (chars < 3000) return { seconds: 15, label: '~15 seconds' };
        if (chars < 8000) return { seconds: 25, label: '~25 seconds' };
        return { seconds: 40, label: '~40+ seconds' };
    };

    // Format elapsed seconds to a human-readable string
    const formatElapsed = (secs: number): string => {
        if (secs < 60) return `${secs}s`;
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}m ${s}s`;
    };

    // Start/stop elapsed timer helper
    const startElapsedTimer = () => {
        setElapsedSeconds(0);
        elapsedTimerRef.current = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);
        }, 1000);
    };
    const stopElapsedTimer = () => {
        if (elapsedTimerRef.current) {
            clearInterval(elapsedTimerRef.current);
            elapsedTimerRef.current = null;
        }
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        };
    }, []);
    const hasValidTranslation = cleanTranslatedLyrics &&
        cleanTranslatedLyrics.trim() &&
        cleanTranslatedLyrics !== 'No translation available yet. Use "Translate Lyrics" to generate one.';

    // Split lyrics into lines for inline mode
    const originalLines = cleanOriginalLyrics.split('\n');
    const translatedLines = cleanTranslatedLyrics.split('\n');

    // Render lyrics in inline view
    const renderLyrics = () => {
        return (
            <div className="space-y-4" style={{ fontSize: '20px' }}>
                {originalLines.map((line, index) => (
                    <div key={index} className="space-y-1">
                        <p className="font-sans whitespace-pre-wrap text-gray-200 leading-loose">
                            {line}
                        </p>
                        {translatedLines[index] && (
                            <p className="font-sans whitespace-pre-wrap text-green-400 leading-loose text-sm italic ml-4" style={{ fontSize: '18px' }}>
                                {translatedLines[index]}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="px-8 md:px-12 py-4 relative">
            {/* Compact Song Header */}
            {!loading && !error && song && (
                <div className="mb-4 flex items-center gap-4">
                    {/* Small Song Image */}
                    <div className="flex-shrink-0">
                        {song.image ? (
                            <img
                                src={song.image}
                                alt={`${title} by ${artist}`}
                                className="w-32 h-32 md:w-40 md:h-40 rounded-lg object-cover border border-gray-700"
                            />
                        ) : (
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg bg-gradient-to-br from-green-600/30 to-amber-600/30 flex items-center justify-center border border-gray-700">
                                <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Song Info - Compact */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl md:text-2xl font-bold text-white mb-1 break-words" data-testid="song-title">
                            {title || 'Loading...'}
                        </h1>
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm md:text-base text-gray-300">
                                {artist || 'Unknown Artist'}
                            </p>
                            {song.artistId && (
                                <Link
                                    to={`/artists/${song.artistId}`}
                                    className="text-green-400 hover:text-green-300 text-xs underline"
                                >
                                    View Artist
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Like & Share Buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={handleFavoriteToggle}
                            disabled={favoriteLoading}
                            className={`flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full hover:bg-white/10 transition-colors touch-manipulation ${isFavorite ? 'text-red-400' : 'text-gray-400 hover:text-white'}`}
                            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            <HeartIcon className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                            onClick={handleShare}
                            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white touch-manipulation"
                            title="Share this song"
                        >
                            <ShareIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Compact Spotify Player */}
                    {title && artist && (
                        <div className="flex-shrink-0 hidden md:block">
                            <SpotifyPlayer title={title} artist={artist} spotifyId={songSpotifyId} compact={true} />
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Spotify Player */}
            {!loading && !error && song && title && artist && (
                <div className="mb-4 md:hidden">
                    <SpotifyPlayer title={title} artist={artist} spotifyId={songSpotifyId} compact={true} />
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="mb-8 flex items-center gap-4">
                    <div className="w-32 h-32 rounded-xl bg-gray-800 animate-pulse"></div>
                    <div className="flex-1">
                        <div className="h-8 bg-gray-800 rounded animate-pulse mb-2 w-3/4"></div>
                        <div className="h-6 bg-gray-800 rounded animate-pulse w-1/2"></div>
                    </div>
                </div>
            )}

            {/* Error State */}
            {(!loading && error) && (
                <div className="mb-8 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Fallback Header when no song data */}
            {!loading && !error && !song && (
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-white">
                        {title && artist ? `${artist.toUpperCase()} - ${title.toUpperCase()}` : 'Song'}
                    </h1>
                </div>
            )}

            {/* Generate Translation Button - Show when original lyrics exist but translation is empty */}
            {!loading && !error && canGenerateTranslation && (
                <div className="mb-4">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        {/* Language Selector - Only Target Language */}
                        {showLanguageSelector && (
                            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Target Language
                                </label>
                                <select
                                    value={targetLang}
                                    onChange={(e) => setTargetLang(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    disabled={translationLoading || detectingLanguage}
                                >
                                    {languages.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <button
                                data-testid="translate-btn"
                                onClick={() => {
                                    if (!showLanguageSelector) {
                                        setShowLanguageSelector(true);
                                    } else {
                                        handleGenerateTranslation();
                                    }
                                }}
                                disabled={translationLoading || detectingLanguage}
                                className="w-full sm:w-auto min-h-[44px] bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {translationLoading || detectingLanguage ? (
                                    <>
                                        <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-pulse" />
                                        <span>
                                            {detectingLanguage
                                                ? 'Detecting Language...'
                                                : `Translating... ${formatElapsed(elapsedSeconds)}`
                                            }
                                        </span>
                                    </>
                                ) : (
                                    <span>{showLanguageSelector ? 'Generate Translation' : 'Translate Lyrics'}</span>
                                )}
                            </button>
                            <button
                                onClick={handleRequestTranslation}
                                disabled={requestLoading}
                                className="text-sm text-gray-400 hover:text-gray-300 underline transition-colors disabled:opacity-50"
                            >
                                {requestLoading ? 'Submitting...' : 'Prefer a human translation? Request one instead'}
                            </button>
                            {/* Estimated time hint - shown when language selector is visible */}
                            {showLanguageSelector && !translationLoading && !detectingLanguage && hasOriginalLyrics && (
                                <span className="text-xs text-gray-500 hidden sm:inline">
                                    Estimated: {estimateTranslationTime(cleanOriginalLyrics.length).label}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Translation Button - Show when translation exists */}
            {!loading && !error && hasValidTranslation && (
                <div className="mb-4">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-semibold text-white">Translation Available</h3>
                                <p className="text-xs text-gray-400 mt-1">Reset to generate a new translation in a different language</p>
                            </div>
                            <button
                                onClick={handleResetTranslation}
                                className="min-h-[44px] bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                            >
                                <span className="hidden sm:inline">Reset Translation</span>
                                <span className="sm:hidden">Reset</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Translation Button - Show when no lyrics or translation */}
            {!loading && !error && (hasNoLyrics || (hasNoTranslation && !canGenerateTranslation)) && (
                <div className="mb-4">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <div className="mb-3">
                            <h3 className="text-base font-semibold text-white">
                                {hasNoLyrics && hasNoTranslation
                                    ? 'Lyrics & Translation Needed'
                                    : hasNoLyrics
                                        ? 'Lyrics Needed'
                                        : 'Translation Needed'}
                            </h3>
                            <p className="text-gray-400 text-sm mt-1">
                                {hasNoLyrics && hasNoTranslation
                                    ? 'This song doesn\'t have lyrics or translation yet. Request one and our team will add it soon!'
                                    : hasNoLyrics
                                        ? 'This song doesn\'t have lyrics yet. Request them and our team will add it soon!'
                                        : 'This song doesn\'t have a translation yet. Request one and our team will add it soon!'}
                            </p>
                        </div>
                        <button
                            onClick={handleRequestTranslation}
                            disabled={requestLoading}
                            className="w-full sm:w-auto min-h-[44px] bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {requestLoading ? (
                                <>
                                    <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-pulse" />
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <span>Request Translation</span>
                            )}
                        </button>
                    </div>
                </div>
            )}



            {/* Cultural Context Display */}
            {!loading && !error && culturalContext && culturalContext.trim() && (
                <CulturalContextCarousel culturalContext={culturalContext} />
            )}

            {/* Lyrics Display - Main Focus */}
            {!loading && !error && (
                <div data-testid="translation-result">
                    {renderLyrics()}
                </div>
            )}

            {showLoginPrompt && (
                <div className="mb-4 p-4 bg-amber-900/30 border border-amber-500/40 rounded-lg">
                    <p className="text-amber-200 text-sm">Your session has expired. Please sign in again to continue.</p>
                </div>
            )}


            {/* Custom Notification Toast */}
            {notification && (
                <div className="fixed top-4 right-4 left-4 md:left-auto md:right-4 z-50 max-w-md mx-auto md:mx-0 animate-slide-in-right">
                    <div className={`relative overflow-hidden rounded-2xl shadow-2xl border ${notification.type === 'success'
                        ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600/50'
                        : notification.type === 'info'
                        ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-blue-500/50'
                        : 'bg-gradient-to-br from-gray-900 to-gray-800 border-red-500/50'
                        } backdrop-blur-sm`}>
                        {/* Animated background gradient */}
                        <div className={`absolute inset-0 ${notification.type === 'success'
                            ? 'bg-gradient-to-r from-blue-500/10 via-green-500/10 to-blue-500/10'
                            : notification.type === 'info'
                            ? 'bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10'
                            : 'bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10'
                            } animate-gradient-shift`}></div>

                        {/* Content */}
                        <div className="relative z-10 p-4 md:p-5">
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className={`flex-shrink-0 relative ${notification.type === 'success' ? 'text-green-400' : notification.type === 'info' ? 'text-blue-400' : 'text-red-400'
                                    }`}>
                                    <div className={`absolute inset-0 ${notification.type === 'success' ? 'bg-green-500/20' : notification.type === 'info' ? 'bg-blue-500/20' : 'bg-red-500/20'
                                        } rounded-full animate-ping`}></div>
                                    <div className={`relative bg-gray-700/50 p-2 rounded-full border ${notification.type === 'success' ? 'border-green-500/30' : notification.type === 'info' ? 'border-blue-500/30' : 'border-red-500/30'
                                        }`}>
                                        {notification.type === 'success' ? (
                                            <svg className="w-5 h-5 md:w-6 md:h-6 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : notification.type === 'info' ? (
                                            <svg className="w-5 h-5 md:w-6 md:h-6 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 md:w-6 md:h-6 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        )}
                                    </div>
                                </div>

                                {/* Message */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-sm md:text-base mb-1">
                                        {notification.type === 'success' ? 'Success!' : notification.type === 'info' ? 'Processing' : 'Error'}
                                    </p>
                                    <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                                        {notification.message}
                                    </p>
                                </div>

                                {/* Close button */}
                                <button
                                    onClick={() => setNotification(null)}
                                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700/50"
                                    aria-label="Close notification"
                                >
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-3 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'info' ? 'bg-blue-500' : 'bg-red-500'
                                        }`}
                                    style={{
                                        animation: `progress-bar ${notification.type === 'success' ? '4s' : notification.type === 'info' ? '8s' : '5s'} linear forwards`
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LyricContent;
