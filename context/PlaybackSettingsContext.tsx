import React, { createContext, useContext, useState, useCallback } from 'react';

interface PlaybackSettingsContextValue {
  fontSize: number;
  setFontSize: (size: number) => void;
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
  onResetTranslation?: () => void;
}

export const PlaybackSettingsProvider: React.FC<PlaybackSettingsProviderProps> = ({
  children,
  initialFontSize = 20,
  onResetTranslation,
}) => {
  const [fontSize, setFontSizeState] = useState(() => {
    const saved = localStorage.getItem('playbackFontSize');
    return saved ? parseInt(saved, 10) : initialFontSize;
  });

  const setFontSize = useCallback((size: number) => {
    setFontSizeState(size);
    localStorage.setItem('playbackFontSize', size.toString());
  }, []);

  const handleResetTranslation = useCallback(() => {
    onResetTranslation?.();
  }, [onResetTranslation]);

  return (
    <PlaybackSettingsContext.Provider value={{ fontSize, setFontSize, handleResetTranslation }}>
      {children}
    </PlaybackSettingsContext.Provider>
  );
};

export default PlaybackSettingsContext;
