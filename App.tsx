import React, { useState } from 'react';
import {
    Command, Wand2, LayoutGrid,
    Video, Music, Image as ImageIcon, FileText, Code, Layers, X, Type
} from 'lucide-react';
import { Dashboard, TOOLS } from './views/Dashboard';
import { ToolItem, ToolCategory } from './types';
import { ProEditor } from './views/ProEditor';

const App = () => {
    const [activeTool, setActiveTool] = useState<ToolItem | null>(null);
    const [isProMode, setIsProMode] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [showBanner, setShowBanner] = useState(true);

    const categories = ['All', ...Object.values(ToolCategory)];

    // Handle back navigation
    const goHome = () => {
        setActiveTool(null);
    };

    const handleCategoryClick = (cat: string) => {
        setActiveCategory(cat);
        setActiveTool(null);
    };

    const handleHeroClick = () => {
        const bgRemoverTool = TOOLS.find(t => t.id === 'bg-remover');
        if (bgRemoverTool) {
            setActiveTool(bgRemoverTool);
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case ToolCategory.VIDEO: return Video;
            case ToolCategory.AUDIO: return Music;
            case ToolCategory.IMAGE: return ImageIcon;
            case ToolCategory.PDF: return FileText;
            case ToolCategory.TEXT: return Type;
            case ToolCategory.DEV: return Code;
            default: return Layers;
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-zinc-100 font-sans selection:bg-primary/30">

            {/* Header */}
            <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 md:px-8 bg-background/95 backdrop-blur-md z-40 shrink-0 gap-4">
                {/* Brand */}
                <div
                    className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
                    onClick={() => { goHome(); setIsProMode(false); }}
                >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105 shrink-0">
                        <Command className="text-white" size={20} />
                    </div>
                    <span className="text-3xl tracking-tight text-white hidden md:block" style={{ fontFamily: '"Jersey 10", sans-serif' }}>
                        ADopeCanva <span className={`font-sans font-normal text-zinc-400 text-xl transition-opacity ${isProMode ? 'opacity-100' : 'opacity-0 hidden'}`}>| Studio</span>
                    </span>
                </div>

                {/* Categories Tabs - Center */}
                {!isProMode ? (
                    <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
                        <nav className="flex items-center gap-1 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-x-auto no-scrollbar max-w-full">
                            {categories.map(cat => {
                                const Icon = getCategoryIcon(cat);
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => handleCategoryClick(cat)}
                                        className={`flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeCategory === cat
                                            ? 'bg-zinc-800 text-white shadow-sm'
                                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                                            }`}
                                    >
                                        <Icon size={16} />
                                        <span>{cat}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                ) : (
                    <div id="studio-header-target" className="flex-1 flex items-center justify-center gap-4 min-w-0" />
                )}

                {/* Mode Switcher */}
                <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex items-center shrink-0">
                    <button
                        onClick={() => { goHome(); setIsProMode(false); }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!isProMode ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <LayoutGrid size={14} />
                        <span className="hidden sm:inline">Tools</span>
                    </button>
                    <button
                        onClick={() => { goHome(); setIsProMode(true); }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isProMode ? 'bg-gradient-to-r from-indigo-900 to-purple-900 text-white border border-indigo-500/30 shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <Wand2 size={14} />
                        <span className="hidden sm:inline">Studio</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className={`flex-1 relative scroll-smooth bg-background ${isProMode ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                <div className={`h-full ${!isProMode && !activeTool ? 'max-w-7xl mx-auto p-6 md:p-10' : 'w-full h-full'}`}>

                    {isProMode ? (
                        <div className="h-full w-full">
                            <ProEditor />
                        </div>
                    ) : activeTool ? (
                        <div className="animate-fade-in h-full p-4 md:p-8">
                            <div className="max-w-7xl mx-auto h-full">
                                {/* Header removed as per user request to avoid duplication with tool internal headers */}
                                <div className="h-[calc(100%-80px)]">
                                    {activeTool.component}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            {/* Hero / Promo */}
                            {showBanner && (
                                <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 h-64 flex flex-col justify-center px-10 md:px-16 animate-slide-up group shadow-2xl">
                                    <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 group-hover:opacity-110 transition-opacity"></div>
                                    <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>

                                    <button
                                        onClick={() => setShowBanner(false)}
                                        className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
                                    >
                                        <X size={20} />
                                    </button>

                                    <div className="relative z-10 max-w-lg">
                                        <span className="inline-block px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-bold mb-4 border border-teal-500/20 shadow-sm">NEW FEATURE</span>
                                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Smart Remove Background</h2>
                                        <p className="text-zinc-400 mb-6">One click to isolate subjects. Powered by Gemini Vision.</p>
                                        <button
                                            onClick={handleHeroClick}
                                            className="bg-white text-black px-6 py-2.5 rounded-xl font-bold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
                                        >
                                            Try it out
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Tool Grid */}
                            <div className="flex flex-col gap-4">
                                <Dashboard onSelectTool={setActiveTool} activeCategory={activeCategory} />
                            </div>

                            <footer className="mt-12 text-center text-zinc-600 text-sm py-8 border-t border-zinc-900">
                                <p>© 2024 ADopeCanva - The Ultimate Omnitool Suite. Simplicity is the ultimate sophistication.</p>
                                <div className="mt-6 flex justify-center opacity-50 hover:opacity-100 transition-opacity">
                                    <img src="/ADC-Footer.png" alt="ADopeCanva Logo" className="h-8" />
                                </div>
                            </footer>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;