import React, { useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { TOOLS } from './Dashboard';
import { getProgrammaticSubRoute, buildToolSchema, updateHeadTags, SITE_URL, getDefaultSteps, getDefaultComparisonTable } from '../utils/seoHelper';
import { SEOSections } from '../components/SEOSections';
import { ChevronLeft, ArrowRightLeft } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

interface ProgrammaticToolViewProps {
    setActiveCategory?: (cat: string) => void;
}

export const ProgrammaticToolView: React.FC<ProgrammaticToolViewProps> = ({ setActiveCategory }) => {
    const { category, toolId, subRoute, slug } = useParams<{ category?: string; toolId?: string; subRoute?: string; slug?: string }>();
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    // Determine target sub-route slug and parent tool
    const targetSlug = subRoute || slug || '';
    let targetToolId = toolId;

    // If accessed via /convert/:slug, deduce the right tool
    if (!targetToolId && targetSlug) {
        if (targetSlug.includes('pdf') && targetSlug.includes('text')) {
            targetToolId = targetSlug.startsWith('pdf-to') ? 'pdf-to-text' : 'text-to-pdf';
        } else if (targetSlug.includes('video') || targetSlug.includes('gif') || targetSlug.includes('mp4')) {
            targetToolId = targetSlug === 'video-to-gif' ? 'video-to-gif' : targetSlug.includes('gif') ? 'gif-maker' : 'video-converter';
        } else if (targetSlug.includes('svg')) {
            targetToolId = targetSlug.includes('code') ? 'svg-to-code' : 'svg-converter';
        } else if (targetSlug.includes('markdown') || targetSlug.includes('docx')) {
            targetToolId = 'file-to-markdown';
        } else {
            targetToolId = 'image-converter';
        }
    }

    const tool = TOOLS.find(t => t.id === targetToolId);
    const subRouteMeta = targetToolId ? getProgrammaticSubRoute(targetToolId, targetSlug) : undefined;

    useEffect(() => {
        if (!tool) return;

        if (setActiveCategory) {
            setActiveCategory(tool.category);
        }

        const canonicalUrl = subRouteMeta
            ? `${SITE_URL}/${tool.id}/${subRouteMeta.slug}`
            : `${SITE_URL}/${tool.id}`;

        const schemas = buildToolSchema(tool, subRouteMeta);

        updateHeadTags({
            title: subRouteMeta ? `${subRouteMeta.title} | A Dope Canva` : `${tool.title} | A Dope Canva`,
            description: subRouteMeta?.metaDescription || tool.description,
            keywords: subRouteMeta?.keywords || tool.keywords,
            canonicalUrl,
            schemas
        });
    }, [tool, subRouteMeta, setActiveCategory]);

    if (!tool) {
        return <Navigate to="/" replace />;
    }

    const swapTool = tool.swapId ? TOOLS.find(t => t.id === tool.swapId) : null;
    const steps = subRouteMeta?.steps || getDefaultSteps(tool);
    const comparisonTable = subRouteMeta?.comparisonTable || getDefaultComparisonTable(tool);
    const faqs = subRouteMeta?.faqs || tool.faqs;

    return (
        <div className={`animate-fade-in ${isMobile ? 'p-0 pb-20' : 'p-4 md:p-6'}`}>
            <div className={`${isMobile ? '' : 'max-w-7xl mx-auto'}`}>
                {/* Breadcrumb Navigation */}
                {!isMobile && (
                    <div className="flex items-center gap-2 mb-4 text-sm">
                        <button
                            onClick={() => navigate('/')}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            All tools
                        </button>
                        <span className="text-zinc-700">/</span>
                        <button
                            onClick={() => navigate(`/category/${tool.category.toLowerCase()}`)}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            {tool.category}
                        </button>
                        <span className="text-zinc-700">/</span>
                        <button
                            onClick={() => navigate(`/${tool.id}`)}
                            className="text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                            {tool.title}
                        </button>
                        {subRouteMeta && (
                            <>
                                <span className="text-zinc-700">/</span>
                                <span className="text-indigo-400 font-medium">{subRouteMeta.sourceFormat && subRouteMeta.targetFormat ? `${subRouteMeta.sourceFormat} to ${subRouteMeta.targetFormat}` : subRouteMeta.slug}</span>
                            </>
                        )}
                    </div>
                )}

                {/*
                 * Above the Fold: Zero-friction Tool Container
                 */}
                <div className={isMobile ? 'pb-20' : 'h-[calc(100vh-128px)] overflow-hidden'}>
                    {tool.component}
                </div>

                {/* Below the Fold: Rich Educational & SEO Sections */}
                <div className="mt-8 pb-20">
                    <SEOSections
                        toolId={tool.id}
                        category={tool.category}
                        guideTitle={subRouteMeta?.guideTitle || tool.guideTitle}
                        guideContent={subRouteMeta?.guideContent || tool.guideContent}
                        steps={steps}
                        comparisonTable={comparisonTable}
                        faqs={faqs}
                        specs={tool.specs}
                        privacyNotes={tool.privacyNotes}
                        beforeAfterImage={tool.beforeAfterImage}
                        relatedToolIds={tool.relatedToolIds}
                    />
                </div>
            </div>

            {/* Swap Tool Floating Pill Button */}
            {swapTool && (
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
