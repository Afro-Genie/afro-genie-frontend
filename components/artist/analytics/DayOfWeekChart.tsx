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

interface SeriesPoint {
  date: string;
  plays: number;
}

interface DayOfWeekChartProps {
  series: SeriesPoint[];
  loading?: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const tooltipStyle = {
  backgroundColor: '#1F2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#F3F4F6',
};

const DayOfWeekChart: React.FC<DayOfWeekChartProps> = ({ series, loading }) => {
  // Aggregate plays by day of week
  const dayMap = new Map<number, number>();
  series.forEach((d) => {
    const dayIdx = new Date(d.date).getDay();
    dayMap.set(dayIdx, (dayMap.get(dayIdx) || 0) + d.plays);
  });

  const chartData = [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => ({
    day: DAY_NAMES[dayIdx],
    plays: dayMap.get(dayIdx) || 0,
  }));

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <div className="h-6 w-48 bg-gray-700 rounded mb-6 animate-pulse" />
        <div className="h-64 bg-gray-700/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Plays by Day of Week</h2>
      {series.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="plays" fill="#22C55E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-400 text-center py-12">No data available</p>
      )}
    </div>
  );
};

export default DayOfWeekChart;
