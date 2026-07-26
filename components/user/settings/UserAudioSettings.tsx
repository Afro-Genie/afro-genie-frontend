import React, { useState, useEffect } from 'react';
import { Music, Save } from 'lucide-react';

interface AudioToggles {
  autoplay: boolean;
  highQualityAudio: boolean;
  canvasAnimations: boolean;
}

interface UserAudioSettingsProps {
  onSave?: (toggles: AudioToggles) => Promise<void>;
}

const STORAGE_KEY = 'user_audio';

const DEFAULTS: AudioToggles = {
  autoplay: true,
  highQualityAudio: true,
  canvasAnimations: true,
};

function loadSaved(): AudioToggles {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

const UserAudioSettings: React.FC<UserAudioSettingsProps> = ({ onSave }) => {
  const [toggles, setToggles] = useState<AudioToggles>(loadSaved);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setToggles(loadSaved());
  }, []);

  const toggle = (key: keyof AudioToggles) => {
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

  const items: { key: keyof AudioToggles; label: string; description: string }[] = [
    {
      key: 'autoplay',
      label: 'Autoplay',
      description: 'Automatically play next song in queue',
    },
    {
      key: 'highQualityAudio',
      label: 'High Quality Audio',
      description: 'Stream in high quality when available',
    },
    {
      key: 'canvasAnimations',
      label: 'Canvas Animations',
      description: 'Show animated canvases during playback',
    },
  ];

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Audio & Playback</h2>
        </div>
        <p className="text-sm text-gray-400 mt-1">Configure audio playback preferences</p>
      </div>
      <div className="p-6 space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-white">{item.label}</p>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
            <button
              role="switch"
              aria-checked={toggles[item.key]}
              aria-label={item.label}
              onClick={() => toggle(item.key)}
              className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                toggles[item.key] ? 'bg-green-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  toggles[item.key] ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        ))}
        <div className="flex justify-end pt-4">
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

export default UserAudioSettings;
export type { AudioToggles, UserAudioSettingsProps };
