import React from 'react';
import { toMediaUrl } from '../../lib/apiBase';

interface FeaturedImageProps {
  src: string;
  alt: string;
}

const FeaturedImage: React.FC<FeaturedImageProps> = ({ src, alt }) => (
  <div className="flex h-36 w-full items-center justify-center bg-gray-900/40 p-3">
    <img
      src={toMediaUrl(src)}
      alt={alt}
      loading="lazy"
      className="mx-auto h-full max-h-full max-w-full rounded-md object-contain"
    />
  </div>
);

export default FeaturedImage;
