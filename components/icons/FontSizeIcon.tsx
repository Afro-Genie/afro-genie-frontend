import React from 'react';

const FontSizeIcon: React.FC<{className?: string}> = ({ className }) => (
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
      d="M3 15s4.5-3 9-3 9 3 9 3m-9-3v6m0 0V9m0 6h.01M6 12h.01M18 12h.01"
    />
     <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 11h-2a2 2 0 00-2 2v2a2 2 0 002 2h2v-4z"
    />
  </svg>
);

export default FontSizeIcon;