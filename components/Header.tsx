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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <LogoIcon className="h-5 w-5 text-green-400" />
              <span className="text-xl font-bold text-white">AfroGenie</span>
            </Link>

            {/* Search, Actions */}
            <div className="flex items-center space-x-4">
              <SearchBar variant="header" />
              <button className="p-2 rounded-md text-gray-300 hover:bg-[#2a3c30] hover:text-white transition-colors">
                <MenuIcon className="h-6 w-6" />
              </button>
              <UserMenu onLoginClick={() => setIsLoginModalOpen(true)} />
            </div>
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