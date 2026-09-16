import React, { useState } from 'react';

interface BeforeAfterProps {
    before: string;
    after: string;
    alt: string;
}

export const BeforeAfter: React.FC<BeforeAfterProps> = ({ before, after, alt }) => {
    const [sliderPos, setSliderPos] = useState(50);
    const [imgError, setImgError] = useState(false);

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        const container = e.currentTarget.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const relativeX = x - container.left;
        const position = Math.max(0, Math.min(100, (relativeX / container.width) * 100));
        setSliderPos(position);
    };

    if (imgError || !before || !after) {
        return null;
    }

    return (
        <div
            className="relative aspect-video rounded-3xl overflow-hidden cursor-ew-resize select-none border border-zinc-800 shadow-2xl"
            onMouseMove={handleMove}
            onTouchMove={handleMove}
        >
            {/* Background Image (After) */}
            <img
                src={after}
                alt={`${alt} - After`}
                onError={() => setImgError(true)}
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Foreground Image (Before) */}
            <div
                className="absolute inset-0 w-full h-full"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
                <img
                    src={before}
                    alt={`${alt} - Before`}
                    onError={() => setImgError(true)}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            </div>

            {/* Slider Line */}
            <div
                className="absolute inset-y-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center"
                style={{ left: `${sliderPos}%` }}
            >
                <div className="w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center -translate-x-1/2">
                    <div className="flex gap-0.5">
                        <div className="w-0.5 h-3 bg-zinc-400 rounded-full" />
                        <div className="w-0.5 h-3 bg-zinc-400 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20 uppercase tracking-widest">
                Before
            </div>
            <div className="absolute top-4 right-4 bg-indigo-500/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20 uppercase tracking-widest text-right">
                After
            </div>
        </div>
    );
};
