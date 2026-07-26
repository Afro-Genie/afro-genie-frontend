import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Eye } from 'lucide-react';

interface SubSidebarCommunityProps {
  onBack: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}

const SubSidebarCommunity: React.FC<SubSidebarCommunityProps> = ({
  onBack,
  onNavigate,
  isMobile = false,
}) => {
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
        {/* Request Translation */}
        <section>
          <Link
            to="/request-translation"
            onClick={onNavigate}
            className="flex items-center gap-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-green-900/60 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Request Translation</p>
              <p className="text-xs text-gray-400 mt-0.5">Submit a song for translation</p>
            </div>
          </Link>
        </section>

        {/* Review Translations */}
        <section>
          <Link
            to="/community/review"
            onClick={onNavigate}
            className="flex items-center gap-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-900/60 flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Review Translations</p>
              <p className="text-xs text-gray-400 mt-0.5">Help verify community translations</p>
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
};

export default SubSidebarCommunity;
