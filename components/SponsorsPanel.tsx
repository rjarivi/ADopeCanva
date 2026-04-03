import React, { useState, useEffect } from 'react';
import { ExternalLink, Heart } from 'lucide-react';

const TIERS = [
    { label: '$4.99', sublabel: '/mo', url: 'https://whop.com/checkout/plan_Egg3uCzdqrT8U', recurring: true },
    { label: '$20', sublabel: '/mo', url: 'https://whop.com/checkout/plan_C2iCkiR1sIGCU', recurring: true },
    { label: '$50', sublabel: 'one-time', url: 'https://whop.com/checkout/plan_KUwN9p7hIr5CA', recurring: false },
    { label: '$100', sublabel: 'one-time', url: 'https://whop.com/checkout/plan_7uLfNjSaMnVN1', recurring: false },
    { label: '$250', sublabel: 'one-time', url: 'https://whop.com/checkout/plan_2NhefU1RYa1oE', recurring: false },
];

const WHOP_URL = 'https://whop.com/checkout/plan_Egg3uCzdqrT8U';

interface Sponsor {
    handle: string;
    name: string;
    avatar: string;
    twitterUrl: string;
}

const SPONSORS: Sponsor[] = [
    {
        handle: 'rjarivi',
        name: 'rjarivi',
        avatar: 'https://pbs.twimg.com/profile_images/2038989459069468672/YTcP3YlU_400x400.jpg',
        twitterUrl: 'https://x.com/rjarivi',
    },
];

const VISIBLE_COUNT = 5;
const ROTATE_INTERVAL = 3500;

export const SponsorsPanel: React.FC = () => {
    const [offset, setOffset] = useState(0);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        if (SPONSORS.length <= VISIBLE_COUNT) return;
        const timer = setInterval(() => {
            setFading(true);
            setTimeout(() => {
                setOffset(prev => (prev + 1) % SPONSORS.length);
                setFading(false);
            }, 350);
        }, ROTATE_INTERVAL);
        return () => clearInterval(timer);
    }, []);

    const visible: Sponsor[] = [];
    for (let i = 0; i < Math.min(VISIBLE_COUNT, SPONSORS.length); i++) {
        visible.push(SPONSORS[(offset + i) % SPONSORS.length]);
    }

    return (
        <div className="flex flex-col gap-4 w-44 shrink-0">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Heart size={13} className="text-rose-400 fill-rose-400" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Sponsors</span>
            </div>

            {/* Sponsor list */}
            <div
                className="flex flex-col gap-2 transition-opacity duration-300"
                style={{ opacity: fading ? 0 : 1 }}
            >
                {visible.map(sponsor => (
                    <a
                        key={sponsor.handle}
                        href={sponsor.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800/60 hover:border-indigo-500/40 hover:bg-zinc-800/80 transition-all group"
                    >
                        <img
                            src={sponsor.avatar}
                            alt={sponsor.name}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-zinc-700 group-hover:ring-indigo-500/50 transition-all shrink-0"
                            crossOrigin="anonymous"
                            onError={e => {
                                (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sponsor.name)}&background=3f3f46&color=fff&size=64`;
                            }}
                        />
                        <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors truncate flex-1">
                            {sponsor.name}
                        </span>
                        <ExternalLink size={11} className="text-zinc-600 group-hover:text-indigo-400 shrink-0 transition-colors" />
                    </a>
                ))}
            </div>

            {/* Placeholder slots when fewer than VISIBLE_COUNT sponsors */}
            {SPONSORS.length < VISIBLE_COUNT && Array.from({ length: VISIBLE_COUNT - SPONSORS.length }).map((_, i) => (
                <a
                    key={`empty-${i}`}
                    href={WHOP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl border border-dashed border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-900/60 transition-all group"
                >
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                        <span className="text-zinc-600 group-hover:text-indigo-400 text-xs transition-colors">+</span>
                    </div>
                    <span className="text-xs text-zinc-600 group-hover:text-indigo-400 transition-colors">Your name here</span>
                </a>
            ))}

            {/* CTA card */}
            <div className="rounded-xl p-3 border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-indigo-500/5">
                <p className="text-[11px] text-zinc-400 mb-2.5">
                    Keep AdopeCanva <span className="text-white font-semibold">free forever</span>
                </p>
                <a
                    href={WHOP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 hover:border-rose-500/50 text-rose-300 text-xs font-bold transition-all whitespace-nowrap mb-2.5"
                >
                    <Heart size={10} className="fill-rose-400 text-rose-400 shrink-0" />
                    Become a Sponsor
                </a>

                {/* Tier grid */}
                <div className="grid grid-cols-3 gap-1">
                    {TIERS.map(tier => (
                        <a
                            key={tier.url}
                            href={tier.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center py-1.5 rounded-lg bg-zinc-800/60 hover:bg-rose-500/15 border border-zinc-700/60 hover:border-rose-500/40 transition-all group"
                        >
                            <span className="text-[10px] font-bold text-zinc-300 group-hover:text-rose-300 leading-none">{tier.label}</span>
                            <span className="text-[8px] text-zinc-500 group-hover:text-rose-400/70 mt-0.5 leading-none">{tier.sublabel}</span>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};
