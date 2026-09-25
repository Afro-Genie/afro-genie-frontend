import React, { useEffect, useRef } from 'react';
import { useAudioPlayer, type YouTubeController } from '../context/AudioContext';
import YouTubePlayer, { type YouTubePlayerHandle } from './YouTubePlayer';
import { featureFlags } from '../config/featureFlags';

/**
 * Global bridge between the audio engine (AudioContext) and the YouTube
 * IFrame player. Mounted once near the app root.
 *
 * Renders a hidden, audio-only YouTube player whenever the audio engine
 * selects the YOUTUBE playback tier, and pipes play/pause/seek state both ways.
 * Visible controls live in <NowPlayingBar>.
 *
 * Gated on the Phase 4 rollout flag (`VITE_FLAG_PLAYBACK_YOUTUBE`): when the
 * flag is off the legacy Spotify player (SDK/preview) is used exclusively.
 */
const PlaybackManager: React.FC = () => {
  const {
    playbackMode,
    youtubeVideoId,
    currentTrack,
    registerYouTubeController,
    reportYouTubeState,
    handleYouTubeEnded,
    handleYouTubeError,
  } = useAudioPlayer();

  const handleRef = useRef<YouTubePlayerHandle | null>(null);

  useEffect(() => {
    if (playbackMode !== 'youtube') {
      registerYouTubeController(null);
    }
    return () => {
      registerYouTubeController(null);
    };
  }, [playbackMode, registerYouTubeController]);

  if (playbackMode !== 'youtube' || !youtubeVideoId) return null;
  if (!featureFlags.youtubePlayback) return null;

  const controller: YouTubeController = {
    play: () => handleRef.current?.play(),
    pause: () => handleRef.current?.pause(),
    seek: (seconds: number) => handleRef.current?.seek(seconds),
    setVolume: (volume: number) => handleRef.current?.setVolume(volume),
  };

  return (
    <YouTubePlayer
      ref={handleRef}
      videoId={youtubeVideoId}
      autoplay
      showControls={false}
      coverImageUrl={currentTrack?.imageUrl ?? null}
      title={currentTrack?.name}
      artist={currentTrack?.artistName}
      onReady={() => registerYouTubeController(controller)}
      onStateChange={reportYouTubeState}
      onEnd={handleYouTubeEnded}
      onError={handleYouTubeError}
    />
  );
};

export default PlaybackManager;
