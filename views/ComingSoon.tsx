import React, { useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Construction, Wand2, Loader2 } from 'lucide-react';

// Studio (player + parsers + Gemini) is beta-gated — keep it out of the
// eager bundle so first paint doesn't pay for it.
const StudioBeta = lazy(() => import('./Studio').then(m => ({ default: m.Studio })));

export const ComingSoon: React.FC<{ studioBeta?: boolean }> = ({ studioBeta }) => {
    const navigate = useNavigate();
    const [showStudio, setShowStudio] = useState(() => {
        try { return localStorage.getItem('studio_beta') === '1'; } catch { return false; }
    });

    if (studioBeta && showStudio) {
        return (
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4">
                    <Loader2 className="text-indigo-400 animate-spin" size={28} />
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Loading Studio…</p>
                </div>
            }>
                <StudioBeta />
            </Suspense>
        );
    }

    if (studioBeta) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-6 text-center animate-fade-in">
                <div className="relative z-10 flex flex-col items-center max-w-lg">
                    <button
                        onClick={() => setShowStudio(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <Wand2 size={18} />
                        Enter Studio Phase 0 (beta)
                    </button>
                    <p className="text-zinc-600 text-xs mt-4">Internal preview — not listed publicly. Exit: clear the "studio_beta" localStorage flag.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-6 text-center animate-fade-in">
            {/* Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center max-w-lg">
                <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800 shadow-2xl mb-8 animate-bounce-slow">
                    <Wand2 className="text-primary w-10 h-10" />
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                    Studio Editor is
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400"> Coming Soon</span>
                </h1>

                <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                    We're working hard to bring you the ultimate creative studio experience.
                    Get ready for professional-grade video editing, advanced composition, and AI-powered tools directly in your browser.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <ArrowLeft size={18} />
                        Back to Tools
                    </button>

                    <button
                        disabled
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 text-zinc-500 font-semibold border border-zinc-700 cursor-not-allowed"
                    >
                        <Construction size={18} />
                        Under Construction
                    </button>
                </div>

                {/* Feature Previews (Optional decoration) */}
                <div className="grid grid-cols-3 gap-4 mt-16 w-full opacity-50">
                    {['Multi-Track', 'Keyframes', 'AI Effects'].map((feature, i) => (
                        <div key={i} className="px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs font-mono text-zinc-500 uppercase tracking-widest">
                            {feature}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
