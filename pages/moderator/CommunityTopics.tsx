import React from 'react';
import { Link } from 'react-router-dom';

const CommunityTopics: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Community Topics Moderation</h1>
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400 mb-4">
          Topic pin, lock, and delete actions are available directly on the community pages.
        </p>
        <Link
          to="/community"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
        >
          Go to Community
        </Link>
      </div>
    </div>
  );
};

export default CommunityTopics;
