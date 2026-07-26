import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PlaybackSidebar, { SidebarPanel } from '../components/PlaybackSidebar';
import SubSidebarLibrary from '../components/SubSidebarLibrary';
import SubSidebarExplore from '../components/SubSidebarExplore';
import SubSidebarCommunity from '../components/SubSidebarCommunity';
import SubSidebarSettings from '../components/SubSidebarSettings';
import LyricContent from '../components/LyricContent';
import { PlaybackSettingsProvider } from '../context/PlaybackSettingsContext';

const SUB_SIDEBAR_IDS: SidebarPanel[] = ['library', 'explore', 'community', 'settings'];

const TranslationPage: React.FC = () => {
    const { id: songId } = useParams<{ id: string }>();
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [activePanel, setActivePanel] = useState<SidebarPanel>(null);
    const [culturalContext, setCulturalContext] = useState('');
    const [resetTranslationKey, setResetTranslationKey] = useState(0);

    const hasSubPanel = SUB_SIDEBAR_IDS.includes(activePanel);

    const handleNavigate = useCallback(() => {
        setShowMobileSidebar(false);
    }, []);

    const handleCulturalContextLoaded = useCallback((context: string) => {
        setCulturalContext(context);
    }, []);

    const handleResetTranslation = useCallback(() => {
        setResetTranslationKey((prev) => prev + 1);
    }, []);

    const renderSubSidebar = () => {
        switch (activePanel) {
            case 'library':
                return (
                    <SubSidebarLibrary
                        onBack={() => setActivePanel(null)}
                        onNavigate={handleNavigate}
                        isMobile={false}
                    />
                );
            case 'explore':
                return (
                    <SubSidebarExplore
                        onBack={() => setActivePanel(null)}
                        onNavigate={handleNavigate}
                        isMobile={false}
                        culturalContext={culturalContext}
                    />
                );
            case 'community':
                return (
                    <SubSidebarCommunity
                        onBack={() => setActivePanel(null)}
                        onNavigate={handleNavigate}
                        isMobile={false}
                    />
                );
            case 'settings':
                return (
                    <SubSidebarSettings
                        onBack={() => setActivePanel(null)}
                        onNavigate={handleNavigate}
                        isMobile={false}
                    />
                );
            default:
                return null;
        }
    };

    const renderMobileSubSidebar = () => {
        switch (activePanel) {
            case 'library':
                return (
                    <SubSidebarLibrary
                        onBack={() => setActivePanel(null)}
                        onNavigate={handleNavigate}
                        isMobile={true}
                    />
                );
            case 'explore':
                return (
                    <SubSidebarExplore
                        onBack={() => setActivePanel(null)}
                        onNavigate={handleNavigate}
                        isMobile={true}
                        culturalContext={culturalContext}
                    />
                );
            case 'community':
                return (
                    <SubSidebarCommunity
                        onBack={() => setActivePanel(null)}
                        onNavigate={handleNavigate}
                        isMobile={true}
                    />
                );
            case 'settings':
                return (
                    <SubSidebarSettings
                        onBack={() => setActivePanel(null)}
                        onNavigate={handleNavigate}
                        isMobile={true}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <PlaybackSettingsProvider
            initialFontSize={20}
            onResetTranslation={handleResetTranslation}
        >
            <div className={`flex-1 flex flex-col lg:grid overflow-hidden h-[calc(100vh-4rem)] ${hasSubPanel ? 'lg:grid-cols-[260px_260px_1fr]' : 'lg:grid-cols-[260px_1fr]'}`}>
                {/* Main Content */}
                <main className="flex-1 order-1 lg:order-3 overflow-y-auto no-scrollbar pb-24 lg:pb-24 relative min-h-0">
                    {/* Mobile Sidebar Toggle Button */}
                    <div className="lg:hidden sticky top-0 z-10 flex items-center p-3 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 mb-4">
                        <button
                            onClick={() => {
                                setShowMobileSidebar(!showMobileSidebar);
                                setActivePanel(null);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                                showMobileSidebar
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
                    <LyricContent
                        key={resetTranslationKey}
                        onCulturalContextLoaded={handleCulturalContextLoaded}
                    />
                </main>

                {/* Mobile Sidebar (toggled) */}
                {showMobileSidebar && (
                    <div className="lg:hidden order-2 fixed inset-0 z-40 flex">
                        {/* Overlay */}
                        <div
                            className="absolute inset-0 bg-black/50"
                            onClick={() => {
                                setShowMobileSidebar(false);
                                setActivePanel(null);
                            }}
                        />
                        {/* Sidebar Panel */}
                        <div className="relative w-[280px] max-h-[calc(100vh-4rem)] mb-16 bg-[#1a1a1a] border-r border-[#282828] flex flex-col overflow-hidden animate-slide-in-left">
                            {hasSubPanel ? (
                                renderMobileSubSidebar()
                            ) : (
                                <PlaybackSidebar
                                    songId={songId || ''}
                                    activePanel={activePanel}
                                    onPanelChange={setActivePanel}
                                    onNavigate={handleNavigate}
                                    isMobile={true}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Desktop Sidebar (always visible) */}
                <aside className="hidden lg:flex lg:order-1 lg:flex-col lg:w-[260px] lg:min-w-[260px] lg:max-w-[260px] h-full border-r border-[#282828] overflow-hidden">
                    <PlaybackSidebar
                        songId={songId || ''}
                        activePanel={activePanel}
                        onPanelChange={setActivePanel}
                        onNavigate={handleNavigate}
                        isMobile={false}
                    />
                </aside>

                {/* Desktop Sub-Sidebar (opens beside the sidebar) */}
                {hasSubPanel && (
                    <aside className="hidden lg:flex lg:order-2 lg:flex-col lg:w-[260px] lg:min-w-[260px] lg:max-w-[260px] h-full border-r border-[#282828] overflow-hidden animate-slide-in-left">
                        {renderSubSidebar()}
                    </aside>
                )}
            </div>
        </PlaybackSettingsProvider>
    );
};

export default TranslationPage;
