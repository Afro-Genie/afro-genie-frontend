import React from 'react';
interface Song { id:string; title:string; translationViews:number; requests:number; completionRate:number; upvoteRatio:number; languages:number }
const TopSongsByTranslationImpact: React.FC<{ songs: Song[]; loading?: boolean }> = ({ songs, loading }) => {
  if (loading) return <div className="h-80 bg-gray-800/40 border border-gray-700/50 rounded-xl animate-pulse" />;
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-1">Top Songs by Translation Impact</h2>
      <p className="text-xs text-gray-400 mb-4">Views, demand, completion, and quality by song.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="text-gray-400 text-left border-b border-gray-700/50"><th className="py-2 pr-2">Song</th><th className="py-2 pr-2">Views</th><th className="py-2 pr-2">Requests</th><th className="py-2 pr-2">Completion</th><th className="py-2 pr-2">Upvote</th><th className="py-2">Langs</th></tr></thead>
        <tbody>{songs.map(s=>(<tr key={s.id} className="border-b border-gray-800/60 text-gray-200"><td className="py-2 pr-2 font-medium text-white">{s.title}</td><td className="py-2 pr-2">{s.translationViews}</td><td className="py-2 pr-2">{s.requests}</td><td className="py-2 pr-2">{s.completionRate}%</td><td className="py-2 pr-2">{s.upvoteRatio}%</td><td className="py-2">{s.languages}</td></tr>))}
        {songs.length===0 && <tr><td colSpan={6} className="py-8 text-center text-gray-500">No translation impact data yet.</td></tr>}</tbody></table>
      </div>
    </div>
  );
};
export default TopSongsByTranslationImpact;
