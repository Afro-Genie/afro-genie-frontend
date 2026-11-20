import React, { useEffect, useState } from 'react';
import { toMediaUrl } from '../lib/apiBase';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  alt?: string;
  className: string;
  fallbackClassName?: string;
  initialsClassName?: string;
}

const isFacebookCdnUrl = (url: string): boolean =>
  /^https?:\/\/[^/?#]+\.fbcdn\.net(?:[/?#]|$)/i.test(url);

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

  const imageUrl = src && !isFacebookCdnUrl(src) && failedUrl !== src ? toMediaUrl(src) : null;
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
