import React from 'react';

interface Props { series: Array<{ date: string; translationViews: number; translationReaders: number; returningReaders: number }>; loading?: boolean }
const fmt = (n:number)=>n.toLocaleString();
const ArtistTranslationReachChart: React.FC<Props> = ({ series, loading }) => {
  if (loading) return <div className="h-80 bg-gray-800/40 border border-gray-700/50 rounded-xl animate-pulse" />;
  const max = Math.max(1, ...series.map(s=>Math.max(s.translationViews,s.translationReaders,s.returningReaders)));
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-1">Translation Reach Over Time</h2>
      <p className="text-xs text-gray-400 mb-6">Translation views, unique readers, and returning readers.</p>
      <div className="h-64 flex items-end gap-2">
        {series.map((s) => (
          <div key={s.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="w-full flex items-end gap-0.5 h-52">
              <div className="flex-1 bg-purple-500/70 rounded-t" style={{ height: `${(s.translationViews/max)*100}%` }} />
              <div className="flex-1 bg-blue-500/70 rounded-t" style={{ height: `${(s.translationReaders/max)*100}%` }} />
              <div className="flex-1 bg-emerald-500/70 rounded-t" style={{ height: `${(s.returningReaders/max)*100}%` }} />
            </div>
            <div className="text-[10px] text-gray-500">{new Date(s.date).getMonth()+1}/{new Date(s.date).getDate()}</div>
            <div className="hidden group-hover:block absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-gray-200 z-10 whitespace-nowrap">
              <div>{s.date}</div><div>Views: {fmt(s.translationViews)}</div><div>Readers: {fmt(s.translationReaders)}</div><div>Returning: {fmt(s.returningReaders)}</div>
            </div>
          </div>
        ))}
        {series.length===0 && <div className="text-gray-500 text-sm m-auto">No translation reach data yet.</div>}
      </div>
      <div className="flex gap-4 mt-4 text-xs text-gray-400"><span><span className="inline-block w-2 h-2 bg-purple-500 mr-1 rounded-sm"/>Views</span><span><span className="inline-block w-2 h-2 bg-blue-500 mr-1 rounded-sm"/>Readers</span><span><span className="inline-block w-2 h-2 bg-emerald-500 mr-1 rounded-sm"/>Returning</span></div>
    </div>
  );
};
export default ArtistTranslationReachChart;
