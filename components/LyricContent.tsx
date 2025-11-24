import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    getSong, 
    getLatestTranslationForSong, 
    addToFavorites, 
    removeFromFavorites, 
    getUserFavorites,
    addToHistory,
    createTranslationRequest
} from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';
import HeartIcon from './icons/HeartIcon';
import ShareIcon from './icons/ShareIcon';
import FontSizeIcon from './icons/FontSizeIcon';
import type { Song, TranslationViewMode } from '../types';

const LyricContent: React.FC = () => {
    const { currentUser } = useAuth();
    const { id: songIdParam } = useParams<{ id: string }>();
    const songId = useMemo(() => songIdParam ?? '', [songIdParam]);
    const [viewMode, setViewMode] = useState<TranslationViewMode>('tabs');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [artist, setArtist] = useState<string>('');
    const [originalLyrics, setOriginalLyrics] = useState<string>('');
    const [translatedLyrics, setTranslatedLyrics] = useState<string>('');
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteId, setFavoriteId] = useState<string | null>(null);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [song, setSong] = useState<Song | null>(null);
    const [fontSize, setFontSize] = useState<number>(16);
    const [splitPosition, setSplitPosition] = useState<number>(50); // For split-screen mode
    const [hoveredLine, setHoveredLine] = useState<number | null>(null);
    const [showTranslation, setShowTranslation] = useState<boolean>(false); // For toggle mode
    const [requestLoading, setRequestLoading] = useState(false);

    // Load view mode preference from localStorage
    useEffect(() => {
        const savedMode = localStorage.getItem('translationViewMode') as TranslationViewMode;
        if (savedMode && ['tabs', 'side-by-side', 'top-bottom', 'hover', 'split-screen', 'inline', 'toggle'].includes(savedMode)) {
            setViewMode(savedMode);
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
                    setTranslatedLyrics(latest.translatedLyrics);
                } else if (!cancelled) {
                    setOriginalLyrics('No lyrics available yet for this song.');
                    setTranslatedLyrics('No translation available yet. Use "Reveal the Meaning" to generate one.');
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
            alert('Please sign in to add favorites');
            return;
        }
        if (!songId) return;

        setFavoriteLoading(true);
        try {
            if (isFavorite && favoriteId) {
                await removeFromFavorites(favoriteId);
                setIsFavorite(false);
                setFavoriteId(null);
            } else {
                const newFavId = await addToFavorites(currentUser.uid, songId);
                setIsFavorite(true);
                setFavoriteId(newFavId);
            }
        } catch (err: any) {
            alert(err.message || 'Failed to update favorite');
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
            alert('Link copied to clipboard!');
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
            alert('Translation request submitted! Admins will be notified.');
        } catch (err: any) {
            alert('Failed to submit request: ' + err.message);
        } finally {
            setRequestLoading(false);
        }
    };

    const hasNoLyrics = originalLyrics === 'No lyrics available yet for this song.' || !originalLyrics.trim();
    const hasNoTranslation = translatedLyrics === 'No translation available yet. Use "Reveal the Meaning" to generate one.' || !translatedLyrics.trim();

    // Split lyrics into lines for hover and inline modes
    const originalLines = originalLyrics.split('\n');
    const translatedLines = translatedLyrics.split('\n');

    // Render lyrics based on view mode
    const renderLyrics = () => {
        switch (viewMode) {
            case 'tabs':
                return (
                    <>
                        <div className="flex border-b border-white/10 mb-6">
                            <button 
                                onClick={() => setShowTranslation(false)}
                                className={`py-2 px-4 font-semibold transition-colors ${!showTranslation ? 'text-white border-b-2 border-white' : 'text-gray-400'}`}
                            >
                                Original
                            </button>
                            <button
                                onClick={() => setShowTranslation(true)}
                                className={`py-2 px-4 font-semibold transition-colors ${showTranslation ? 'text-white border-b-2 border-white' : 'text-gray-400'}`}
                            >
                                Translation
                            </button>
                        </div>
                        <div className="text-gray-200 text-lg leading-loose">
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
        <div className="px-12 py-8 relative">
            {/* Song Header with Image */}
            {!loading && !error && song && (
                <div className="mb-8 flex flex-col md:flex-row gap-6 items-start">
                    {/* Song Image/Album Cover */}
                    <div className="flex-shrink-0">
                        {song.image ? (
                            <img 
                                src={song.image} 
                                alt={`${title} by ${artist}`}
                                className="w-48 h-48 md:w-64 md:h-64 rounded-xl object-cover shadow-2xl border-2 border-gray-700"
                            />
                        ) : (
                            <div className="w-48 h-48 md:w-64 md:h-64 rounded-xl bg-gradient-to-br from-green-600/30 to-amber-600/30 flex items-center justify-center border-2 border-gray-700 shadow-2xl">
                                <svg className="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    
                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 break-words">
                            {title || 'Loading...'}
                        </h1>
                        <div className="flex items-center gap-3 mb-4">
                            <p className="text-2xl md:text-3xl text-gray-300 font-semibold">
                                {artist || 'Unknown Artist'}
                            </p>
                            {song.artistId && (
                                <Link
                                    to={`/search/${artist}`}
                                    className="text-green-400 hover:text-green-300 text-sm underline"
                                >
                                    View Artist
                                </Link>
                            )}
                        </div>
                        {song.createdAt && (
                            <p className="text-gray-400 text-sm">
                                Added {song.createdAt.toDate ? new Date(song.createdAt.toDate()).toLocaleDateString() : 'recently'}
                            </p>
                        )}
                    </div>
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

            {/* Request Translation Button - Show when no lyrics or translation */}
            {!loading && !error && (hasNoLyrics || hasNoTranslation) && (
                <div className="mb-6 p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
                    <p className="text-amber-200 mb-3">
                        {hasNoLyrics && hasNoTranslation 
                            ? 'This song has no lyrics or translation yet.' 
                            : hasNoLyrics 
                                ? 'This song has no lyrics yet.' 
                                : 'This song has no translation yet.'}
                    </p>
                    <button
                        onClick={handleRequestTranslation}
                        disabled={requestLoading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                    >
                        {requestLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                </svg>
                                Request Translation
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Song Metadata Info */}
            {!loading && !error && song && (originalLyrics !== 'No lyrics available yet for this song.' || translatedLyrics !== 'No translation available yet. Use "Reveal the Meaning" to generate one.') && (
                <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Song data loaded from database</span>
                        {originalLyrics !== 'No lyrics available yet for this song.' && (
                            <>
                                <span className="text-gray-600">•</span>
                                <span className="text-green-400">Original lyrics available</span>
                            </>
                        )}
                        {translatedLyrics !== 'No translation available yet. Use "Reveal the Meaning" to generate one.' && (
                            <>
                                <span className="text-gray-600">•</span>
                                <span className="text-amber-400">Translation available</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* View Mode Selector */}
            {!loading && !error && !hasNoLyrics && !hasNoTranslation && (
                <div className="mb-6 flex flex-wrap items-center gap-4">
                    <label className="text-gray-300 font-semibold">View Mode:</label>
                    <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as TranslationViewMode)}
                        className="bg-gray-800 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="tabs">Tabs</option>
                        <option value="side-by-side">Side-by-Side</option>
                        <option value="top-bottom">Top & Bottom</option>
                        <option value="hover">Mouse-over</option>
                        <option value="split-screen">Split-Screen</option>
                        <option value="inline">Inline</option>
                        <option value="toggle">Toggle</option>
                    </select>
                    <div className="flex items-center gap-2">
                        <label className="text-gray-300 text-sm">Font Size:</label>
                        <input
                            type="range"
                            min="12"
                            max="24"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="w-32"
                        />
                        <span className="text-gray-400 text-sm">{fontSize}px</span>
                    </div>
                </div>
            )}

            {/* Lyrics Display */}
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
        </div>
    );
};

export default LyricContent;
