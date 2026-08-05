import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface MediaCardProps {
    to: string;
    image?: string | null;
    title: string;
    subtitle?: string;
    badge?: React.ReactNode;
    accent?: 'green' | 'amber';
    footer?: React.ReactNode;
    onClick?: (e?: React.MouseEvent<HTMLAnchorElement>) => void;
    className?: string;
    imageClassName?: string;
    titleClassName?: string;
}

const ACCENT_STYLES = {
    green: {
        hoverText: 'group-hover:text-green-400',
        hoverBorder: 'group-hover:border-green-400/50',
        focusRing: 'focus-visible:ring-green-400',
    },
    amber: {
        hoverText: 'group-hover:text-amber-400',
        hoverBorder: 'group-hover:border-amber-400/50',
        focusRing: 'focus-visible:ring-amber-400',
    },
} as const;

const MediaCard: React.FC<MediaCardProps> = ({
    to,
    image,
    title,
    subtitle,
    badge,
    accent = 'green',
    footer,
    onClick,
    className = '',
    imageClassName = '',
    titleClassName = '',
}) => {
    const [imageError, setImageError] = useState(false);
    const styles = ACCENT_STYLES[accent];
    const showImage = Boolean(image) && !imageError;
    const initials = title
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');

    return (
        <Link
            to={to}
            onClick={onClick}
            title={title}
            className={`group rounded-xl outline-none focus-visible:ring-2 ${styles.focusRing} ${className}`}
        >
            <div className={`relative aspect-square rounded-xl overflow-hidden shadow-xl shadow-black/40 bg-gradient-to-br from-green-500/20 to-amber-500/20 border border-gray-700 ${styles.hoverBorder} transition-colors duration-300`}>
                {showImage ? (
                    <img
                        src={image as string}
                        alt={title}
                        loading="lazy"
                        onError={() => setImageError(true)}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 motion-reduce:transform-none ${imageClassName}`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-700 to-green-900">
                        <span className="text-3xl font-bold text-white/80">{initials || '?'}</span>
                    </div>
                )}
                {badge && <div className="absolute top-2 right-2">{badge}</div>}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0a120d]/95 via-[#0a120d]/55 to-transparent flex flex-col items-center justify-end gap-0.5 px-3 pb-3">
                    <h3 className={`font-semibold text-white ${styles.hoverText} transition-colors text-center text-sm sm:text-base line-clamp-1 ${titleClassName}`}>
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-xs sm:text-sm text-green-200 text-center line-clamp-1">{subtitle}</p>
                    )}
                </div>
            </div>
            {footer && <div className="mt-3">{footer}</div>}
        </Link>
    );
};

export default MediaCard;
