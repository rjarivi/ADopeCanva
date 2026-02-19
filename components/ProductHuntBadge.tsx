import React from 'react';

export const ProductHuntBadge = () => {
    return (
        <div className="fixed bottom-28 left-6 sm:bottom-10 sm:left-10 z-[60] transition-all duration-300 hover:scale-105 active:scale-95 group">
            <div className="absolute -inset-2 bg-indigo-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
            <a
                href="https://www.producthunt.com/products/a-dope-canva-omni-toolkit-locally?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-a-dope-canva-omni-toolkit-locally"
                target="_blank"
                rel="noopener noreferrer"
                className="relative block"
            >
                <img
                    src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1081467&theme=light&t=1771519722838"
                    alt="A Dope Canva - Omni Toolkit, Locally. - tools,converter,compressor,privacy,DesignTools,Productivity, | Product Hunt"
                    width="250"
                    height="54"
                    className="w-[140px] sm:w-[190px] h-auto drop-shadow-lg"
                />
            </a>
        </div>
    );
};
