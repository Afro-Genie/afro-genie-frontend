import React from 'react';

interface DayData {
  date: string;
  plays: number;
}

interface StreamChartProps {
  series: DayData[];
  loading?: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatCompact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const StreamChart: React.FC<StreamChartProps> = ({ series, loading }) => {
  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <div className="h-6 w-48 bg-gray-700 rounded mb-6 animate-pulse" />
        <div className="h-64 bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  // Aggregate by day of week (last 7 entries or group by weekday)
  const last7 = series.slice(-7);
  const dayMap = new Map<number, number>();
  last7.forEach((d) => {
    const dayIdx = new Date(d.date + 'T12:00:00').getDay();
    dayMap.set(dayIdx, (dayMap.get(dayIdx) || 0) + d.plays);
  });

  const chartData = [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => ({
    day: DAY_NAMES[dayIdx],
    value: dayMap.get(dayIdx) || 0,
  }));

  const maxVal = Math.max(...chartData.map((d) => d.value), 1);
  const total = chartData.reduce((s, d) => s + d.value, 0);
  const avg = Math.round(total / 7);
  const peak = Math.max(...chartData.map((d) => d.value));

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-6">Streams This Week</h2>

      <div className="flex items-end justify-around h-64 gap-2 mb-6">
        {chartData.map((item, index) => (
          <div key={index} className="flex flex-col items-center gap-2 flex-1">
            <div className="relative w-full h-48 bg-gray-700/30 rounded-t-lg overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 to-green-400/60 rounded-t-lg transition-all hover:from-green-500 hover:to-green-400/70 cursor-pointer"
                style={{ height: `${(item.value / maxVal) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-400 font-medium">{item.day}</span>
            <span className="text-xs text-white font-semibold">{formatCompact(item.value)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-700/50">
        <div>
          <p className="text-gray-400 text-sm mb-1">Average</p>
          <p className="text-2xl font-bold text-white">{formatCompact(avg)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-1">Peak Day</p>
          <p className="text-2xl font-bold text-white">{formatCompact(peak)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-1">Total</p>
          <p className="text-2xl font-bold text-white">{formatCompact(total)}</p>
        </div>
      </div>
    </div>
  );
};

export default StreamChart;
