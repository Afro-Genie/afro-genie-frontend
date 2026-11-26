import React, { useEffect, useState, useRef } from 'react';
import { Upload, ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { uploadImage } from '../services/uploadService';
import { toMediaUrl } from '../lib/apiBase';
import MediaImage from './MediaImage';

interface ImageUploadProps {
  label: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
  onRemove?: () => void;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ label, currentUrl, onUploaded, onRemove, className }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = toMediaUrl(preview || currentUrl || '');

  useEffect(() => {
    setImageFailed(false);
  }, [displayUrl]);

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    setImageFailed(false);
    if (inputRef.current) inputRef.current.value = '';
    onRemove?.();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageFailed(false);
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    setError(null);

    try {
      const url = await uploadImage(file, 'images');
      onUploaded(url);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setTimeout(() => setError(null), 3000);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700/50 border border-gray-600 flex items-center justify-center flex-shrink-0">
          {displayUrl ? (
            imageFailed ? (
              <ImageIcon className="w-6 h-6 text-gray-500" />
            ) : (
              <MediaImage
                src={displayUrl}
                alt={label}
                onError={() => setImageFailed(true)}
                className="w-full h-full object-cover"
                fallback={<ImageIcon className="w-6 h-6 text-gray-500" />}
                fallbackClassName="flex items-center justify-center"
              />
            )
          ) : (
            <ImageIcon className="w-6 h-6 text-gray-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
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
                Choose File
              </>
            )}
          </button>
          {displayUrl && onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="ml-2 px-3 py-1.5 text-red-400 hover:text-red-300 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              Remove image
            </button>
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

export default ImageUpload;
