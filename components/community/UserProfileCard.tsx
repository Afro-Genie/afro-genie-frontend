import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserIcon from '../icons/UserIcon';
import PremiumBadge from '../PremiumBadge';
import UserBadges from './UserBadges';
import { tokenApi, type UserProfile, getBadgeDisplay } from '../../services/tokenService';

const UserProfileCard: React.FC = () => {
    const { user, isAdmin, isSpotifyPremium } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (!user?.id) return;
        tokenApi.getProfile(user.id)
            .then(setProfile)
            .catch(() => {});
    }, [user?.id]);

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
                        Administrator
                    </span>
                )}
                {isSpotifyPremium && user.spotifyId && (
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

            {/* Token Balance & Badges */}
            {profile && (
                <div className="pt-4 border-t border-gray-700 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Tokens</span>
                        <Link
                            to="/tokens"
                            className="flex items-center gap-1.5 text-amber-400 font-bold hover:text-amber-300 transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                            </svg>
                            {profile.tokenBalance}
                        </Link>
                    </div>

                    {profile.badges.length > 0 && (
                        <div>
                            <p className="text-sm text-gray-400 mb-2">Badges</p>
                            <UserBadges badges={profile.badges} />
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-3 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Quick Actions</h3>

                <Link
                    to="/community"
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

                <Link
                    to="/leaderboard"
                    className="flex items-center justify-between w-full p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors group"
                >
                    <span className="flex items-center text-gray-300 group-hover:text-white">
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                        </svg>
                        Leaderboard
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
                    {profile
                        ? `Member since ${new Date(profile.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                        : `Member since ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                    }
                </p>
            </div>
        </div>
    );
};

export default UserProfileCard;
