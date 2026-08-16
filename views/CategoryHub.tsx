import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CATEGORY_METAS, buildCategorySchema, updateHeadTags, SITE_URL, PROGRAMMATIC_SUB_ROUTES } from '../utils/seoHelper';
import { TOOLS } from './Dashboard';
import { ToolCategory } from '../types';
import { Search, ChevronLeft, ArrowRight, Check, ChevronDown, Layers, Sparkles } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

export const CategoryHub: React.FC = () => {
    const { category } = useParams<{ category: string }>();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [searchQuery, setSearchQuery] = useState('');

    const catKey = category?.toLowerCase() || 'image';
    const catMeta = CATEGORY_METAS[catKey] || CATEGORY_METAS.image;

    // Filter tools for this category
    const categoryTools = React.useMemo(() => {
        if (catMeta.category === 'Converters') {
            return TOOLS.filter(t => t.id.includes('converter') || t.id.includes('to-') || t.category === ToolCategory.IMAGE || t.category === ToolCategory.VIDEO);
        }
        return TOOLS.filter(t => t.category === catMeta.category);
    }, [catMeta]);

    const filteredTools = React.useMemo(() => {
        if (!searchQuery.trim()) return categoryTools;
        const q = searchQuery.toLowerCase();
        return categoryTools.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q)
        );
    }, [categoryTools, searchQuery]);

    // Sub-routes related to this category
    const relevantSubRoutes = React.useMemo(() => {
        const toolIds = categoryTools.map(t => t.id);
        return PROGRAMMATIC_SUB_ROUTES.filter(r => toolIds.includes(r.parentToolId));
    }, [categoryTools]);

    // Update document head & structured data
    useEffect(() => {
        const canonicalUrl = `${SITE_URL}/category/${catKey}`;
        const schemas = buildCategorySchema(catMeta, categoryTools);

        updateHeadTags({
            title: `${catMeta.title} | A Dope Canva`,
            description: catMeta.description,
            keywords: catMeta.keywords,
            canonicalUrl,
            schemas
        });
    }, [catKey, catMeta, categoryTools]);

    const otherCategories = Object.keys(CATEGORY_METAS).filter(k => k !== catKey);

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 animate-fade-in space-y-8 pb-24">
            {/* Sleek Top Navigation Bar: Breadcrumb + Compact Header + Search */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-1 hover:text-zinc-300 transition-colors group"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span>All Tools</span>
                    </button>
                    <span className="text-zinc-700">/</span>
                    <span className="text-zinc-300 font-medium">{catMeta.name}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                            {catMeta.name}
                        </h1>
                        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                            {categoryTools.length} tools
                        </span>
                    </div>

                    {/* Compact Search Bar */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
                        <input
                            type="text"
                            placeholder={`Search ${catMeta.name.toLowerCase()}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Tools Grid — Immediately Above the Fold */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <div
                            key={tool.id}
                            onClick={() => navigate(`/${tool.id}`)}
                            className={`group p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-800/90 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-lg relative overflow-hidden ${tool.comingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-1'}`}
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <Icon size={22} />
                                    </div>
                                    {tool.popular && (
                                        <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                                            Popular
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors mb-1.5">
                                        {tool.title}
                                    </h3>
                                    <p className="text-sm text-zinc-400 group-hover:text-zinc-300 line-clamp-2 leading-relaxed">
                                        {tool.description}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs font-semibold text-zinc-500 group-hover:text-indigo-400 transition-colors">
                                <span>Launch tool</span>
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredTools.length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                    No tools found matching "{searchQuery}".
                </div>
            )}

            {/* Below the Fold: Structured SEO Content & Educational Context */}
            <div className="pt-12 border-t border-zinc-800/80 space-y-12">
                {/* Category Context & Trust Features */}
                <div className="bg-zinc-900/40 rounded-3xl p-8 border border-zinc-800/80 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                            <Sparkles size={14} />
                            <span>About {catMeta.name}</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-white">
                            {catMeta.h1}
                        </h2>
                        <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                            {catMeta.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        {catMeta.features.map((feat, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 text-xs font-medium"
                            >
                                <Check size={14} className="text-emerald-400" />
                                <span>{feat}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Programmatic Intent Landing Pages in this Category */}
                {relevantSubRoutes.length > 0 && (
                    <section className="bg-zinc-900/40 rounded-3xl p-8 border border-zinc-800/80 space-y-4">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Layers className="text-indigo-400" size={18} />
                                Dedicated Conversion Hubs
                            </h3>
                            <p className="text-xs text-zinc-400">Direct intent pages optimized for specific format conversions</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                            {relevantSubRoutes.map((sub) => (
                                <button
                                    key={sub.slug}
                                    onClick={() => navigate(`/${sub.parentToolId}/${sub.slug}`)}
                                    className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-left transition-all group"
                                >
                                    <div>
                                        <div className="text-sm font-semibold text-zinc-200 group-hover:text-white">
                                            {sub.h1}
                                        </div>
                                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                            /{sub.parentToolId}/{sub.slug}
                                        </div>
                                    </div>
                                    <ArrowRight size={14} className="text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Category Technical FAQs */}
                {catMeta.faqs && catMeta.faqs.length > 0 && (
                    <section className="space-y-6">
                        <div className="text-center space-y-1">
                            <h3 className="text-2xl font-bold text-white">Frequently Asked Questions</h3>
                            <p className="text-xs text-zinc-400">Common questions about {catMeta.name.toLowerCase()} and performance</p>
                        </div>

                        <div className="grid gap-3.5 max-w-4xl mx-auto">
                            {catMeta.faqs.map((faq, i) => (
                                <details
                                    key={i}
                                    className="group bg-zinc-900/40 rounded-2xl border border-zinc-800 open:border-indigo-500/40 open:bg-zinc-900/80 transition-all duration-200 shadow-md"
                                >
                                    <summary className="flex items-center justify-between p-5 cursor-pointer list-none select-none">
                                        <span className="text-base font-semibold text-zinc-200 group-hover:text-white transition-colors pr-4">
                                            {faq.question}
                                        </span>
                                        <ChevronDown className="text-zinc-500 group-open:rotate-180 group-open:text-indigo-400 transition-transform duration-300 shrink-0" size={18} />
                                    </summary>
                                    <div className="px-5 pb-5 text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-4 text-sm">
                                        {faq.answer}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </section>
                )}

                {/* Other Category Hubs Mesh */}
                <section className="space-y-6 pt-6 border-t border-zinc-800/80">
                    <h3 className="text-lg font-bold text-white text-center">Explore Other Categories</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {otherCategories.map(k => {
                            const m = CATEGORY_METAS[k];
                            return (
                                <button
                                    key={k}
                                    onClick={() => navigate(`/category/${k}`)}
                                    className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-800/80 text-center transition-all group"
                                >
                                    <div className="text-xs font-bold text-zinc-200 group-hover:text-white">
                                        {m.name}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-0.5">
                                        View tools →
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
};
