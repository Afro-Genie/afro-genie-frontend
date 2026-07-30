import React from 'react';
import { getBadgeDisplay, type UserBadge } from '../../services/tokenService';

interface UserBadgesProps {
  badges: UserBadge[];
  showDate?: boolean;
}

const UserBadges: React.FC<UserBadgesProps> = ({ badges, showDate = false }) => {
  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => {
        const meta = getBadgeDisplay(badge.badgeType);
        return (
          <div
            key={badge.id}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/40 rounded-full text-xs"
            title={meta.description}
          >
            <span>{meta.icon}</span>
            <span className="text-amber-400 font-semibold">{meta.name}</span>
            {showDate && (
              <span className="text-amber-400/50 ml-1">
                {new Date(badge.earnedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default UserBadges;
