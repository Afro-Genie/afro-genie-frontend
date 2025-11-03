import React, { useState } from 'react';
import LyricInputForm from '../components/LyricInputForm';
import TranslationDisplay from '../components/TranslationDisplay';
import { getAiAnalysis } from '../services/geminiService';
import type { AiAnalysisResult, LyricInput } from '../types';

const RequestTranslationPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTranslationRequest = async (input: LyricInput) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await getAiAnalysis(
        input.artist,
        input.title,
        input.lyrics,
        input.sourceLang,
        input.targetLang
      );

      setResult(analysisResult);
    } catch (err: any) {
      setError(err.message || 'Failed to get translation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Request Song Translation
            </h1>
            <p className="text-xl text-gray-300">
              Get AI-powered translations and cultural context for African music
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="bg-gray-800 rounded-lg p-6">
              <LyricInputForm onSubmit={handleTranslationRequest} loading={loading} />
            </div>

            {/* Results Display */}
            <div className="bg-gray-800 rounded-lg p-6">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                  <span className="ml-3 text-white">Analyzing lyrics...</span>
                </div>
              )}

              {error && (
                <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {result && (
                <TranslationDisplay result={result} />
              )}

              {!loading && !error && !result && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-6xl mb-4">🎵</div>
                  <p>Enter song details and get an AI-powered translation with cultural context</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestTranslationPage;

