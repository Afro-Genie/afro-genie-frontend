import React from 'react';
import { ArrowLeft, Globe } from 'lucide-react';
import { parseCulturalContext } from './CulturalContextCarousel';

interface CulturalContextListProps {
  culturalContext: string;
  onBack: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}

const CulturalContextList: React.FC<CulturalContextListProps> = ({
  culturalContext,
  onBack,
  onNavigate,
  isMobile = false,
}) => {
  const items = parseCulturalContext(culturalContext);

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
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold">Cultural Context</h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.number}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-900/60 text-green-400 text-xs font-bold flex items-center justify-center mt-0.5">
                  {item.number}
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-green-300 mb-1">
                    {item.term}
                  </h4>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {item.explanation}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Globe className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No cultural context available for this song.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CulturalContextList;
