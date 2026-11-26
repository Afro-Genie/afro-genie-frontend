import React, { useEffect, useState } from 'react';
import { resolveMediaUrl, toMediaUrl } from '../lib/apiBase';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  alt?: string;
  className: string;
  fallbackClassName?: string;
  initialsClassName?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  alt = '',
  className,
  fallbackClassName = 'bg-gradient-to-br from-green-600 to-green-800',
  initialsClassName = 'text-sm font-bold text-white',
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    setFailedUrl(null);
  }, [src]);

  const normalizedSrc = resolveMediaUrl(src);
  const imageUrl = normalizedSrc && failedUrl !== src ? toMediaUrl(normalizedSrc) : null;
  const initial = name?.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-full ${className}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          onError={() => setFailedUrl(src ?? null)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center ${fallbackClassName}`}>
          <span className={initialsClassName}>{initial}</span>
        </div>
      )}
    </div>
  );
};

export default Avatar;
