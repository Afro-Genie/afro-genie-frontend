import React from 'react';
import RobotIcon from './icons/RobotIcon';
import CheckBadgeIcon from './icons/CheckBadgeIcon';

const ConfidenceScore: React.FC = () => {
  return (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <RobotIcon className="h-6 w-6 text-amber-400" />
        <div>
          <h4 className="font-semibold text-gray-200">AI-Generated Analysis</h4>
          <p className="text-sm text-gray-400">AI-generated analysis. Please verify critical information.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-green-400">
        <CheckBadgeIcon className="h-5 w-5" />
        <span className="text-sm font-medium">Verified Model</span>
      </div>
    </div>
  );
};

export default ConfidenceScore;
