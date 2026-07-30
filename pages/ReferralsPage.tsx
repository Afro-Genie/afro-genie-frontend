import React, { useState, useEffect } from 'react';
import { tokenApi, type ReferralInfo } from '../services/tokenService';

const ReferralsPage: React.FC = () => {
  const [data, setData] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyCode, setApplyCode] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await tokenApi.getMyReferrals();
      setData(result);
      if (!result.referralCode) {
        await tokenApi.getReferralCode();
        const updated = await tokenApi.getMyReferrals();
        setData(updated);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyCode = () => {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleApplyReferral = async () => {
    if (!applyCode.trim()) return;
    setApplyLoading(true);
    setMessage(null);
    try {
      const result = await tokenApi.applyReferral(applyCode.trim());
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        setApplyCode('');
        fetchData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to apply referral' });
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Referral Program</h1>
          <p className="text-gray-400">Invite friends and earn tokens for every signup</p>
        </div>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-900/50 text-green-300 border border-green-700/50'
              : 'bg-red-900/50 text-red-300 border border-red-700/50'
          }`}>
            {message.text}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && data && (
          <>
            {/* Referral Code */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-2">Your Referral Code</h2>
              <p className="text-sm text-gray-400 mb-4">
                Share this code and earn 20 tokens for each friend who signs up. They get 10 tokens too!
              </p>
              {data.referralCode ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-center">
                    <span className="text-xl font-bold text-amber-400 tracking-wider">{data.referralCode}</span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {codeCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ) : (
                <p className="text-gray-500">Generating code...</p>
              )}
            </div>

            {/* Apply Referral */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-2">Have a Referral Code?</h2>
              <p className="text-sm text-gray-400 mb-4">Enter the code from a friend to receive a welcome bonus.</p>
              {data.referralCode && !data.referrals.length ? (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={applyCode}
                    onChange={(e) => setApplyCode(e.target.value)}
                    placeholder="Enter referral code"
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                  <button
                    onClick={handleApplyReferral}
                    disabled={applyLoading || !applyCode.trim()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {applyLoading ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">You have already been referred.</p>
              )}
            </div>

            {/* My Referrals */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">My Referrals</h2>
                <span className="px-3 py-1 bg-amber-900/30 text-amber-400 text-sm font-medium rounded-full">
                  {data.totalReferrals} total
                </span>
              </div>
              {data.referrals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No referrals yet. Share your code!</p>
              ) : (
                <div className="space-y-3">
                  {data.referrals.map((ref) => (
                    <div key={ref.id} className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                      {ref.photoUrl ? (
                        <img src={ref.photoUrl} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                          <span className="text-xs text-white">{ref.displayName?.[0] || '?'}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-white">{ref.displayName || 'Anonymous'}</p>
                        <p className="text-xs text-gray-500">
                          Joined {new Date(ref.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-xs text-green-400 font-medium">+20 tokens</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="mt-8 p-4 bg-gray-800/30 border border-gray-700/30 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Rewards Summary</h3>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• You earn 20 tokens per referred friend who signs up</li>
                <li>• Your friend earns 10 tokens as a welcome bonus</li>
                <li>• Refer 3 friends to earn the ⭐ Referral Star badge</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReferralsPage;
