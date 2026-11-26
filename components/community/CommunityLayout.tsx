import React, { useState } from 'react';
import CommunitySidebar, { type CommunityTab } from './CommunitySidebar';

interface CommunityLayoutProps {
  activeTab: CommunityTab;
  onTabChange: (tab: CommunityTab) => void;
  header?: React.ReactNode;
  children: React.ReactNode;
}

const CommunityLayout: React.FC<CommunityLayoutProps> = ({ activeTab, onTabChange, header, children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex flex-1 overflow-hidden">
      <CommunitySidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile sidebar toggle — matches TranslationPage */}
        <div className="md:hidden sticky top-0 z-10 flex items-center p-3 bg-[#122118]/95 backdrop-blur-sm border-b border-white/5">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              mobileSidebarOpen
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Menu</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {header}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityLayout;
