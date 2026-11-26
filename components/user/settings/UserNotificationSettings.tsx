import React, { useState } from 'react';
import { Bell, Mail, Smartphone, Save } from 'lucide-react';

interface NotificationToggles {
  emailTranslationReady: boolean;
  emailWeeklyDigest: boolean;
  emailMarketing: boolean;
  pushNewFeatures: boolean;
}

interface UserNotificationSettingsProps {
  onSave?: (toggles: NotificationToggles) => Promise<void>;
}

const DEFAULT_TOGGLES: NotificationToggles = {
  emailTranslationReady: true,
  emailWeeklyDigest: true,
  emailMarketing: false,
  pushNewFeatures: true,
};

const Toggle: React.FC<{
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}> = ({ enabled, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
      enabled ? 'bg-green-600' : 'bg-gray-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const UserNotificationSettings: React.FC<UserNotificationSettingsProps> = ({ onSave }) => {
  const [toggles, setToggles] = useState<NotificationToggles>(DEFAULT_TOGGLES);
  const [saving, setSaving] = useState(false);

  const toggle = (key: keyof NotificationToggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(toggles);
    } finally {
      setSaving(false);
    }
  };

  const emailSettings = [
    { key: 'emailTranslationReady' as const, label: 'Translation updates', description: 'When a translation you requested is ready' },
    { key: 'emailWeeklyDigest' as const, label: 'Weekly digest', description: 'Weekly summary of new songs and translations' },
    { key: 'emailMarketing' as const, label: 'Marketing & updates', description: 'Product updates and new features' },
  ];

  const pushSettings = [
    { key: 'pushNewFeatures' as const, label: 'New features', description: 'Push notification when new features launch' },
  ];

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
        </div>
        <p className="text-sm text-gray-400 mt-1">Choose what notifications you receive</p>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-300">Email</h3>
          </div>
          <div className="space-y-3">
            {emailSettings.map((s) => (
              <div key={s.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-white">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.description}</p>
                </div>
                <Toggle enabled={toggles[s.key]} onChange={() => toggle(s.key)} label={s.label} />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-700/50" />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-300">Push</h3>
          </div>
          <div className="space-y-3">
            {pushSettings.map((s) => (
              <div key={s.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-white">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.description}</p>
                </div>
                <Toggle enabled={toggles[s.key]} onChange={() => toggle(s.key)} label={s.label} />
              </div>
            ))}
          </div>
        </div>

        {onSave && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserNotificationSettings;
export type { NotificationToggles, UserNotificationSettingsProps };
