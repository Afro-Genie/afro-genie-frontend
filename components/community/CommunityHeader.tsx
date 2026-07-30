import React from 'react';

interface Chip {
  label: string;
  href?: string;
}

interface CommunityHeaderProps {
  title: string;
  description?: string;
  bannerImage?: string;
  chips?: Chip[];
  action?: React.ReactNode;
  actionPlacement?: 'before-title' | 'after-chips';
}

const CommunityHeader: React.FC<CommunityHeaderProps> = React.memo(({ title, description, bannerImage, chips, action, actionPlacement }) => {
  return (
    <div className="relative w-full min-h-[200px] sm:h-52 rounded-xl overflow-hidden mb-6">
      {bannerImage ? (
        <img src={bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-800 to-gray-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      {action && (
        <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 right-6 z-10">
          {action}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
        {action && actionPlacement === 'before-title' && (
          <div className="sm:hidden mb-3">{action}</div>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{title}</h1>
        {description && <p className="text-gray-300 text-sm mb-3 max-w-xl">{description}</p>}
        {chips && chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) =>
              chip.href ? (
                <a
                  key={chip.label}
                  href={chip.href}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-full transition-colors"
                >
                  {chip.label}
                </a>
              ) : (
                <span
                  key={chip.label}
                  className="px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full"
                >
                  {chip.label}
                </span>
              ),
            )}
          </div>
        )}
        {action && actionPlacement === 'after-chips' && (
          <div className="sm:hidden mt-3">{action}</div>
        )}
      </div>
    </div>
  );
});

export default CommunityHeader;
