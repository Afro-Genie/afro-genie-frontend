import React from 'react';

const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect y="4" width="24" height="3" rx="1.5" fill="currentColor"/>
    <rect y="11" width="18" height="3" rx="1.5" fill="currentColor"/>
    <rect y="18" width="12" height="3" rx="1.5" fill="currentColor"/>
  </svg>
);

export default LogoIcon;