import React from 'react';

const GlobeIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.55 12a14.2 14.2 0 0116.9 0" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.25c-2.42 2.8-4.28 6.55-4.28 10.5 0 2.25 1.9 4.25 4.28 4.25s4.28-2 4.28-4.25c0-3.95-1.86-7.7-4.28-10.5z" />
  </svg>
);

export default GlobeIcon;