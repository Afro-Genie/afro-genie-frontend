import React, { useEffect, useState } from 'react';
import { Activity, Play, MessageSquare, Music, Clock } from 'lucide-react';
import { apiRequest } from '../../../services/api';

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface NotificationsResponse {
  notifications: ActivityItem[];
  total: number;
}

interface RecentActivityProps {
  loading?: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  STREAM: <Play className="w-4 h-4 text-green-400" />,
  TRANSLATION_READY: <MessageSquare className="w-4 h-4 text-blue-400" />,
  SONG_UPLOAD: <Music className="w-4 h-4 text-purple-400" />,
  default: <Activity className="w-4 h-4 text-gray-400" />,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const RecentActivity: React.FC<RecentActivityProps> = ({ loading }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await apiRequest<NotificationsResponse>('/artists/me/notifications?limit=8');
        setActivities(data?.notifications ?? []);
      } catch {
        setActivities([]);
      } finally {
        setFetching(false);
      }
    };
    fetchNotifications();
  }, []);

  const isLoading = loading || fetching;

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50">
        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
      </div>
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-700/50 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-gray-700/50 rounded animate-pulse" />
                  <div className="h-2 w-1/4 bg-gray-700/50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-8 h-8 mx-auto mb-3 text-gray-600" />
            <p className="text-sm text-gray-400">No recent activity yet</p>
            <p className="text-xs text-gray-500 mt-1">Streams and updates will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  {ICON_MAP[item.type] ?? ICON_MAP.default}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{item.message}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">{timeAgo(item.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;
