import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TopSong {
  title: string;
  views: number;
}

interface TopSongsChartProps {
  songs: TopSong[];
  loading?: boolean;
}

const tooltipStyle = {
  backgroundColor: '#1F2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#F3F4F6',
};

const TopSongsChart: React.FC<TopSongsChartProps> = ({ songs, loading }) => {
  const top5 = songs
    .slice()
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <div className="h-6 w-48 bg-gray-700 rounded mb-6 animate-pulse" />
        <div className="h-72 bg-gray-700/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Top Songs by Views</h2>
      {top5.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top5} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
            <YAxis
              type="category"
              dataKey="title"
              stroke="#9CA3AF"
              fontSize={12}
              width={140}
              tick={{ fill: '#D1D5DB' }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="views" fill="#22C55E" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-400 text-center py-16">No song data available</p>
      )}
    </div>
  );
};

export default TopSongsChart;
