import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import {
    Command, Wand2, LayoutGrid,
    Video, Music, Image as ImageIcon, FileText, Code, Layers, X, Type
} from 'lucide-react';
import { Dashboard, TOOLS } from './views/Dashboard';
import { ToolCategory } from './types';
import { ProEditor } from './views/ProEditor';
import { Feedback } from './components/Feedback';

const ToolRenderer = () => {
    const isMobile = useIsMobile();
    const { toolId } = useParams();
    const tool = TOOLS.find(t => t.id === toolId);

    if (!tool) {
        return <Navigate to="/" replace />;
    }

    // Set document title and meta description for SEO
    useEffect(() => {
        const originalTitle = document.title;
        const metaDesc = document.querySelector('meta[name="description"]');
        const originalDesc = metaDesc?.getAttribute('content') || '';

        document.title = `${tool.title} | AdopeCanva Office Suite`;
        if (metaDesc) {
            metaDesc.setAttribute('content', tool.description);
        }

        return () => {
            document.title = originalTitle;
            if (metaDesc) {
                metaDesc.setAttribute('content', originalDesc);
            }
        };
    }, [tool]);

    return (
        <div className={`animate-fade-in h-full ${isMobile ? 'p-0' : 'p-4 md:p-6'}`}>
            <div className={`h-full ${isMobile ? '' : 'max-w-7xl mx-auto'}`}>
                <div className="h-full">
                    {tool.component}
                </div>
            </div>
        </div>
    );
};

import { useIsMobile } from './hooks/useIsMobile';
import { MobileLayout } from './components/MobileLayout';

const App = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();
    const [isProMode, setIsProMode] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [showBanner, setShowBanner] = useState(true);

    const categories = ['All', ...Object.values(ToolCategory)];

    // Google Analytics Page Tracking
    useEffect(() => {
        if (typeof window.gtag === 'function') {
            window.gtag('config', 'G-1ZV3C4L9KF', {
                page_path: location.pathname + location.search,
                page_title: document.title
            });
        }
    }, [location]);

    // Sync Pro Mode with URL
    useEffect(() => {
        if (location.pathname === '/studio') {
            if (isMobile) {
                navigate('/', { replace: true });
                return;
            }
            setIsProMode(true);
        } else {
            setIsProMode(false);
        }
    }, [location.pathname, isMobile, navigate]);

    const goHome = () => {
        navigate('/');
    };

    const handleCategoryClick = (cat: string) => {
        setActiveCategory(cat);
        navigate('/');
    };

    const handleHeroClick = () => {
        navigate('/bg-remover');
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case ToolCategory.VIDEO: return Video;
            case ToolCategory.AUDIO: return Music;
            case ToolCategory.IMAGE: return ImageIcon;
            case ToolCategory.DOCS: return FileText;
            case ToolCategory.TEXT: return Type;
            case ToolCategory.DEV: return Code;
            default: return Layers;
        }
    };

    const content = (
        <div className={`h-full ${!isProMode && location.pathname === '/' ? 'max-w-7xl mx-auto p-6 md:p-10' : 'w-full h-full'}`}>
            <Routes>
                <Route path="/" element={
                    <div className="space-y-8 animate-fade-in">
                        {/* Hero / Promo */}
                        {showBanner && !isMobile && (
                            <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 h-64 flex flex-col justify-center px-10 md:px-16 animate-slide-up group shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 group-hover:opacity-110 transition-opacity"></div>
                                <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>

                                <button
                                    onClick={() => setShowBanner(false)}
                                    className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
                                >
                                    <X size={20} />
                                </button>

                                <div className="relative z-10 max-w-lg">
                                    <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold mb-4 border border-indigo-500/20 shadow-sm">HOT FEATURE</span>
                                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Pro Image Editor</h2>
                                    <p className="text-zinc-400 mb-6">Master your designs with layers, advanced filters, and professional tools.</p>
                                    <div className="flex items-center gap-4">
                                        <button
                                            disabled
                                            className="bg-zinc-800 text-zinc-500 px-6 py-2.5 rounded-xl font-bold cursor-not-allowed border border-zinc-700 shadow-lg"
                                        >
                                            Coming Soon
                                        </button>
                                        <span className="text-zinc-500 text-xs font-medium italic animate-pulse">Under Development</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tool Grid */}
                        <div className="flex flex-col gap-4">
                            <Dashboard activeCategory={activeCategory} />
                        </div>

                        {!isMobile && (
                            <footer className="mt-12 text-center text-zinc-600 text-sm py-8 border-t border-zinc-900">
                                <p>© 2024 AdopeCanva - The Ultimate Omnitool Suite. Simplicity is the ultimate sophistication.</p>
                                <div className="mt-6 flex justify-center">
                                    <img src="/ADC-Footer.png" alt="AdopeCanva Logo" className="h-8 opacity-100 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all" />
                                </div>
                            </footer>
                        )}
                    </div>
                } />

                <Route path="/studio" element={
                    <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-6">
                        <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                            <Wand2 size={40} className="text-indigo-400 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black tracking-tight text-white font-unbounded">Studio is Coming Soon</h2>
                            <p className="text-zinc-400 max-w-md mx-auto">We're putting the finishing touches on our professional video editor. Stay tuned for advanced timeline-based editing!</p>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-white text-black px-8 py-3 rounded-2xl font-bold hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/10"
                        >
                            Back to Tools
                        </button>
                    </div>
                } />

                <Route path="/:toolId" element={<ToolRenderer />} />
            </Routes>
        </div>
    );

    if (isMobile) {
        return (
            <MobileLayout
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
            >
                {content}
                <Feedback />
            </MobileLayout>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-zinc-100 font-sans selection:bg-primary/30">

            {/* Header */}
            <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 md:px-8 bg-background/95 backdrop-blur-md z-40 shrink-0 gap-4">
                {/* Brand */}
                <div
                    className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
                    onClick={() => { navigate('/'); }}
                >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105 shrink-0">
                        <Command className="text-white" size={20} />
                    </div>
                    <span className="text-2xl tracking-tight text-white hidden md:block" style={{ fontFamily: '"Comfortaa", sans-serif', fontWeight: 700 }}>
                        adopecanva<span className={`font-sans font-normal text-zinc-400 text-lg transition-opacity ml-2 ${isProMode ? 'opacity-100' : 'opacity-0 hidden'}`}>| Studio</span>
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
                        onClick={() => navigate('/')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!isProMode ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <LayoutGrid size={14} />
                        <span className="hidden sm:inline">Tools</span>
                    </button>
                    <button
                        onClick={() => navigate('/studio')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isProMode ? 'bg-gradient-to-r from-indigo-900 to-purple-900 text-white border border-indigo-500/30 shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <Wand2 size={14} />
                        <span className="hidden sm:inline">Studio</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className={`flex-1 relative scroll-smooth bg-background dot-grid ${isProMode ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {content}
            </main>

            <Feedback />
        </div>
    );
};

export default App;