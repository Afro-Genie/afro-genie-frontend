import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface TokenBalanceProps {
  className?: string;
  showLink?: boolean;
}

// Live balance pill. Reads the SSE-fed balance from AuthContext — updates are
// pushed the moment the ledger commits, with a 30s polling fallback handled by
// the useBalanceStream hook. When a balance event arrives the pill pulses green
// (+delta badge) or red (−delta badge) for a moment, then fades back out.
const TokenBalance: React.FC<TokenBalanceProps> = ({ className = '', showLink = true }) => {
  const { user, balance, lastBalanceEvent } = useAuth();
  const [delta, setDelta] = useState<number | null>(null);
  const [pulseKey, setPulseKey] = useState<string | null>(null);

  useEffect(() => {
    if (!lastBalanceEvent || typeof lastBalanceEvent.delta !== 'number') return;
    setDelta(lastBalanceEvent.delta);
    setPulseKey(lastBalanceEvent.timestamp);
  }, [lastBalanceEvent]);

  if (!user) return null;

  const pulseCls =
    delta === null ? '' : delta >= 0 ? 'gt-pulse-gain' : 'gt-pulse-loss';

  const content = (
    <span
      key={pulseKey ?? 'idle'}
      className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 ${pulseCls} ${className}`}
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
      <span className="tabular-nums">{balance ?? 0}</span>
      <span className="text-amber-500/70 font-semibold">GT</span>
      {delta !== null && pulseKey !== null && (
        <span
          key={`delta-${pulseKey}`}
          className={`absolute -top-3 -right-1 text-xs font-bold tabular-nums gt-delta-fade ${
            delta >= 0 ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {delta >= 0 ? '+' : ''}
          {delta}
        </span>
      )}
    </span>
  );

  if (!showLink) return content;

  return (
    <Link to="/tokens" onClick={(e) => e.stopPropagation()}>
      {content}
    </Link>
  );
};

export default TokenBalance;