import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { spotifyAuthService } from '../services/spotifyAuthService';
import PremiumBadge from './PremiumBadge';

const SpotifyLinkDialog: React.FC = () => {
  const { user, isSpotifyPremium } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);

  useEffect(() => {
    if (!user || sessionDismissed) {
      setIsOpen(false);
      return;
    }

    if (isSpotifyPremium) {
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => setIsOpen(true), 2000);
    return () => clearTimeout(timer);
  }, [user, isSpotifyPremium, sessionDismissed]);

  const handleConnect = async () => {
    try {
      const { url } = await spotifyAuthService.getAuthorizationUrl({ action: 'link' });
      sessionStorage.setItem('spotify_redirect_after_auth', window.location.href);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to initiate Spotify link:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-600/50 max-w-md w-full animate-scale-in relative overflow-hidden">
        {/* Green glow accent */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-green-500/5 rounded-full blur-3xl" />

        <button
          onClick={() => setSessionDismissed(true)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-20"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative z-10 p-6 md:p-8">
          {/* Spotify icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
              <div className="relative bg-gray-700/50 p-4 rounded-full border border-green-500/30">
                <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-white text-center mb-2">
            Unlock Full Playback
          </h3>

          {/* Premium badge */}
          <div className="flex justify-center mb-3">
            <PremiumBadge variant="full" />
          </div>

          {/* Message */}
          <p className="text-gray-300 text-center mb-6 leading-relaxed text-sm">
            Connect your Spotify Premium account to play full tracks directly in Afro Genie
          </p>

          {/* Connect button */}
          <button
            onClick={handleConnect}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-900/30 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Connect Spotify
          </button>
          <p className="text-gray-400 text-xs text-center mt-4">
            Spotify Premium is required for full track playback
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpotifyLinkDialog;
