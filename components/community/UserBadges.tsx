import React from 'react';
import { UserBadge } from '../../types';

interface UserBadgesProps {
  badges: UserBadge[];
}

const UserBadges: React.FC<UserBadgesProps> = ({ badges }) => {
  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 border border-amber-500/50 rounded-full text-xs"
          title={badge.description}
        >
          {badge.icon && <span>{badge.icon}</span>}
          <span className="text-amber-400 font-semibold">{badge.name}</span>
        </div>
      ))}
    </div>
  );
};

export default UserBadges;

