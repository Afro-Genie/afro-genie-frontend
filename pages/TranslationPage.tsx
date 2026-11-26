import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PlaybackSidebar, { SidebarPanel } from '../components/PlaybackSidebar';
import SubSidebarLibrary from '../components/SubSidebarLibrary';
import SubSidebarExplore from '../components/SubSidebarExplore';
import SubSidebarCommunity from '../components/SubSidebarCommunity';
import SubSidebarSettings from '../components/SubSidebarSettings';
import LyricContent from '../components/LyricContent';
import { PlaybackSettingsProvider } from '../context/PlaybackSettingsContext';
import { Menu, X } from 'lucide-react';

const SUB_SIDEBAR_IDS: SidebarPanel[] = ['library', 'explore', 'community', 'settings'];

const TranslationPage: React.FC = () => {
    const { id: songId } = useParams<{ id: string }>();
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [activePanel, setActivePanel] = useState<SidebarPanel>(null);
    const [culturalContext, setCulturalContext] = useState('');

    const hasSubPanel = SUB_SIDEBAR_IDS.includes(activePanel);

    const handleNavigate = useCallback(() => {
        setShowMobileSidebar(false);
    }, []);

    const handleCulturalContextLoaded = useCallback((context: string) => {
        setCulturalContext(context);
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
        <PlaybackSettingsProvider initialFontSize={20}>
            <div className="flex min-h-0 flex-1 overflow-hidden">
                {/* Desktop Sidebar (always visible) */}
                <aside className="hidden h-full min-h-0 w-[260px] min-w-[260px] max-w-[260px] shrink-0 flex-col overflow-hidden border-r border-[#282828] lg:flex">
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
                    <aside className="hidden h-full min-h-0 w-[260px] min-w-[260px] max-w-[260px] shrink-0 flex-col overflow-hidden border-r border-[#282828] animate-slide-in-left lg:flex">
                        {renderSubSidebar()}
                    </aside>
                )}

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Mobile Sidebar Toggle Button */}
                    <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#08130f]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
                        <div className="flex items-center gap-2.5">
                            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200">
                                <Menu className="size-4" aria-hidden="true" />
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Playback</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setShowMobileSidebar(!showMobileSidebar);
                                setActivePanel(null);
                            }}
                            aria-expanded={showMobileSidebar}
                            aria-controls="mobile-playback-menu"
                            aria-label={showMobileSidebar ? 'Close playback menu' : 'Open playback menu'}
                            className="group flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200/15 bg-emerald-300/[0.08] px-3.5 text-sm font-semibold text-emerald-100 shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-all hover:border-emerald-200/30 hover:bg-emerald-300/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 active:scale-[0.98]"
                        >
                            {showMobileSidebar ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
                            <span>{showMobileSidebar ? 'Close' : 'Menu'}</span>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
                        <div className="px-4 py-4 sm:px-6 sm:py-6">
                            <LyricContent
                                onCulturalContextLoaded={handleCulturalContextLoaded}
                            />
                        </div>
                    </main>
                </div>

                {/* Mobile Sidebar (toggled) */}
                {showMobileSidebar && (
                    <div className="fixed inset-0 z-40 flex lg:hidden">
                        <button
                            type="button"
                            aria-label="Close playback menu"
                            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
                            onClick={() => {
                                setShowMobileSidebar(false);
                                setActivePanel(null);
                            }}
                        />
                        <div id="mobile-playback-menu" role="dialog" aria-modal="true" aria-label="Playback menu" className="relative flex h-[100dvh] max-h-[100dvh] w-[min(88vw,340px)] flex-col overflow-hidden border-r border-white/[0.08] bg-[#08130f] shadow-2xl animate-slide-in-left">
                            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-4 py-3">
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Menu</span>
                                <button
                                    type="button"
                                    aria-label="Close playback menu"
                                    onClick={() => {
                                        setShowMobileSidebar(false);
                                        setActivePanel(null);
                                    }}
                                    className="flex size-10 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            </div>
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
