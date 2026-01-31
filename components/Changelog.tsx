import React from 'react';
import { Sparkles, Bug, Zap, Layers, Lock, Rocket, GitBranch, Music } from 'lucide-react';

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
        version: '1.3.0',
        date: 'Jan 31, 2026',
        items: [
            {
                icon: Zap,
                title: 'New Efficiency Tools',
                description: 'Launched 4 new power tools: Image Converter, Text Utilities, Code Formatter, and Signature Generator.',
                type: 'feature'
            },
            {
                icon: Sparkles,
                title: 'Design System Unification',
                description: 'Standardized the UI across all 20+ tools with a consistent "Unbounded" header style and modern aesthetic.',
                type: 'update'
            },
            {
                icon: Layers,
                title: 'PDF & Media Studio Polish',
                description: 'Refined the PDF Suite and Audio tools with cleaner layouts, invisible icon fixes, and better spacing.',
                type: 'fix'
            }
        ]
    },
    {
        version: '1.2.1',
        date: 'Jan 10, 2026',
        items: [
            {
                icon: Layers,
                title: 'Text Tool Power-Up',
                description: 'Added support for multi-line text (Enter key) and fixed a critical layer deletion bug when using backspace.',
                type: 'feature'
            },
            {
                icon: Music,
                title: 'Audio Precision Control',
                description: 'Introduced a new dual-handle slider for the Video/Audio Trimmer for frame-perfect loop selection.',
                type: 'feature'
            },
            {
                icon: Bug,
                title: 'Navigation & UI Polish',
                description: 'Fixed header tab syncing when navigating to tools and refined button layouts in the Sidebar.',
                type: 'fix'
            }
        ]
    },
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
        <div className="space-y-8 animate-fade-in flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Rocket className="text-indigo-400" size={20} />
                    What's New
                </h3>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700/50 uppercase tracking-widest">
                    Version History
                </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-10 min-h-[300px]">
                {CHANGES.map((release, idx) => (
                    <div key={release.version} className="relative pl-6 border-l border-zinc-800">
                        {/* Dot on timeleline */}
                        <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />

                        <div className="flex items-center gap-3 mb-6">
                            <h4 className="text-lg font-bold text-white leading-none">v{release.version}</h4>
                            <span className="text-xs font-medium text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded-full border border-zinc-800">
                                {release.date}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {release.items.map((item, i) => (
                                <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 hover:border-zinc-700 transition-colors group">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-xl shrink-0 ${item.type === 'feature' ? 'bg-indigo-500/10 text-indigo-400' :
                                            item.type === 'fix' ? 'bg-green-500/10 text-green-400' :
                                                item.type === 'security' ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-zinc-800 text-zinc-400'
                                            }`}>
                                            <item.icon size={18} />
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-bold text-zinc-200 mb-1 group-hover:text-white transition-colors">
                                                {item.title}
                                            </h5>
                                            <p className="text-xs text-zinc-500 leading-relaxed">
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
