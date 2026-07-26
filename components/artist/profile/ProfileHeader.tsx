import React from 'react';
import { BadgeCheck, Music } from 'lucide-react';

interface ProfileHeaderProps {
  stageName: string;
  bio: string;
  genres: string[];
  profileImageUrl?: string;
  bannerImageUrl?: string;
  verified: boolean;
  totalStreams: number;
  totalListeners: number;
  totalFollowers: number;
  loading?: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  stageName,
  bio,
  genres,
  profileImageUrl,
  bannerImageUrl,
  verified,
  totalStreams,
  totalListeners,
  totalFollowers,
  loading,
}) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-700/50">
      {/* Banner */}
      <div className="relative h-48 sm:h-56">
        {bannerImageUrl ? (
          <img src={bannerImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/60 via-gray-900 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
      </div>

      {/* Profile info overlay */}
      <div className="relative px-6 pb-6 -mt-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {/* Avatar */}
          <div className="shrink-0">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={stageName}
                className="w-28 h-28 rounded-full border-4 border-gray-900 object-cover"
              />
            ) : (
              <div className="w-28 h-28 rounded-full border-4 border-gray-900 bg-gray-800 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-500">
                  {stageName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 pt-2 sm:pt-0">
            <div className="flex items-center gap-2 flex-wrap">
              {loading ? (
                <div className="h-8 w-48 bg-gray-700/50 rounded animate-pulse" />
              ) : (
                <h1 className="text-3xl font-bold text-white truncate">{stageName}</h1>
              )}
              {verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-900/50 text-green-300 border border-green-700/50 rounded-full text-xs font-medium shrink-0">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verified
                </span>
              )}
            </div>
            {genres.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {genres.slice(0, 3).map((genre) => (
                  <span
                    key={genre}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-800 border border-gray-700/50 rounded-full text-xs text-gray-300"
                  >
                    <Music className="w-3 h-3" />
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl">
          {[
            { label: 'Total Streams', value: totalStreams },
            { label: 'Monthly Listeners', value: totalListeners },
            { label: 'Total Followers', value: totalFollowers },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-white">
                {loading ? (
                  <div className="h-7 w-16 bg-gray-700/50 rounded animate-pulse mx-auto" />
                ) : (
                  stat.value.toLocaleString()
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Bio preview */}
        {!loading && bio && (
          <p className="text-sm text-gray-300 mt-4 leading-relaxed line-clamp-2">{bio}</p>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
