import React from 'react';
import RegistrationForm from '../components/community/RegistrationForm';
import ForumSection from '../components/community/ForumSection';
import UserGroupIcon from '../components/icons/UserGroupIcon';

const CommunityPage: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto animate-fade-in space-y-12">
            <div className="text-center p-8 bg-gray-800/50 rounded-xl border border-gray-700">
                <UserGroupIcon className="h-16 w-16 mx-auto text-amber-400 mb-4" />
                <h1 className="text-4xl font-bold text-gray-100">Welcome to the Afro Genie Community</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto">
                    This is where the magic happens. Join fellow music lovers, artists, and cultural experts to share, discuss, and refine the stories behind the songs.
                </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                    <ForumSection />
                </div>
                <div className="lg:col-span-1">
                    <RegistrationForm />
                </div>
            </div>
        </div>
    );
};

export default CommunityPage;