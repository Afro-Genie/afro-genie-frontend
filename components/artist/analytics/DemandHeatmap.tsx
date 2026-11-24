import React from 'react';
interface Cell { songId:string; title:string; targetLang:string; count:number }
const DemandHeatmap: React.FC<{ cells: Cell[]; loading?: boolean }> = ({ cells, loading }) => {
  if (loading) return <div className="h-80 bg-gray-800/40 border border-gray-700/50 rounded-xl animate-pulse" />;
  const max = Math.max(1, ...cells.map(c=>c.count));
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-1">Translation Demand Heatmap</h2>
      <p className="text-xs text-gray-400 mb-4">Where fans are requesting translations by song and language.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-auto">
        {cells.map((c)=> (
          <div key={`${c.songId}-${c.targetLang}`} className="flex items-center justify-between rounded-lg border border-gray-700/50 px-3 py-2" style={{ backgroundColor:`rgba(16,185,129,${0.08 + (c.count/max)*0.35})` }}>
            <div className="min-w-0"><div className="text-sm text-white truncate">{c.title}</div><div className="text-xs text-gray-400 uppercase">{c.targetLang}</div></div>
            <div className="text-sm font-semibold text-emerald-300">{c.count}</div>
          </div>
        ))}
        {cells.length===0 && <div className="text-gray-500 text-sm py-8 col-span-full text-center">No translation demand yet.</div>}
      </div>
    </div>
  );
};
export default DemandHeatmap;
