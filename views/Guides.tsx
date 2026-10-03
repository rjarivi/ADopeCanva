import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOOLS } from './Dashboard';
import { ToolCategory } from '../types';
import { Search, BookOpen, ArrowRight, ExternalLink, Shield } from 'lucide-react';

import { updateHeadTags, SITE_URL, SITE_NAME } from '../utils/seoHelper';

export const Guides: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    React.useEffect(() => {
        const canonicalUrl = `${SITE_URL}/guides`;
        const title = 'Comprehensive How-To Guides & Tutorials for Online Creative & Developer Tools';
        const description = 'Explore step-by-step guides on video trimming, background removal, PDF redaction, audio conversion, and format optimization with 100% private in-browser tools.';

        updateHeadTags({
            title: `${title} | A Dope Canva`,
            description,
            canonicalUrl,
            keywords: ['how to edit video online', 'how to convert png to webp', 'how to redact pdf', 'in-browser tutorials', 'adopecanva guides'],
            schemas: [
                {
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    'name': title,
                    'description': description,
                    'url': canonicalUrl,
                    'publisher': { '@type': 'Organization', 'name': SITE_NAME, 'url': SITE_URL }
                },
                {
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    'itemListElement': [
                        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
                        { '@type': 'ListItem', 'position': 2, 'name': 'Guides', 'item': canonicalUrl }
                    ]
                }
            ]
        });
    }, []);

    // Filter tools that have guide content
    const guidedTools = TOOLS.filter(t => !t.comingSoon && t.guideTitle && t.guideContent);

    const filteredTools = guidedTools.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.guideTitle && t.guideTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.guideContent && t.guideContent.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in space-y-12">
            {/* Header Section */}
            <div className="text-center space-y-4 relative">
                {/* Decorative background glow */}
                <div 
                    className="absolute inset-0 -top-24 w-96 h-96 mx-auto rounded-full blur-[120px] pointer-events-none opacity-40" 
                    style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.3) 0%, transparent 75%)' }}
                />
                
                <h1 className="text-4xl md:text-5xl font-black tracking-tight font-unbounded text-white">
                    How-To Guides
                </h1>
                <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                    Learn how to edit videos, crop images, convert documents, and build format conversions directly in your browser.
                </p>

                {/* Search Bar */}
                <div className="max-w-md mx-auto relative mt-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search guides..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500/50 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Featured Cornerstone Guide */}
            {(!searchQuery || 'remove.bg background remover alternative'.includes(searchQuery.toLowerCase())) && (
                <div 
                    onClick={() => navigate('/remove-bg-alternative')}
                    className="relative overflow-hidden rounded-3xl p-7 md:p-8 bg-gradient-to-r from-indigo-950/50 via-zinc-900 to-zinc-900 border border-indigo-500/30 hover:border-indigo-500/60 cursor-pointer transition-all duration-300 group shadow-xl hover:-translate-y-0.5"
                >
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-2xl">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    Featured Industry Guide
                                </span>
                                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                                    <Shield size={13} /> 100% On-Device
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-white font-unbounded group-hover:text-indigo-200 transition-colors">
                                Best Free Remove.bg Alternative in 2026: Unlimited, In-Browser & Private
                            </h2>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                Why cloud background removers are obsolete—and how on-device neural WebAssembly isolates subjects with zero server uploads and full-resolution PNG exports.
                            </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 group-hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider font-unbounded transition-all shadow-lg shadow-indigo-600/30">
                            <span>Read Guide & Try Tool</span>
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>
            )}

            {/* Guides Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTools.map(tool => {
                    const Icon = tool.icon;
                    return (
                        <div 
                            key={tool.id} 
                            className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-6 flex flex-col justify-between hover:border-indigo-500/30 hover:bg-zinc-900/60 transition-all duration-300 group shadow-lg"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-zinc-800/80 rounded-2xl text-indigo-400 group-hover:scale-105 group-hover:bg-indigo-500/10 transition-all">
                                            <Icon size={20} />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800/60">
                                            {tool.category}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/${tool.id}`)}
                                        className="text-zinc-600 hover:text-zinc-300 transition-colors"
                                        title={`Open ${tool.title}`}
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                                        {tool.guideTitle || `How to use ${tool.title}`}
                                    </h2>
                                    <p className="text-sm text-zinc-400 leading-relaxed line-clamp-4">
                                        {tool.guideContent}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-zinc-800/40 mt-6 flex items-center justify-between">
                                <button
                                    onClick={() => navigate(`/${tool.id}`)}
                                    className="flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                                >
                                    Launch Tool
                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                                <span className="text-[10px] text-zinc-600 font-mono">
                                    /{tool.id}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {filteredTools.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-zinc-500">
                        <BookOpen size={40} className="text-zinc-700 mb-4" />
                        <p className="text-base font-semibold text-zinc-400">No guides found</p>
                        <p className="text-sm text-zinc-600 text-center max-w-xs mt-1">
                            Try searching for something else like "image" or "pdf".
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
