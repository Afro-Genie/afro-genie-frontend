import React, { useState } from 'react';
import { Award, Globe, Languages, BookOpenCheck, ShieldCheck, Wrench, MapPinned, BadgeCheck, ListChecks, Sparkles, Lock } from 'lucide-react';

export interface ArtistBadge {
  id: string;
  title: string;
  description: string;
  howToEarn: string;
  eligible: boolean;
  unlocked: boolean;
  purchased: boolean;
  progressLabel: string;
}

const ICONS: Record<string, React.ReactNode> = {
  FIRST_TRANSLATION_UNLOCK: <Sparkles className="w-5 h-5" />,
  BRIDGE_BUILDER: <Languages className="w-5 h-5" />,
  LANGUAGE_PIONEER: <BadgeCheck className="w-5 h-5" />,
  CONTEXT_CURATOR: <BookOpenCheck className="w-5 h-5" />,
  COMMUNITY_TRUSTED: <ShieldCheck className="w-5 h-5" />,
  CORRECTION_CHAMPION: <Wrench className="w-5 h-5" />,
  GLOBAL_LISTENER_REACH: <MapPinned className="w-5 h-5" />,
  MOST_REQUESTED: <Award className="w-5 h-5" />,
  CATALOG_CLARITY: <ListChecks className="w-5 h-5" />,
  CULTURAL_MILESTONE: <Globe className="w-5 h-5" />,
};

interface Props { badges: ArtistBadge[]; loading?: boolean; onPurchase?: (badgeId: string) => void; purchasingId?: string | null; showPurchase?: boolean; }

const ArtistBadges: React.FC<Props> = ({ badges, loading, onPurchase, purchasingId, showPurchase }) => {
  const [active, setActive] = useState<string | null>(null);
  if (loading) return <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6"><div className="h-6 w-40 bg-gray-700/50 rounded animate-pulse mb-4" /><div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{Array.from({length:10}).map((_,i)=><div key={i} className="h-28 bg-gray-700/30 rounded-lg animate-pulse"/>)}</div></div>;
  const unlockedCount = badges.filter(b=>b.unlocked).length;
  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-visible">
      <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
        <div><h2 className="text-lg font-semibold text-white">Translation Badges</h2><p className="text-xs text-gray-400 mt-1">Earn badges through translation impact. Click or hover a card to see how to unlock it.</p></div>
        <span className="text-sm text-gray-400">{unlockedCount}/{badges.length} unlocked</span>
      </div>
      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {badges.map((b) => {
          const isActive = active === b.id;
          return (
            <button key={b.id} type="button" onMouseEnter={()=>setActive(b.id)} onMouseLeave={()=>setActive(null)} onClick={()=>setActive(isActive?null:b.id)}
              className={`relative text-left p-4 rounded-lg border transition-all min-h-[140px] ${b.unlocked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gray-800/30 border-gray-700/40 opacity-70 grayscale'} ${isActive ? 'ring-2 ring-emerald-400/50 opacity-100 grayscale-0' : ''}`}>
              <div className={`mb-2 ${b.unlocked ? 'text-emerald-400' : 'text-gray-500'}`}>{ICONS[b.id] ?? <Award className="w-5 h-5" />}</div>
              {!b.unlocked && <Lock className="absolute top-3 right-3 w-4 h-4 text-gray-500" />}
              {b.unlocked && <div className="absolute top-3 right-3 w-2 h-2 bg-green-400 rounded-full" />}
              <p className={`text-sm font-medium ${b.unlocked ? 'text-white' : 'text-gray-400'}`}>{b.title}</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{b.description}</p>
              {isActive && (
                <div className="absolute z-30 left-1/2 -translate-x-1/2 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] p-3 rounded-lg bg-gray-900 border border-emerald-500/30 shadow-2xl text-xs text-gray-100">
                  <div className="font-semibold text-emerald-300 mb-1">How to earn</div>
                  <div className="text-gray-200 leading-relaxed">{b.howToEarn}</div>
                  <div className="mt-2 text-amber-300 font-medium">{b.progressLabel}</div>
                  {showPurchase && <div className="mt-2">{b.purchased ? <span className="text-green-400">Owned on profile</span> : b.eligible ? <span className="text-amber-300">Eligible for token store</span> : <span className="text-gray-400">Locked until eligible</span>}</div>}
                </div>
              )}
              {showPurchase && onPurchase && b.eligible && !b.purchased && (
                <span onClick={(e)=>{e.stopPropagation(); onPurchase(b.id);}} className="inline-block mt-3 px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px]">{purchasingId===b.id?'Buying...':'Buy badge'}</span>
              )}
              {showPurchase && b.purchased && <span className="inline-block mt-3 px-2 py-1 rounded bg-green-900/60 text-green-300 text-[11px]">Owned</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default ArtistBadges;
