import React, { useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { usePlaybackSettings } from '../context/PlaybackSettingsContext';

interface SubSidebarSettingsProps {
  onBack: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}

const SubSidebarSettings: React.FC<SubSidebarSettingsProps> = ({
  onBack,
  onNavigate,
  isMobile = false,
}) => {
  const { fontSize, setFontSize, handleResetTranslation } = usePlaybackSettings();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    handleResetTranslation();
    setShowResetConfirm(false);
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
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Font Size */}
        <section>
          <label className="block text-sm font-semibold text-gray-300 mb-3">
            Font Size: {fontSize}px
          </label>
          <input
            type="range"
            min="12"
            max="24"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>12px</span>
            <span>24px</span>
          </div>
        </section>

        {/* Reset Translation */}
        <section>
          {showResetConfirm ? (
            <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <p className="text-sm text-gray-300 mb-3">
                Are you sure you want to reset the translation? This will clear the current translation.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-gray-500" />
              Reset Translation
            </button>
          )}
        </section>
      </div>
    </div>
  );
};

export default SubSidebarSettings;
