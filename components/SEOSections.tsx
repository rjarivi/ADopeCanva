import React, { useState } from 'react';
import { FAQItem, SpecItem, HowToStep, ComparisonTableData, ToolCategory, ToolItem } from '../types';
import { HelpCircle, Shield, Cpu, ChevronDown, Check, Copy, Code, ArrowRight, ExternalLink, Sparkles, Layers, Share2 } from 'lucide-react';
import { BeforeAfter } from './BeforeAfter';
import { useNavigate } from 'react-router-dom';
import { SITE_URL, getSubRoutesForTool } from '../utils/seoHelper';
import { TOOLS } from '../views/Dashboard';

interface SEOSectionsProps {
    toolId?: string;
    category?: ToolCategory;
    guideTitle?: string;
    guideContent?: string;
    steps?: HowToStep[];
    comparisonTable?: ComparisonTableData;
    faqs?: FAQItem[];
    specs?: SpecItem[];
    privacyNotes?: string;
    beforeAfterImage?: {
        before: string;
        after: string;
        alt: string;
    };
    relatedToolIds?: string[];
}

export const SEOSections: React.FC<SEOSectionsProps> = ({
    toolId,
    category,
    guideTitle,
    guideContent,
    steps,
    comparisonTable,
    faqs,
    specs,
    privacyNotes,
    beforeAfterImage,
    relatedToolIds
}) => {
    const navigate = useNavigate();
    const [copiedEmbed, setCopiedEmbed] = useState(false);
    const [showEmbed, setShowEmbed] = useState(false);

    // Compute related tools for internal mesh linking
    const relatedTools: ToolItem[] = React.useMemo(() => {
        if (relatedToolIds && relatedToolIds.length > 0) {
            return TOOLS.filter(t => relatedToolIds.includes(t.id) && t.id !== toolId).slice(0, 4);
        }
        if (category) {
            const sameCategory = TOOLS.filter(t => t.category === category && t.id !== toolId && !t.comingSoon);
            if (sameCategory.length >= 3) return sameCategory.slice(0, 4);
            const otherTools = TOOLS.filter(t => t.id !== toolId && !t.comingSoon && !sameCategory.includes(t));
            return [...sameCategory, ...otherTools].slice(0, 4);
        }
        return TOOLS.filter(t => t.id !== toolId && !t.comingSoon).slice(0, 4);
    }, [toolId, category, relatedToolIds]);

    // Programmatic sub-routes for this tool (e.g. /image-converter/png-to-webp)
    const subRoutes = toolId ? getSubRoutesForTool(toolId) : [];

    const embedUrl = toolId ? `${SITE_URL}/${toolId}?embed=true` : `${SITE_URL}`;
    const embedSnippet = `<iframe src="${embedUrl}" width="100%" height="650" frameborder="0" style="border-radius: 16px; border: 1px solid #27272a;" title="${guideTitle || 'AdopeCanva Online Utility'}"></iframe>\n<p style="font-size: 12px; color: #71717a; text-align: center; margin-top: 8px;">Free tool provided by <a href="${SITE_URL}" target="_blank" rel="noopener noreferrer" style="color: #6366f1; text-decoration: underline;">AdopeCanva</a></p>`;

    const handleCopyEmbed = async () => {
        try {
            await navigator.clipboard.writeText(embedSnippet);
            setCopiedEmbed(true);
            setTimeout(() => setCopiedEmbed(false), 2500);
        } catch (err) {
            console.error('Failed to copy embed code', err);
        }
    };

    if (!guideTitle && !faqs?.length && !specs?.length && !privacyNotes && !beforeAfterImage && !steps?.length && !comparisonTable) {
        return null;
    }

    return (
        <div className="mt-16 space-y-14 max-w-5xl mx-auto pb-20 px-4">
            {/* 1. Guide Overview Section */}
            {guideTitle && guideContent && (
                <section className="bg-zinc-900/60 rounded-3xl p-8 md:p-10 border border-zinc-800 backdrop-blur-md space-y-6 shadow-xl relative overflow-hidden">
                    {/* Background Ambient Glow */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400">
                            <Sparkles size={16} />
                            <span>Step-by-Step Educational Guide</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            {guideTitle}
                        </h2>
                        <p className="text-zinc-400 leading-relaxed text-base md:text-lg">
                            {guideContent}
                        </p>
                    </div>

                    {beforeAfterImage && (
                        <div className="pt-4 relative z-10">
                            <BeforeAfter
                                before={beforeAfterImage.before}
                                after={beforeAfterImage.after}
                                alt={beforeAfterImage.alt}
                            />
                        </div>
                    )}
                </section>
            )}

            {/* 2. 3-Step Visual How-To Guide (Semantic <ol>) */}
            {steps && steps.length > 0 && (
                <section className="space-y-6">
                    <div className="text-center space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                            Quick 3-Step Walkthrough
                        </span>
                        <h3 className="text-2xl font-bold text-white tracking-tight">
                            How to Use This Tool in 3 Simple Steps
                        </h3>
                    </div>

                    <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none p-0">
                        {steps.map((step) => (
                            <li
                                key={step.stepNumber}
                                className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 relative flex flex-col justify-between hover:border-indigo-500/40 hover:bg-zinc-900/80 transition-all duration-300 group shadow-lg"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-base font-mono group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                            {step.stepNumber}
                                        </div>
                                        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                                            Step 0{step.stepNumber}
                                        </span>
                                    </div>

                                    <h4 className="text-lg font-bold text-zinc-100 group-hover:text-white transition-colors">
                                        {step.title}
                                    </h4>

                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>

                                {step.tip && (
                                    <div className="mt-4 pt-3 border-t border-zinc-800/60 text-xs text-indigo-300/80 flex items-start gap-1.5 font-medium">
                                        <span className="text-indigo-400 font-bold">Tip:</span>
                                        <span>{step.tip}</span>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            {/* 3. Programmatic Sub-Routes / Intent Permutations Matrix (if applicable) */}
            {subRoutes.length > 0 && (
                <section className="bg-zinc-900/40 rounded-3xl p-6 md:p-8 border border-zinc-800/60 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Layers className="text-indigo-400" size={18} />
                                Dedicated Conversion Landers
                            </h3>
                            <p className="text-xs text-zinc-400 mt-1">Direct intent landing pages for high-frequency conversion pairs</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                        {subRoutes.map(sub => (
                            <button
                                key={sub.slug}
                                onClick={() => navigate(`/${toolId}/${sub.slug}`)}
                                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-left transition-all group"
                            >
                                <div>
                                    <div className="text-sm font-semibold text-zinc-200 group-hover:text-white">
                                        {sub.sourceFormat && sub.targetFormat ? `${sub.sourceFormat} to ${sub.targetFormat}` : sub.h1}
                                    </div>
                                    <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                        /{toolId}/{sub.slug}
                                    </div>
                                </div>
                                <ArrowRight size={14} className="text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* 4. Technical Comparison Table */}
            {comparisonTable && (
                <section className="space-y-4">
                    <div className="text-center space-y-1">
                        <h3 className="text-2xl font-bold text-white tracking-tight">
                            {comparisonTable.title}
                        </h3>
                        <p className="text-sm text-zinc-400">Technical specifications and format comparison metrics</p>
                    </div>

                    <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-zinc-800/60 border-b border-zinc-700/60">
                                        {comparisonTable.headers.map((h, i) => (
                                            <th key={i} className={`py-4 px-5 font-bold uppercase text-xs tracking-wider ${i === 0 ? 'text-zinc-300' : 'text-indigo-300'}`}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60">
                                    {comparisonTable.rows.map((row, rIdx) => (
                                        <tr
                                            key={rIdx}
                                            className={`transition-colors ${row.highlight ? 'bg-indigo-500/5 hover:bg-indigo-500/10' : 'hover:bg-white/5'}`}
                                        >
                                            <td className="py-3.5 px-5 font-medium text-zinc-300">
                                                {row.label}
                                            </td>
                                            {comparisonTable.headers.slice(1).map((headerKey, cIdx) => {
                                                const val = row.values[headerKey] !== undefined ? row.values[headerKey] : Object.values(row.values)[cIdx];
                                                return (
                                                    <td key={cIdx} className="py-3.5 px-5 text-zinc-300 font-mono text-xs md:text-sm">
                                                        {typeof val === 'boolean' ? (
                                                            val ? <Check className="text-emerald-400" size={18} /> : <span className="text-zinc-600">✕</span>
                                                        ) : (
                                                            <span>{val}</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}

            {/* 5. Specs & Privacy Guarantee Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Specs Section */}
                {specs && specs.length > 0 && (
                    <section className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 px-2">
                            <Cpu className="text-emerald-400" size={20} />
                            Technical Specifications
                        </h3>
                        <div className="bg-zinc-900/40 rounded-2xl border border-zinc-800/70 overflow-hidden shadow-lg">
                            <table className="w-full text-left">
                                <tbody className="divide-y divide-zinc-800/60">
                                    {specs.map((spec, i) => (
                                        <tr key={i} className="group hover:bg-white/5 transition-colors">
                                            <td className="py-3.5 px-5 text-zinc-400 font-medium text-sm">{spec.label}</td>
                                            <td className="py-3.5 px-5 text-zinc-100 text-sm text-right font-mono font-semibold">{spec.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Privacy & Security Guarantee */}
                <section className="space-y-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 px-2">
                        <Shield className="text-indigo-400" size={20} />
                        100% Client-Side Privacy Guarantee
                    </h3>
                    <div className="bg-indigo-500/5 rounded-2xl border border-indigo-500/20 p-6 flex flex-col justify-between h-[calc(100%-2.5rem)] shadow-lg space-y-4">
                        <div className="space-y-2">
                            <p className="text-zinc-200 text-sm leading-relaxed font-medium">
                                "{privacyNotes || 'All files are processed entirely in your browser memory via WebAssembly and HTML5 Canvas. No data or media is ever uploaded to any remote server.'}"
                            </p>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Complete security for sensitive personal photos, financial spreadsheets, corporate contracts, and proprietary code.
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-indigo-500/20 text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                Local In-Browser Sandbox
                            </div>
                            <span className="text-[11px] text-zinc-500 font-mono">0 Server Bytes</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* 6. FAQ Accordion (Schema.org FAQPage) */}
            {faqs && faqs.length > 0 && (
                <section className="space-y-6">
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                            Frequently Asked Questions
                        </h3>
                        <p className="text-sm text-zinc-400">Everything you need to know about formats, privacy, and technical limits</p>
                    </div>

                    <div className="grid gap-3.5">
                        {faqs.map((faq, i) => (
                            <details
                                key={i}
                                className="group bg-zinc-900/40 rounded-2xl border border-zinc-800 open:border-indigo-500/40 open:bg-zinc-900/80 transition-all duration-200 shadow-md"
                            >
                                <summary className="flex items-center justify-between p-5 md:p-6 cursor-pointer list-none select-none">
                                    <span className="text-base md:text-lg font-semibold text-zinc-200 group-hover:text-white transition-colors pr-4">
                                        {faq.question}
                                    </span>
                                    <ChevronDown className="text-zinc-500 group-open:rotate-180 group-open:text-indigo-400 transition-transform duration-300 shrink-0" size={20} />
                                </summary>
                                <div className="px-5 pb-5 md:px-6 md:pb-6 text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-4 text-sm md:text-base">
                                    {faq.answer}
                                </div>
                            </details>
                        ))}
                    </div>
                </section>
            )}

            {/* 7. Related Utilities Mesh Linking Grid */}
            {relatedTools.length > 0 && (
                <section className="space-y-6 pt-4 border-t border-zinc-800/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h3 className="text-xl font-bold text-white">Related Utilities</h3>
                            <p className="text-xs text-zinc-400">Explore complementary browser tools in the AdopeCanva suite</p>
                        </div>
                        {category && (
                            <button
                                onClick={() => {
                                    const slug = category === ToolCategory.DEV || (typeof category === 'string' && category.toLowerCase() === 'developer') ? 'dev' : category.toLowerCase();
                                    navigate(`/category/${slug}`);
                                }}
                                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition-colors"
                            >
                                View all {category} tools <ArrowRight size={14} />
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {relatedTools.map(rel => {
                            const Icon = rel.icon;
                            return (
                                <div
                                    key={rel.id}
                                    onClick={() => navigate(`/${rel.id}`)}
                                    className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800/80 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
                                >
                                    <div className="space-y-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-zinc-800 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-white flex items-center justify-center transition-colors">
                                            <Icon size={18} />
                                        </div>
                                        <h4 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
                                            {rel.title}
                                        </h4>
                                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                            {rel.description}
                                        </p>
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center justify-between text-[11px] font-semibold text-zinc-500 group-hover:text-indigo-400 transition-colors">
                                        <span>Launch tool</span>
                                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* 8. Embed Tool Widget Snippet (Backlink Discovery Engine) */}
            {toolId && (
                <section className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Code className="text-indigo-400" size={18} />
                            <div>
                                <h4 className="text-sm font-bold text-white">Embed this tool on your website</h4>
                                <p className="text-xs text-zinc-400">Provide free in-browser utility on your blog or web application</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowEmbed(!showEmbed)}
                            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 transition-colors"
                        >
                            {showEmbed ? 'Hide Embed Code' : 'Get Embed Code'}
                        </button>
                    </div>

                    {showEmbed && (
                        <div className="space-y-3 pt-2 animate-fade-in">
                            <div className="relative">
                                <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto selection:bg-indigo-500/30">
                                    {embedSnippet}
                                </pre>
                                <button
                                    onClick={handleCopyEmbed}
                                    className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-all shadow-lg"
                                >
                                    {copiedEmbed ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copiedEmbed ? 'Copied!' : 'Copy Code'}</span>
                                </button>
                            </div>
                            <p className="text-[11px] text-zinc-500">
                                Embeds clean standalone view with responsive aspect ratio. Backlink attribution helps keep our tools free and open.
                            </p>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};
