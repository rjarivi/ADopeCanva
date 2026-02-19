import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TOOLS } from './Dashboard';
import { Check, X, Zap, Shield, Heart } from 'lucide-react';

export const Comparison: React.FC = () => {
    const { competitor } = useParams();
    const navigate = useNavigate();

    // Default to comparing with EzGif if none specified
    const compName = competitor || 'EzGif';

    // Get a few top tools for the comparison table
    const topTools = TOOLS.filter(t => t.popular).slice(0, 5);

    return (
        <div className="max-w-5xl mx-auto px-6 py-20 space-y-16 animate-fade-in">
            <div className="text-center space-y-6">
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
                    AdopeCanva <span className="text-zinc-500">vs</span> {compName}
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto italic">
                    "Why switch? Because speed, privacy, and simplicity matter."
                </p>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <X className="text-red-500" size={24} />
                        Traditional Tools ({compName})
                    </h2>
                    <ul className="space-y-4 text-zinc-400">
                        <li className="flex items-start gap-3">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
                            Slow uploads to remote servers
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
                            Privacy risks (files stored on cloud)
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
                            Annoying pop-up ads and tracking
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
                            Limit on file sizes and daily use
                        </li>
                    </ul>
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-3xl p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        <Zap className="text-indigo-400 fill-indigo-400/20" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Check className="text-indigo-400" size={24} />
                        AdopeCanva Advantage
                    </h2>
                    <ul className="space-y-4 text-zinc-300">
                        <li className="flex items-start gap-3">
                            <Zap className="text-indigo-400 shrink-0 mt-1" size={16} />
                            <strong>Instant Processing:</strong> Zero upload time. Everything happens in your browser.
                        </li>
                        <li className="flex items-start gap-3">
                            <Shield className="text-indigo-400 shrink-0 mt-1" size={16} />
                            <strong>Privacy First:</strong> Your files never leave your computer. 100% secure.
                        </li>
                        <li className="flex items-start gap-3">
                            <Heart className="text-indigo-400 shrink-0 mt-1" size={16} />
                            <strong>No Limits:</strong> Free forever. No registration, no ads, no watermarks.
                        </li>
                    </ul>
                </div>
            </div>

            {/* Comparison Table */}
            <div className="space-y-8">
                <h3 className="text-2xl font-bold text-white text-center">Feature Comparison</h3>
                <div className="bg-zinc-900/30 rounded-3xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-800/50">
                                <th className="py-4 px-6 text-zinc-300 font-bold uppercase tracking-wider text-xs">Feature</th>
                                <th className="py-4 px-6 text-zinc-300 font-bold uppercase tracking-wider text-xs text-center">{compName}</th>
                                <th className="py-4 px-6 text-indigo-400 font-bold uppercase tracking-wider text-xs text-center bg-indigo-500/5">AdopeCanva</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {[
                                { f: 'In-Browser Processing', c: false, a: true },
                                { f: 'Privacy Guaranteed', c: 'Partial', a: true },
                                { f: 'No Watermarks', c: 'Depends', a: true },
                                { f: 'Modern UI/UX', c: false, a: true },
                                { f: 'Batch Processing', c: 'Limited', a: 'Coming Soon' },
                                { f: 'Mobile Friendly', c: 'Poor', a: true },
                            ].map((row, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="py-4 px-6 text-zinc-300 font-medium">{row.f}</td>
                                    <td className="py-4 px-6 text-center">
                                        {row.c === true ? <Check className="mx-auto text-emerald-500" size={18} /> :
                                            row.c === false ? <X className="mx-auto text-zinc-600" size={18} /> :
                                                <span className="text-zinc-500 text-sm font-bold">{row.c}</span>}
                                    </td>
                                    <td className="py-4 px-6 text-center bg-indigo-500/5">
                                        {row.a === true ? <Check className="mx-auto text-indigo-400" size={18} /> :
                                            <span className="text-indigo-400 text-sm font-bold tracking-tight uppercase">{row.a}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CTA */}
            <div className="text-center py-10 bg-gradient-to-b from-transparent to-indigo-500/5 rounded-3xl border border-indigo-500/10">
                <h2 className="text-3xl font-bold text-white mb-6">Ready to experience the future of online tools?</h2>
                <button
                    onClick={() => navigate('/')}
                    className="bg-white text-black px-10 py-4 rounded-2xl font-black text-lg hover:bg-zinc-200 transition-all shadow-xl shadow-white/10 active:scale-95"
                >
                    Get Started Free
                </button>
            </div>
        </div>
    );
};
