
import React from 'react';

const TranslateIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 5h12M9 3v2m4 13-4-4m0 0-4 4m4-4v12m6.707-15.707a1 1 0 0 1 0 1.414L15.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L14 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L12.586 10 8.293 5.707a1 1 0 0 1 1.414-1.414L14 8.586l4.293-4.293a1 1 0 0 1 1.414 0z"
    />
  </svg>
);

export default TranslateIcon;
