import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { roleRequestsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePendingRequests } from '../hooks/usePendingRequests';

const STEPS = [
  { id: 0, label: 'About You', description: 'Your background' },
  { id: 1, label: 'Experience', description: 'Skills and availability' },
  { id: 2, label: 'Review', description: 'Confirm and submit' },
];

const ModeratorRequestPage: React.FC = () => {
  const { user } = useAuth();
  const { roleRequests, loading: pendingLoading, refresh } = usePendingRequests();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const pendingModeratorRequest = roleRequests.find((r) => r.role === 'MODERATOR');

  const handleCancel = async () => {
    if (!pendingModeratorRequest) return;
    if (!window.confirm('Are you sure you want to cancel your moderator request?')) return;
    setCancelling(true);
    try {
      await roleRequestsApi.cancel(pendingModeratorRequest.id);
      await refresh();
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Failed to cancel request. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const [formData, setFormData] = useState({
    fullName: '',
    motivation: '',
    communityExperience: '',
    moderationExperience: '',
    languages: '',
    availabilityHours: '',
    platformKnowledge: '',
    contentAreas: [] as string[],
    additionalInfo: '',
  });

  const CONTENT_AREAS = [
    'Lyric translation review',
    'Community content moderation',
    'User reports and flagging',
    'Artist verification support',
    'New user onboarding',
    'Quality assurance',
  ];

  const toggleContentArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      contentAreas: prev.contentAreas.includes(area)
        ? prev.contentAreas.filter((a) => a !== area)
        : [...prev.contentAreas, area],
    }));
  };

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const canNext = () => {
    if (step === 0) return formData.fullName.trim() && formData.motivation.trim();
    if (step === 1) return formData.availabilityHours.trim();
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await roleRequestsApi.submit('MODERATOR', {
        fullName: formData.fullName,
        motivation: formData.motivation,
        communityExperience: formData.communityExperience,
        moderationExperience: formData.moderationExperience,
        languages: formData.languages,
        availabilityHours: formData.availabilityHours,
        platformKnowledge: formData.platformKnowledge,
        contentAreas: formData.contentAreas,
        additionalInfo: formData.additionalInfo,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (pendingLoading) {
    return (
      <div className="min-h-screen bg-[#122118] flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-lg w-full border border-gray-700 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-blue-400/60 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Checking request status...</p>
        </div>
      </div>
    );
  }

  if (pendingModeratorRequest) {
    return (
      <div className="min-h-screen bg-[#122118] flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-lg w-full border border-gray-700 text-center">
          <div className="w-20 h-20 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Moderator Request Under Review</h1>
          <p className="text-gray-300 mb-2">
            Your moderator request is currently being reviewed by our admin team.
          </p>
          <p className="text-gray-400 mb-6">
            Status: <span className="text-blue-400 font-medium">{pendingModeratorRequest.status.replace('_', ' ')}</span>.
            You'll be notified once a decision is made.
          </p>
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Back to Home
            </Link>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium py-3 px-6 rounded-xl transition-colors border border-red-600/30 disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Request'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#122118] flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-lg w-full border border-gray-700 text-center">
          <div className="w-20 h-20 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Request Submitted</h1>
          <p className="text-gray-300 mb-2">
            Thank you, <span className="text-blue-400 font-medium">{formData.fullName}</span>.
          </p>
          <p className="text-gray-400 mb-8">
            Your moderator request has been submitted. An admin will review your qualifications and get back to you within 72 hours.
          </p>
          <Link
            to="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-xl transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#122118] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center text-gray-400 hover:text-white text-sm mb-6 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Become a <span className="text-blue-400">Moderator</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Help shape the AfroGenie community. Review translations, moderate content, and ensure a great experience for all users.
          </p>
        </div>

        {/* Responsibilities Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: '🔍', title: 'Review Content', desc: 'Verify lyrics, translations, and user submissions' },
            { icon: '🛡️', title: 'Protect Community', desc: 'Handle reports and maintain community guidelines' },
            { icon: '🤝', title: 'Help Users', desc: 'Guide new users and support the community' },
          ].map((item) => (
            <div key={item.title} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="text-white font-medium text-sm">{item.title}</h3>
              <p className="text-gray-400 text-xs mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-10">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < step
                      ? 'bg-blue-600 text-white'
                      : i === step
                      ? 'bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-2 ring-offset-[#122118]'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {i < step ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-xs mt-2 font-medium ${i === step ? 'text-blue-400' : 'text-gray-500'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 sm:w-20 h-0.5 mx-2 mb-6 ${i < step ? 'bg-blue-600' : 'bg-gray-700'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          {error && (
            <div className="bg-red-900/50 border-b border-red-700 text-red-100 px-6 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="p-6 sm:p-8">
            {/* Step 0: About You */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">About You</h2>
                  <p className="text-gray-400 text-sm">Tell us a bit about yourself and why you want to moderate.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => update('fullName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Why do you want to be a moderator? <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={formData.motivation}
                    onChange={(e) => update('motivation', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Describe your motivation for wanting to help moderate the AfroGenie community..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    How did you discover AfroGenie?
                  </label>
                  <textarea
                    value={formData.platformKnowledge}
                    onChange={(e) => update('platformKnowledge', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="How long have you been using AfroGenie? What features do you use most?"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Experience & Availability */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Experience & Availability</h2>
                  <p className="text-gray-400 text-sm">Share your relevant skills and how much time you can contribute.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Community / Moderation Experience
                  </label>
                  <textarea
                    value={formData.communityExperience}
                    onChange={(e) => update('communityExperience', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Have you moderated any online communities before? (Discord, Reddit, forums, etc.)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Content Moderation Experience
                  </label>
                  <textarea
                    value={formData.moderationExperience}
                    onChange={(e) => update('moderationExperience', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Any experience with content review, fact-checking, or quality assurance?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Languages Spoken
                  </label>
                  <input
                    type="text"
                    value={formData.languages}
                    onChange={(e) => update('languages', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. English, Yoruba, French, Pidgin"
                  />
                  <p className="text-gray-500 text-xs mt-1">Multilingual moderators are especially valuable for reviewing translations.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Weekly Availability <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.availabilityHours}
                    onChange={(e) => update('availabilityHours', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select availability</option>
                    <option value="1-3 hours">1 - 3 hours per week</option>
                    <option value="3-5 hours">3 - 5 hours per week</option>
                    <option value="5-10 hours">5 - 10 hours per week</option>
                    <option value="10+ hours">10+ hours per week</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Areas of Interest
                  </label>
                  <p className="text-gray-500 text-xs mb-3">Select the areas you'd like to help with.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CONTENT_AREAS.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleContentArea(area)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-left transition-colors ${
                          formData.contentAreas.includes(area)
                            ? 'bg-blue-600/20 border border-blue-500 text-blue-300'
                            : 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                          formData.contentAreas.includes(area) ? 'bg-blue-500 border-blue-500' : 'border-gray-500'
                        }`}>
                          {formData.contentAreas.includes(area) && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Additional Information
                  </label>
                  <textarea
                    value={formData.additionalInfo}
                    onChange={(e) => update('additionalInfo', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Anything else you'd like us to know?"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Review & Submit</h2>
                  <p className="text-gray-400 text-sm">Please review your application before submitting.</p>
                </div>

                <div className="bg-gray-700/40 rounded-xl p-5 border border-gray-600/50">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Personal Info</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Full Name</span>
                      <p className="text-white font-medium">{formData.fullName || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Availability</span>
                      <p className="text-white">{formData.availabilityHours || '—'}</p>
                    </div>
                  </div>
                  {formData.languages && (
                    <div className="mt-3 text-sm">
                      <span className="text-gray-500">Languages</span>
                      <p className="text-white">{formData.languages}</p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-700/40 rounded-xl p-5 border border-gray-600/50">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Motivation</h3>
                  <p className="text-gray-300 text-sm whitespace-pre-line">{formData.motivation || '—'}</p>
                </div>

                {formData.contentAreas.length > 0 && (
                  <div className="bg-gray-700/40 rounded-xl p-5 border border-gray-600/50">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Areas of Interest</h3>
                    <div className="flex flex-wrap gap-2">
                      {formData.contentAreas.map((area) => (
                        <span key={area} className="px-3 py-1 bg-blue-900/40 text-blue-300 text-xs font-medium rounded-full border border-blue-700/50">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(formData.communityExperience || formData.moderationExperience) && (
                  <div className="bg-gray-700/40 rounded-xl p-5 border border-gray-600/50">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Experience</h3>
                    {formData.communityExperience && (
                      <div className="text-sm mb-2">
                        <span className="text-gray-500">Community Experience</span>
                        <p className="text-gray-300 mt-1 whitespace-pre-line">{formData.communityExperience}</p>
                      </div>
                    )}
                    {formData.moderationExperience && (
                      <div className="text-sm">
                        <span className="text-gray-500">Content Moderation Experience</span>
                        <p className="text-gray-300 mt-1 whitespace-pre-line">{formData.moderationExperience}</p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-gray-400 text-sm">
                  By submitting, you agree to follow AfroGenie's community guidelines and moderator code of conduct.
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 px-6 sm:px-8 py-5 bg-gray-800/50 border-t border-gray-700">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors font-medium"
              >
                Back
              </button>
            )}
            <div className="flex-1" />
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canNext()}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-pulse" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeratorRequestPage;
