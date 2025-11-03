import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllArtists, getAllGenres } from '../services/firebaseService';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Artist, Genre } from '../types';

const HomePage: React.FC = () => {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [genres, setGenres] = useState<Genre[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [fetchedArtists, fetchedGenres] = await Promise.all([
                    getAllArtists(),
                    getAllGenres()
                ]);
                setArtists(fetchedArtists.slice(0, 8)); // Show top 8 artists
                setGenres(fetchedGenres.slice(0, 10)); // Show top 10 genres
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
                        src="/Images/gene.png"
                        alt="Afro Genie Mascot"
                        className="h-80 md:h-[500px] opacity-20 animate-float"
                        style={{
                            filter: 'blur(2px)',
                        }}
                    />
                </div>

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
                    <img
                        src="/Images/gene.png"
                        alt="Afro Genie Mascot"
                        className="mx-auto mb-4 h-64 md:h-72 animate-float"
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

            {/* CSS Animation */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-20px);
                    }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}} />
        </div>
    );
};

export default HomePage;