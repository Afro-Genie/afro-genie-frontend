import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAudioPlayer } from './AudioContext';

export interface PlaybackQueueItem {
  id: string;
  title: string;
  artist: string;
}

interface PlaybackContextValue {
  queue: PlaybackQueueItem[];
  currentIndex: number;
  hasQueue: boolean;
  /** Play a single song, optionally replacing the queue. */
  playSong: (song: PlaybackQueueItem, queue?: PlaybackQueueItem[]) => void;
  /** Replace the queue and start playing at `index`. */
  playQueue: (songs: PlaybackQueueItem[], index?: number) => void;
  /** Append a song to the end of the queue. */
  addToQueue: (song: PlaybackQueueItem) => void;
  next: () => void;
  previous: () => void;
  clearQueue: () => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return ctx;
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const { loadTrackBySongId, trackEndedCount } = useAudioPlayer();

  const [queue, setQueue] = useState<PlaybackQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const lastEndedRef = useRef(trackEndedCount);

  const playItem = useCallback(
    (item: PlaybackQueueItem) => {
      if (item.id && !item.id.startsWith('spotify:')) {
        void loadTrackBySongId(item.id, item.title, item.artist);
      }
    },
    [loadTrackBySongId],
  );

  const playSong = useCallback(
    (song: PlaybackQueueItem, nextQueue?: PlaybackQueueItem[]) => {
      const resolved = nextQueue && nextQueue.length > 0 ? nextQueue : [song];
      const index = Math.max(0, resolved.findIndex((q) => q.id === song.id));
      setQueue(resolved);
      setCurrentIndex(index);
      playItem(resolved[index]);
    },
    [playItem],
  );

  const playQueue = useCallback(
    (songs: PlaybackQueueItem[], index = 0) => {
      if (songs.length === 0) return;
      const safeIndex = Math.min(Math.max(0, index), songs.length - 1);
      setQueue(songs);
      setCurrentIndex(safeIndex);
      playItem(songs[safeIndex]);
    },
    [playItem],
  );

  const addToQueue = useCallback((song: PlaybackQueueItem) => {
    setQueue((prev) => [...prev, song]);
  }, []);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) return;
    setCurrentIndex(nextIndex);
    playItem(queue[nextIndex]);
  }, [queue, currentIndex, playItem]);

  const previous = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) return;
    setCurrentIndex(prevIndex);
    playItem(queue[prevIndex]);
  }, [queue, currentIndex, playItem]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
  }, []);

  // Auto-advance when a track finishes and a queue is active.
  useEffect(() => {
    if (trackEndedCount === lastEndedRef.current) return;
    lastEndedRef.current = trackEndedCount;
    if (queue.length > 1 && currentIndex >= 0 && currentIndex < queue.length - 1) {
      next();
    }
  }, [trackEndedCount, queue, currentIndex, next]);

  const value = useMemo<PlaybackContextValue>(
    () => ({
      queue,
      currentIndex,
      hasQueue: queue.length > 0,
      playSong,
      playQueue,
      addToQueue,
      next,
      previous,
      clearQueue,
    }),
    [queue, currentIndex, playSong, playQueue, addToQueue, next, previous, clearQueue],
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}
