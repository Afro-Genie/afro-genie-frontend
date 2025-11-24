import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import LeftSidebar from '../components/LeftSidebar';
import LyricContent from '../components/LyricContent';
import AnnotationSidebar from '../components/AnnotationSidebar';

const TranslationPage: React.FC = () => {
    const { id: songId } = useParams<{ id: string }>();
    const [showLeftSidebar, setShowLeftSidebar] = useState(false);
    const [showRightSidebar, setShowRightSidebar] = useState(false);
    
    return (
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[280px_1fr_340px] overflow-hidden h-full">
            {/* Main Content - Always visible, full width on mobile, center column on desktop */}
            <main className="flex-1 order-1 lg:order-2 overflow-y-auto pb-24 lg:pb-24 relative">
                {/* Mobile Sidebar Toggle Buttons - Fixed at top of content */}
                <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between p-3 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 mb-4">
                    <button
                        onClick={() => {
                            setShowLeftSidebar(!showLeftSidebar);
                            setShowRightSidebar(false); // Close other sidebar when opening one
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                            showLeftSidebar 
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span>Menu</span>
                    </button>
                    <button
                        onClick={() => {
                            setShowRightSidebar(!showRightSidebar);
                            setShowLeftSidebar(false); // Close other sidebar when opening one
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                            showRightSidebar 
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-7 4h7" />
                        </svg>
                        <span>Comments</span>
                    </button>
                </div>
                <LyricContent />
            </main>

            {/* Left Sidebar - Hidden on mobile by default, shown below content when toggled, always visible on desktop */}
            {showLeftSidebar && (
                <aside className="lg:hidden order-2 overflow-y-auto bg-gray-800 border-t border-gray-700 max-h-[60vh]">
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800 z-10">
                        <h2 className="text-lg font-bold text-white">Navigation</h2>
                        <button
                            onClick={() => setShowLeftSidebar(false)}
                            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-4">
                        <LeftSidebar />
                    </div>
                </aside>
            )}

            {/* Desktop Left Sidebar - Always visible on desktop */}
            <aside className="hidden lg:block order-1 overflow-y-auto bg-[#1A2B22]/50 border-r border-white/10">
                <LeftSidebar />
            </aside>

            {/* Right Sidebar (Annotations) - Hidden on mobile by default, shown below content when toggled, always visible on desktop */}
            {showRightSidebar && (
                <aside className="lg:hidden order-3 overflow-y-auto bg-gray-800 border-t border-gray-700 max-h-[60vh]">
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800 z-10">
                        <h2 className="text-lg font-bold text-white">Community Comments</h2>
                        <button
                            onClick={() => setShowRightSidebar(false)}
                            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-4">
                        <AnnotationSidebar songId={songId || ''} />
                    </div>
                </aside>
            )}

            {/* Desktop Right Sidebar - Always visible on desktop */}
            <aside className="hidden lg:block order-3 overflow-y-auto bg-[#1A2B22]/50 border-l border-white/10">
                <AnnotationSidebar songId={songId || ''} />
            </aside>
        </div>
    );
};

export default TranslationPage;