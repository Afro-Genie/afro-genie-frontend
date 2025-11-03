import React from 'react';

const RobotIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5v3.75c0 .621.504 1.125 1.125 1.125h5.25c.621 0 1.125-.504 1.125-1.125V7.5m0 0h-7.5m0 0H6.375c-.621 0-1.125.504-1.125 1.125v9.75c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V8.625c0-.621-.504-1.125-1.125-1.125H15.75" 
    />
  </svg>
);

export default RobotIcon;
