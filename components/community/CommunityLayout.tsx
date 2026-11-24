import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Header from '../Header';
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
        {/* Header */}
        <Header
          leading={
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          }
        />

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
