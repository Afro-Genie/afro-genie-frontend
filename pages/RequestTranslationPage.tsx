import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SUPPORTED_LANGUAGES } from '../constants';
import { saveTranslation } from '../services/firebaseService';
import UserProfileCard from '../components/community/UserProfileCard';
import RegistrationForm from '../components/community/RegistrationForm';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import type { AiAnalysisResult } from '../types';

const RequestTranslationPage: React.FC = () => {
  const navigate = useNavigate();
  const { notification, showNotification, hideNotification } = useNotification();

  // Redirect to homepage if accessed directly
  useEffect(() => {
    // Show a message and redirect after a brief delay
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);
  const { user } = useAuth();
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [sourceLang, setSourceLang] = useState('yo');
  const [targetLang, setTargetLang] = useState('en');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!artist || !title) {
      setError('Please provide both artist and song title');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      // Translation requests now go through the backend API via song pages.
      // This deprecated page redirects to homepage automatically.
      setError('This page is deprecated. Please use the translation button on any song page instead.');
    } catch (err: any) {
      setError(err.message || 'Failed to get translation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    if (!result) return;

    try {
      await saveTranslation({
        songId: `${artist}-${title}`.toLowerCase().replace(/\s+/g, '-'),
        userId: user.uid,
        originalLyrics: lyrics || 'Lyrics not provided',
        translatedLyrics: result.translatedLyrics,
        culturalContext: result.culturalContext,
        sourceLang,
        targetLang,
        status: 'pending',
        source: 'user_request'
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      showNotification({
        message: 'Translation saved successfully!',
        type: 'success'
      });
    } catch (err: any) {
      showNotification({
        message: 'Failed to save translation: ' + err.message,
        type: 'error'
      });
    }
  };

  const estimatedReviewTime = () => {
    const days = Math.floor(Math.random() * 5) + 3; // 3-7 days
    return `${days} days`;
  };

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Redirect Message */}
        <div className="mb-8 p-6 bg-amber-900/30 border border-amber-700 rounded-lg text-center">
          <h2 className="text-2xl font-bold text-amber-200 mb-2">Translation Request Flow Updated</h2>
          <p className="text-amber-100 mb-4">
            To request a translation, please navigate to a song page that doesn't have lyrics or translation yet.
            You'll see a "Request Translation" button there.
          </p>
          <p className="text-amber-200 text-sm">
            Redirecting to homepage in 3 seconds...
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
          >
            Go to Homepage Now
          </button>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <svg className="h-16 w-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Request Song <span className="text-green-400">Translation</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Don't know what a song means? Submit the artist and title, and our AI will provide cultural context and meaning.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-8">
            {/* Request Form */}
            <div className="bg-[#1a2922] rounded-xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">Song Information</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Artist Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Artist Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    required
                    placeholder="e.g., Burna Boy, Wizkid, Tems"
                    className="w-full min-h-[44px] text-base px-4 py-3 bg-[#0d1612] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Song Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Song Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="e.g., Last Last, Essence"
                    className="w-full min-h-[44px] text-base px-4 py-3 bg-[#0d1612] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Language Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Original Language
                    </label>
                    <select
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value)}
                      className="w-full min-h-[44px] text-base px-4 py-3 bg-[#0d1612] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {SUPPORTED_LANGUAGES.filter(l => l.isActive).map(l => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Translate To
                    </label>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="w-full min-h-[44px] text-base px-4 py-3 bg-[#0d1612] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {SUPPORTED_LANGUAGES.filter(l => l.isActive).map(l => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Lyrics (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Lyrics <span className="text-gray-500">(Optional)</span>
                  </label>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Add lyrics if you have them (optional). We'll still analyze the song's meaning even without lyrics."
                    rows={8}
                    className="w-full px-4 py-3 bg-[#0d1612] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 No lyrics? No problem! Our AI will analyze the song's cultural context and meaning based on the title and artist.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[44px] bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-white font-bold py-4 px-6 rounded-lg transition-all text-base flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="h-5 w-5 rounded-full border-2 border-white/60 border-t-transparent animate-pulse" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Get AI Translation
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Results Section */}
            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                <p className="text-red-200">{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-[#1a2922] rounded-xl border border-gray-700 overflow-hidden">
                {/* AI Disclaimer Header */}
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-b border-gray-700 px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        ✨ AI-Generated Translation
                        <span className="text-xs px-2 py-0.5 bg-purple-700 rounded-full">Beta</span>
                      </h3>
                      <p className="text-sm text-gray-300 mt-1">
                        This translation is generated using <strong>Afro Genie Advanced AI Processing</strong>. AI handles translation only - cultural context and explanations are added by human experts.
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-purple-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Estimated human review: <strong>{estimatedReviewTime()}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Translation Content */}
                <div className="p-6 space-y-6">
                  {/* Translation */}
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                      Translation
                    </h3>
                    <div className="bg-[#0d1612] rounded-lg p-4 text-gray-300 whitespace-pre-wrap">
                      {result.translatedLyrics}
                    </div>
                  </div>

                  {/* Cultural Context - Only show if present (added by humans) */}
                  {result.culturalContext && (
                    <div>
                      <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Cultural Context
                        <span className="text-xs px-2 py-1 bg-green-700 rounded-full">Human-Added</span>
                      </h3>
                      <div className="bg-[#0d1612] rounded-lg p-4 text-gray-300 prose prose-invert max-w-none">
                        {result.culturalContext.split('\n').map((paragraph, i) => (
                          <p key={i} className="mb-2">{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-700">
                    <button
                      onClick={handleSave}
                      disabled={saved}
                      className="flex-1 min-h-[44px] bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      {saved ? 'Saved!' : 'Save Translation'}
                    </button>

                    <button
                      onClick={() => window.location.reload()}
                      className="min-h-[44px] px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
                    >
                      New Request
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Profile or Registration */}
            {user ? <UserProfileCard /> : <RegistrationForm />}

            {/* Info Card */}
            <div className="bg-[#1a2922] rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How It Works
              </h3>
              <ol className="space-y-3 text-sm text-gray-400">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-700 rounded-full flex items-center justify-center text-white font-bold text-xs">1</span>
                  <span>Enter artist and song title (lyrics optional)</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-700 rounded-full flex items-center justify-center text-white font-bold text-xs">2</span>
                  <span>Our AI generates translation (cultural context added by humans)</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-700 rounded-full flex items-center justify-center text-white font-bold text-xs">3</span>
                  <span>Get instant AI-generated insights</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-700 rounded-full flex items-center justify-center text-white font-bold text-xs">4</span>
                  <span>Human experts will review within 3-7 days</span>
                </li>
              </ol>
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-br from-green-900/30 to-blue-900/30 rounded-xl p-6 border border-green-700/50">
              <h3 className="text-lg font-bold text-white mb-4">🎵 Our Impact</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Songs Translated</span>
                  <span className="text-white font-bold">500+</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Languages Supported</span>
                  <span className="text-white font-bold">10+</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Active Contributors</span>
                  <span className="text-white font-bold">50+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a2922] rounded-xl p-8 max-w-md w-full border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">Save Your Translation</h3>
            <p className="text-gray-300 mb-6">
              Create an account to save this translation and access it anytime. Join our community of music lovers!
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="w-full min-h-[44px] bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-all"
              >
                Create Account / Login
              </button>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="w-full min-h-[44px] bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      <Notification notification={notification} onClose={hideNotification} />
    </div>
  );
};

export default RequestTranslationPage;
