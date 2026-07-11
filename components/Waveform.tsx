import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useAudioPlayer } from '../context/AudioContext';

interface WaveformProps {
  height?: number;
  barWidth?: number;
  barGap?: number;
  color?: string;
  progressColor?: string;
  className?: string;
}

export default function Waveform({
  height = 48,
  barWidth = 2,
  barGap = 1,
  color = '#374151',
  progressColor = '#22c55e',
  className = '',
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const { getAudioElement, currentTrack, currentTime } = useAudioPlayer();

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height,
      barWidth,
      barGap,
      barRadius: 2,
      cursorWidth: 0,
      interact: false,
      waveColor: color,
      progressColor,
    });

    wsRef.current = ws;

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [height, barWidth, barGap, color, progressColor]);

  useEffect(() => {
    const ws = wsRef.current;
    const audio = getAudioElement();
    if (!ws || !audio) return;

    ws.setMediaElement(audio);

    return () => {
      ws.setMediaElement(audio);
    };
  }, [getAudioElement, currentTrack?.previewUrl]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden rounded ${className}`}
      style={{ minHeight: height }}
    />
  );
}
