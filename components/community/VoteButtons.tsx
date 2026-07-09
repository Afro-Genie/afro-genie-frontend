import React, { useState } from 'react';

interface VoteButtonsProps {
  score: number;
  userVote: number | null | undefined;
  onVote: (voteType: 1 | -1) => Promise<void>;
  size?: 'sm' | 'md';
}

const VoteButtons: React.FC<VoteButtonsProps> = ({ score, userVote, onVote, size = 'md' }) => {
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

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote(1)}
        className={`p-0.5 rounded transition-colors ${
          currentVote === 1
            ? 'text-blue-400'
            : 'text-gray-500 hover:text-blue-400'
        }`}
        title="Upvote"
      >
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <span className={`font-semibold min-w-[1.5rem] text-center ${textSize} ${
        currentVote === 1 ? 'text-blue-400' : currentVote === -1 ? 'text-red-400' : 'text-gray-300'
      }`}>
        {currentScore}
      </span>
      <button
        onClick={() => handleVote(-1)}
        className={`p-0.5 rounded transition-colors ${
          currentVote === -1
            ? 'text-red-400'
            : 'text-gray-500 hover:text-red-400'
        }`}
        title="Downvote"
      >
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};

export default VoteButtons;
