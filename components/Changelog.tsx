import React from 'react';
import { Sparkles, Bug, Zap, Layers, Lock, Rocket, GitBranch, Music, GitCompare, Palette, FileDown, Type, Scissors } from 'lucide-react';

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
        version: '1.8.0',
        date: 'Jul 23, 2026',
        items: [
            {
                icon: Scissors,
                title: 'Image Splitter',
                description: 'New IMAGE tool: split any wide or tall image into perfectly-sized slices for seamless Instagram carousels and stories. Includes presets for 1080×1350 portrait carousel, 1080×1080 square, and 1080×1920 story. Features a live split-line overlay, individual PNG downloads, and bulk ZIP export — all client-side.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.7.0',
        date: 'Apr 12, 2026',
        items: [
            {
                icon: GitCompare,
                title: 'Text Compare Tool',
                description: 'New TEXT tool: paste two versions of any text and get a side-by-side LCS diff with colour-coded added (green) and removed (red) lines plus an added/removed/unchanged summary.',
                type: 'feature'
            },
            {
                icon: Palette,
                title: 'Gradient Creator',
                description: 'New IMAGE tool: design linear, radial, and conic gradients with unlimited colour stops, angle control, 8 one-click presets, and export at any resolution as PNG or JPEG.',
                type: 'feature'
            },
            {
                icon: FileDown,
                title: 'File to Markdown',
                description: 'New DOCS tool: convert PDFs, DOCX, CSV, JSON, YAML, XML, HTML, and plain text to clean Markdown — fully in-browser using PDF.js, Mammoth, and PapaParse.',
                type: 'feature'
            },
            {
                icon: Type,
                title: 'Font Previewer',
                description: 'New DEV tool: browse 100+ curated Google Fonts with your own preview text. Click any font for a full weight showcase, alphabet sample, heading/body mockup, and copy-ready CSS snippet.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.6.0',
        date: 'Mar 14, 2026',
        items: [
            {
                icon: Sparkles,
                title: 'HTML to Image',
                description: 'New DEV tool: write HTML & CSS in a live code editor, preview the result in real-time, and export as PNG, JPEG, or WebP at up to 3× resolution — all in-browser with html2canvas.',
                type: 'feature'
            },
            {
                icon: Zap,
                title: 'UI/UX Consistency Pass',
                description: 'Comprehensive brand and interaction polish across 35+ tools: unified indigo-500 accent, consistent focus rings, indigo hover states on interactive cards, redesigned QR Generator, improved select element styling.',
                type: 'update'
            }
        ]
    },
    {
        version: '1.5.2',
        date: 'Mar 14, 2026',
        items: [
            {
                icon: GitBranch,
                title: 'Batch HTML Studio',
                description: 'Complete overhaul of the HTML to Image tool into a two-step studio workflow. Added multi-file queue management, isolated Iframe rendering, and bulk ZIP export.',
                type: 'update'
            },
            {
                icon: Zap,
                title: 'Signature Engine Fix',
                description: 'Resolved a critical "Protocol Error" in the WASM processing engine. Improved encoding stability for transparent GIFs and simplified the export UI.',
                type: 'fix'
            },
            {
                icon: Sparkles,
                title: 'UI Stability Prep',
                description: 'Refined split-button layouts and added proactive error recovery for browser-based media tools.',
                type: 'update'
            }
        ]
    },
    {
        version: '1.5.1',
        date: 'Mar 14, 2026',
        items: [
            {
                icon: GitBranch,
                title: 'HTML to Image',
                description: 'New design tool: Convert HTML and CSS snippets into high-quality PNG, JPG, or WebP images with custom resolution and retina scaling.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.5.0',
        date: 'Mar 13, 2026',
        items: [
            {
                icon: Sparkles,
                title: 'SVG Code to SVG',
                description: 'New DEV tool: paste raw SVG markup, preview it live with dark/light/transparent backgrounds, validate in real-time, and download a clean .svg file.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.4.0',
        date: 'Feb 19, 2026',
        items: [
            {
                icon: Rocket,
                title: 'Product Hunt Launch',
                description: 'We are officially LIVE on Product Hunt! Check out our new featured badge on the site and support our community launch.',
                type: 'feature'
            },
            {
                icon: Layers,
                title: 'Markdown Creator Launch',
                description: 'A revolutionary text-based UI design tool using Unicode/ASCII characters for AI prompt engineering and mockups.',
                type: 'feature'
            },
            {
                icon: Zap,
                title: 'AI Magic Build & Sync',
                description: 'Integrated Gemini 2.0 Flash for instant UI generation from text prompts, with integrated template chips and persistent API settings.',
                type: 'feature'
            },
            {
                icon: Sparkles,
                title: 'Workspace & UX Polish',
                description: 'Optimized layout for high-density viewports, added Pro Mode history (Undo/Redo), and refined keyboard shortcuts.',
                type: 'update'
            },
            {
                icon: Layers,
                title: 'Text Utilities Improvements',
                description: 'Refined sentence parsing algorithm with SBD rules and added a visual sentence merging UI in the Text Utilities tool.',
                type: 'feature'
            },
            {
                icon: Zap,
                title: 'Image to ICO Converter',
                description: 'Added a new client-side tool to convert any image into multi-resolution .ico files with ZIP download support.',
                type: 'feature'
            }
        ]
    },
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
            <div className="flex items-center justify-end shrink-0">
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
