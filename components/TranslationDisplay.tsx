import React from 'react';
import type { AiAnalysisResult, LyricInput } from '../types';
import BookOpenIcon from './icons/BookOpenIcon';
import TranslateIcon from './icons/TranslateIcon';
import ConfidenceScore from './ConfidenceScore';

interface TranslationDisplayProps {
  result: AiAnalysisResult;
  input: LyricInput;
}

const TranslationDisplay: React.FC<TranslationDisplayProps> = ({ result, input }) => {
  return (
    <div className="animate-fade-in space-y-8">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-100">{input.title}</h2>
            <p className="text-lg text-gray-400">by {input.artist}</p>
        </div>
        
        <ConfidenceScore />
        
        <div className={`grid gap-8 ${result.culturalContext ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h3 className="flex items-center gap-2 text-xl font-semibold text-amber-400 mb-4">
                    <TranslateIcon className="h-6 w-6" />
                    Translated Lyrics ({input.targetLang.toUpperCase()})
                </h3>
                <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">{result.translatedLyrics}</pre>
            </div>
            {result.culturalContext && (
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h3 className="flex items-center gap-2 text-xl font-semibold text-amber-400 mb-4">
                    <BookOpenIcon className="h-6 w-6" />
                    Cultural Context
                        <span className="text-xs px-2 py-1 bg-green-700 rounded-full">Human-Added</span>
                </h3>
                <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">{result.culturalContext}</pre>
            </div>
            )}
        </div>
    </div>
  );
};

export default TranslationDisplay;
