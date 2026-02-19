import React from 'react';

export const MarkdownCreatorIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 7H9M4 12H9M4 17H7M12 7H20M12 12H20M12 17H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11 4V20" stroke="url(#paint0_linear_markdown)" strokeWidth="2.5" strokeLinecap="round" />
        <defs>
            <linearGradient id="paint0_linear_markdown" x1="11" y1="4" x2="11" y2="20" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" />
                <stop offset="1" stopColor="#A855F7" />
            </linearGradient>
        </defs>
    </svg>
);
