import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllArtists, getAllGenres, getGenieSettings, getTopics } from '../services/firebaseService';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Artist, Genre, GenieSettings, Topic } from '../types';

const HomePage: React.FC = () => {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [genres, setGenres] = useState<Genre[]>([]);
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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [fetchedArtists, fetchedGenres, fetchedGenieSettings, topics] = await Promise.all([
                    getAllArtists(),
                    getAllGenres(),
                    getGenieSettings(),
                    getTopics(undefined, 'mostLiked', 5).catch(() => []) // Get top 5 most liked topics
                ]);
                setArtists(fetchedArtists.slice(0, 8)); // Show top 8 artists
                setGenres(fetchedGenres.slice(0, 10)); // Show top 10 genres
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
        <div>
            {/* Hero Section */}
            <section className="relative text-center py-20 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#122118] via-[#122118]/80 to-transparent z-10"></div>
                
                {/* Floating Genie Background */}
                <div className="absolute inset-0 flex items-center justify-center z-0">
                    <img
                        src={genieSettings.imageUrl}
                        alt="Afro Genie Mascot"
                        className={`genie-animated ${genieSettings.size === 'small' ? 'h-48 md:h-64' : genieSettings.size === 'medium' ? 'h-64 md:h-80' : 'h-80 md:h-[500px]'}`}
                        style={{
                            filter: 'blur(2px)',
                            opacity: genieSettings.opacity / 100,
                        }}
                    />
                </div>

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
                    <img
                        src={genieSettings.imageUrl}
                        alt="Afro Genie Mascot"
                        className={`mx-auto mb-4 genie-animated ${genieSettings.size === 'small' ? 'h-40 md:h-48' : genieSettings.size === 'medium' ? 'h-52 md:h-60' : 'h-64 md:h-72'}`}
                    />
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-8">
                            <SearchBar variant="homepage" />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight">
                            The Largest Library of <span className="text-green-400">African Lyrics</span>
                        </h1>
                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/request-translation" className="bg-[#2a3c30] hover:bg-[#395040] text-white font-semibold py-3 px-8 rounded-full transition-all duration-300 w-full sm:w-auto text-center">
                                Request Translation
                            </Link>
                            <Link to="/request-translation" className="bg-transparent border-2 border-[#2a3c30] hover:bg-[#2a3c30] text-gray-300 hover:text-white font-semibold py-3 px-8 rounded-full transition-all duration-300 w-full sm:w-auto text-center">
                                Contribute
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trending Now Section */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-white mb-8">Trending Now</h2>
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {artists.map((artist) => (
                                <Link to={`/search/${artist.name}`} key={artist.id} className="group cursor-pointer">
                                    <div className="aspect-[4/5] rounded-lg overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-[#2a3c30]">
                                        {artist.image ? (
                                            <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                No image
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="mt-3 font-semibold text-white">{artist.name}</h3>
                                    <p className="text-sm text-gray-400">{artist.genre}</p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Explore by Genre Section */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-white mb-8">Explore by Genre</h2>
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
                                <Link to={`/search/${genre.name}`} key={genre.id} className="group cursor-pointer">
                                    <div className="aspect-square rounded-lg overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-[#2a3c30]">
                                        {genre.image ? (
                                            <img src={genre.image} alt={genre.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                No image
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="mt-3 font-semibold text-white text-center">{genre.name}</h3>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Trending Topics Section */}
            {trendingTopics.length > 0 && (
                <section className="py-16">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-bold text-white">Trending Discussions</h2>
                            <Link 
                                to="/community" 
                                className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                            >
                                View All →
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {trendingTopics.map((topic) => (
                                <Link
                                    key={topic.id}
                                    to={`/community/topic/${topic.id}`}
                                    className="bg-gray-800/50 hover:bg-gray-700/50 transition-colors rounded-lg border border-gray-700 p-5"
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        {topic.authorAvatar ? (
                                            <img
                                                src={topic.authorAvatar}
                                                alt={topic.authorName}
                                                className="h-8 w-8 rounded-full flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center flex-shrink-0">
                                                <span className="text-white font-bold text-xs">
                                                    {topic.authorName?.[0]?.toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-200 line-clamp-2 mb-1">
                                                {topic.title}
                                            </h3>
                                            <p className="text-xs text-gray-400">{topic.authorName}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">
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