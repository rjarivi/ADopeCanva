import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import {
    Wand2, LayoutGrid,
    Video, Music, Image as ImageIcon, FileText, Code, Layers, X, Type
} from 'lucide-react';
import { Dashboard, TOOLS } from './views/Dashboard';
import { ToolCategory } from './types';
// import { ProEditor } from './views/ProEditor';
import { ComingSoon } from './views/ComingSoon';
import { Feedback } from './components/Feedback';


import { SEOSections } from './components/SEOSections';
import { Comparison } from './views/Comparison';

const ToolRenderer = ({ setActiveCategory }: { setActiveCategory: (cat: string) => void }) => {
    const isMobile = useIsMobile();
    const { toolId } = useParams();
    const tool = TOOLS.find(t => t.id === toolId);

    if (!tool) {
        return <Navigate to="/" replace />;
    }

    // Set document title, meta description, and active category
    useEffect(() => {
        const originalTitle = document.title;
        const metaDesc = document.querySelector('meta[name="description"]');
        const originalDesc = metaDesc?.getAttribute('content') || '';

        document.title = `${tool.title} | AdopeCanva Office Suite`;
        if (metaDesc) {
            metaDesc.setAttribute('content', tool.description);
        }

        // Sync active category
        setActiveCategory(tool.category);

        return () => {
            document.title = originalTitle;
            if (metaDesc) {
                metaDesc.setAttribute('content', originalDesc);
            }
        };
    }, [tool, setActiveCategory]);

    return (
        <div className={`animate-fade-in h-full ${isMobile ? 'p-0 pb-20' : 'p-4 md:p-6 pb-20'}`}>
            <div className={`h-full ${isMobile ? '' : 'max-w-7xl mx-auto'}`}>
                <div className="h-full">
                    {tool.component}
                </div>

                {/* SEO & Guide Sections */}
                <SEOSections
                    guideTitle={tool.guideTitle}
                    guideContent={tool.guideContent}
                    faqs={tool.faqs}
                    specs={tool.specs}
                    privacyNotes={tool.privacyNotes}
                />
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
    React.useLayoutEffect(() => {
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
                            <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/60 h-56 flex flex-col justify-center px-10 md:px-16 animate-slide-up group">
                                {/* Color leak — visible indigo warmth */}
                                <div className="absolute right-0 top-0 w-96 h-96 rounded-full translate-x-1/3 -translate-y-1/3 blur-[80px]" style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.25) 0%, transparent 70%)' }}></div>
                                <div className="absolute left-1/4 bottom-0 w-64 h-64 blur-[80px] rounded-full translate-y-1/2" style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)' }}></div>

                                <button
                                    onClick={() => setShowBanner(false)}
                                    className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-zinc-300 hover:bg-white/5 rounded-full transition-colors z-20"
                                >
                                    <X size={18} />
                                </button>

                                <div className="relative z-10 max-w-lg">
                                    <span className="inline-block px-3 py-1 rounded-full text-indigo-300 text-[11px] font-bold tracking-wide uppercase mb-4 border" style={{ background: 'rgba(79,70,229,0.15)', borderColor: 'rgba(79,70,229,0.3)' }}>New</span>
                                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Pro Image Editor</h2>
                                    <p className="text-zinc-500 text-sm mb-6 leading-relaxed">Layers, filters, and professional tools — all in your browser.</p>
                                    <button
                                        onClick={() => navigate('/image-editor')}
                                        className="bg-zinc-100 text-indigo-950 px-5 py-2 rounded-lg text-sm font-bold hover:bg-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5" style={{ boxShadow: '0 8px 32px rgba(79,70,229,0.3)' }}
                                    >
                                        Try it out
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Tool Grid */}
                        <div className="flex flex-col gap-4">
                            <Dashboard activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
                        </div>

                        {!isMobile && (
                            <footer className="mt-12 text-center text-zinc-600 text-sm py-8 border-t border-zinc-900">
                                <p>© 2026 AdopeCanva - The Ultimate Omnitool Suite. Simplicity is the ultimate sophistication.</p>
                                <div className="mt-6 flex flex-col items-center gap-4">
                                    <img src="/ADC-Footer.png" alt="AdopeCanva Logo" className="h-8 opacity-100 hover:drop-shadow-[0_0_12px_rgba(79,70,229,0.6)] transition-all" />
                                    <a
                                        href="https://www.producthunt.com/products/a-dope-canva-omni-toolkit-locally"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-orange-400 hover:border-orange-500/30 hover:bg-orange-500/10 transition-all duration-300 text-xs font-medium"
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.604 8.4h-3.405V12h3.405a1.8 1.8 0 0 0 0-3.6zM12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm1.604 14.4h-3.405V18H7.801V6h5.804a4.2 4.2 0 0 1 0 8.4z" /></svg>
                                        Find us on Product Hunt
                                    </a>
                                </div>
                            </footer>
                        )}
                    </div>
                } />

                <Route path="/vs/:competitor" element={<Comparison />} />
                <Route path="/studio" element={<ComingSoon />} />

                <Route path="/:toolId" element={<ToolRenderer setActiveCategory={setActiveCategory} />} />
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

                {!isProMode && <Feedback />}
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
                    <img src="/adopecanva.svg" alt="AdopeCanva" className="w-9 h-9 rounded-xl transition-transform group-hover:scale-105 shrink-0" style={{ filter: 'drop-shadow(0 4px 12px rgba(121, 95, 244, 0.4))' }} />
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
                                        className={`flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${activeCategory === cat
                                            ? 'text-white'
                                            : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/50'
                                            }`}
                                        style={activeCategory === cat ? { background: 'rgba(79,70,229,0.15)', borderColor: 'rgba(79,70,229,0.3)', color: '#fff', boxShadow: '0 4px 12px rgba(79,70,229,0.15)' } : undefined}
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
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${!isProMode ? 'text-white' : 'text-zinc-400 border-transparent hover:text-white'}`}
                        style={!isProMode ? { background: 'rgba(79,70,229,0.15)', borderColor: 'rgba(79,70,229,0.3)', color: '#fff', boxShadow: '0 4px 12px rgba(79,70,229,0.15)' } : undefined}
                    >
                        <LayoutGrid size={14} />
                        <span className="hidden sm:inline">Tools</span>
                    </button>
                    <button
                        onClick={() => navigate('/studio')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${isProMode ? 'text-white' : 'text-zinc-400 border-transparent hover:text-white'}`}
                        style={isProMode ? { background: 'rgba(79,70,229,0.15)', borderColor: 'rgba(79,70,229,0.3)', color: '#fff', boxShadow: '0 4px 12px rgba(79,70,229,0.15)' } : undefined}
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


            {!isProMode && <Feedback />}
        </div>
    );
};

export default App;