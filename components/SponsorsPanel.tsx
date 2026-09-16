import React, { useState, useEffect } from 'react';
import { ExternalLink, Heart } from 'lucide-react';

const TIERS = [
    { label: '$4.99', sublabel: '/mo', url: 'https://whop.com/checkout/plan_Egg3uCzdqrT8U', recurring: true },
    { label: '$20', sublabel: '/mo', url: 'https://whop.com/checkout/plan_C2iCkiR1sIGCU', recurring: true },
    { label: '$50', sublabel: 'one-time', url: 'https://whop.com/checkout/plan_KUwN9p7hIr5CA', recurring: false },
    { label: '$100', sublabel: 'one-time', url: 'https://whop.com/checkout/plan_7uLfNjSaMnVN1', recurring: false },
    { label: '$250', sublabel: 'one-time', url: 'https://whop.com/checkout/plan_2NhefU1RYa1oE', recurring: false },
];

const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/rjarivi';

interface Sponsor {
    handle: string;
    name: string;
    avatar: string;
    twitterUrl?: string;
}

const getInitialsAvatar = (name: string) => {
    const initials = (name || 'SP').trim().slice(0, 2).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
        <rect width="64" height="64" rx="32" fill="#27272a"/>
        <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#e4e4e7" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700">${initials}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const SPONSORS: Sponsor[] = [
    {
        handle: 'rjarivi',
        name: 'RJ',
        avatar: getInitialsAvatar('RJ'),
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
                {visible.map(sponsor => {
                    const hasLink = !!sponsor.twitterUrl;
                    if (hasLink) {
                        return (
                            <a
                                key={sponsor.handle}
                                href={sponsor.twitterUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800/60 hover:border-indigo-500/40 hover:bg-zinc-800/80 transition-all group"
                            >
                                <img
                                    src={sponsor.avatar || getInitialsAvatar(sponsor.name)}
                                    alt={sponsor.name}
                                    className="w-7 h-7 rounded-full object-cover ring-1 ring-zinc-700 group-hover:ring-indigo-500/50 transition-all shrink-0"
                                    onError={e => {
                                        const target = e.currentTarget as HTMLImageElement;
                                        target.onerror = null;
                                        target.src = getInitialsAvatar(sponsor.name);
                                    }}
                                />
                                <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors truncate flex-1">
                                    {sponsor.name}
                                </span>
                                <ExternalLink size={11} className="text-zinc-600 group-hover:text-indigo-400 shrink-0 transition-colors" />
                            </a>
                        );
                    }
                    return (
                        <div
                            key={sponsor.handle}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800/60 transition-all"
                        >
                            <img
                                src={sponsor.avatar || getInitialsAvatar(sponsor.name)}
                                alt={sponsor.name}
                                className="w-7 h-7 rounded-full object-cover ring-1 ring-zinc-700 transition-all shrink-0"
                                onError={e => {
                                    const target = e.currentTarget as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = getInitialsAvatar(sponsor.name);
                                }}
                            />
                            <span className="text-xs font-semibold text-zinc-300 transition-colors truncate flex-1">
                                {sponsor.name}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Placeholder slots when fewer than VISIBLE_COUNT sponsors */}
            {SPONSORS.length < VISIBLE_COUNT && Array.from({ length: VISIBLE_COUNT - SPONSORS.length }).map((_, i) => (
                <a
                    key={`empty-${i}`}
                    href={GITHUB_SPONSORS_URL}
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
                    href={GITHUB_SPONSORS_URL}
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
                    {/* GitHub Sponsors tile */}
                    <a
                        href={GITHUB_SPONSORS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Sponsor on GitHub"
                        className="flex flex-col items-center justify-center py-1.5 rounded-lg bg-zinc-800/60 hover:bg-rose-500/15 border border-zinc-700/60 hover:border-rose-500/40 transition-all group"
                    >
                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-300 transition-colors" fill="currentColor" aria-hidden="true">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                        <span className="text-[8px] text-zinc-500 group-hover:text-rose-400/70 mt-0.5 leading-none">GitHub</span>
                    </a>
                </div>
            </div>
        </div>
    );
};
