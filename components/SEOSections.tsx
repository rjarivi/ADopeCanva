import React from 'react';
import { FAQItem, SpecItem } from '../types';
import { HelpCircle, Shield, Cpu, ChevronDown } from 'lucide-react';
import { BeforeAfter } from './BeforeAfter';

interface SEOSectionsProps {
    guideTitle?: string;
    guideContent?: string;
    faqs?: FAQItem[];
    specs?: SpecItem[];
    privacyNotes?: string;
    beforeAfterImage?: {
        before: string;
        after: string;
        alt: string;
    };
}

export const SEOSections: React.FC<SEOSectionsProps> = ({
    guideTitle,
    guideContent,
    faqs,
    specs,
    privacyNotes,
    beforeAfterImage
}) => {
    if (!guideTitle && !faqs?.length && !specs?.length && !privacyNotes && !beforeAfterImage) return null;

    return (
        <div className="mt-16 space-y-12 max-w-4xl mx-auto pb-20 px-4">
            {/* Guide Section */}
            {guideTitle && guideContent && (
                <section className="bg-zinc-900/50 rounded-3xl p-8 border border-zinc-800 backdrop-blur-sm space-y-8">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <HelpCircle className="text-indigo-400" size={24} />
                            {guideTitle}
                        </h2>
                        <p className="text-zinc-400 leading-relaxed text-lg">
                            {guideContent}
                        </p>
                    </div>

                    {beforeAfterImage && (
                        <div className="pt-4">
                            <BeforeAfter
                                before={beforeAfterImage.before}
                                after={beforeAfterImage.after}
                                alt={beforeAfterImage.alt}
                            />
                        </div>
                    )}
                </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Specs Section */}
                {specs && specs.length > 0 && (
                    <section className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 px-2">
                            <Cpu className="text-emerald-400" size={20} />
                            Technical Specifications
                        </h3>
                        <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden">
                            <table className="w-full text-left">
                                <tbody className="divide-y divide-zinc-800/50">
                                    {specs.map((spec, i) => (
                                        <tr key={i} className="group hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-4 text-zinc-500 font-medium text-sm">{spec.label}</td>
                                            <td className="py-3 px-4 text-zinc-200 text-sm text-right font-mono">{spec.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Privacy Section */}
                {privacyNotes && (
                    <section className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 px-2">
                            <Shield className="text-blue-400" size={20} />
                            Privacy & Security
                        </h3>
                        <div className="bg-indigo-500/5 rounded-2xl border border-indigo-500/10 p-6 flex flex-col justify-center h-[calc(100%-2.5rem)]">
                            <p className="text-zinc-300 text-sm leading-relaxed italic">
                                "{privacyNotes}"
                            </p>
                            <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                100% In-Browser Processing
                            </div>
                        </div>
                    </section>
                )}
            </div>

            {/* FAQ Section */}
            {faqs && faqs.length > 0 && (
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-white text-center">Frequently Asked Questions</h2>
                    <div className="grid gap-4">
                        {faqs.map((faq, i) => (
                            <details key={i} className="group bg-zinc-900/30 rounded-2xl border border-zinc-800 open:bg-zinc-900/50 transition-all duration-300">
                                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                                    <span className="text-lg font-semibold text-zinc-200 group-hover:text-white transition-colors">
                                        {faq.question}
                                    </span>
                                    <ChevronDown className="text-zinc-500 group-open:rotate-180 transition-transform duration-300" size={20} />
                                </summary>
                                <div className="px-6 pb-6 text-zinc-400 leading-relaxed border-t border-zinc-800 pt-4">
                                    {faq.answer}
                                </div>
                            </details>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};
