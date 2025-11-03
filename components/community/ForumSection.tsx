import React from 'react';
import BookOpenIcon from '../icons/BookOpenIcon';
import ChatBubbleIcon from '../icons/ChatBubbleIcon';
import TranslateIcon from '../icons/TranslateIcon';
import UserGroupIcon from '../icons/UserGroupIcon';

const MOCK_FORUMS = [
    {
        title: "Lyric Discussions & Interpretations",
        description: "Dive deep into the meaning of your favorite songs. Share your thoughts and theories.",
        latestPost: {
            title: "Unpacking the dual meanings in 'Ye' by Burna Boy",
            author: "AfroBeatFanatic",
        },
        posts: 124,
        icon: ChatBubbleIcon,
    },
    {
        title: "Translation Reviews (Community Moderation)",
        description: "Help refine AI translations. Vote on suggestions and become a trusted moderator.",
        latestPost: {
            title: "Correction suggestion for Tiwa Savage's 'Koroba'",
            author: "YorubaGuru",
        },
        posts: 357,
        icon: TranslateIcon,
    },
    {
        title: "Cultural Context Deep Dives",
        description: "Explore the stories behind the slang, the history in the rhythm, and the culture in the lyrics.",
        latestPost: {
            title: "The influence of Fela Kuti on modern protest music",
            author: "CultureVulture",
        },
        posts: 89,
        icon: BookOpenIcon,
    },
    {
        title: "New Music Discovery",
        description: "Share and discover new tracks and artists from across the continent.",
        latestPost: {
            title: "Have you heard the new Amapiano track from Focalistic?",
            author: "DJTunez",
        },
        posts: 543,
        icon: UserGroupIcon,
    },
];


const ForumSection: React.FC = () => {
    return (
        <div className="bg-gray-800/50 p-6 md:p-8 rounded-xl border border-gray-700">
            <h2 className="text-3xl font-bold text-gray-100 mb-6">Community Forums</h2>
            <div className="space-y-4">
                {MOCK_FORUMS.map((forum, index) => (
                    <div key={index} className="bg-gray-800 hover:bg-gray-700/80 transition-colors duration-200 p-4 rounded-lg border border-gray-700 flex items-start space-x-4">
                        <div className="flex-shrink-0">
                            <forum.icon className="h-8 w-8 text-amber-400 mt-1" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-200">{forum.title}</h3>
                            <p className="text-sm text-gray-400 mt-1">{forum.description}</p>
                            <div className="text-xs text-gray-500 mt-2">
                                <span>Latest: "{forum.latestPost.title}" by <strong>{forum.latestPost.author}</strong></span>
                            </div>
                        </div>
                         <div className="text-right flex-shrink-0">
                            <div className="font-semibold text-gray-300">{forum.posts}</div>
                            <div className="text-sm text-gray-500">Posts</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ForumSection;
