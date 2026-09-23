import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FocusedModeCtx } from './contexts/FocusedMode';
import { useFocusedMode } from './contexts/FocusedMode';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import {
    Wand2, LayoutGrid, Maximize2,
    Video, Music, Image as ImageIcon, FileText, Code, Layers, X, Type, ArrowLeftRight, ChevronLeft
} from 'lucide-react';
import { Dashboard, TOOLS } from './views/Dashboard';
import { ToolCategory } from './types';
import { ComingSoon } from './views/ComingSoon';
import { Feedback } from './components/Feedback';
import { SponsorsPanel } from './components/SponsorsPanel';
import { AdvertisePanel } from './components/AdvertisePanel';
import { SEOSections } from './components/SEOSections';
import { Comparison } from './views/Comparison';
import { ToolLoader } from './components/ToolLoader';
import { ToolErrorBoundary } from './components/ToolErrorBoundary';
import { ToolFullscreenButton } from './components/ToolFullscreenButton';
import { ToolHealth } from './views/ToolHealth';
import { Guides } from './views/Guides';
import { CategoryHub } from './views/CategoryHub';
import { ProgrammaticToolView } from './views/ProgrammaticToolView';
import { RemoveBgAlternativeBlog } from './views/RemoveBgAlternativeBlog';
import {
    buildToolSchema,
    updateHeadTags,
    getDefaultSteps,
    getDefaultComparisonTable,
    SITE_URL,
    SITE_NAME
} from './utils/seoHelper';
import { useIsMobile } from './hooks/useIsMobile';
import { MobileLayout } from './components/MobileLayout';
import { trackPageView } from './utils/analytics';
import { installGlobalFailureHook } from './utils/toolHealth';

const ToolRenderer = ({ setActiveCategory }: { setActiveCategory: (cat: string) => void }) => {
    const isMobile = useIsMobile();
    const { toolId } = useParams();
    const navigate = useNavigate();
    const { focused, setFocused } = useFocusedMode();
    const wrapRef = useRef<HTMLDivElement>(null);
    const tool = TOOLS.find(t => t.id === toolId);

    if (!tool) {
        return <Navigate to="/" replace />;
    }

    const swapTool = tool.swapId ? TOOLS.find(t => t.id === tool.swapId) : null;

    // Set document title, meta tags, and structured data
    useEffect(() => {
        const canonicalUrl = `${SITE_URL}/${tool.id}`;
        const schemas = buildToolSchema(tool);

        updateHeadTags({
            title: tool.seoTitle || `${tool.title} - Free Online In-Browser Tool | A Dope Canva`,
            description: tool.metaDescription || tool.description,
            keywords: tool.keywords || [tool.title.toLowerCase(), `${tool.category.toLowerCase()} tool`, 'free in-browser tool', 'no upload converter'],
            canonicalUrl,
            schemas
        });

        // Sync active category
        setActiveCategory(tool.category);
    }, [tool, setActiveCategory]);

    // Exit fullscreen/focus when switching tools; keyboard shortcut (F).
    useEffect(() => {
        setFocused(false);
    }, [tool.id, setFocused]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement | null;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
            if (e.key === 'f' || e.key === 'F') {
                const btn = wrapRef.current?.querySelector<HTMLButtonElement>('[data-tool-fullscreen]');
                btn?.click();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const steps = getDefaultSteps(tool);
    const comparisonTable = getDefaultComparisonTable(tool);

    return (
        <div ref={wrapRef} className={`animate-fade-in ${focused ? 'p-0' : isMobile ? 'p-0 pb-20' : 'p-4 md:p-6'}`}>
            <div className={`${isMobile || focused ? '' : 'max-w-7xl mx-auto'}`}>
                {/* Breadcrumb / Back navigation — hidden in fullscreen */}
                {!isMobile && !focused && (
                    <div className="flex items-center gap-2 mb-4 text-sm">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors group"
                        >
                            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                            <span>All tools</span>
                        </button>
                        <span className="text-zinc-700">/</span>
                        <button
                            onClick={() => {
                                const slug = tool.category === ToolCategory.DEV ? 'dev' : tool.category.toLowerCase();
                                navigate(`/category/${slug}`);
                            }}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            {tool.category} Tools
                        </button>
                        <span className="text-zinc-700">/</span>
                        <span className="text-zinc-300 font-medium">{tool.title}</span>
                        <div className="flex-1" />
                        <ToolFullscreenButton targetRef={wrapRef} />
                    </div>
                )}

                {/*
                 * Fixed-height tool container — prevents layout shift when switching tabs/panels.
                 * Desktop: locked to viewport height minus header (64px) + top-padding (24px) + breadcrumb (40px) = 128px.
                 * Fullscreen: edge-to-edge viewport, zero chrome.
                 * Mobile: natural content flow.
                 */}
                <div className={focused ? 'h-[100dvh] overflow-hidden bg-zinc-950' : isMobile ? 'pb-20' : 'h-[calc(100vh-128px)] overflow-hidden'}>
                    <ToolErrorBoundary toolId={tool.id} toolTitle={tool.title}>
                        {tool.component}
                    </ToolErrorBoundary>
                </div>

                {/* SEO & Guide Sections — below the fold, hidden in fullscreen */}
                {!focused && (
                    <div className="mt-8 pb-20">
                        <SEOSections
                            toolId={tool.id}
                            category={tool.category}
                            guideTitle={tool.guideTitle}
                            guideContent={tool.guideContent}
                            steps={steps}
                            comparisonTable={comparisonTable}
                            faqs={tool.faqs}
                            specs={tool.specs}
                            privacyNotes={tool.privacyNotes}
                            beforeAfterImage={tool.beforeAfterImage}
                            relatedToolIds={tool.relatedToolIds}
                        />
                    </div>
                )}
            </div>

            {/* Mobile floating fullscreen button (drives the hidden toolbar toggle) */}
            {isMobile && !focused && (
                <>
                    <div className="hidden">
                        <ToolFullscreenButton targetRef={wrapRef} />
                    </div>
                    <button
                        onClick={() => {
                            const btn = wrapRef.current?.querySelector<HTMLButtonElement>('[data-tool-fullscreen]');
                            btn?.click();
                        }}
                        title="Fullscreen"
                        className="fixed bottom-24 left-4 z-40 p-3 rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-400 shadow-xl backdrop-blur-sm"
                    >
                        <Maximize2 size={16} />
                    </button>
                </>
            )}

            {/* Swap Tool Button — floating pill, only shown when a swap partner exists */}
            {!focused && swapTool && (
                <button
                    onClick={() => navigate(`/${swapTool.id}`)}
                    title={`Switch to ${swapTool.title}`}
                    className="fixed bottom-24 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:border-indigo-500/60 hover:bg-zinc-800 shadow-xl transition-all duration-200 group hover:shadow-indigo-500/10 hover:shadow-2xl text-sm font-medium"
                >
                    <ArrowLeftRight size={15} className="text-indigo-400 group-hover:rotate-180 transition-transform duration-300" />
                    <span className="max-w-[140px] truncate">{swapTool.title}</span>
                </button>
            )}
        </div>
    );
};

const App = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();
    const [isProMode, setIsProMode] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [showBanner, setShowBanner] = useState(true);
    const [toolFocused, setToolFocused] = useState(false);
    const [toolLoading, setToolLoading] = useState(false);
    const mainRef = useRef<HTMLElement>(null);
    const [prevPath, setPrevPath] = useState(location.pathname);

    // Global failure safety net: unhandled rejections → tool-health log + GA4.
    useEffect(() => { installGlobalFailureHook(); }, []);

    // Embed Mode detection: ?embed=true
    const isEmbed = new URLSearchParams(location.search).get('embed') === 'true';

    // Sync loading state during render phase to prevent single-frame content flash
    if (location.pathname !== prevPath) {
        setPrevPath(location.pathname);
        const isCategoryHub = /^\/category\/[^\/]+$/.test(location.pathname);
        const isStaticPage = location.pathname === '/' ||
            location.pathname.startsWith('/vs') ||
            location.pathname.startsWith('/blog') ||
            location.pathname === '/remove-bg-alternative' ||
            isCategoryHub ||
            location.pathname === '/studio' ||
            location.pathname === '/guides';
        setToolLoading(!isStaticPage);
    }

    // Auto-dismiss loader after 350ms
    useEffect(() => {
        if (toolLoading) {
            const timer = setTimeout(() => setToolLoading(false), 350);
            return () => clearTimeout(timer);
        }
    }, [toolLoading]);

    const categories = ['All', ...Object.values(ToolCategory)];

    // Homepage Head & Structured Data Management
    useEffect(() => {
        // Track page view and AI / UTM referrals
        trackPageView(location.pathname + location.search, document.title);

        if (location.pathname === '/') {
            updateHeadTags({
                title: 'AdopeCanva | The All-in-One In-Browser Productivity Tool Suite',
                description: 'A comprehensive collection of 60+ free in-browser tools for video editing, image processing, audio conversion, and document management. 100% private, zero uploads.',
                keywords: ['all in one tools', 'in-browser video editor', 'image compressor', 'pdf redactor', 'format converter online', 'free client side tools', 'adopecanva'],
                canonicalUrl: SITE_URL,
                schemas: [
                    {
                        '@context': 'https://schema.org',
                        '@type': 'WebSite',
                        'name': SITE_NAME,
                        'url': SITE_URL,
                        'potentialAction': {
                            '@type': 'SearchAction',
                            'target': `${SITE_URL}/?q={search_term_string}`,
                            'query-input': 'required name=search_term_string'
                        }
                    },
                    {
                        '@context': 'https://schema.org',
                        '@type': 'SoftwareApplication',
                        'name': SITE_NAME,
                        'operatingSystem': 'All',
                        'applicationCategory': 'MultimediaApplication, ProductivityApplication',
                        'description': 'A comprehensive all-in-one productivity suite for video editing, image processing, and document management entirely in the browser.',
                        'offers': {
                            '@type': 'Offer',
                            'price': '0',
                            'priceCurrency': 'USD'
                        },
                        'url': SITE_URL
                    }
                ]
            });
        }
    }, [location.pathname, location.search]);

    // Sync Pro Mode & Active Category with URL; reset focused mode on navigation
    React.useLayoutEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
        setToolFocused(false);

        if (location.pathname === '/studio') {
            if (isMobile) {
                navigate('/', { replace: true });
                return;
            }
            setIsProMode(true);
        } else {
            setIsProMode(false);
        }

        if (location.pathname === '/') {
            setActiveCategory('All');
        } else if (location.pathname.startsWith('/category/')) {
            const catPart = location.pathname.split('/')[2]?.toLowerCase();
            if (catPart === 'dev' || catPart === 'developer') {
                setActiveCategory(ToolCategory.DEV);
            } else {
                const matched = Object.values(ToolCategory).find(c => c.toLowerCase() === catPart);
                if (matched) setActiveCategory(matched);
            }
        }
    }, [location.pathname, isMobile, navigate]);

    const handleCategoryClick = (cat: string) => {
        setActiveCategory(cat);
        if (cat === 'All') {
            navigate('/');
        } else {
            const slug = cat === ToolCategory.DEV || cat.toLowerCase() === 'developer' ? 'dev' : cat.toLowerCase();
            navigate(`/category/${slug}`);
        }
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
                            <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/60 flex flex-col justify-center px-10 md:px-16 py-10 animate-slide-up group">
                                {/* Color leak — visible indigo warmth */}
                                <div className="absolute right-0 top-0 w-96 h-96 rounded-full translate-x-1/3 -translate-y-1/3 blur-[80px]" style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.25) 0%, transparent 70%)' }}></div>
                                <div className="absolute left-1/4 bottom-0 w-64 h-64 blur-[80px] rounded-full translate-y-1/2" style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)' }}></div>

                                <button
                                    onClick={() => setShowBanner(false)}
                                    className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-zinc-300 hover:bg-white/5 rounded-full transition-colors z-20"
                                    aria-label="Dismiss banner"
                                >
                                    <X size={18} />
                                </button>

                                <div className="relative z-10 flex items-center justify-between gap-10">
                                    <div className="max-w-lg">
                                        <span className="inline-block px-3 py-1 rounded-full text-indigo-300 text-[11px] font-bold tracking-wide uppercase mb-4 border" style={{ background: 'rgba(79,70,229,0.15)', borderColor: 'rgba(79,70,229,0.3)' }}>New</span>
                                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Pro Image Editor</h2>
                                        <p className="text-zinc-500 text-sm mb-6 leading-relaxed">Layers, filters, and professional tools — all in your browser. No installs, no uploads.</p>
                                        <button
                                            onClick={() => navigate('/image-editor')}
                                            className="bg-zinc-100 text-indigo-950 px-5 py-2 rounded-lg text-sm font-bold hover:bg-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5" style={{ boxShadow: '0 8px 32px rgba(79,70,229,0.3)' }}
                                        >
                                            Try it out
                                        </button>
                                    </div>

                                    {/* Quick stats strip */}
                                    <div className="hidden xl:flex items-center gap-6 shrink-0">
                                        {[
                                            { value: `${TOOLS.filter(t => !t.comingSoon).length}+`, label: 'Free tools' },
                                            { value: '100%', label: 'In-browser' },
                                            { value: '0', label: 'Uploads' },
                                        ].map(stat => (
                                            <div key={stat.label} className="text-center">
                                                <div className="text-3xl font-unbounded font-bold text-white">{stat.value}</div>
                                                <div className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>
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
                                <div className="mt-2 flex items-center justify-center gap-4 text-xs text-zinc-500">
                                    <button onClick={() => navigate('/guides')} className="hover:text-zinc-300 hover:underline">How-to Guides</button>
                                    <span>•</span>
                                    <button onClick={() => navigate('/remove-bg-alternative')} className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium">Remove.bg Alternative</button>
                                    <span>•</span>
                                    <button onClick={() => navigate('/category/image')} className="hover:text-zinc-300 hover:underline">Image Tools</button>
                                    <span>•</span>
                                    <button onClick={() => navigate('/category/video')} className="hover:text-zinc-300 hover:underline">Video Tools</button>
                                    <span>•</span>
                                    <button onClick={() => navigate('/category/docs')} className="hover:text-zinc-300 hover:underline">PDF & Docs</button>
                                    <span>•</span>
                                    <button onClick={() => navigate('/studio')} className="hover:text-zinc-300 hover:underline">Studio</button>
                                </div>
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

                {/* Category Hubs */}
                <Route path="/category/:category" element={<CategoryHub />} />
                <Route path="/category/:category/:toolId" element={<ToolRenderer setActiveCategory={setActiveCategory} />} />
                <Route path="/category/:category/:toolId/:subRoute" element={<ProgrammaticToolView setActiveCategory={setActiveCategory} />} />

                {/* Direct /tools and /tool prefix aliases */}
                <Route path="/tools/:toolId" element={<ToolRenderer setActiveCategory={setActiveCategory} />} />
                <Route path="/tools/:toolId/:subRoute" element={<ProgrammaticToolView setActiveCategory={setActiveCategory} />} />
                <Route path="/tool/:toolId" element={<ToolRenderer setActiveCategory={setActiveCategory} />} />
                <Route path="/tool/:toolId/:subRoute" element={<ProgrammaticToolView setActiveCategory={setActiveCategory} />} />

                {/* Programmatic Converter Permutations */}
                <Route path="/convert/:slug" element={<ProgrammaticToolView setActiveCategory={setActiveCategory} />} />

                {/* Competitor Comparisons */}
                <Route path="/vs/:competitor" element={<Comparison />} />
                <Route path="/studio" element={<ComingSoon />} />
                <Route path="/guides" element={<Guides />} />

                {/* Remove.bg Alternative Blog & Pillar */}
                <Route path="/blog/remove-bg-alternative" element={<RemoveBgAlternativeBlog />} />
                <Route path="/remove-bg-alternative" element={<RemoveBgAlternativeBlog />} />
                <Route path="/health" element={<ToolHealth />} />

                {/* Programmatic Sub-Routes (e.g. /image-converter/png-to-webp) */}
                <Route path="/:toolId/:subRoute" element={<ProgrammaticToolView setActiveCategory={setActiveCategory} />} />

                {/* Primary Tool Route */}
                <Route path="/:toolId" element={<ToolRenderer setActiveCategory={setActiveCategory} />} />

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );

    // If loaded as an iframe embed (?embed=true), render tool with zero surrounding chrome
    if (isEmbed) {
        return (
            <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 p-4">
                <Routes>
                    <Route path="/category/:category/:toolId/:subRoute" element={<ProgrammaticToolView />} />
                    <Route path="/category/:category/:toolId" element={<ToolRenderer setActiveCategory={setActiveCategory} />} />
                    <Route path="/tools/:toolId/:subRoute" element={<ProgrammaticToolView />} />
                    <Route path="/tools/:toolId" element={<ToolRenderer setActiveCategory={setActiveCategory} />} />
                    <Route path="/tool/:toolId/:subRoute" element={<ProgrammaticToolView />} />
                    <Route path="/tool/:toolId" element={<ToolRenderer setActiveCategory={setActiveCategory} />} />
                    <Route path="/convert/:slug" element={<ProgrammaticToolView />} />
                    <Route path="/:toolId/:subRoute" element={<ProgrammaticToolView />} />
                    <Route path="/:toolId" element={<ToolRenderer setActiveCategory={setActiveCategory} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        );
    }

    if (isMobile) {
        return (
            <FocusedModeCtx.Provider value={{ focused: toolFocused, setFocused: setToolFocused }}>
            <MobileLayout
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
            >
                {content}

                {!isProMode && <Feedback />}
            </MobileLayout>
            </FocusedModeCtx.Provider>
        );
    }

    return (
        <FocusedModeCtx.Provider value={{ focused: toolFocused, setFocused: setToolFocused }}>
        <div className="flex flex-col h-screen overflow-hidden bg-background text-zinc-100 font-sans selection:bg-primary/30">

            {/* Header — hidden in focused/presentation mode */}
            {!toolFocused && <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 md:px-8 bg-background/95 backdrop-blur-md z-40 shrink-0 gap-4">
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
                                const count = cat === 'All'
                                    ? TOOLS.filter(t => !t.comingSoon).length
                                    : TOOLS.filter(t => t.category === cat && !t.comingSoon).length;
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
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full hidden lg:inline-block ${activeCategory === cat ? 'bg-white/15 text-white/80' : 'bg-zinc-800 text-zinc-500'}`}>
                                            {count}
                                        </span>
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
            </header>}

            {/* Main Content */}
            <main ref={mainRef} className={`flex-1 relative bg-background dot-grid ${isProMode ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {/* Full-page tool loader — shown briefly on tool navigation to prevent scroll flash */}
                <ToolLoader isLoading={toolLoading} />
                <div style={{ visibility: toolLoading ? 'hidden' : 'visible', height: '100%' }}>
                    {content}
                </div>
            </main>

            {!isProMode && !toolFocused && <Feedback />}

            {/* Advertise panel — floats in the left whitespace */}
            {!isProMode && !toolFocused && location.pathname === '/' && (
                <div className="hidden 2xl:block fixed top-20 pt-4 pl-4" style={{ left: '8px' }}>
                    <AdvertisePanel />
                </div>
            )}

            {/* Sponsors panel — floats in the right whitespace */}
            {!isProMode && !toolFocused && location.pathname === '/' && (
                <div className="hidden 2xl:block fixed top-20 pt-4 pr-4" style={{ right: '24px' }}>
                    <SponsorsPanel />
                </div>
            )}
        </div>
        </FocusedModeCtx.Provider>
    );
};

export default App;