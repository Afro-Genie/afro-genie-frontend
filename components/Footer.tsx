import React from 'react';
import { Link } from 'react-router-dom';
import LogoIcon from './icons/LogoIcon';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1A2B22] border-t border-gray-700/50 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <LogoIcon className="h-5 w-5 text-green-400" />
              <span className="text-xl font-bold text-white">AfroGenie</span>
            </Link>
            <p className="text-gray-400 text-sm">
              Africa's premier AI-powered lyric translation and cultural annotation platform.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/songs" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                  Songs Catalog
                </Link>
              </li>
              <li>
                <Link to="/community" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                  Community Forum
                </Link>
              </li>
              <li>
                <Link to="/request-translation" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                  Request Translation
                </Link>
              </li>
              <li>
                <Link to="/artist/signup" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                  For Artists
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700/50 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © {currentYear} AfroGenie. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs text-center md:text-right">
              Original lyrics © respective copyright owners. Translations and annotations © AfroGenie contributors.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


