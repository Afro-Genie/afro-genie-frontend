import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { moderationApi, CorrectionHistory } from '../services/moderationService';
import { translationsApi } from '../services/api';

interface SubSidebarCommunityProps {
  songId: string;
  onBack: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}

const SubSidebarCommunity: React.FC<SubSidebarCommunityProps> = ({
  songId,
  onBack,
  onNavigate,
  isMobile = false,
}) => {
  const { isModerator } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [correctionHistory, setCorrectionHistory] = useState<CorrectionHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [translationId, setTranslationId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!songId) return;
      setHistoryLoading(true);
      try {
        const data = await translationsApi.getForSong(songId);
        const groups = data?.translations || {};
        const firstLang = Object.values(groups)[0] as any[] | undefined;
        const first = firstLang?.[0];
        if (first?.id) {
          setTranslationId(first.id);
          const history = await moderationApi.getCorrectionHistory(first.id);
          if (!cancelled) setCorrectionHistory(history);
        }
      } catch {
        // Non-fatal
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [songId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    if (!title.trim()) {
      setSubmitError('Title is required');
      return;
    }
    if (description.trim().length < 40) {
      setSubmitError('Description must be at least 40 characters');
      return;
    }
    if (!translationId) {
      setSubmitError('No translation available for this song. A translation must exist before requesting a correction.');
      return;
    }

    setSubmitting(true);
    try {
      await moderationApi.submitCorrectionRequest(translationId, title.trim(), description.trim());
      setSubmitSuccess(true);
      setTitle('');
      setDescription('');
      setShowForm(false);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit correction request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white">
      {/* Header */}
      <div className="flex items-center gap-3 h-16 px-4 border-b border-[#282828] flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">Community & Contribution</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Review Translations – only for moderators */}
        {isModerator && (
          <section>
            <Link
              to="/moderator/translations"
              onClick={onNavigate}
              className="flex items-center gap-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-900/60 flex items-center justify-center flex-shrink-0">
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Review Translations</p>
                <p className="text-xs text-gray-400 mt-0.5">Verify and correct community translations</p>
              </div>
            </Link>
          </section>
        )}

        {/* Request Translation Correction */}
        <section>
          {!showForm ? (
            <button
              onClick={() => { setShowForm(true); setSubmitSuccess(false); }}
              className="w-full flex items-center gap-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-900/60 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Request Translation Correction</p>
                <p className="text-xs text-gray-400 mt-0.5">Report an issue with the current translation</p>
              </div>
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">New Correction Request</h3>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief title for the issue"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Description * <span className="text-gray-500">({Math.max(0, 40 - description.length)} min chars)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what is wrong with the translation (minimum 40 characters)..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px] resize-y"
                  maxLength={2000}
                />
                <p className="text-xs text-gray-500 mt-1">{description.length} / 2000</p>
              </div>

              {submitError && (
                <p className="text-xs text-red-400">{submitError}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800/50 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm flex-1"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setSubmitError(''); }}
                  className="min-h-[44px] bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {submitSuccess && (
            <p className="text-xs text-green-400 mt-2">Correction request submitted successfully. A moderator will review it.</p>
          )}
        </section>

        {/* Correction History */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Translation History</h3>
          {historyLoading ? (
            <p className="text-xs text-gray-500">Loading...</p>
          ) : correctionHistory ? (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-300">
                Reviewed and corrected by{' '}
                <span className="font-semibold text-green-400">{correctionHistory.correctedBy.displayName}</span>
                {correctionHistory.requestedBy && (
                  <> upon request by <span className="font-semibold text-amber-400">{correctionHistory.requestedBy.displayName}</span></>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(correctionHistory.correctedAt).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
              {correctionHistory.title && (
                <p className="text-xs text-gray-400 mt-1">&ldquo;{correctionHistory.title}&rdquo;</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No corrections recorded for this translation yet.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default SubSidebarCommunity;
