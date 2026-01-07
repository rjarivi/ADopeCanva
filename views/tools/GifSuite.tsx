import React, { useState } from 'react';
import { Layers, Edit3, Minimize2, Image as ImageIcon, Video, Scissors, Film, RefreshCcw, LayoutGrid, ChevronRight } from 'lucide-react';
import { VideoToGif } from './VideoToGif';
import { GifMaker } from './GifMaker';
import { GifEditor } from './GifEditor';
import { GifCompressor } from './GifCompressor';

type SuiteMode = 'video-to-gif' | 'images-to-gif' | 'editor' | 'compressor';

export const GifSuite: React.FC = () => {
    const [activeMode, setActiveMode] = useState<SuiteMode>('video-to-gif');

    const renderContent = () => {
        switch (activeMode) {
            case 'video-to-gif': return <VideoToGif />;
            case 'images-to-gif': return <GifMaker />;
            case 'editor': return <GifEditor />;
            case 'compressor': return <GifCompressor />;
            default: return <VideoToGif />;
        }
    };

    const navItems = [
        { id: 'video-to-gif', label: 'Video to GIF', icon: Video, desc: 'Convert video clips' },
        { id: 'images-to-gif', label: 'Images to GIF', icon: ImageIcon, desc: 'Stitch photos together' },
        { id: 'editor', label: 'GIF Editor', icon: Edit3, desc: 'Trim, crop, & add text' },
        { id: 'compressor', label: 'Compressor', icon: Minimize2, desc: 'Reduce file size' },
    ] as const;

    return (
        <div className="max-w-[1800px] mx-auto p-6 lg:p-8 animate-fade-in pb-20">
            <div className="flex flex-col lg:flex-row gap-8 min-h-[80vh]">

                {/* Sidebar Navigation */}
                <div className="w-full lg:w-72 flex-shrink-0 space-y-8">
                    <div className="px-2">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2 font-unbounded">
                            <LayoutGrid className="text-pink-500" /> GIF Studio
                        </h2>
                        <p className="text-zinc-500 text-sm">Professional GIF toolkit</p>
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider px-3 mb-2">Create</div>
                        {navItems.slice(0, 2).map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveMode(item.id as SuiteMode)}
                                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all group relative overflow-hidden ${activeMode === item.id
                                    ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700/50'
                                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeMode === item.id ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-pink-500'
                                    }`}>
                                    <item.icon size={16} />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">{item.label}</div>
                                    <div className="text-[10px] text-zinc-500 opacity-80">{item.desc}</div>
                                </div>
                                {activeMode === item.id && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <ChevronRight size={14} className="text-zinc-500" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider px-3 mb-2">Tools</div>
                        {navItems.slice(2).map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveMode(item.id as SuiteMode)}
                                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all group relative overflow-hidden ${activeMode === item.id
                                    ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700/50'
                                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeMode === item.id ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-purple-500'
                                    }`}>
                                    <item.icon size={16} />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">{item.label}</div>
                                    <div className="text-[10px] text-zinc-500 opacity-80">{item.desc}</div>
                                </div>
                                {activeMode === item.id && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <ChevronRight size={14} className="text-zinc-500" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-zinc-950/50 rounded-3xl border border-zinc-900 p-1 min-h-[600px] relative">
                    {/* Dynamic Header for Context */}
                    <div className="absolute -top-10 left-0 lg:left-4 flex items-center gap-2 text-sm text-zinc-500">
                        <span>GIF Studio</span>
                        <ChevronRight size={12} />
                        <span className="text-zinc-200">{navItems.find(i => i.id === activeMode)?.label}</span>
                    </div>

                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
