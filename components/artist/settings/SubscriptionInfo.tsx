import React from 'react';
import { Crown, Check } from 'lucide-react';

interface SubscriptionInfoProps {
  plan: 'FREE' | 'PREMIUM' | string;
  isSpotifyPremium?: boolean;
}

const SubscriptionInfo: React.FC<SubscriptionInfoProps> = ({ plan, isSpotifyPremium }) => {
  const isPremium = plan === 'PREMIUM' || isSpotifyPremium;

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Subscription</h2>
        </div>
      </div>
      <div className="p-6">
        <div className={`p-4 rounded-xl border ${
          isPremium
            ? 'bg-green-900/20 border-green-700/30'
            : 'bg-gray-800/50 border-gray-700/50'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            {isPremium ? (
              <Crown className="w-6 h-6 text-green-400" />
            ) : (
              <Crown className="w-6 h-6 text-gray-500" />
            )}
            <div>
              <p className={`font-semibold ${isPremium ? 'text-green-300' : 'text-white'}`}>
                {isPremium ? 'Premium Artist' : 'Free Artist'}
              </p>
              <p className="text-xs text-gray-400">
                {isPremium
                  ? 'Full access to all features'
                  : 'Upgrade for advanced analytics and more'}
              </p>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {[
              'Unlimited song uploads',
              'Translation requests',
              'Analytics dashboard',
              'Priority support',
              'Advanced audience insights',
            ].map((feature, idx) => (
              <div key={feature} className="flex items-center gap-2">
                <Check className={`w-3.5 h-3.5 ${isPremium ? 'text-green-400' : idx < 3 ? 'text-green-400' : 'text-gray-600'}`} />
                <span className={`text-sm ${isPremium || idx < 3 ? 'text-gray-300' : 'text-gray-500'}`}>
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {!isPremium && (
            <button className="mt-4 w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
              Upgrade to Premium
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionInfo;
