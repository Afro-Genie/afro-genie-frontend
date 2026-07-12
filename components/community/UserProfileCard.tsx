import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserIcon from '../icons/UserIcon';
import PremiumBadge from '../PremiumBadge';

const UserProfileCard: React.FC = () => {
    const { user, isAdmin, isSpotifyPremium, userProfile } = useAuth();

    if (!user) return null;

    return (
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-lg space-y-6">
            <div className="text-center">
                {user.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt="Profile"
                        className="h-20 w-20 rounded-full mx-auto mb-4 ring-4 ring-amber-400"
                    />
                ) : (
                    <div className="h-20 w-20 rounded-full mx-auto mb-4 bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center ring-4 ring-amber-400">
                        <span className="text-3xl font-bold text-white">
                            {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                        </span>
                    </div>
                )}
                <h2 className="text-2xl font-bold text-white mb-1">
                    {user.displayName || 'Community Member'}
                </h2>
                <p className="text-sm text-gray-400 mb-2">{user.email}</p>
                {isAdmin && (
                    <span className="inline-block px-3 py-1 text-xs font-semibold bg-green-900/50 text-green-300 rounded-full">
                        ⭐ Administrator
                    </span>
                )}
                {isSpotifyPremium && (
                    <div className="mt-2">
                        <PremiumBadge variant="full" />
                    </div>
                )}
                {!isSpotifyPremium && user.spotifyId && (
                    <div className="mt-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-700/50 text-gray-400 rounded-full">
                            Spotify Free
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Quick Actions</h3>
                
                <Link
                    to="/request-translation"
                    className="flex items-center justify-between w-full p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors group"
                >
                    <span className="flex items-center text-gray-300 group-hover:text-white">
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Request Translation
                    </span>
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>

                <Link
                    to="/community/create"
                    className="flex items-center justify-between w-full p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors group"
                >
                    <span className="flex items-center text-gray-300 group-hover:text-white">
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Start Discussion
                    </span>
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>

                {isAdmin && (
                    <Link
                        to="/admin"
                        className="flex items-center justify-between w-full p-3 bg-green-900/30 hover:bg-green-900/50 border border-green-700/50 rounded-lg transition-colors group"
                    >
                        <span className="flex items-center text-green-300 group-hover:text-green-200">
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Admin Panel
                        </span>
                        <svg className="w-4 h-4 text-green-300 group-hover:text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                )}
            </div>

            <div className="pt-4 border-t border-gray-700 text-center">
                <p className="text-xs text-gray-500">
                    Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
            </div>
        </div>
    );
};

export default UserProfileCard;
