import React from 'react';
import TranslateIcon from './icons/TranslateIcon';
import UserGroupIcon from './icons/UserGroupIcon';

interface NavbarProps {
    activeView: 'translator' | 'community';
    setActiveView: (view: 'translator' | 'community') => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView }) => {
    const baseStyles = "flex-1 text-center py-3 px-4 font-semibold text-gray-400 border-b-2 transition-all duration-300 flex items-center justify-center gap-2";
    const activeStyles = "text-amber-400 border-amber-400";
    const inactiveStyles = "border-transparent hover:bg-gray-800/50 hover:text-gray-200";

    return (
        <nav className="bg-gray-900/80 backdrop-blur-sm sticky top-[80px] z-10 border-b border-t border-gray-700/50">
            <div className="container mx-auto flex">
                <button 
                    onClick={() => setActiveView('translator')}
                    className={`${baseStyles} ${activeView === 'translator' ? activeStyles : inactiveStyles}`}
                    aria-current={activeView === 'translator' ? 'page' : undefined}
                >
                    <TranslateIcon className="h-5 w-5" />
                    AI Translator
                </button>
                <button 
                    onClick={() => setActiveView('community')}
                    className={`${baseStyles} ${activeView === 'community' ? activeStyles : inactiveStyles}`}
                    aria-current={activeView === 'community' ? 'page' : undefined}
                >
                    <UserGroupIcon className="h-5 w-5" />
                    Community Hub
                </button>
            </div>
        </nav>
    );
};

export default Navbar;