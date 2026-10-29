import React, { useState } from 'react';

interface VoteButtonsProps {
  score: number;
  userVote: number | null | undefined;
  onVote: (voteType: 1 | -1) => Promise<void>;
  size?: 'sm' | 'md';
  variant?: 'topic' | 'comment';
}

const VoteButtons: React.FC<VoteButtonsProps> = ({ score, userVote, onVote, size = 'md', variant = 'topic' }) => {
  const [optimisticVote, setOptimisticVote] = useState<number | null>(userVote ?? null);
  const [optimisticScore, setOptimisticScore] = useState(score);

  const currentVote = optimisticVote;
  const currentScore = optimisticScore;

  const handleVote = async (voteType: 1 | -1) => {
    const previousVote = currentVote;
    const previousScore = currentScore;

    let newVote: number | null;
    let scoreDelta: number;

    if (currentVote === voteType) {
      newVote = null;
      scoreDelta = -voteType;
    } else {
      scoreDelta = voteType - (currentVote ?? 0);
      newVote = voteType;
    }

    setOptimisticVote(newVote);
    setOptimisticScore(prev => prev + scoreDelta);

    try {
      await onVote(voteType);
    } catch {
      setOptimisticVote(previousVote);
      setOptimisticScore(previousScore);
    }
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (variant === 'comment') {
    return (
      <button
        onClick={() => handleVote(1)}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
          currentVote === 1
            ? 'text-red-500 bg-red-500/10'
            : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
        }`}
        title="Like"
      >
        <svg className={iconSize} fill={currentVote === 1 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        {currentScore > 0 && <span className={textSize}>{currentScore}</span>}
      </button>
    );
  }

  return (
    <button
      onClick={() => handleVote(1)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors ${
        currentVote === 1
          ? 'text-red-500 bg-red-500/10'
          : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
      }`}
      title="Like"
      aria-label="Like"
    >
      <svg className={iconSize} fill={currentVote === 1 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      <span className={`font-semibold ${textSize}`}>{currentScore}</span>
    </button>
  );
};

export default VoteButtons;
