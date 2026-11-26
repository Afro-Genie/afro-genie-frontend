import React, { useState } from 'react';
import { Bell, Mail, Smartphone, Save } from 'lucide-react';

interface NotificationToggles {
  emailNewSongRequest: boolean;
  emailTranslationReady: boolean;
  emailWeeklyReport: boolean;
  emailMarketing: boolean;
  pushNewSongRequest: boolean;
  pushTranslationReady: boolean;
}

interface NotificationSettingsProps {
  onSave?: (toggles: NotificationToggles) => Promise<void>;
}

const DEFAULT_TOGGLES: NotificationToggles = {
  emailNewSongRequest: true,
  emailTranslationReady: true,
  emailWeeklyReport: true,
  emailMarketing: false,
  pushNewSongRequest: true,
  pushTranslationReady: true,
};

const Toggle: React.FC<{ enabled: boolean; onChange: () => void; disabled?: boolean }> = ({
  enabled,
  onChange,
  disabled,
}) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onSave }) => {
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
    { key: 'emailNewSongRequest' as const, label: 'New song request', description: 'When a listener requests one of your songs' },
    { key: 'emailTranslationReady' as const, label: 'Translation ready', description: 'When a translation of your lyrics is complete' },
    { key: 'emailWeeklyReport' as const, label: 'Weekly report', description: 'Your weekly performance summary' },
    { key: 'emailMarketing' as const, label: 'Marketing & updates', description: 'Product updates and promotional content' },
  ];

  const pushSettings = [
    { key: 'pushNewSongRequest' as const, label: 'New song request', description: 'Push notification for song requests' },
    { key: 'pushTranslationReady' as const, label: 'Translation ready', description: 'Push notification for completed translations' },
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
        {/* Email notifications */}
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
                <Toggle enabled={toggles[s.key]} onChange={() => toggle(s.key)} />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-700/50" />

        {/* Push notifications */}
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
                <Toggle enabled={toggles[s.key]} onChange={() => toggle(s.key)} />
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

export default NotificationSettings;
export type { NotificationToggles };
