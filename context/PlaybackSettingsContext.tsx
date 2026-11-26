import React, { createContext, useContext, useState, useCallback } from 'react';

interface PlaybackSettingsContextValue {
  fontSize: number;
  setFontSize: (size: number) => void;
  resetTranslationSignal: number;
  handleResetTranslation: () => void;
}

const PlaybackSettingsContext = createContext<PlaybackSettingsContextValue | null>(null);

export function usePlaybackSettings() {
  const context = useContext(PlaybackSettingsContext);
  if (!context) {
    throw new Error('usePlaybackSettings must be used within a PlaybackSettingsProvider');
  }
  return context;
}

interface PlaybackSettingsProviderProps {
  children: React.ReactNode;
  initialFontSize?: number;
}

export const PlaybackSettingsProvider: React.FC<PlaybackSettingsProviderProps> = ({
  children,
  initialFontSize = 20,
}) => {
  const [fontSize, setFontSizeState] = useState(() => {
    const saved = localStorage.getItem('playbackFontSize');
    return saved ? parseInt(saved, 10) : initialFontSize;
  });

  const setFontSize = useCallback((size: number) => {
    setFontSizeState(size);
    localStorage.setItem('playbackFontSize', size.toString());
  }, []);

  const [resetTranslationSignal, setResetTranslationSignal] = useState(0);

  const handleResetTranslation = useCallback(() => {
    setResetTranslationSignal((prev) => prev + 1);
  }, []);

  return (
    <PlaybackSettingsContext.Provider
      value={{ fontSize, setFontSize, resetTranslationSignal, handleResetTranslation }}
    >
      {children}
    </PlaybackSettingsContext.Provider>
  );
};

export default PlaybackSettingsContext;
