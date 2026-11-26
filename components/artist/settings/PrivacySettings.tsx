import React, { useState, useEffect } from 'react';
import { Lock, Eye, Smartphone, Save } from 'lucide-react';

interface PrivacyToggles {
  privateProfile: boolean;
  showEmail: boolean;
  showLocation: boolean;
  twoFactorEnabled: boolean;
}

interface PrivacySettingsProps {
  onSave?: (toggles: PrivacyToggles) => Promise<void>;
}

const STORAGE_KEY = 'artist_privacy';

const DEFAULTS: PrivacyToggles = {
  privateProfile: false,
  showEmail: false,
  showLocation: true,
  twoFactorEnabled: false,
};

function loadSaved(): PrivacyToggles {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

const PrivacySettings: React.FC<PrivacySettingsProps> = ({ onSave }) => {
  const [toggles, setToggles] = useState<PrivacyToggles>(loadSaved);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setToggles(loadSaved());
  }, []);

  const toggle = (key: keyof PrivacyToggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toggles));
      await onSave?.(toggles);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const items: { key: keyof PrivacyToggles; label: string; description: string; icon: React.ReactNode }[] = [
    {
      key: 'privateProfile',
      label: 'Private Profile',
      description: 'Only approved followers can see your full profile',
      icon: <Lock className="w-4 h-4" />,
    },
    {
      key: 'showEmail',
      label: 'Show Email',
      description: 'Display your email on your public profile',
      icon: <Eye className="w-4 h-4" />,
    },
    {
      key: 'showLocation',
      label: 'Show Location',
      description: 'Display your location on your public profile',
      icon: <Eye className="w-4 h-4" />,
    },
    {
      key: 'twoFactorEnabled',
      label: 'Two-Factor Authentication',
      description: 'Add an extra layer of security to your account',
      icon: <Smartphone className="w-4 h-4" />,
    },
  ];

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Privacy & Security</h2>
        </div>
        <p className="text-sm text-gray-400 mt-1">Control your privacy and security settings</p>
      </div>
      <div className="p-6 space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="text-gray-400">{item.icon}</div>
              <div>
                <p className="text-sm text-white">{item.label}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                toggles[item.key] ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  toggles[item.key] ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        ))}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
