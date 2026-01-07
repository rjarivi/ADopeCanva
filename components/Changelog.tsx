import React from 'react';
import { Sparkles, Bug, Zap, Layers, Lock, Rocket, GitBranch } from 'lucide-react';

interface ChangeEntry {
    version: string;
    date: string;
    items: {
        icon: React.ElementType;
        title: string;
        description: string;
        type: 'feature' | 'fix' | 'update' | 'security';
    }[];
}

const CHANGES: ChangeEntry[] = [
    {
        version: '1.2.0',
        date: 'Jan 07, 2026',
        items: [
            {
                icon: Rocket,
                title: 'Studio Guard',
                description: 'Locked the advanced Studio features behind a "Coming Soon" splash page for later release.',
                type: 'update'
            },
            {
                icon: Sparkles,
                title: 'Image Editor Fix & Launch',
                description: 'The basic Image Editor is now LIVE with visibility fixes confirmed.',
                type: 'feature'
            },
            {
                icon: Bug,
                title: 'Image Editor Visibility Fix',
                description: 'Resolved a critical bug where uploaded images were not rendering on the canvas when filters were disabled.',
                type: 'fix'
            },
            {
                icon: Sparkles,
                title: 'Global Header Refresh',
                description: 'Updated all 20+ tool headers with the "Unbounded" font and consistent Lucide icons.',
                type: 'update'
            },
            {
                icon: GitBranch,
                title: 'Infrastructure Cleanup',
                description: 'Resolved repository sync issues and sanitized local environment configuration.',
                type: 'update'
            }
        ]
    },
    {
        version: '1.1.0',
        date: 'Jan 05, 2024',
        items: [
            {
                icon: Layers,
                title: 'Feature Roadmap Board',
                description: 'Launched a community board to request and vote on new features for Omniedit.',
                type: 'feature'
            },
            {
                icon: Zap,
                title: 'Audio Trimmer Tool',
                description: 'Added a powerful new audio trimming tool with waveform visualization.',
                type: 'feature'
            },
            {
                icon: Lock,
                title: 'Security Enhancements',
                description: 'Implemented Content Security Policies for Google AdSense and Analytics integration.',
                type: 'security'
            }
        ]
    }
];

export const Changelog = () => {
    return (
        <div className="space-y-8 animate-fade-in h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between shrink-0 mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                        <Rocket className="text-indigo-400" size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white tracking-tight font-unbounded">
                            What's New
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Latest Updates & Fixes</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full border border-zinc-700/50 uppercase tracking-widest">
                        v{CHANGES[0].version}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 -mr-4 custom-scrollbar space-y-12 py-4">
                {CHANGES.map((release, idx) => (
                    <div key={release.version} className="relative pl-8 border-l-2 border-zinc-800/50 ml-2">
                        {/* Dot on timeline */}
                        <div className="absolute left-[-9px] top-1.5 w-4 h-4 rounded-full bg-zinc-900 border-2 border-indigo-500/50 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <h4 className="text-xl font-black text-white leading-none font-unbounded">v{release.version}</h4>
                            <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent mx-2 opacity-50" />
                            <span className="text-[10px] font-bold text-zinc-500 px-3 py-1 bg-zinc-900/50 rounded-full border border-zinc-800 uppercase tracking-wider">
                                {release.date}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {release.items.map((item, i) => (
                                <div key={i} className={`bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 hover:border-indigo-500/30 transition-all duration-300 group hover:bg-zinc-800/40 ${i === release.items.length - 1 && release.items.length % 2 !== 0 ? 'lg:col-span-2' : ''}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl shrink-0 transition-transform group-hover:scale-110 duration-300 ${item.type === 'feature' ? 'bg-indigo-500/10 text-indigo-400' :
                                            item.type === 'fix' ? 'bg-emerald-500/10 text-emerald-400' :
                                                item.type === 'security' ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-zinc-800/50 text-zinc-400'
                                            }`}>
                                            <item.icon size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-sm font-bold text-zinc-200 mb-1 group-hover:text-white transition-colors truncate">
                                                {item.title}
                                            </h5>
                                            <p className="text-[13px] text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {idx !== CHANGES.length - 1 && <div className="mt-10" />}
                    </div>
                ))}
            </div>
        </div>
    );
};
