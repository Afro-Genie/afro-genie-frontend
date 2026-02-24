import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RegistrationForm from '../components/community/RegistrationForm';
import UserProfileCard from '../components/community/UserProfileCard';
import ForumSection from '../components/community/ForumSection';
import TopicList from '../components/community/TopicList';
import CreateTopicForm from '../components/community/CreateTopicForm';
import UserGroupIcon from '../components/icons/UserGroupIcon';

const CommunityPage: React.FC = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const categoryId = searchParams.get('category');
    const [view, setView] = useState<'forums' | 'topics' | 'create'>('forums');

    useEffect(() => {
        // If category is selected, show topics view
        if (categoryId) {
            setView('topics');
        } else if (location.pathname.includes('/create') || location.hash.includes('/create')) {
            setView('create');
        } else {
            setView('forums');
        }
    }, [categoryId, location]);

    return (
        <div className="max-w-7xl mx-auto animate-fade-in space-y-12 px-4 py-8">
            <div className="text-center p-6 sm:p-8 bg-gray-800/50 rounded-xl border border-gray-700">
                <UserGroupIcon className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-amber-400 mb-4" />
                <h1 className="text-2xl sm:text-4xl font-bold text-gray-100">Welcome to the Afro Genie Community</h1>
                <p className="mt-4 text-base sm:text-lg text-gray-400 max-w-3xl mx-auto">
                    This is where the magic happens. Join fellow music lovers, artists, and cultural experts to share, discuss, and refine the stories behind the songs.
                </p>
            </div>
            
            {view === 'create' ? (
                <div className="max-w-3xl mx-auto">
                    <CreateTopicForm />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2">
                        {view === 'forums' ? (
                            <ForumSection />
                        ) : (
                            <TopicList categoryId={categoryId || undefined} />
                        )}
                    </div>
                    <div className="lg:col-span-1">
                        {user ? <UserProfileCard /> : <RegistrationForm />}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunityPage;