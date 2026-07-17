import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/apiClient';
import { useAudioPlayer } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import { SearchResultsSkeleton, SongListSkeleton, SquareGridSkeleton } from '../components/PageSkeletons';
import { SUPPORTED_LANGUAGES, LANGUAGE_FLAGS } from '../constants';
import { featureFlags } from '../config/featureFlags';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Artist, Genre, Song, GenieSettings, Topic } from '../types';

const LANGUAGE_IMAGES: Record<string, string> = {
  en: 'https://flagcdn.com/w320/gb.png',
  yo: 'https://flagcdn.com/w320/ng.png',
  ig: 'https://flagcdn.com/w320/ng.png',
  ha: 'https://flagcdn.com/w320/ng.png',
  pcm: 'https://flagcdn.com/w320/ng.png',
  sw: 'https://flagcdn.com/w320/ke.png',
  fr: 'https://flagcdn.com/w320/fr.png',
  es: 'https://flagcdn.com/w320/es.png',
  pt: 'https://flagcdn.com/w320/pt.png',
  ar: 'https://flagcdn.com/w320/sa.png',
  zu: 'https://flagcdn.com/w320/za.png',
  am: 'https://flagcdn.com/w320/et.png',
};

const GENRE_IMAGES: Record<string, string> = {
  Afrobeats: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
  Amapiano: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d50?w=400&h=400&fit=crop',
  Highlife: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop',
  Fuji: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop',
  Gospel: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  HipHop: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
  Jazz: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=400&fit=crop',
  Pop: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
  RnB: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
  Soul: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop',
  Reggae: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400&h=400&fit=crop',
  Dancehall: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400&h=400&fit=crop',
  'Bongo Flava': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop',
  Gengetone: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d50?w=400&h=400&fit=crop',
  Kwaito: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
};

const DEFAULT_GENRE_IMAGE = 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop';

const HomePage: React.FC = () => {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [genres, setGenres] = useState<Genre[]>([]);
    const [songs, setSongs] = useState<Song[]>([]);
    const [trendingTopics, setTrendingTopics] = useState<Topic[]>([]);
    const [artistsLoading, setArtistsLoading] = useState(true);
    const [genresLoading, setGenresLoading] = useState(true);
    const [songsLoading, setSongsLoading] = useState(true);
    const [topicsLoading, setTopicsLoading] = useState(true);
    const [artistsError, setArtistsError] = useState<string | null>(null);
    const [genresError, setGenresError] = useState<string | null>(null);
    const [songsError, setSongsError] = useState<string | null>(null);
    const [topicsError, setTopicsError] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
    const [genieSettings, setGenieSettings] = useState<GenieSettings>({
        imageUrl: '/Images/gene.png',
        animationType: 'float',
        animationDuration: 3,
        animationDelay: 0,
        opacity: 20,
        size: 'large'
    });

    const { isSpotifyPremium, user } = useAuth();
    const { loadTrackById, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
    const navigate = useNavigate();
    const [showSignInDialog, setShowSignInDialog] = useState(false);

    // Languages supported — built from canonical source
    const languages = SUPPORTED_LANGUAGES
        .filter(l => l.isActive)
        .map(l => ({ code: l.code, name: l.name, flag: LANGUAGE_FLAGS[l.code] || '' }));

    useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            setArtistsLoading(true);
            setGenresLoading(true);
            setSongsLoading(true);
            setTopicsLoading(true);
            setArtistsError(null);
            setGenresError(null);
            setSongsError(null);
            setTopicsError(null);

            void apiFetch('/api/catalog/home')
                .then((data: any) => {
                    if (cancelled) return;

                    const fetchedSongs = (data.songs || []).map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        artist: s.artistName,
                        artistId: s.artistId,
                        image: s.imageUrl || '',
                        imageUrl: s.imageUrl || '',
                        views: 0,
                        year: null,
                        genre: '',
                        album: s.albumName,
                        requestCount: 0,
                        spotifyId: s.spotifyId || null,
                        source: s.source || null,
                    }));
                    const sortedSongs = fetchedSongs.sort((a: any, b: any) => {
                        const aScore = (a.views || 0) + (a.requestCount || 0) * 2;
                        const bScore = (b.views || 0) + (b.requestCount || 0) * 2;
                        return bScore - aScore;
                    });
                    setSongs(sortedSongs.slice(0, 100));
                    setArtists((data.artists || []).slice(0, 12));
                    setGenres((data.genres || []).slice(0, 10));
                })
                .catch((err: any) => {
                    if (!cancelled) {
                        setSongsError(err.message || 'Failed to load catalog');
                        setArtistsError(err.message || 'Failed to load catalog');
                        setGenresError(err.message || 'Failed to load catalog');
                    }
                })
                .finally(() => {
                    if (!cancelled) {
                        setSongsLoading(false);
                        setArtistsLoading(false);
                        setGenresLoading(false);
                    }
                });

            void apiFetch('/api/community/topics?sort=top&limit=5')
                .then((data: any) => {
                    if (!cancelled) {
                        setTrendingTopics(Array.isArray(data) ? data : data?.topics ?? []);
                    }
                })
                .catch((err: any) => {
                    if (!cancelled) {
                        setTopicsError(err.message || 'Failed to load community topics');
                    }
                })
                .finally(() => {
                    if (!cancelled) {
                        setTopicsLoading(false);
                    }
                });
        };

        fetchData();

        return () => {
            cancelled = true;
        };
    }, [selectedLanguage]);

    const onImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.currentTarget;
        target.style.display = 'none';
    };

    return (
        <div className="min-h-screen bg-[#122118]">
            {/* Modern Hero Section */}
            <section className="relative bg-gradient-to-br from-[#122118] via-[#1a2b22] to-[#122118] py-10 sm:py-16 md:py-24 overflow-hidden">
                {/* Floating Genie Background */}
                <div className="absolute inset-0 flex items-center justify-center z-0 opacity-10">
                    <img
                        src={genieSettings.imageUrl}
                        alt="Afro Genie Mascot"
                        className={`genie-animated ${genieSettings.size === 'small' ? 'h-64' : genieSettings.size === 'medium' ? 'h-80' : 'h-96'}`}
                        style={{
                            filter: 'blur(3px)',
                            opacity: genieSettings.opacity / 100,
                        }}
                    />
                </div>

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Floating Genie - Prominent Display */}
                        <div className="mb-6 flex justify-center">
                    <img
                        src={genieSettings.imageUrl}
                        alt="Afro Genie Mascot"
                                className={`genie-animated ${genieSettings.size === 'small' ? 'h-32 md:h-40' : genieSettings.size === 'medium' ? 'h-40 md:h-52' : 'h-48 md:h-64'}`}
                                style={{
                                    opacity: Math.max(genieSettings.opacity / 100, 0.8), // At least 80% visible
                                }}
                            />
                        </div>
                        
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold text-white mb-4 sm:mb-6 leading-tight px-2">
                            The Largest Library of{' '}
                            <span className="text-green-400">Translated African Lyrics</span>
                        </h1>
                        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-6 sm:mb-8 px-2">
                            Discover, translate, and explore African music with cultural context
                        </p>
                        
                        {/* Quick Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
                            <Link 
                                to="/community" 
                                data-testid="join-btn"
                                className="w-full sm:w-auto min-h-[44px] bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold py-3 px-6 sm:px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-amber-500/50 flex items-center justify-center gap-2 text-base sm:text-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                </svg>
                                Join Community
                            </Link>
                            <button 
                                onClick={() => {
                                    if (user) {
                                        navigate('/account');
                                    } else {
                                        setShowSignInDialog(true);
                                    }
                                }}
                                className="w-full sm:w-auto min-h-[44px] bg-transparent border-2 border-green-400 hover:bg-green-400/10 text-green-400 hover:text-green-300 font-semibold py-3 px-6 sm:px-8 rounded-full transition-all duration-300 flex items-center justify-center text-base sm:text-lg"
                            >
                                Request Role
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Explore Our Lyrics - Feature Showcase */}
            <section className="py-16 bg-gradient-to-b from-[#1a2b22] to-[#122118]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                            Explore Our <span className="text-green-400">Lyrics</span>
                        </h2>
                        <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto px-2">
                            Discover the full power of Afro Genie - from AI translations to cultural insights
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {/* Feature Card 1 */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">AI Translations</h3>
                            <p className="text-gray-400 mb-4">
                                Get accurate translations that preserve cultural context and meaning
                            </p>
                            <Link to="/request-translation" className="inline-flex items-center min-h-[44px] text-green-400 hover:text-green-300 font-semibold text-sm gap-1">
                                Try Now <span>→</span>
                            </Link>
                        </div>

                        {/* Feature Card 2 */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Community Forum</h3>
                            <p className="text-gray-400 mb-4">
                                Join discussions, share experiences, and connect with music lovers
                            </p>
                            <Link to="/community" className="inline-flex items-center min-h-[44px] text-amber-400 hover:text-amber-300 font-semibold text-sm gap-1">
                                Explore <span>→</span>
                            </Link>
                        </div>

                        {/* Feature Card 3 */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Vast Library</h3>
                            <p className="text-gray-400 mb-4">
                                Access thousands of African songs across multiple languages and genres
                            </p>
                            <Link to="/songs" className="inline-flex items-center min-h-[44px] text-green-400 hover:text-green-300 font-semibold text-sm gap-1">
                                Browse <span>→</span>
                            </Link>
                        </div>

                        {/* Feature Card 4 */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Cultural Context</h3>
                            <p className="text-gray-400 mb-4">
                                Understand the deeper meaning behind lyrics with cultural annotations
                            </p>
                            <Link to="/search" className="inline-flex items-center min-h-[44px] text-amber-400 hover:text-amber-300 font-semibold text-sm gap-1">
                                Learn More <span>→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Popular Songs Section */}
            {songs.length > 0 && (
                <section className="py-16 bg-[#122118]">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                            <div>
                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                                    Popular <span className="text-green-400">Songs</span>
                                </h2>
                                <p className="text-gray-400 mt-2 text-sm">
                                    Ranked by search requests, views, and translation requests
                                </p>
                            </div>
                            <Link 
                                to="/songs" 
                                className="inline-flex items-center min-h-[44px] text-green-400 hover:text-green-300 font-semibold gap-2 bg-green-600/20 hover:bg-green-600/30 px-4 py-2.5 rounded-lg transition-colors self-start"
                            >
                                View All <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                        {songsLoading ? (
                            <SongListSkeleton count={8} />
                        ) : songsError ? (
                            <div className="text-red-400 text-center py-8">{songsError}</div>
                        ) : (
                            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
                                <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-1 max-h-[600px] overflow-x-auto md:overflow-y-auto pr-2 pb-2">
                                    {songs.slice(0, 100).map((song, index) => {
                                        const artistName = song.artist || '';
                                        const isThisPlaying = currentTrack?.id === song.spotifyId && isPlaying;

                                        return (
                                        <div
                                            key={song.id}
                                            className="group min-w-[240px] md:min-w-0 flex items-center gap-2 py-2.5 sm:py-1.5 px-2 min-h-[44px] hover:bg-gray-700/50 rounded transition-colors"
                                        >
                                            <div className="flex-shrink-0 w-6 text-right">
                                                {song.spotifyId ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (isThisPlaying) {
                                                                togglePlayPause();
                                                            } else {
                                                                loadTrackById(song.spotifyId!, song.title, artistName);
                                                            }
                                                        }}
                                                        className="text-sm font-semibold text-gray-500 hover:text-green-400 transition-colors w-6 h-6 flex items-center justify-center"
                                                        aria-label={isThisPlaying ? 'Pause' : `Play ${song.title}`}
                                                    >
                                                        {isThisPlaying ? (
                                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M8 5v14l11-7z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-sm font-semibold text-gray-500 group-hover:text-green-400 transition-colors">
                                                        {index + 1}.
                                                    </span>
                                                )}
                                            </div>
                                            <Link
                                                to={`/songs/${song.id}`}
                                                className="flex-1 min-w-0 flex items-center gap-2"
                                            >
                                                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded overflow-hidden bg-gray-700/50">
                                                    {song.image ? (
                                                        <img
                                                            src={song.image}
                                                            alt={song.title}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-medium text-white group-hover:text-green-400 transition-colors line-clamp-1">
                                                        {song.title}
                                                    </h3>
                                                    {artistName && (
                                                        <p className="text-xs text-gray-400 line-clamp-1">
                                                            {artistName}
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Browse Languages Section */}
            <section className="py-16 bg-gradient-to-b from-[#122118] to-[#1a2b22]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                            Browse <span className="text-green-400">Languages</span>
                        </h2>
                    </div>
                    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 overflow-x-auto pb-2">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => {
                                    if (featureFlags.languagePages) {
                                        navigate(`/language/${lang.code}`);
                                    } else {
                                        setSelectedLanguage(lang.code);
                                    }
                                }}
                                className="group min-w-[150px] md:min-w-0 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl p-4 sm:p-6 border border-gray-700 hover:border-green-400/50 transition-all duration-300 text-center min-h-[44px] flex flex-col items-center justify-center"
                            >
                                {LANGUAGE_IMAGES[lang.code] ? (
                                    <img
                                        src={LANGUAGE_IMAGES[lang.code]}
                                        alt={`${lang.name} flag`}
                                        className="w-12 h-8 sm:w-14 sm:h-9 rounded-sm object-cover mb-3 shadow-md border border-gray-600"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="text-4xl mb-3">{lang.flag}</div>
                                )}
                                <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors text-sm sm:text-base">
                                    {lang.name}
                                </h3>
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setSelectedLanguage('all')}
                            className="group min-w-[150px] md:min-w-0 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl p-4 sm:p-6 border border-gray-700 hover:border-green-400/50 transition-all duration-300 text-center min-h-[44px] flex flex-col items-center justify-center"
                        >
                            <div className="text-4xl mb-3">🌍</div>
                            <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors text-sm sm:text-base">
                                All Languages
                            </h3>
                        </button>
                    </div>
                </div>
            </section>

            {/* Top Artists Section */}
            <section className="py-16 bg-[#122118]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                            Top Artists on <span className="text-green-400">AfroGenie</span>
                        </h2>
                        <Link 
                            to="/artists" 
                            className="inline-flex items-center min-h-[44px] text-green-400 hover:text-green-300 font-semibold gap-2 self-start"
                        >
                            More <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                    {artistsLoading ? (
                        <SquareGridSkeleton count={6} />
                    ) : artistsError ? (
                        <div className="text-red-400 text-center py-8">{artistsError}</div>
                    ) : artists.length === 0 ? (
                        <SquareGridSkeleton count={6} />
                    ) : (
                        <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 overflow-x-auto pb-2">
                            {artists.map((artist) => (
                                <Link 
                                    to={`/artist/${artist.id}`} 
                                    key={artist.id} 
                                    className="group cursor-pointer min-w-[150px] md:min-w-0"
                                >
                                    <div className="aspect-square rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-gradient-to-br from-green-500/20 to-amber-500/20 border border-gray-700 group-hover:border-green-400/50">
                                        {artist.image ? (
                                            <img src={artist.image} alt={artist.name} onError={onImageError} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="mt-3 font-semibold text-white group-hover:text-green-400 transition-colors text-center text-sm sm:text-base">
                                        {artist.name}
                                    </h3>
                                    {artist.genre && (
                                        <p className="text-xs sm:text-sm text-gray-400 text-center">{artist.genre}</p>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Explore by Genre Section */}
            <section className="py-16 bg-gradient-to-b from-[#1a2b22] to-[#122118]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                            Explore by <span className="text-green-400">Genre</span>
                        </h2>
                    </div>
                    {genresLoading ? (
                        <SquareGridSkeleton count={5} />
                    ) : genresError ? (
                        <div className="text-red-400 text-center py-8">{genresError}</div>
                    ) : genres.length === 0 ? (
                        <div className="text-gray-400 text-center py-8">
                            No genres yet. <Link to="/admin/genres" className="text-green-400 hover:underline">Add some in the admin panel!</Link>
                        </div>
                    ) : (
                        <div className="flex md:grid md:grid-cols-5 gap-4 md:gap-6 overflow-x-auto pb-2">
                            {genres.map((genre) => {
                                const genreImage = genre.image || GENRE_IMAGES[genre.name] || DEFAULT_GENRE_IMAGE;
                                return (
                                <Link 
                                    to={featureFlags.genrePages ? `/genre/${encodeURIComponent(genre.name)}` : `/search/${genre.name}`} 
                                    key={genre.id} 
                                    className="group cursor-pointer min-w-[150px] md:min-w-0"
                                >
                                    <div className="aspect-square rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg border border-gray-700 group-hover:border-green-400/50">
                                        <img
                                            src={genreImage}
                                            alt={genre.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = DEFAULT_GENRE_IMAGE;
                                            }}
                                        />
                                    </div>
                                    <h3 className="mt-3 font-semibold text-white group-hover:text-green-400 transition-colors text-center text-sm sm:text-base">
                                        {genre.name}
                                    </h3>
                                </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Trending Discussions Section */}
            <section className="py-16 bg-[#122118]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                            Trending <span className="text-amber-400">Discussions</span>
                        </h2>
                        <Link 
                            to="/community" 
                            className="inline-flex items-center min-h-[44px] text-amber-400 hover:text-amber-300 font-semibold gap-2 self-start"
                        >
                            View All <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                    {topicsLoading ? (
                        <SearchResultsSkeleton count={3} />
                    ) : topicsError ? (
                        <div className="text-red-400 text-center py-8">{topicsError}</div>
                    ) : trendingTopics.length === 0 ? (
                        <div className="text-gray-400 text-center py-8">
                            No trending discussions yet. <Link to="/community" className="text-amber-400 hover:underline">Start a conversation!</Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trendingTopics.map((topic) => (
                            <Link
                                key={topic.id}
                                to={`/community/topic/${topic.id}`}
                                className="bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-300 rounded-xl border border-gray-700 hover:border-amber-400/50 p-6"
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    {topic.authorAvatar ? (
                                        <img
                                            src={topic.authorAvatar}
                                            alt={topic.authorName}
                                            className="h-10 w-10 rounded-full flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-bold text-sm">
                                                {topic.authorName?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white line-clamp-2 mb-1 hover:text-amber-400 transition-colors">
                                            {topic.title}
                                        </h3>
                                        <p className="text-xs text-gray-400">{topic.authorName}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                                    {topic.content}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.834a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-5.834a1.5 1.5 0 011.5-1.5h1a1.5 1.5 0 011.5 1.5v5.834a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5V10.5a1.5 1.5 0 011.5-1.5h1a1.5 1.5 0 011.5 1.5v6a7.5 7.5 0 01-7.5 7.5h-2A7.5 7.5 0 012 16.5v-6z" />
                                        </svg>
                                        {topic.likes || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        {topic.commentCount || 0}
                                    </span>
                                </div>
                            </Link>
                        ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CSS Animation */}
            <style dangerouslySetInnerHTML={{__html: `
                ${genieSettings.animationType === 'float' ? `
                    @keyframes float {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-20px); }
                    }
                ` : ''}
                ${genieSettings.animationType === 'bounce' ? `
                    @keyframes bounce {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-30px); }
                    }
                ` : ''}
                ${genieSettings.animationType === 'pulse' ? `
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                    }
                ` : ''}
                ${genieSettings.animationType === 'spin' ? `
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                ` : ''}
                .genie-animated {
                    ${genieSettings.animationType !== 'none' ? `
                        animation: ${genieSettings.animationType} ${genieSettings.animationDuration}s ease-in-out ${genieSettings.animationDelay}s infinite;
                    ` : ''}
                }
            `}} />

            <ConfirmDialog
                isOpen={showSignInDialog}
                title="Sign In Required"
                message="You need to be signed in to request a role. Please sign in or create an account first."
                confirmText="Sign In"
                cancelText="Cancel"
                onConfirm={() => {
                    setShowSignInDialog(false);
                    navigate('/');
                    setTimeout(() => {
                        const loginButton = document.querySelector('[data-login-button]') as HTMLElement;
                        if (loginButton) loginButton.click();
                    }, 100);
                }}
                onCancel={() => setShowSignInDialog(false)}
                type="info"
            />
        </div>
    );
};

export default HomePage;
