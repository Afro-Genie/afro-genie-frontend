import React, { useEffect, useState } from 'react';
import { toMediaUrl } from '../lib/apiBase';

interface MediaImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: unknown;
  fallback?: React.ReactNode;
  fallbackClassName?: string;
}

const MediaImage: React.FC<MediaImageProps> = ({
  src,
  alt = '',
  fallback,
  fallbackClassName = 'bg-gradient-to-br from-green-900/70 to-gray-900/70',
  loading = 'lazy',
  onError,
  className,
  ...props
}) => {
  const resolvedUrl = toMediaUrl(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedUrl]);

  if (!resolvedUrl || failed) {
    return (
      <div className={`${className || ''} ${fallbackClassName}`.trim()}>
        {fallback}
      </div>
    );
  }

  return (
    <img
      {...props}
      src={resolvedUrl}
      alt={alt}
      loading={loading}
      className={className}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
};

export default MediaImage;
