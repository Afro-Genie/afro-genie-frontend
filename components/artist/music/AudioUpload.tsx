import React, { useState, useRef } from 'react';
import { Upload, Music, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadAudio } from '../../../services/uploadService';
import { toMediaUrl } from '../../../lib/apiBase';

const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
  'audio/x-flac',
  'audio/opus',
];

const MAX_SIZE = 50 * 1024 * 1024;

const formatBytes = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (ms: number): string => {
  if (!ms || !Number.isFinite(ms)) return '';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

interface AudioUploadProps {
  label: string;
  currentUrl?: string;
  currentDurationMs?: number;
  onUploaded: (url: string, durationMs: number) => void;
  className?: string;
}

const AudioUpload: React.FC<AudioUploadProps> = ({ label, currentUrl, currentDurationMs, onUploaded, className }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(currentDurationMs ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 4000);
  };

  const readDuration = (file: File): Promise<number> =>
    new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const el = new Audio();
        el.preload = 'metadata';
        el.onloadedmetadata = () => {
          const ms = Math.round((el.duration || 0) * 1000);
          URL.revokeObjectURL(url);
          resolve(ms);
        };
        el.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(0);
        };
        el.src = url;
      } catch {
        resolve(0);
      }
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
      showError('Unsupported audio type. Use MP3, WAV, M4A, AAC, OGG, WebM, FLAC, or Opus.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (file.size > MAX_SIZE) {
      showError('File must be under 50MB');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const [duration, result] = await Promise.all([readDuration(file), uploadAudio(file)]);
      setFileName(file.name);
      setFileSize(file.size);
      setDurationMs(duration);
      onUploaded(result.url, duration);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const audioUrl = toMediaUrl(currentUrl || '');

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700/50 border border-gray-600 flex items-center justify-center flex-shrink-0">
          <Music className="w-6 h-6 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_AUDIO_TYPES.join(',')}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Choose Audio File
              </>
            )}
          </button>
          {(currentUrl || fileName) && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="truncate">{fileName || 'Audio attached'}</span>
              </div>
              {(fileSize ?? 0) > 0 && (
                <span className="text-xs text-gray-400">{formatBytes(fileSize!)}</span>
              )}
              {audioUrl && (
                <audio
                  controls
                  preload="metadata"
                  src={audioUrl}
                  className="w-full h-9 mt-1"
                />
              )}
              {durationMs ? (
                <span className="text-xs text-gray-400">Duration: {formatDuration(durationMs)}</span>
              ) : null}
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
};

export default AudioUpload;
