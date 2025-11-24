import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LogoIcon from './icons/LogoIcon';
import MenuIcon from './icons/MenuIcon';
import SearchBar from './SearchBar';
import UserMenu from './auth/UserMenu';
import LoginModal from './auth/LoginModal';

const Header: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <>
      <header className="bg-[#1A2B22]/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/10 flex-shrink-0">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
              <LogoIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
              <span className="text-lg sm:text-xl font-bold text-white">AfroGenie</span>
            </Link>

            {/* Search, Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <div className="flex-1 min-w-0 hidden sm:block">
                <SearchBar variant="header" />
              </div>
              <Link
                to="/artist/signup"
                className="text-gray-300 hover:text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors hidden lg:block whitespace-nowrap"
              >
                For Artists
              </Link>
              <button className="p-2 rounded-md text-gray-300 hover:bg-[#2a3c30] hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <MenuIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <UserMenu onLoginClick={() => setIsLoginModalOpen(true)} />
            </div>
          </div>
          {/* Mobile Search Bar */}
          <div className="sm:hidden pb-3">
            <SearchBar variant="header" />
          </div>
        </div>
      </header>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </>
  );
};

export default Header;