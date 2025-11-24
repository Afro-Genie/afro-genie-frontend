import React, { useEffect, useState } from 'react';
import { spotifyService, SpotifyTrack } from '../services/spotifyService';

interface SpotifyPlayerProps {
  title: string;
  artist: string;
  compact?: boolean;
}

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ title, artist, compact = false }) => {
  const [spotifyTrack, setSpotifyTrack] = useState<SpotifyTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchTrack = async () => {
      if (!title || !artist) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Search for the track using Spotify API
        const tracks = await spotifyService.searchTrackByArtistAndTitle(artist, title);
        
        if (tracks && tracks.length > 0) {
          // Use the first result (most relevant)
          setSpotifyTrack(tracks[0]);
        } else {
          setError('Track not found on Spotify');
        }
      } catch (err: any) {
        console.error('Error searching for Spotify track:', err);
        // Don't show error if credentials are not configured
        if (err.message?.includes('credentials not configured')) {
          setError(null); // Silently fail if credentials aren't set up
        } else {
          setError('Unable to load Spotify player');
        }
      } finally {
        setLoading(false);
      }
    };

    searchTrack();
  }, [title, artist]);

  // Don't render anything if loading, error, or no track found
  if (loading || error || !spotifyTrack) {
    return null;
  }

  const spotifyEmbedUrl = `https://open.spotify.com/embed/track/${spotifyTrack.id}?utm_source=generator&theme=0`;

  if (compact) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden w-full md:w-[280px] h-[80px]">
        <iframe
          src={spotifyEmbedUrl}
          width="100%"
          height="80"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ border: 'none' }}
        />
      </div>
    );
  }

  return (
    <div className="mb-6 bg-gray-800/50 rounded-xl border border-gray-700 p-4 md:p-6 shadow-lg">
      <div className="mb-4">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{title}</h3>
        <p className="text-gray-300 text-base md:text-lg">{artist}</p>
      </div>
      
      <div className="w-full rounded-lg overflow-hidden">
        <iframe
          src={spotifyEmbedUrl}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-lg"
          style={{ minHeight: '152px' }}
        />
      </div>
    </div>
  );
};

export default SpotifyPlayer;

