import React, { useState, useMemo } from 'react';
import { GENERATED_TOOLS } from '../utils/toolRegistry.generated';
import { ToolItem, ToolCategory } from '../types';
import {
    Search, Scissors, Music, Video, FileText, Code, Layers, Minimize2, Edit3, Crop, ArrowRightLeft, Film, ListMusic, Eraser, Type, RefreshCcw, FileVideo, FileSpreadsheet, Maximize2, PenTool, FileCode2, FileSearch, MonitorDown, Smartphone, AudioWaveform, EyeOff, GitCompare, Palette, FileDown, SplitSquareHorizontal, Pipette, FileAudio, Stamp
} from 'lucide-react';
import { Tooltip } from '../components/ui/Tooltip';

const CORE_TOOLS: ToolItem[] = []; // Fully migrated — see tools/<id>/manifest.json

/**
 * Full registry: hand-maintained core tools (legacy, being migrated) +
 * manifest-generated tools from tools/<id>/ (see scripts/build-registry.mjs).
 * New tools MUST go in tools/ — do not append here.
 */
export const TOOLS: ToolItem[] = [...CORE_TOOLS, ...GENERATED_TOOLS];

import { useNavigate } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

interface DashboardProps {
    activeCategory: string;
    setActiveCategory?: (category: string) => void;
}

const getCategoryStyles = (category: ToolCategory) => {
    switch (category) {
        case ToolCategory.VIDEO: return { icon: 'bg-pink-500/10 text-pink-500 group-hover:bg-pink-500/20', badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20' };
        case ToolCategory.IMAGE: return { icon: 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
        case ToolCategory.AUDIO: return { icon: 'bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20' };
        case ToolCategory.DOCS: return { icon: 'bg-red-500/10 text-red-500 group-hover:bg-red-500/20', badge: 'bg-red-500/10 text-red-400 border-red-500/20' };
        case ToolCategory.TEXT: return { icon: 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
        case ToolCategory.DEV: return { icon: 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
        default: return { icon: 'bg-yellow-500/10 text-yellow-500 group-hover:bg-yellow-500/20', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    }
};

export const Dashboard: React.FC<DashboardProps> = ({ activeCategory, setActiveCategory }) => {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Cmd+K / Ctrl+K keyboard shortcut for search focus
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }
            if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
                setSearchQuery('');
                searchInputRef.current?.blur();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const filteredTools = useMemo(() => {
        let tools = activeCategory === 'All'
            ? TOOLS
            : activeCategory === 'Media'
                ? TOOLS.filter(t => [ToolCategory.VIDEO, ToolCategory.AUDIO, ToolCategory.IMAGE].includes(t.category))
                : TOOLS.filter(t => t.category === activeCategory);

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            tools = tools.filter(t =>
                t.title.toLowerCase().includes(query) ||
                t.description.toLowerCase().includes(query)
            );
        }

        return [...tools].sort((a, b) => {
            if (a.comingSoon !== b.comingSoon) return (a.comingSoon ? 1 : 0) - (b.comingSoon ? 1 : 0);
            if (!searchQuery.trim() && a.popular !== b.popular) {
                return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
            }
            return 0;
        });
    }, [activeCategory, searchQuery]);

    const handleToolClick = (tool: ToolItem) => {
        if (tool.comingSoon) return;
        if (setActiveCategory) {
            setActiveCategory(tool.category);
        }
        navigate(`/${tool.id}`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Search Bar */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                    id="mobile-tool-search"
                    ref={searchInputRef}
                    type="text"
                    className="block w-full pl-10 pr-24 py-3 border border-zinc-800 rounded-xl leading-5 bg-zinc-900/50 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:bg-zinc-900 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 sm:text-sm transition-all"
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search tools"
                />
                <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3">
                    {searchQuery ? (
                        <button
                            onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                            className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
                            aria-label="Clear search"
                        >
                            <X size={14} />
                        </button>
                    ) : (
                        <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-zinc-600 bg-zinc-800/80 border border-zinc-700/50 rounded-md select-none">
                            ⌘K
                        </kbd>
                    )}
                </div>
            </div>

            {/* Result count */}
            {(searchQuery || activeCategory !== 'All') && filteredTools.length > 0 && (
                <div className="text-xs text-zinc-600 font-medium">
                    {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''}
                    {searchQuery && <span> matching "<span className="text-zinc-400">{searchQuery}</span>"</span>}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTools.map((tool) => {
                    const styles = getCategoryStyles(tool.category);
                    return (
                        <div
                            key={tool.id}
                            onClick={() => handleToolClick(tool)}
                            className={`group bg-zinc-900/80 border border-zinc-800/50 rounded-2xl transition-all duration-300 relative flex flex-col h-full ${
                                tool.comingSoon
                                    ? 'opacity-75 grayscale-[0.5] cursor-not-allowed'
                                    : 'cursor-pointer hover:bg-zinc-800/90 hover:-translate-y-0.5 hover:border-indigo-500/50 hover:shadow-[0_8px_32px_rgba(79,70,229,0.15)]'
                            }`}
                        >
                            {/* Background Glow Effect */}
                            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                                <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl transition-all duration-500 bg-indigo-500/5 group-hover:bg-indigo-500/15" />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 flex flex-col h-full p-6">
                                <div className="flex items-start justify-between mb-4">
                                    {isMobile ? (
                                        <div className={`p-3 rounded-2xl transition-colors ${styles.icon}`}>
                                            <tool.icon size={24} />
                                        </div>
                                    ) : (
                                        <Tooltip content={tool.category} position="right">
                                            <div className={`p-3 rounded-2xl transition-colors ${styles.icon}`}>
                                                <tool.icon size={24} />
                                            </div>
                                        </Tooltip>
                                    )}
                                    {tool.popular && (
                                        isMobile ? (
                                            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded-full border border-amber-500/20 font-medium">
                                                Popular
                                            </span>
                                        ) : (
                                            <Tooltip content="Trending among users">
                                                <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded-full border border-amber-500/20 font-medium">
                                                    Popular
                                                </span>
                                            </Tooltip>
                                        )
                                    )}
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-zinc-100 mb-2 group-hover:text-white transition-colors">
                                        {tool.title}
                                    </h3>
                                    <p className="text-sm text-zinc-400 group-hover:text-zinc-300 line-clamp-2">
                                        {tool.description}
                                    </p>
                                </div>

                                <div className="mt-6 flex items-center justify-between pt-3 border-t border-zinc-800/50">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${styles.badge}`}>
                                        {tool.category}
                                    </span>
                                    {tool.comingSoon ? (
                                        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] bg-zinc-800 px-2 py-1 rounded-md border border-zinc-700">Coming Soon</span>
                                    ) : (
                                        <span className="text-sm font-bold text-zinc-600 group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                                            Try now <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all inline-block">→</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredTools.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-zinc-500">
                        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 mb-4">
                            <Search size={24} className="text-zinc-600" />
                        </div>
                        <p className="text-base font-semibold text-zinc-400 mb-1">No tools found</p>
                        <p className="text-sm text-zinc-600 text-center max-w-xs">
                            No results for "<span className="text-zinc-500">{searchQuery}</span>" — try a different keyword
                        </p>
                        <button
                            onClick={() => setSearchQuery('')}
                            className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                        >
                            Clear search
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};