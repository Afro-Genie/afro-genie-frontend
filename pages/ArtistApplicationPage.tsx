import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, artistApplicationApi } from '../services/api';
import { usePendingRequests } from '../hooks/usePendingRequests';

const GENRES = [
  'Afrobeats', 'Afro-pop', 'Amapiano', 'Highlife', 'Afro-fusion',
  'Afro-house', 'Afro-swing', 'Afro-trap', 'Juju', 'Fuji', 'Other',
];

const STEPS = [
  { id: 0, label: 'Identity', description: 'Basic artist information' },
  { id: 1, label: 'Music Profile', description: 'Your sound and style' },
  { id: 2, label: 'Online Presence', description: 'Social links and streaming' },
  { id: 3, label: 'Review', description: 'Confirm and submit' },
];

const ArtistApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { artistApplication, loading: pendingLoading, refresh } = usePendingRequests();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!artistApplication) return;
    if (!window.confirm('Are you sure you want to cancel your artist application?')) return;
    setCancelling(true);
    try {
      await artistApplicationApi.cancel();
      await refresh();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel application. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const [formData, setFormData] = useState({
    stageName: '',
    realName: '',
    genre: '',
    subGenres: '',
    bio: '',
    origin: '',
    yearsActive: '',
    imageUrl: '',
    bannerImageUrl: '',
    spotifyArtistId: '',
    instagram: '',
    twitter: '',
    facebook: '',
    youtube: '',
    tiktok: '',
    website: '',
    notableWorks: '',
    inspiration: '',
    additionalInfo: '',
  });

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const canNext = () => {
    if (step === 0) return formData.stageName.trim() && formData.genre && formData.bio.trim();
    if (step === 1) return true;
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await apiRequest('/artists/apply', {
        method: 'POST',
        body: JSON.stringify({
          stageName: formData.stageName,
          genre: formData.genre,
          bio: [
            formData.bio,
            formData.origin && `Origin: ${formData.origin}`,
            formData.yearsActive && `Years active: ${formData.yearsActive}`,
            formData.subGenres && `Sub-genres: ${formData.subGenres}`,
            formData.notableWorks && `Notable works: ${formData.notableWorks}`,
            formData.inspiration && `Inspiration: ${formData.inspiration}`,
          ].filter(Boolean).join('\n\n'),
          socialLinks: {
            instagram: formData.instagram || undefined,
            twitter: formData.twitter || undefined,
            facebook: formData.facebook || undefined,
            youtube: formData.youtube || undefined,
            tiktok: formData.tiktok || undefined,
            website: formData.website || undefined,
          },
          spotifyArtistId: formData.spotifyArtistId || undefined,
          imageUrl: formData.imageUrl || undefined,
        }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (pendingLoading) {
    return (
      <div className="min-h-screen bg-[#122118] flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-lg w-full border border-gray-700 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-green-400/60 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Checking application status...</p>
        </div>
      </div>
    );
  }

  if (artistApplication) {
    return (
      <div className="min-h-screen bg-[#122118] flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-lg w-full border border-gray-700 text-center">
          <div className="w-20 h-20 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Application Under Review</h1>
          <p className="text-gray-300 mb-2">
            Your artist application for <span className="text-amber-400 font-medium">{artistApplication.stageName}</span> is currently being reviewed.
          </p>
          <p className="text-gray-400 mb-6">
            Status: <span className="text-amber-400 font-medium">{artistApplication.status.replace('_', ' ')}</span>.
            You'll receive an email notification once a decision is made.
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
              {cancelling ? 'Cancelling...' : 'Cancel Application'}
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
          <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Application Submitted</h1>
          <p className="text-gray-300 mb-2">
            Thank you, <span className="text-green-400 font-medium">{formData.stageName}</span>.
          </p>
          <p className="text-gray-400 mb-8">
            Your artist application has been submitted for review. Our team will review your profile and get back to you within 48 hours. You'll receive an email notification once a decision is made.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Back to Home
            </Link>
            <Link
              to="/artists"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Browse Artists
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#122118] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center text-gray-400 hover:text-white text-sm mb-6 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Genie for <span className="text-green-400">Artists</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Join AfroGenie as a verified artist. Upload your music, manage your catalog, and reach a global audience with AI-powered lyric translations.
          </p>
        </div>

        {/* Benefits Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: '🎵', title: 'Upload Songs', desc: 'Add your music with lyrics and translations' },
            { icon: '📊', title: 'Analytics', desc: 'Track plays, views, and listener engagement' },
            { icon: '🌍', title: 'Global Reach', desc: 'Auto-translate lyrics into multiple languages' },
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
                      ? 'bg-green-600 text-white'
                      : i === step
                      ? 'bg-green-500 text-white ring-2 ring-green-300 ring-offset-2 ring-offset-[#122118]'
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
                <span className={`text-xs mt-2 font-medium ${i === step ? 'text-green-400' : 'text-gray-500'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 sm:w-20 h-0.5 mx-2 mb-6 ${i < step ? 'bg-green-600' : 'bg-gray-700'}`} />
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
            {/* Step 0: Identity */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Artist Identity</h2>
                  <p className="text-gray-400 text-sm">Tell us about who you are as an artist.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Stage Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.stageName}
                      onChange={(e) => update('stageName', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Your stage /艺名 name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Real Name
                    </label>
                    <input
                      type="text"
                      value={formData.realName}
                      onChange={(e) => update('realName', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Your real / legal name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Primary Genre <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.genre}
                      onChange={(e) => update('genre', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select Genre</option>
                      {GENRES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Sub-genres
                    </label>
                    <input
                      type="text"
                      value={formData.subGenres}
                      onChange={(e) => update('subGenres', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g. Amapiano, Kwaito, House"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Origin / Location
                    </label>
                    <input
                      type="text"
                      value={formData.origin}
                      onChange={(e) => update('origin', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="City, Country"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Years Active
                    </label>
                    <input
                      type="text"
                      value={formData.yearsActive}
                      onChange={(e) => update('yearsActive', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g. 3 years, Since 2020"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Artist Bio <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => update('bio', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    placeholder="Tell us about yourself, your musical journey, and what makes your sound unique..."
                  />
                  <p className="text-gray-500 text-xs mt-1">This will be displayed on your public artist profile.</p>
                </div>
              </div>
            )}

            {/* Step 1: Music Profile */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Music Profile</h2>
                  <p className="text-gray-400 text-sm">Help us understand your music and artistic vision.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Notable Works / Discography
                  </label>
                  <textarea
                    value={formData.notableWorks}
                    onChange={(e) => update('notableWorks', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    placeholder="List your notable releases, collaborations, or achievements (e.g. 'Featured on African Heat playlist, 500K+ streams on single X')..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Musical Inspiration
                  </label>
                  <textarea
                    value={formData.inspiration}
                    onChange={(e) => update('inspiration', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    placeholder="Who are your musical influences? What drives your creative process?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Profile Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => update('imageUrl', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://example.com/your-photo.jpg"
                  />
                  <p className="text-gray-500 text-xs mt-1">A clear, high-resolution photo of yourself.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Banner Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.bannerImageUrl}
                    onChange={(e) => update('bannerImageUrl', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://example.com/banner.jpg"
                  />
                  <p className="text-gray-500 text-xs mt-1">A wide banner image for your profile header (16:9 ratio recommended).</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Additional Information
                  </label>
                  <textarea
                    value={formData.additionalInfo}
                    onChange={(e) => update('additionalInfo', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    placeholder="Anything else you'd like us to know? Upcoming projects, management info, etc."
                  />
                </div>
              </div>
            )}

            {/* Step 2: Online Presence */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Online Presence</h2>
                  <p className="text-gray-400 text-sm">Connect your streaming and social media accounts.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Spotify Artist ID
                  </label>
                  <input
                    type="text"
                    value={formData.spotifyArtistId}
                    onChange={(e) => update('spotifyArtistId', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Your Spotify Artist ID (from your Spotify artist page URL)"
                  />
                  <p className="text-gray-500 text-xs mt-1">Find this in your Spotify for Artists dashboard or your artist page URL.</p>
                </div>

                <div className="border-t border-gray-700 pt-5">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Social Media Links</h3>
                  <p className="text-gray-500 text-xs mb-4">Add your social profiles to help fans connect with you.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { field: 'instagram', label: 'Instagram', placeholder: '@yourusername' },
                      { field: 'twitter', label: 'Twitter / X', placeholder: '@yourusername' },
                      { field: 'tiktok', label: 'TikTok', placeholder: '@yourusername' },
                      { field: 'youtube', label: 'YouTube', placeholder: 'Channel URL' },
                      { field: 'facebook', label: 'Facebook', placeholder: 'Page URL' },
                      { field: 'website', label: 'Website', placeholder: 'https://yourwebsite.com' },
                    ].map(({ field, label, placeholder }) => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
                        <input
                          type="text"
                          value={(formData as any)[field]}
                          onChange={(e) => update(field, e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Review & Submit</h2>
                  <p className="text-gray-400 text-sm">Please review your application before submitting.</p>
                </div>

                {/* Identity */}
                <div className="bg-gray-700/40 rounded-xl p-5 border border-gray-600/50">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Identity</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Stage Name</span>
                      <p className="text-white font-medium">{formData.stageName || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Real Name</span>
                      <p className="text-white">{formData.realName || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Genre</span>
                      <p className="text-white">{formData.genre || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Origin</span>
                      <p className="text-white">{formData.origin || '—'}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <span className="text-gray-500">Bio</span>
                    <p className="text-gray-300 mt-1 whitespace-pre-line">{formData.bio || '—'}</p>
                  </div>
                </div>

                {/* Music Profile */}
                <div className="bg-gray-700/40 rounded-xl p-5 border border-gray-600/50">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Music Profile</h3>
                  {formData.notableWorks && (
                    <div className="text-sm mb-2">
                      <span className="text-gray-500">Notable Works</span>
                      <p className="text-gray-300 mt-1 whitespace-pre-line">{formData.notableWorks}</p>
                    </div>
                  )}
                  {formData.inspiration && (
                    <div className="text-sm">
                      <span className="text-gray-500">Inspiration</span>
                      <p className="text-gray-300 mt-1 whitespace-pre-line">{formData.inspiration}</p>
                    </div>
                  )}
                  {!formData.notableWorks && !formData.inspiration && (
                    <p className="text-gray-500 text-sm">No additional music profile details provided.</p>
                  )}
                </div>

                {/* Social Links */}
                <div className="bg-gray-700/40 rounded-xl p-5 border border-gray-600/50">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Online Presence</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(['spotifyArtistId', 'instagram', 'twitter', 'tiktok', 'youtube', 'facebook', 'website'] as const).map((field) => (
                      formData[field] ? (
                        <div key={field}>
                          <span className="text-gray-500 capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <p className="text-green-400 truncate">{formData[field]}</p>
                        </div>
                      ) : null
                    ))}
                  </div>
                  {!(formData.spotifyArtistId || formData.instagram || formData.twitter || formData.tiktok || formData.youtube || formData.facebook || formData.website) && (
                    <p className="text-gray-500 text-sm">No social links provided.</p>
                  )}
                </div>

                <p className="text-gray-400 text-sm">
                  By submitting, you confirm that you are the artist and agree to AfroGenie's platform terms. Your application will be reviewed by our team.
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
                className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-pulse" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistApplicationPage;
