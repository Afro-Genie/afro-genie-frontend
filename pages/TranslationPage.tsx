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
                        songId={songId || ''}
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
                        songId={songId || ''}
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
            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar (always visible) */}
                <aside className="hidden lg:flex lg:flex-col w-[260px] min-w-[260px] max-w-[260px] border-r border-[#282828] overflow-hidden">
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
                    <aside className="hidden lg:flex lg:flex-col w-[260px] min-w-[260px] max-w-[260px] border-r border-[#282828] overflow-hidden animate-slide-in-left">
                        {renderSubSidebar()}
                    </aside>
                )}

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Mobile Sidebar Toggle Button */}
                    <div className="lg:hidden sticky top-0 z-10 flex items-center p-3 bg-[#122118]/95 backdrop-blur-sm border-b border-white/5">
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

                    {/* Scrollable Content */}
                    <main className="flex-1 overflow-y-auto no-scrollbar">
                        <div className="p-6">
                            <LyricContent
                                key={resetTranslationKey}
                                onCulturalContextLoaded={handleCulturalContextLoaded}
                            />
                        </div>
                    </main>
                </div>

                {/* Mobile Sidebar (toggled) */}
                {showMobileSidebar && (
                    <div className="lg:hidden fixed inset-0 z-40 flex">
                        <div
                            className="absolute inset-0 bg-black/50"
                            onClick={() => {
                                setShowMobileSidebar(false);
                                setActivePanel(null);
                            }}
                        />
                        <div className="relative w-[280px] max-h-full bg-[#122118] border-r border-white/5 flex flex-col overflow-hidden animate-slide-in-left">
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
            </div>
        </PlaybackSettingsProvider>
    );
};

export default TranslationPage;
