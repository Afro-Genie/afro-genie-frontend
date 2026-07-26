import React from 'react';
import { Award, Star, TrendingUp, Users, Music, Globe, Zap, Crown } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  unlockedAt?: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface AchievementsProps {
  totalStreams: number;
  totalListeners: number;
  totalFollowers: number;
  songCount?: number;
  loading?: boolean;
}

function buildAchievements(data: {
  totalStreams: number;
  totalListeners: number;
  totalFollowers: number;
  songCount: number;
}): Achievement[] {
  return [
    {
      id: 'first_stream',
      title: 'First Stream',
      description: 'Get your first stream on AfroGenie',
      icon: <Zap className="w-5 h-5" />,
      unlocked: data.totalStreams >= 1,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    {
      id: 'rising_star',
      title: 'Rising Star',
      description: 'Reach 1,000 total streams',
      icon: <Star className="w-5 h-5" />,
      unlocked: data.totalStreams >= 1000,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
    },
    {
      id: 'viral_hit',
      title: 'Viral Hit',
      description: 'Reach 10,000 total streams',
      icon: <TrendingUp className="w-5 h-5" />,
      unlocked: data.totalStreams >= 10000,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
    },
    {
      id: 'streaming_legend',
      title: 'Streaming Legend',
      description: 'Reach 100,000 total streams',
      icon: <Crown className="w-5 h-5" />,
      unlocked: data.totalStreams >= 100000,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
    },
    {
      id: 'crowd_pleaser',
      title: 'Crowd Pleaser',
      description: 'Reach 500 unique listeners',
      icon: <Users className="w-5 h-5" />,
      unlocked: data.totalListeners >= 500,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    {
      id: 'fan_favorite',
      title: 'Fan Favorite',
      description: 'Reach 1,000 followers',
      icon: <Award className="w-5 h-5" />,
      unlocked: data.totalFollowers >= 1000,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/30',
    },
    {
      id: 'prolific_artist',
      title: 'Prolific Artist',
      description: 'Upload at least 5 songs',
      icon: <Music className="w-5 h-5" />,
      unlocked: data.songCount >= 5,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      id: 'global_reach',
      title: 'Global Reach',
      description: 'Reach listeners in 5+ countries',
      icon: <Globe className="w-5 h-5" />,
      unlocked: false,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/30',
    },
  ];
}

const Achievements: React.FC<AchievementsProps> = ({
  totalStreams,
  totalListeners,
  totalFollowers,
  songCount = 0,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6">
        <div className="h-6 w-40 bg-gray-700/50 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-700/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const achievements = buildAchievements({
    totalStreams,
    totalListeners,
    totalFollowers,
    songCount,
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Achievements</h2>
          <span className="text-sm text-gray-400">
            {unlockedCount}/{achievements.length} unlocked
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`relative p-4 rounded-lg border transition-all ${
                achievement.unlocked
                  ? `${achievement.bgColor} ${achievement.borderColor}`
                  : 'bg-gray-800/30 border-gray-700/30 opacity-50'
              }`}
            >
              <div className={`mb-2 ${achievement.unlocked ? achievement.color : 'text-gray-500'}`}>
                {achievement.icon}
              </div>
              <p className={`text-sm font-medium ${achievement.unlocked ? 'text-white' : 'text-gray-500'}`}>
                {achievement.title}
              </p>
              <p className="text-xs text-gray-500 mt-1">{achievement.description}</p>
              {achievement.unlocked && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Achievements;
