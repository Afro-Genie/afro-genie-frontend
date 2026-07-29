import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tokenApi } from '../services/tokenService';

interface TokenBalanceProps {
  className?: string;
  showLink?: boolean;
}

const TokenBalance: React.FC<TokenBalanceProps> = ({ className = '', showLink = true }) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    tokenApi.getProfile(user.id)
      .then((profile) => {
        if (!cancelled) setBalance(profile.tokenBalance);
      })
      .catch(() => {
        if (!cancelled) setBalance(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  if (!user) return null;
  if (loading) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-gray-500 ${className}`}>
        <span className="w-3 h-3 rounded-full bg-gray-700 animate-pulse" />
      </span>
    );
  }

  const content = (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 ${className}`}>
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
      {balance}
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
