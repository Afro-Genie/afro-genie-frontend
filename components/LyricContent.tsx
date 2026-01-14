import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    getSong, 
    getLatestTranslationForSong, 
    addToFavorites, 
    removeFromFavorites, 
    getUserFavorites,
    addToHistory,
    createTranslationRequest,
    updateTranslation,
    saveTranslation,
    voteTranslation,
    getUserVote,
    submitTranslationCorrection
} from '../services/firebaseService';
import { getAiAnalysis } from '../services/geminiService';
import { getAllLanguages, detectLanguageWithAI, getLanguageByCode } from '../services/languageService';
import { useAuth } from '../context/AuthContext';
import HeartIcon from './icons/HeartIcon';
import ShareIcon from './icons/ShareIcon';
import FontSizeIcon from './icons/FontSizeIcon';
import SpotifyPlayer from './SpotifyPlayer';
import type { Song, TranslationViewMode } from '../types';

const LyricContent: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const { id: songIdParam } = useParams<{ id: string }>();
    const songId = useMemo(() => songIdParam ?? '', [songIdParam]);
    const [viewMode, setViewMode] = useState<TranslationViewMode>('side-by-side');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [artist, setArtist] = useState<string>('');
    const [originalLyrics, setOriginalLyrics] = useState<string>('');
    const [translatedLyrics, setTranslatedLyrics] = useState<string>('');
    const [culturalContext, setCulturalContext] = useState<string>('');
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteId, setFavoriteId] = useState<string | null>(null);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [song, setSong] = useState<Song | null>(null);
    const [fontSize, setFontSize] = useState<number>(16);
    const [splitPosition, setSplitPosition] = useState<number>(50); // For split-screen mode
    const [hoveredLine, setHoveredLine] = useState<number | null>(null);
    const [showTranslation, setShowTranslation] = useState<boolean>(false); // For toggle mode
    const [requestLoading, setRequestLoading] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [translationLoading, setTranslationLoading] = useState(false);
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);
    const [sourceLang, setSourceLang] = useState<string>('en');
    const [targetLang, setTargetLang] = useState<string>('en');
    const [existingTranslationId, setExistingTranslationId] = useState<string | null>(null);
    const [languages, setLanguages] = useState<Array<{ code: string; name: string }>>([]);
    const [detectingLanguage, setDetectingLanguage] = useState(false);
    const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
    const [upvotes, setUpvotes] = useState<number>(0);
    const [downvotes, setDownvotes] = useState<number>(0);
    const [votingLoading, setVotingLoading] = useState(false);
    const [showCorrectionForm, setShowCorrectionForm] = useState(false);
    const [correctionText, setCorrectionText] = useState('');
    const [correctionReason, setCorrectionReason] = useState('');

    // Load languages from database
    useEffect(() => {
        const loadLanguages = async () => {
            try {
                const fetchedLanguages = await getAllLanguages();
                setLanguages(fetchedLanguages.map(lang => ({ code: lang.code, name: lang.name })));
            } catch (error) {
                console.error('Error loading languages:', error);
                // Fallback to default languages
                setLanguages([
                    { code: 'en', name: 'English' },
                    { code: 'fr', name: 'French' },
                    { code: 'es', name: 'Spanish' },
                    { code: 'pt', name: 'Portuguese' },
                    { code: 'ar', name: 'Arabic' },
                    { code: 'sw', name: 'Swahili' },
                    { code: 'yo', name: 'Yoruba' },
                    { code: 'ig', name: 'Igbo' },
                    { code: 'ha', name: 'Hausa' },
                    { code: 'pidgin', name: 'Pidgin' }
                ]);
            }
        };
        loadLanguages();
    }, []);

    // Load view mode preference from localStorage
    useEffect(() => {
        const savedMode = localStorage.getItem('translationViewMode') as TranslationViewMode;
        if (savedMode && ['tabs', 'side-by-side', 'top-bottom', 'hover', 'split-screen', 'inline', 'toggle'].includes(savedMode)) {
            setViewMode(savedMode);
        } else {
            // Set default to side-by-side if no saved preference
            setViewMode('side-by-side');
        }
    }, []);

    // Save view mode preference
    useEffect(() => {
        localStorage.setItem('translationViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!songId) return;
            setLoading(true);
            setError('');
            try {
                const song = await getSong(songId);
                if (!song) {
                    if (!cancelled) {
                        setError('Song not found');
                        setTitle('Song');
                        setArtist('');
                    }
                } else if (!cancelled) {
                    setTitle(song.title);
                    setArtist(song.artist);
                    setSong(song);
                }

                const latest = await getLatestTranslationForSong(songId);
                if (latest && !cancelled) {
                    setOriginalLyrics(latest.originalLyrics);
                    setTranslatedLyrics(latest.translatedLyrics || '');
                    setCulturalContext(latest.culturalContext || '');
                    setExistingTranslationId(latest.id || null);
                    setUpvotes(latest.upvotes || 0);
                    setDownvotes(latest.downvotes || 0);
                    // Set source language from translation or song metadata
                    if (latest.sourceLang) {
                        setSourceLang(latest.sourceLang);
                    } else if (song?.language) {
                        setSourceLang(song.language.toLowerCase().split(',')[0].trim() || 'en');
                    }
                    if (latest.targetLang) {
                        setTargetLang(latest.targetLang);
                    }
                    // Load user's vote if logged in
                    if (currentUser && latest.id && currentUser.uid) {
                        try {
                            const vote = await getUserVote(latest.id, currentUser.uid);
                            if (!cancelled) {
                                setUserVote(vote);
                            }
                        } catch (error) {
                            console.error('Error loading user vote:', error);
                            // Silently fail - user can still vote
                        }
                    }
                } else if (!cancelled) {
                    setOriginalLyrics('No lyrics available yet for this song.');
                    setTranslatedLyrics('No translation available yet. Use "Reveal the Meaning" to generate one.');
                    setExistingTranslationId(null);
                    // Set source language from song metadata if available
                    if (song?.language) {
                        setSourceLang(song.language.toLowerCase().split(',')[0].trim() || 'en');
                    }
                }

                // Add to history if user is logged in
                if (currentUser && songId) {
                    await addToHistory(currentUser.uid, songId);
                }

                // Check if song is in favorites
                if (currentUser) {
                    const favorites = await getUserFavorites(currentUser.uid);
                    const fav = favorites.find(f => f.songId === songId);
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
                await removeFromFavorites(favoriteId);
                setIsFavorite(false);
                setFavoriteId(null);
                setNotification({ message: 'Removed from favorites', type: 'success' });
                setTimeout(() => setNotification(null), 3000);
            } else {
                const newFavId = await addToFavorites(currentUser.uid, songId);
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
            await createTranslationRequest({
                songId,
                songTitle: title,
                artist,
                userId: currentUser?.uid || 'anonymous',
                userEmail: currentUser?.email || 'anonymous@example.com'
            });
            setNotification({ message: 'Translation request submitted! Admins will be notified.', type: 'success' });
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
            translatedLyrics !== 'No translation available yet. Use "Reveal the Meaning" to generate one.';
        
        if (hasValidTranslation) {
            setNotification({ message: 'Translation already exists. Please reset it first to generate a new translation.', type: 'error' });
            setTimeout(() => setNotification(null), 4000);
            return;
        }

        // Validate source and target languages are different
        if (sourceLang === targetLang) {
            setNotification({ message: 'Source and target languages cannot be the same. Please select different languages.', type: 'error' });
            setTimeout(() => setNotification(null), 4000);
            return;
        }

        setTranslationLoading(true);
        let detectedSourceLang = 'en';

        try {
            // ALWAYS auto-detect source language - user doesn't need to select it
            setDetectingLanguage(true);
            try {
                detectedSourceLang = await detectLanguageWithAI(originalLyrics);
                setSourceLang(detectedSourceLang);
                
                // Get language name for notification
                const detectedLang = await getLanguageByCode(detectedSourceLang);
                const langName = detectedLang?.name || detectedSourceLang;
                
                setNotification({ 
                    message: `Detected source language: ${langName}`, 
                    type: 'success' 
                });
                setTimeout(() => setNotification(null), 3000);
            } catch (detectError) {
                console.error('Language detection failed:', detectError);
                // Fallback to song's language or 'en'
                if (song?.language) {
                    const songLangCode = song.language.toLowerCase().split(',')[0].trim();
                    detectedSourceLang = songLangCode || 'en';
                    setSourceLang(detectedSourceLang);
                } else {
                    detectedSourceLang = 'en';
                    setSourceLang('en');
                }
                
                // Show warning if detection failed
                setNotification({ 
                    message: 'Could not auto-detect language. Using default. Translation may not be accurate.', 
                    type: 'error' 
                });
                setTimeout(() => setNotification(null), 4000);
            } finally {
                setDetectingLanguage(false);
            }

            // Validate again after detection
            if (detectedSourceLang === targetLang) {
                setNotification({ 
                    message: `Detected source language (${detectedSourceLang}) matches target language. Please select a different target language.`, 
                    type: 'error' 
                });
                setTimeout(() => setNotification(null), 5000);
                return;
            }

            // Call AI translation
            const result = await getAiAnalysis(artist, title, originalLyrics, detectedSourceLang, targetLang);
            
            if (!result.translatedLyrics) {
                throw new Error('AI did not return a translation');
            }

            // Save or update translation
            if (existingTranslationId) {
                // Update existing translation
                await updateTranslation(existingTranslationId, {
                    translatedLyrics: result.translatedLyrics,
                    sourceLang: detectedSourceLang,
                    targetLang
                });
            } else {
                // Create new translation
                if (!currentUser) {
                    throw new Error('Please sign in to generate translations');
                }
                const translationId = await saveTranslation({
                    songId,
                    userId: currentUser.uid,
                    originalLyrics,
                    translatedLyrics: result.translatedLyrics,
                    culturalContext: '',
                    sourceLang: detectedSourceLang,
                    targetLang,
                    source: 'ai',
                    status: 'approved'
                });
                setExistingTranslationId(translationId);
            }

            // Update local state
            setTranslatedLyrics(result.translatedLyrics);
            setSourceLang(detectedSourceLang);
            setShowLanguageSelector(false);
            
            setNotification({ 
                message: 'Translation generated successfully!', 
                type: 'success' 
            });
            setTimeout(() => setNotification(null), 4000);
        } catch (err: any) {
            setNotification({ 
                message: 'Failed to generate translation: ' + (err.message || 'Unknown error'), 
                type: 'error' 
            });
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setTranslationLoading(false);
            setDetectingLanguage(false);
        }
    };

    const handleVote = async (voteType: 'upvote' | 'downvote') => {
        if (!currentUser || !currentUser.uid) {
            setNotification({ message: 'Please sign in to vote', type: 'error' });
            setTimeout(() => setNotification(null), 4000);
            return;
        }
        if (!existingTranslationId) return;

        setVotingLoading(true);
        try {
            await voteTranslation(existingTranslationId, currentUser.uid, voteType);
            // Reload vote counts and user vote
            const latest = await getLatestTranslationForSong(songId);
            if (latest) {
                setUpvotes(latest.upvotes || 0);
                setDownvotes(latest.downvotes || 0);
            }
            try {
                const vote = await getUserVote(existingTranslationId, currentUser.uid);
                setUserVote(vote);
            } catch (voteError) {
                console.error('Error loading vote after voting:', voteError);
                // Continue even if we can't load the vote
            }
            setNotification({ 
                message: `Your ${voteType} has been recorded`, 
                type: 'success' 
            });
            setTimeout(() => setNotification(null), 3000);
        } catch (err: any) {
            console.error('Voting error:', err);
            const errorMessage = err.message || 'Failed to vote. Please try again.';
            setNotification({ message: errorMessage, type: 'error' });
            setTimeout(() => setNotification(null), 4000);
        } finally {
            setVotingLoading(false);
        }
    };

    const handleSubmitCorrection = async () => {
        if (!currentUser) {
            setNotification({ message: 'Please sign in to suggest corrections', type: 'error' });
            setTimeout(() => setNotification(null), 4000);
            return;
        }
        if (!existingTranslationId || !correctionText.trim()) {
            setNotification({ message: 'Please provide a correction', type: 'error' });
            setTimeout(() => setNotification(null), 4000);
            return;
        }

        try {
            await submitTranslationCorrection({
                translationId: existingTranslationId,
                userId: currentUser.uid,
                originalText: translatedLyrics,
                suggestedText: correctionText,
                reason: correctionReason || undefined
            });
            setNotification({ message: 'Correction submitted! Thank you for your contribution.', type: 'success' });
            setTimeout(() => setNotification(null), 4000);
            setCorrectionText('');
            setCorrectionReason('');
            setShowCorrectionForm(false);
        } catch (err: any) {
            setNotification({ message: err.message || 'Failed to submit correction', type: 'error' });
            setTimeout(() => setNotification(null), 4000);
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
            await updateTranslation(existingTranslationId, {
                translatedLyrics: ''
            });

            setTranslatedLyrics('No translation available yet. Use "Reveal the Meaning" to generate one.');
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

    const hasNoLyrics = originalLyrics === 'No lyrics available yet for this song.' || !originalLyrics.trim();
    const hasNoTranslation = translatedLyrics === 'No translation available yet. Use "Reveal the Meaning" to generate one.' || !translatedLyrics.trim();
    const hasOriginalLyrics = !hasNoLyrics;
    const canGenerateTranslation = hasOriginalLyrics && hasNoTranslation;
    const hasValidTranslation = translatedLyrics && 
        translatedLyrics.trim() && 
        translatedLyrics !== 'No translation available yet. Use "Reveal the Meaning" to generate one.';

    // Split lyrics into lines for hover and inline modes
    const originalLines = originalLyrics.split('\n');
    const translatedLines = translatedLyrics.split('\n');

    // Render lyrics based on view mode
    const renderLyrics = () => {
        switch (viewMode) {
            case 'tabs':
                return (
                    <>
                        <div className="flex border-b-2 border-gray-700 mb-6 bg-gray-800/30 rounded-t-lg p-1">
                            <button 
                                onClick={() => setShowTranslation(false)}
                                className={`flex-1 py-3 px-4 font-semibold transition-all rounded-lg ${
                                    !showTranslation 
                                        ? 'text-white bg-gray-700/50 shadow-lg' 
                                        : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                Original
                            </button>
                            <button
                                onClick={() => setShowTranslation(true)}
                                className={`flex-1 py-3 px-4 font-semibold transition-all rounded-lg ${
                                    showTranslation 
                                        ? 'text-white bg-green-600/20 border border-green-500/30 shadow-lg' 
                                        : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                Translation
                            </button>
                        </div>
                        <div className="text-gray-200 text-lg leading-loose min-h-[400px]">
                            {!showTranslation ? (
                                <pre className="font-sans whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>{originalLyrics}</pre>
                            ) : (
                                <pre className="font-sans whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>{translatedLyrics}</pre>
                            )}
                        </div>
                    </>
                );

            case 'side-by-side':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-bold text-white mb-3">Original</h3>
                            <pre className="font-sans whitespace-pre-wrap text-gray-200 leading-loose" style={{ fontSize: `${fontSize}px` }}>{originalLyrics}</pre>
                        </div>
                        <div>
                            <h3 className="font-bold text-white mb-3">Translation</h3>
                            <pre className="font-sans whitespace-pre-wrap text-gray-200 leading-loose" style={{ fontSize: `${fontSize}px` }}>{translatedLyrics}</pre>
                        </div>
                    </div>
                );

            case 'top-bottom':
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="font-bold text-white mb-3">Original</h3>
                            <pre className="font-sans whitespace-pre-wrap text-gray-200 leading-loose" style={{ fontSize: `${fontSize}px` }}>{originalLyrics}</pre>
                        </div>
                        <div>
                            <h3 className="font-bold text-white mb-3">Translation</h3>
                            <pre className="font-sans whitespace-pre-wrap text-gray-200 leading-loose" style={{ fontSize: `${fontSize}px` }}>{translatedLyrics}</pre>
                        </div>
                    </div>
                );

            case 'hover':
                return (
                    <div className="space-y-2">
                        {originalLines.map((line, index) => (
                            <div
                                key={index}
                                className="relative group"
                                onMouseEnter={() => setHoveredLine(index)}
                                onMouseLeave={() => setHoveredLine(null)}
                            >
                                <pre className="font-sans whitespace-pre-wrap text-gray-200 leading-loose" style={{ fontSize: `${fontSize}px` }}>
                                    {line}
                                </pre>
                                {hoveredLine === index && translatedLines[index] && (
                                    <div className="absolute left-0 top-full mt-2 bg-gray-800 border border-green-400 rounded-lg p-3 shadow-lg z-10 max-w-md">
                                        <p className="text-green-400 font-semibold mb-1">Translation:</p>
                                        <p className="text-gray-200 text-sm">{translatedLines[index]}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                );

            case 'split-screen':
                return (
                    <div className="relative" style={{ height: '600px' }}>
                        <div className="absolute inset-0 flex">
                            <div 
                                className="overflow-y-auto pr-4"
                                style={{ width: `${splitPosition}%` }}
                            >
                                <h3 className="font-bold text-white mb-3 sticky top-0 bg-[#122118] py-2">Original</h3>
                                <pre className="font-sans whitespace-pre-wrap text-gray-200 leading-loose" style={{ fontSize: `${fontSize}px` }}>{originalLyrics}</pre>
                            </div>
                            <div 
                                className="w-1 bg-gray-600 cursor-col-resize hover:bg-green-400 transition-colors"
                                onMouseDown={(e) => {
                                    const startX = e.clientX;
                                    const startWidth = splitPosition;
                                    const handleMouseMove = (e: MouseEvent) => {
                                        const delta = e.clientX - startX;
                                        const containerWidth = (e.target as HTMLElement).closest('.relative')?.clientWidth || 1000;
                                        const newPosition = Math.max(20, Math.min(80, startWidth + (delta / containerWidth) * 100));
                                        setSplitPosition(newPosition);
                                    };
                                    const handleMouseUp = () => {
                                        document.removeEventListener('mousemove', handleMouseMove);
                                        document.removeEventListener('mouseup', handleMouseUp);
                                    };
                                    document.addEventListener('mousemove', handleMouseMove);
                                    document.addEventListener('mouseup', handleMouseUp);
                                }}
                            />
                            <div 
                                className="overflow-y-auto pl-4"
                                style={{ width: `${100 - splitPosition}%` }}
                            >
                                <h3 className="font-bold text-white mb-3 sticky top-0 bg-[#122118] py-2">Translation</h3>
                                <pre className="font-sans whitespace-pre-wrap text-gray-200 leading-loose" style={{ fontSize: `${fontSize}px` }}>{translatedLyrics}</pre>
                            </div>
                        </div>
                    </div>
                );

            case 'inline':
                return (
                    <div className="space-y-4">
                        {originalLines.map((line, index) => (
                            <div key={index} className="space-y-1">
                                <pre className="font-sans whitespace-pre-wrap text-gray-200 leading-loose" style={{ fontSize: `${fontSize}px` }}>
                                    {line}
                                </pre>
                                {translatedLines[index] && (
                                    <pre className="font-sans whitespace-pre-wrap text-green-400 leading-loose text-sm italic ml-4" style={{ fontSize: `${fontSize - 2}px` }}>
                                        {translatedLines[index]}
                                    </pre>
                                )}
                            </div>
                        ))}
                    </div>
                );

            case 'toggle':
                return (
                    <div className="text-gray-200 text-lg leading-loose">
                        <button
                            onClick={() => setShowTranslation(!showTranslation)}
                            className="mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                            {showTranslation ? 'Show Original' : 'Show Translation'}
                        </button>
                        <pre className="font-sans whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>
                            {showTranslation ? translatedLyrics : originalLyrics}
                        </pre>
                    </div>
                );

            default:
                return null;
        }
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
                                className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border border-gray-700"
                            />
                        ) : (
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-gradient-to-br from-green-600/30 to-amber-600/30 flex items-center justify-center border border-gray-700">
                                <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    
                    {/* Song Info - Compact */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl md:text-2xl font-bold text-white mb-1 break-words">
                            {title || 'Loading...'}
                        </h1>
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm md:text-base text-gray-300">
                                {artist || 'Unknown Artist'}
                            </p>
                            {song.artistId && (
                                <Link
                                    to={`/artist/${song.artistId}`}
                                    className="text-green-400 hover:text-green-300 text-xs underline"
                                >
                                    View Artist
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Compact Spotify Player */}
                    {title && artist && (
                        <div className="flex-shrink-0 hidden md:block">
                            <SpotifyPlayer title={title} artist={artist} compact={true} />
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Spotify Player */}
            {!loading && !error && song && title && artist && (
                <div className="mb-4 md:hidden">
                    <SpotifyPlayer title={title} artist={artist} compact={true} />
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
                <div className="mb-4 animate-fade-in-up">
                    <div className="relative overflow-hidden bg-gradient-to-br from-green-800/20 to-emerald-800/20 backdrop-blur-sm border border-green-500/30 rounded-2xl shadow-2xl p-4 md:p-6">
                        {/* Animated background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-green-500/5 animate-gradient-shift"></div>
                        
                        {/* Content */}
                        <div className="relative z-10">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="flex-shrink-0 relative">
                                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                                    <div className="relative bg-gray-700/50 p-3 rounded-full border border-green-500/30">
                                        <svg className="w-6 h-6 md:w-8 md:h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                        </svg>
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                                        Generate Translation with AI
                                    </h3>
                                    <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-4">
                                        Use AI to automatically translate the original lyrics. The source language will be detected automatically. Select the target language below.
                                    </p>
                                    
                                    {/* Language Selector - Only Target Language */}
                                    {showLanguageSelector && (
                                        <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Target Language (Translate to)
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
                                            {sourceLang && sourceLang !== 'en' && (
                                                <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                                                    <p className="text-xs text-blue-300">
                                                        <span className="font-semibold">Source language will be detected automatically</span>
                                                        {song?.language && (
                                                            <span className="block mt-1 text-blue-400">
                                                                (Song metadata suggests: {song.language})
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Generate Button */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        <button
                                            onClick={() => {
                                                if (!showLanguageSelector) {
                                                    setShowLanguageSelector(true);
                                                } else {
                                                    handleGenerateTranslation();
                                                }
                                            }}
                                            disabled={translationLoading || detectingLanguage}
                                            className="w-full sm:w-auto group relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-800 disabled:to-gray-800 text-white font-semibold py-3 px-6 md:px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {/* Shine effect on hover */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                            
                                            {translationLoading || detectingLanguage ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    <span className="relative z-10">
                                                        {detectingLanguage ? 'Detecting Language...' : 'Generating Translation...'}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                    <span className="relative z-10">
                                                        {showLanguageSelector ? 'Generate Translation' : 'Translate with AI'}
                                                    </span>
                                                    <svg className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Translation Button - Show when translation exists */}
            {!loading && !error && hasValidTranslation && (
                <div className="mb-4 animate-fade-in-up">
                    <div className="relative overflow-hidden bg-gradient-to-br from-amber-800/20 to-orange-800/20 backdrop-blur-sm border border-amber-500/30 rounded-2xl shadow-2xl p-4 md:p-6">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-700/50 p-2 rounded-full border border-amber-500/30">
                                        <svg className="w-5 h-5 md:w-6 md:h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base md:text-lg font-semibold text-white">Translation Available</h3>
                                        <p className="text-xs md:text-sm text-gray-300">Reset to generate a new translation in a different language</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleResetTranslation}
                                    className="min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-4 md:px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                                >
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span className="hidden sm:inline">Reset Translation</span>
                                    <span className="sm:hidden">Reset</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Translation Button - Show when no lyrics or translation */}
            {!loading && !error && (hasNoLyrics || (hasNoTranslation && !canGenerateTranslation)) && (
                <div className="mb-4 animate-fade-in-up">
                    <div className="relative overflow-hidden bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-600/50 rounded-2xl shadow-2xl p-6 md:p-8">
                        {/* Animated background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-gradient-shift"></div>
                        
                        {/* Content */}
                        <div className="relative z-10">
                            {/* Icon with pulse animation */}
                            <div className="flex items-start gap-4 mb-4">
                                <div className="flex-shrink-0 relative">
                                    <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                                    <div className="relative bg-gray-700/50 p-3 rounded-full border border-gray-600">
                                        <svg className="w-6 h-6 md:w-8 md:h-8 text-gray-300 animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                        </svg>
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                                        {hasNoLyrics && hasNoTranslation 
                                            ? 'Lyrics & Translation Needed' 
                                            : hasNoLyrics 
                                                ? 'Lyrics Needed' 
                                                : 'Translation Needed'}
                                    </h3>
                                    <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                                        {hasNoLyrics && hasNoTranslation 
                                            ? 'This song doesn\'t have lyrics or translation yet. Request one and our team will add it soon!' 
                                            : hasNoLyrics 
                                                ? 'This song doesn\'t have lyrics yet. Request them and our team will add it soon!' 
                                                : 'This song doesn\'t have a translation yet. Request one and our team will add it soon!'}
                                    </p>
                                </div>
                            </div>

                            {/* Button with hover animation */}
                            <button
                                onClick={handleRequestTranslation}
                                disabled={requestLoading}
                                className="w-full md:w-auto group relative overflow-hidden bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 disabled:from-gray-800 disabled:to-gray-800 text-white font-semibold py-3 px-6 md:px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {/* Shine effect on hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                
                                {requestLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span className="relative z-10">Submitting Request...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                        </svg>
                                        <span className="relative z-10">Request Translation</span>
                                        <svg className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Voting and Community Actions */}
            {!loading && !error && hasValidTranslation && existingTranslationId && (
                <div className="mb-4 bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Voting Section */}
                        <div className="flex items-center gap-4">
                            <span className="text-gray-300 text-sm font-medium">Rate this translation:</span>
                            {currentUser ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleVote('upvote')}
                                        disabled={votingLoading}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                            userVote === 'upvote'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                        } disabled:opacity-50`}
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm font-medium">{upvotes}</span>
                                    </button>
                                    <button
                                        onClick={() => handleVote('downvote')}
                                        disabled={votingLoading}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                            userVote === 'downvote'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                        } disabled:opacity-50`}
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm font-medium">{downvotes}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                    <span>{upvotes} upvotes • {downvotes} downvotes</span>
                                    <Link 
                                        to="/" 
                                        className="text-green-400 hover:text-green-300 underline"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            // Trigger login modal - you may need to adjust this based on your login flow
                                            window.location.hash = '#/';
                                            setTimeout(() => {
                                                const loginButton = document.querySelector('[data-login-button]') as HTMLElement;
                                                if (loginButton) loginButton.click();
                                            }, 100);
                                        }}
                                    >
                                        Sign in to vote
                                    </Link>
                                </div>
                            )}
                        </div>
                        {/* Correction Button */}
                        {currentUser ? (
                            <button
                                onClick={() => setShowCorrectionForm(!showCorrectionForm)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Suggest Correction
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setShowLoginPrompt(true);
                                    setTimeout(() => setShowLoginPrompt(false), 5000);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Sign in to suggest
                            </button>
                        )}
                    </div>
                    {/* Correction Form */}
                    {showCorrectionForm && (
                        <div className="mt-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                            <h4 className="text-white font-medium mb-3">Suggest a Correction</h4>
                            <textarea
                                value={correctionText}
                                onChange={(e) => setCorrectionText(e.target.value)}
                                placeholder="Enter your suggested correction for the translation..."
                                rows={4}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                            />
                            <input
                                type="text"
                                value={correctionReason}
                                onChange={(e) => setCorrectionReason(e.target.value)}
                                placeholder="Reason (optional)"
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSubmitCorrection}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                    Submit Correction
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCorrectionForm(false);
                                        setCorrectionText('');
                                        setCorrectionReason('');
                                    }}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* View Mode Selector - Moved up to be with lyrics */}
            {!loading && !error && !hasNoLyrics && !hasNoTranslation && (
                <div className="mb-4 flex flex-wrap items-center gap-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
                    <div className="flex items-center gap-2">
                        <label className="text-gray-300 text-sm font-medium">View:</label>
                    <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as TranslationViewMode)}
                            className="bg-gray-800 border border-gray-600 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="tabs">Tabs</option>
                        <option value="side-by-side">Side-by-Side</option>
                        <option value="top-bottom">Top & Bottom</option>
                        <option value="hover">Mouse-over</option>
                        <option value="split-screen">Split-Screen</option>
                        <option value="inline">Inline</option>
                        <option value="toggle">Toggle</option>
                    </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-gray-300 text-sm">Font:</label>
                        <input
                            type="range"
                            min="12"
                            max="24"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="w-24"
                        />
                        <span className="text-gray-400 text-xs">{fontSize}px</span>
                    </div>
                    {/* Compact Status Indicators */}
                    {song && (originalLyrics !== 'No lyrics available yet for this song.' || translatedLyrics !== 'No translation available yet. Use "Reveal the Meaning" to generate one.') && (
                        <div className="ml-auto flex items-center gap-2 text-xs">
                            {originalLyrics !== 'No lyrics available yet for this song.' && (
                                <span className="text-green-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Original
                                </span>
                            )}
                            {translatedLyrics !== 'No translation available yet. Use "Reveal the Meaning" to generate one.' && (
                                <span className="text-amber-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Translation
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Cultural Context Display - Prominent */}
            {!loading && !error && culturalContext && culturalContext.trim() && (
                <div className="mb-6 animate-fade-in-up">
                    <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-sm border-2 border-amber-500/40 rounded-2xl shadow-2xl p-6 md:p-8">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="flex-shrink-0 bg-amber-500/20 p-3 rounded-full border border-amber-500/30">
                                <svg className="w-6 h-6 md:w-8 md:h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-xl md:text-2xl font-bold text-white">Cultural Context</h3>
                                    <span className="text-xs px-3 py-1 bg-green-600/30 border border-green-500/50 rounded-full text-green-300 font-medium">
                                        Human-Added
                                    </span>
                                </div>
                                <p className="text-gray-300 text-sm mb-4">
                                    Learn about the cultural meanings, slang, and context behind these lyrics
                                </p>
                                <div className="bg-gray-900/50 rounded-lg p-4 md:p-6 border border-gray-700/50">
                                    <pre className="whitespace-pre-wrap font-sans text-gray-200 leading-relaxed text-sm md:text-base">
                                        {culturalContext}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lyrics Display - Main Focus */}
            {!loading && !error && renderLyrics()}
            
            {/* Action Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#2a3c30]/80 backdrop-blur-md p-3 rounded-full border border-white/10">
                <button 
                    onClick={handleFavoriteToggle}
                    disabled={favoriteLoading}
                    className={`flex flex-col items-center justify-center w-20 h-14 rounded-full hover:bg-white/10 transition-colors ${isFavorite ? 'text-red-400' : ''}`}
                >
                    <HeartIcon className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''}`}/>
                    <span className="text-xs mt-1">{isFavorite ? 'Liked' : 'Like'}</span>
                </button>
                <button 
                    onClick={handleShare}
                    className="flex flex-col items-center justify-center w-20 h-14 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ShareIcon className="h-6 w-6"/>
                    <span className="text-xs mt-1">Share</span>
                </button>
                {song && (
                    <Link
                        to={`/community/create?songId=${song.id}&artistId=${song.artistId}`}
                        className="flex flex-col items-center justify-center w-20 h-14 rounded-full hover:bg-white/10 transition-colors text-amber-400"
                        title="Discuss this song"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-xs mt-1">Discuss</span>
                    </Link>
                )}
            </div>

            {/* Custom Notification Toast */}
            {notification && (
                <div className="fixed top-4 right-4 left-4 md:left-auto md:right-4 z-50 max-w-md mx-auto md:mx-0 animate-slide-in-right">
                    <div className={`relative overflow-hidden rounded-2xl shadow-2xl border ${
                        notification.type === 'success' 
                            ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600/50' 
                            : 'bg-gradient-to-br from-gray-900 to-gray-800 border-red-500/50'
                    } backdrop-blur-sm`}>
                        {/* Animated background gradient */}
                        <div className={`absolute inset-0 ${
                            notification.type === 'success'
                                ? 'bg-gradient-to-r from-blue-500/10 via-green-500/10 to-blue-500/10'
                                : 'bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10'
                        } animate-gradient-shift`}></div>
                        
                        {/* Content */}
                        <div className="relative z-10 p-4 md:p-5">
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className={`flex-shrink-0 relative ${
                                    notification.type === 'success' ? 'text-green-400' : 'text-red-400'
                                }`}>
                                    <div className={`absolute inset-0 ${
                                        notification.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
                                    } rounded-full animate-ping`}></div>
                                    <div className={`relative bg-gray-700/50 p-2 rounded-full border ${
                                        notification.type === 'success' ? 'border-green-500/30' : 'border-red-500/30'
                                    }`}>
                                        {notification.type === 'success' ? (
                                            <svg className="w-5 h-5 md:w-6 md:h-6 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                                        {notification.type === 'success' ? 'Success!' : 'Error'}
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
                                    className={`h-full ${
                                        notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                    style={{
                                        animation: `progress-bar ${notification.type === 'success' ? '4s' : '5s'} linear forwards`
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
