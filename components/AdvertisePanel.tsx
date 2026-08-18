import React from 'react';
import { Megaphone } from 'lucide-react';

const AD_DIMENSIONS = '160 × 80 px';

const LIVE_ADS = [
    { src: '/xpurge.pro.png', alt: 'XPurge.pro', href: 'https://xpurge.pro' },
    { src: '/ScreenRecord.ing.png', alt: 'Screenrecord.ing', href: 'https://screenrecord.ing' },
    { src: '/Vibefolios.png', alt: 'Vibefolios.com', href: 'https://vibefolios.com' },
];

const PLACEHOLDER_COUNT = 2;

export const AdvertisePanel: React.FC = () => {
    return (
        <div className="flex flex-col gap-4 w-44 shrink-0">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Megaphone size={13} className="text-zinc-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Advertise</span>
            </div>

            <div className="flex flex-col gap-2">
                {/* Live banner ads */}
                {LIVE_ADS.map(ad => (
                    <a
                        key={ad.href}
                        href={ad.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-20 w-full rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all group"
                    >
                        <img
                            src={ad.src}
                            alt={ad.alt}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    </a>
                ))}

                {/* Placeholder slots */}
                {Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
                    <a
                        key={i}
                        href="https://x.com/rjarivi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-20 w-full rounded-xl border border-dashed border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 hover:bg-zinc-900/80 flex flex-col items-center justify-center gap-1 transition-all group"
                    >
                        <span className="text-[10px] text-zinc-600 group-hover:text-zinc-300 font-semibold transition-colors">
                            Your Ad Here
                        </span>
                        <span className="text-[9px] text-zinc-700 group-hover:text-zinc-500 font-mono transition-colors">
                            {AD_DIMENSIONS}
                        </span>
                    </a>
                ))}
            </div>

            {/* CTA */}
            <div className="rounded-xl p-3 border border-zinc-800/60 bg-zinc-900/40">
                <p className="text-[10px] text-zinc-500 leading-relaxed mb-2">
                    Reach <span className="text-zinc-300 font-semibold">thousands of creators</span> who visit daily.
                </p>
                <a
                    href="https://x.com/rjarivi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 rounded-lg border border-zinc-700 hover:border-zinc-500 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold transition-all"
                >
                    <Megaphone size={9} />
                    Get in touch
                </a>
            </div>
        </div>
    );
};
