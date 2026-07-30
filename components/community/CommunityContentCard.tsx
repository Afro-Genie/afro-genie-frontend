import React from 'react';

interface StatItem {
  label: string;
  value: string | number;
}

interface CommunityContentCardProps {
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  stats?: StatItem[];
  onClick?: () => void;
  href?: string;
  children?: React.ReactNode;
}

const CommunityContentCard: React.FC<CommunityContentCardProps> = React.memo(({
  imageUrl,
  title,
  subtitle,
  stats,
  onClick,
  href,
  children,
}) => {
  const Wrapper = href ? 'a' : 'div';
  const wrapperProps = href
    ? { href, className: 'block bg-gray-800/50 hover:bg-gray-700/50 rounded-lg overflow-hidden transition-colors duration-200 border border-gray-700' }
    : { className: 'bg-gray-800/50 hover:bg-gray-700/50 rounded-lg overflow-hidden transition-colors duration-200 border border-gray-700 cursor-pointer', onClick };

  return (
    <Wrapper {...wrapperProps}>
      {imageUrl && (
        <div className="w-full h-36 overflow-hidden">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm truncate">{title}</h3>
        {subtitle && <p className="text-gray-400 text-xs mt-1 truncate">{subtitle}</p>}
        {stats && stats.length > 0 && (
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {stats.map((s) => (
              <span key={s.label}>
                <span className="font-medium text-gray-300">{s.value}</span> {s.label}
              </span>
            ))}
          </div>
        )}
        {children}
      </div>
    </Wrapper>
  );
});

export default CommunityContentCard;
