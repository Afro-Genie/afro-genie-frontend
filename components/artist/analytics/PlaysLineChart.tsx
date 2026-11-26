import React from 'react';
import {
  LineChart,
  Line,
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

interface PlaysLineChartProps {
  series: SeriesPoint[];
  loading?: boolean;
}

const tooltipStyle = {
  backgroundColor: '#1F2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#F3F4F6',
};

const PlaysLineChart: React.FC<PlaysLineChartProps> = ({ series, loading }) => {
  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <div className="h-6 w-48 bg-gray-700 rounded mb-6 animate-pulse" />
        <div className="h-80 bg-gray-700/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Plays Over Time</h2>
      {series.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(val) => new Date(String(val)).toLocaleDateString()}
            />
            <Line
              type="monotone"
              dataKey="plays"
              stroke="#22C55E"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#22C55E', stroke: '#16a34a', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-400 text-center py-16">No play data available for this period</p>
      )}
    </div>
  );
};

export default PlaysLineChart;
