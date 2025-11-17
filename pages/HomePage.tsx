import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllArtists, getAllGenres, getAllSongs, getGenieSettings, getTopics } from '../services/firebaseService';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Artist, Genre, Song, GenieSettings, Topic } from '../types';

const HomePage: React.FC = () => {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [genres, setGenres] = useState<Genre[]>([]);
    const [songs, setSongs] = useState<Song[]>([]);
    const [trendingTopics, setTrendingTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [genieSettings, setGenieSettings] = useState<GenieSettings>({
        imageUrl: '/Images/gene.png',
        animationType: 'float',
        animationDuration: 3,
        animationDelay: 0,
        opacity: 20,
        size: 'large'
    });

    // Languages supported
    const languages = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
        { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
        { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
        { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
        { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
        { code: 'fr', name: 'French', flag: '🇫🇷' },
        { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
        { code: 'ar', name: 'Arabic', flag: '🇸🇦' }
    ];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [fetchedArtists, fetchedGenres, fetchedSongs, fetchedGenieSettings, topics] = await Promise.all([
                    getAllArtists(),
                    getAllGenres(),
                    getAllSongs(),
                    getGenieSettings(),
                    getTopics(undefined, 'mostLiked', 5).catch(() => [])
                ]);
                setArtists(fetchedArtists.slice(0, 12)); // Show top 12 artists
                setGenres(fetchedGenres.slice(0, 10)); // Show top 10 genres
                setSongs(fetchedSongs.slice(0, 9)); // Show top 9 songs for charting
                setTrendingTopics(topics);
                if (fetchedGenieSettings) {
                    setGenieSettings(fetchedGenieSettings);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-[#122118]">
            {/* Modern Hero Section */}
            <section className="relative bg-gradient-to-br from-[#122118] via-[#1a2b22] to-[#122118] py-16 md:py-24 overflow-hidden">
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
                        
                        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
                            The Largest Library of{' '}
                            <span className="text-green-400">African Lyrics</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-300 mb-8">
                            Discover, translate, and explore African music with cultural context
                        </p>
                        
                        {/* Search Bar */}
                        <div className="mb-8">
                            <SearchBar variant="homepage" />
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <Link 
                                to="/request-translation" 
                                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-green-500/50 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Request Translation
                            </Link>
                            <Link 
                                to="/community" 
                                className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold py-3 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-amber-500/50 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                </svg>
                                Join Community
                            </Link>
                            <Link 
                                to="/artist/signup" 
                                className="bg-transparent border-2 border-green-400 hover:bg-green-400/10 text-green-400 hover:text-green-300 font-semibold py-3 px-8 rounded-full transition-all duration-300"
                            >
                                For Artists
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Explore Our Lyrics - Feature Showcase */}
            <section className="py-16 bg-gradient-to-b from-[#1a2b22] to-[#122118]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Explore Our <span className="text-green-400">Lyrics</span>
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Discover the full power of Afro Genie - from AI translations to cultural insights
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Feature Card 1 */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">AI Translations</h3>
                            <p className="text-gray-400 mb-4">
                                Get accurate translations that preserve cultural context and meaning
                            </p>
                            <Link to="/request-translation" className="text-green-400 hover:text-green-300 font-semibold text-sm flex items-center gap-1">
                                Try Now <span>→</span>
                            </Link>
                        </div>

                        {/* Feature Card 2 */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Community Forum</h3>
                            <p className="text-gray-400 mb-4">
                                Join discussions, share experiences, and connect with music lovers
                            </p>
                            <Link to="/community" className="text-amber-400 hover:text-amber-300 font-semibold text-sm flex items-center gap-1">
                                Explore <span>→</span>
                            </Link>
                        </div>

                        {/* Feature Card 3 */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Vast Library</h3>
                            <p className="text-gray-400 mb-4">
                                Access thousands of African songs across multiple languages and genres
                            </p>
                            <Link to="/search" className="text-green-400 hover:text-green-300 font-semibold text-sm flex items-center gap-1">
                                Browse <span>→</span>
                            </Link>
                        </div>

                        {/* Feature Card 4 */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Cultural Context</h3>
                            <p className="text-gray-400 mb-4">
                                Understand the deeper meaning behind lyrics with cultural annotations
                            </p>
                            <Link to="/request-translation" className="text-amber-400 hover:text-amber-300 font-semibold text-sm flex items-center gap-1">
                                Learn More <span>→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Top Charting Songs Section */}
            {songs.length > 0 && (
                <section className="py-16 bg-[#122118]">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl md:text-4xl font-bold text-white">
                                Top Charting <span className="text-green-400">Songs</span>
                            </h2>
                            <Link 
                                to="/search" 
                                className="text-green-400 hover:text-green-300 font-semibold flex items-center gap-2"
                            >
                                More <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                {songs.map((song) => (
                                    <Link 
                                        to={`/song/${song.id}`} 
                                        key={song.id} 
                                        className="group bg-gray-800/50 hover:bg-gray-700/50 rounded-xl overflow-hidden border border-gray-700 hover:border-green-400/50 transition-all duration-300"
                                    >
                                        <div className="flex gap-4 p-4">
                                            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-green-500/20 to-amber-500/20 rounded-lg flex items-center justify-center">
                                                {song.image ? (
                                                    <img src={song.image} alt={song.title} className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-white group-hover:text-green-400 transition-colors line-clamp-1">
                                                    {song.title}
                                                </h3>
                                                <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                                                    {song.artist}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Browse Languages Section */}
            <section className="py-16 bg-gradient-to-b from-[#122118] to-[#1a2b22]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-white">
                            Browse <span className="text-green-400">Languages</span>
                        </h2>
                        <Link 
                            to="/search" 
                            className="text-green-400 hover:text-green-300 font-semibold flex items-center gap-2"
                        >
                            More <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {languages.map((lang) => (
                            <Link
                                key={lang.code}
                                to={`/search/${lang.name}`}
                                className="group bg-gray-800/50 hover:bg-gray-700/50 rounded-xl p-6 border border-gray-700 hover:border-green-400/50 transition-all duration-300 text-center"
                            >
                                <div className="text-4xl mb-3">{lang.flag}</div>
                                <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                                    {lang.name}
                                </h3>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Top Artists Section */}
            <section className="py-16 bg-[#122118]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-white">
                            Top Artists on <span className="text-green-400">AfroGenie</span>
                        </h2>
                        <Link 
                            to="/search" 
                            className="text-green-400 hover:text-green-300 font-semibold flex items-center gap-2"
                        >
                            More <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <LoadingSpinner />
                        </div>
                    ) : error ? (
                        <div className="text-red-400 text-center py-8">{error}</div>
                    ) : artists.length === 0 ? (
                        <div className="text-gray-400 text-center py-8">
                            No artists yet. <Link to="/admin/artists" className="text-green-400 hover:underline">Add some in the admin panel!</Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                            {artists.map((artist) => (
                                <Link 
                                    to={`/search/${artist.name}`} 
                                    key={artist.id} 
                                    className="group cursor-pointer"
                                >
                                    <div className="aspect-square rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-gradient-to-br from-green-500/20 to-amber-500/20 border border-gray-700 group-hover:border-green-400/50">
                                        {artist.image ? (
                                            <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="mt-3 font-semibold text-white group-hover:text-green-400 transition-colors text-center">
                                        {artist.name}
                                    </h3>
                                    {artist.genre && (
                                        <p className="text-sm text-gray-400 text-center">{artist.genre}</p>
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
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-white">
                            Explore by <span className="text-green-400">Genre</span>
                        </h2>
                        <Link 
                            to="/search" 
                            className="text-green-400 hover:text-green-300 font-semibold flex items-center gap-2"
                        >
                            More <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <LoadingSpinner />
                        </div>
                    ) : error ? (
                        <div className="text-red-400 text-center py-8">{error}</div>
                    ) : genres.length === 0 ? (
                        <div className="text-gray-400 text-center py-8">
                            No genres yet. <Link to="/admin/genres" className="text-green-400 hover:underline">Add some in the admin panel!</Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
                            {genres.map((genre) => (
                                <Link 
                                    to={`/search/${genre.name}`} 
                                    key={genre.id} 
                                    className="group cursor-pointer"
                                >
                                    <div className="aspect-square rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-gradient-to-br from-green-500/20 to-amber-500/20 border border-gray-700 group-hover:border-green-400/50">
                                        {genre.image ? (
                                            <img src={genre.image} alt={genre.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="mt-3 font-semibold text-white group-hover:text-green-400 transition-colors text-center">
                                        {genre.name}
                                    </h3>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Trending Discussions Section */}
            {trendingTopics.length > 0 && (
                <section className="py-16 bg-[#122118]">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl md:text-4xl font-bold text-white">
                                Trending <span className="text-amber-400">Discussions</span>
                            </h2>
                            <Link 
                                to="/community" 
                                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-2"
                            >
                                View All <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
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
                    </div>
                </section>
            )}

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
        </div>
    );
};

export default HomePage;
