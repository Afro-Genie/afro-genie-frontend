import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    getSong, 
    getLatestTranslationForSong, 
    addToFavorites, 
    removeFromFavorites, 
    getUserFavorites,
    addToHistory 
} from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';
import HeartIcon from './icons/HeartIcon';
import ShareIcon from './icons/ShareIcon';
import FontSizeIcon from './icons/FontSizeIcon';
import type { Song } from '../types';

const LyricContent: React.FC = () => {
    const { currentUser } = useAuth();
    const { id: songIdParam } = useParams<{ id: string }>();
    const songId = useMemo(() => songIdParam ?? '', [songIdParam]);
    const [activeTab, setActiveTab] = useState<'original' | 'translation'>('original');
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

  return (
    <div className="px-12 py-8 relative">
        <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-white">
                {title && artist ? `${artist.toUpperCase()} - ${title.toUpperCase()}` : 'Loading...'}
            </h1>
        </div>

        {loading && (
            <div className="text-gray-400">Loading song and translations...</div>
        )}
        {(!loading && error) && (
            <div className="text-red-400">{error}</div>
        )}

        {/* Language Tabs */}
        <div className="flex border-b border-white/10 mb-6">
            <button 
                onClick={() => setActiveTab('original')}
                className={`py-2 px-4 font-semibold transition-colors ${activeTab === 'original' ? 'text-white border-b-2 border-white' : 'text-gray-400'}`}
            >
                Original
            </button>
            <button
                onClick={() => setActiveTab('translation')}
                className={`py-2 px-4 font-semibold transition-colors ${activeTab === 'translation' ? 'text-white border-b-2 border-white' : 'text-gray-400'}`}
            >
                Translation
            </button>
        </div>

        {/* Lyrics */}
        <div className="space-y-10 text-gray-200 text-lg leading-loose">
            {activeTab === 'original' && (
            <section>
                    <h3 className="font-bold text-white mb-3">Original Lyrics</h3>
                <pre className="font-sans whitespace-pre-wrap">{originalLyrics}</pre>
            </section>
            )}
            {activeTab === 'translation' && (
            <section>
                    <h3 className="font-bold text-white mb-3">Translation</h3>
                <pre className="font-sans whitespace-pre-wrap">{translatedLyrics}</pre>
            </section>
            )}
        </div>
        
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
            <button className="flex flex-col items-center justify-center w-20 h-14 rounded-full hover:bg-white/10 transition-colors">
                <FontSizeIcon className="h-6 w-6"/>
                <span className="text-xs mt-1">Font Size</span>
            </button>
        </div>
    </div>
  );
};

export default LyricContent;