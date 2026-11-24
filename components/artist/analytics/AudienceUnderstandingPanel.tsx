import React from 'react';
interface Props { data: { countries:Array<{country:string;views:number}>; languages:Array<{language:string;views:number}>; returningReaders:number; translationReaders:number; translatedSongViews:number; lyricsOnlyViews:number }; loading?: boolean }
const BarList: React.FC<{title:string; items:Array<{label:string; value:number}>}> = ({title,items}) => (
  <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-4"><h3 className="text-sm font-semibold text-white mb-3">{title}</h3><div className="space-y-2">{items.map(i=>{const max=Math.max(1,...items.map(x=>x.value)); return <div key={i.label}><div className="flex justify-between text-xs text-gray-300 mb-1"><span className="uppercase">{i.label}</span><span>{i.value}</span></div><div className="h-2 bg-gray-800 rounded"><div className="h-2 bg-emerald-500 rounded" style={{width:`${(i.value/max)*100}%`}}/></div></div>})}{items.length===0 && <div className="text-xs text-gray-500">No data yet.</div>}</div></div>
);
const AudienceUnderstandingPanel: React.FC<Props> = ({ data, loading }) => {
  if (loading) return <div className="h-72 bg-gray-800/40 border border-gray-700/50 rounded-xl animate-pulse" />;
  const total = data.translatedSongViews + data.lyricsOnlyViews;
  const translatedPct = total>0?Math.round((data.translatedSongViews/total)*100):0;
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-1">Audience Understanding</h2>
      <p className="text-xs text-gray-400 mb-4">Who consumes translations, where they are, and how translation engagement compares.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BarList title="Countries consuming translations" items={data.countries.map(c=>({label:c.country,value:c.views}))} />
        <BarList title="Languages consuming translations" items={data.languages.map(l=>({label:l.language,value:l.views}))} />
        <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Engagement</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex justify-between"><span>Unique translation readers</span><span className="text-white font-semibold">{data.translationReaders}</span></div>
            <div className="flex justify-between"><span>Returning readers</span><span className="text-white font-semibold">{data.returningReaders}</span></div>
            <div className="pt-2 border-t border-gray-700/50">
              <div className="flex justify-between text-xs mb-1"><span>Translation-engaged song views</span><span>{translatedPct}%</span></div>
              <div className="h-3 bg-gray-800 rounded overflow-hidden flex"><div className="bg-emerald-500" style={{width:`${translatedPct}%`}}/><div className="bg-gray-600" style={{width:`${100-translatedPct}%`}}/></div>
              <div className="flex justify-between text-xs text-gray-500 mt-1"><span>Translated: {data.translatedSongViews}</span><span>Lyrics-only: {data.lyricsOnlyViews}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AudienceUnderstandingPanel;
