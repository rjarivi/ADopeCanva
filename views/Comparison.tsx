import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { TOOLS } from './Dashboard';
import { 
    Check, X, Zap, Shield, Sparkles, ArrowRight, Layers, 
    DollarSign, Lock, Unlock, FileCheck, RefreshCw 
} from 'lucide-react';
import { updateHeadTags, SITE_URL, SITE_NAME } from '../utils/seoHelper';

interface CompetitorData {
    name: string;
    title: string;
    h1: string;
    metaDesc: string;
    tagline: string;
    price: string;
    cloudUpload: string;
    accountRequired: string;
    watermarks: string;
    weaknesses: string[];
    strengths: string[];
    comparisonRows: { feature: string; competitor: string | boolean; adopecanva: string | boolean }[];
    faqs: { question: string; answer: string }[];
}

const COMPETITORS: Record<string, CompetitorData> = {
    adobe: {
        name: 'Adobe Creative Cloud / Express',
        title: 'Free Adobe Alternative Online - 100% In-Browser & Private',
        h1: 'AdopeCanva vs Adobe Creative Cloud: The Free In-Browser Alternative',
        metaDesc: 'Looking for a free Adobe alternative? AdopeCanva offers 60+ in-browser media utilities — image converters, video editors, PDF redactors, and GIF makers — with 0 server uploads, 0 subscriptions, and no signup.',
        tagline: 'Skip the $55/month subscription and 20GB downloads. Get instant media tools inside your browser.',
        price: '$54.99/mo (Creative Cloud) or $9.99/mo (Express)',
        cloudUpload: 'Yes (Mandatory cloud upload or heavy desktop install)',
        accountRequired: 'Mandatory Adobe ID & payment method',
        watermarks: 'Requires paid plan for premium exports',
        weaknesses: [
            'Expensive monthly recurring subscriptions ($240–$660/year)',
            'Heavy desktop installers that consume gigabytes of storage & RAM',
            'Mandatory account creation and credit card prompts',
            'Cloud uploads that expose sensitive corporate images and documents'
        ],
        strengths: [
            '100% Free Forever with no paywalls or hidden upsells',
            'Zero install needed — instant WebAssembly/Canvas processing in any browser',
            'Complete file privacy — your data never leaves your computer RAM',
            'Batch image conversion (AVIF, WebP, HEIC, PNG, JPG, BMP, ICO)'
        ],
        comparisonRows: [
            { feature: 'Price / Month', competitor: '$54.99/mo', adopecanva: '$0 Free Forever' },
            { feature: 'Account / Signup Required', competitor: 'Mandatory', adopecanva: 'Zero Signup (0s setup)' },
            { feature: 'Processing Location', competitor: 'Remote Cloud Servers', adopecanva: '100% Local Browser RAM' },
            { feature: 'Installation Required', competitor: '20GB+ Installers', adopecanva: 'Zero Install (Web-based)' },
            { feature: 'Image Converter (AVIF, WebP, HEIC)', competitor: 'Requires Photoshop/Bridge', adopecanva: 'Instant Batch Converter' },
            { feature: 'True PDF Redaction (Pixel-Burn)', competitor: 'Acrobat Pro Only ($19.99/mo)', adopecanva: 'Free In-Browser Tool' },
            { feature: 'Quick Video Editor & Trimmer', competitor: 'Premiere Pro ($239/yr)', adopecanva: 'Free Instant Trimmer' },
            { feature: 'Data Privacy & GDPR', competitor: 'Cloud Stored', adopecanva: '100% Private (No upload)' }
        ],
        faqs: [
            { question: 'Is AdopeCanva really a free alternative to Adobe?', answer: 'Yes. For fast everyday media tasks like converting image formats, trimming videos, editing GIFs, redacting PDFs, and formatting data, AdopeCanva gives you instant tools without Adobe subscriptions or heavy installs.' },
            { question: 'Do I need an account or credit card?', answer: 'No. You can use every single one of our 60+ tools instantly with zero registration.' },
            { question: 'How is AdopeCanva faster than Adobe Creative Cloud?', answer: 'AdopeCanva executes modern WebAssembly (Wasm) directly inside your web browser. You do not need to download multi-gigabyte apps or wait for cloud sync.' }
        ]
    },
    canva: {
        name: 'Canva',
        title: 'Free Canva Alternative - No Signup In-Browser Media Suite',
        h1: 'AdopeCanva vs Canva: The Fast, No-Signup Media Toolkit',
        metaDesc: 'Compare AdopeCanva against Canva. Access 60+ free image converters, mockup generators, background removers, video editors, and format shifters with zero paywalls, no login, and complete client-side privacy.',
        tagline: 'All the practical utilities you wish Canva gave you without a paywall or login prompt.',
        price: '$12.99/mo (Canva Pro) or restricted Free tier',
        cloudUpload: 'Yes (All assets saved on Canva cloud)',
        accountRequired: 'Mandatory Canva Login',
        watermarks: 'Free tier restricts high-res exports and premium tools',
        weaknesses: [
            'Aggressive paywalls on basic utility features (transparent PNG, format export)',
            'Forces you to create an account and log in just to convert or resize a file',
            'All your personal photos and design assets are uploaded and stored in the cloud',
            'Slow cloud rendering queues for video and animation exports'
        ],
        strengths: [
            '100% Free with all format exports unlocked (AVIF, WebP, PNG, SVG, PDF, ICO)',
            'No login or account needed — open the page and drop your file',
            'Local client-side execution — 0 latency and complete offline security',
            'Specialized developer and technical tools (SVG to Code, Markdown Creator, Code Formatter)'
        ],
        comparisonRows: [
            { feature: 'Cost for Full Features', competitor: '$12.99/mo (Canva Pro)', adopecanva: '$0 (100% Free)' },
            { feature: 'Signup / Login Required', competitor: 'Mandatory', adopecanva: 'None (Instant access)' },
            { feature: 'Transparent Background Export', competitor: 'Paywalled (Pro Only)', adopecanva: 'Free' },
            { feature: 'Format Support (AVIF, ICO, BMP, HEIC)', competitor: 'Limited', adopecanva: 'Full Matrix Supported' },
            { feature: 'Mockup Generator (iPhone, Mac, Window)', competitor: 'Limited Smartmockups', adopecanva: 'Full 3K Export Frame Suite' },
            { feature: 'File Privacy', competitor: 'Cloud Stored', adopecanva: '100% Client-Side In-Memory' },
            { feature: 'GIF & Video Trimmer', competitor: 'Requires Project Setup', adopecanva: 'Instant Drag & Drop' }
        ],
        faqs: [
            { question: 'Why choose AdopeCanva over Canva?', answer: 'Canva is great for complex templates, but if you need to quickly convert images, wrap a screenshot in a mockup, trim an audio track, or compress a GIF, Canva forces you through signups, paywalls, and slow cloud rendering. AdopeCanva solves it in 1 click.' },
            { question: 'Are export resolutions limited like Canva Free?', answer: 'No. You can export mockups at up to 3× retina resolution (3600×2700 px) and images at original full quality with zero watermarks.' }
        ]
    },
    ezgif: {
        name: 'Ezgif',
        title: 'Modern Ezgif Alternative - Ad-Free, Fast & In-Browser',
        h1: 'AdopeCanva vs Ezgif: Modern, Ad-Free Media Conversion',
        metaDesc: 'Compare AdopeCanva against Ezgif. Experience modern, dark-mode, ad-free image and video conversion with 0 server uploads, batch ZIP downloads, and instant WebAssembly rendering.',
        tagline: 'Say goodbye to 1990s web interfaces, slow server queues, and distracting pop-up ads.',
        price: 'Free (Ad-Supported)',
        cloudUpload: 'Yes (Files uploaded to remote servers)',
        accountRequired: 'No',
        watermarks: 'No',
        weaknesses: [
            'Cluttered layout with dozens of intrusive ads and tracking scripts',
            'Upload file size limits (often 35MB–50MB)',
            'Slow server-side processing queues during peak hours',
            'Outdated legacy user interface'
        ],
        strengths: [
            'Modern, sleek, dark-mode UI/UX with smooth micro-interactions',
            'Zero server uploads — files process at local GPU/CPU hardware speeds',
            'Batch processing with one-click ZIP download',
            '60+ complementary tools including PDF, Audio, and Developer utilities'
        ],
        comparisonRows: [
            { feature: 'Interface & Design', competitor: 'Cluttered Legacy Layout', adopecanva: 'Modern Dark Glassmorphism' },
            { feature: 'Ad Density', competitor: 'Heavy Banner Ads', adopecanva: 'Clean & Distraction-Free' },
            { feature: 'Processing Engine', competitor: 'Remote Server Queues', adopecanva: 'Local WebAssembly & Canvas' },
            { feature: 'Batch ZIP Export', competitor: 'Limited', adopecanva: 'Full Multi-file ZIP Export' },
            { feature: 'File Size Limits', competitor: 'Strict 35–50MB Limits', adopecanva: 'Handled by Local RAM' },
            { feature: 'Video & Audio Suite', competitor: 'GIF / Video Only', adopecanva: '60+ Omnitool Suite' }
        ],
        faqs: [
            { question: 'Is AdopeCanva faster than Ezgif?', answer: 'Yes! Because AdopeCanva does not upload your files to remote servers, conversion starts the millisecond you drop your file without waiting for network transfers.' }
        ]
    }
};

export const Comparison: React.FC = () => {
    const { competitor } = useParams();
    const navigate = useNavigate();

    const normalizedSlug = (competitor || 'adobe').toLowerCase().replace('-alternative', '').replace('vs-', '');
    const data: CompetitorData = COMPETITORS[normalizedSlug] || COMPETITORS.adobe;

    useEffect(() => {
        const canonicalUrl = `${SITE_URL}/vs/${normalizedSlug}`;
        
        updateHeadTags({
            title: `${data.title} | ${SITE_NAME}`,
            description: data.metaDesc,
            canonicalUrl,
            keywords: [
                `${normalizedSlug} alternative`,
                `adobe alternative`,
                `canva alternative`,
                `adobe image converter`,
                `canva image tools`,
                `free online image converter`,
                `adopecanva vs ${data.name.toLowerCase()}`
            ],
            schemas: [
                {
                    '@context': 'https://schema.org',
                    '@type': 'Article',
                    'headline': data.h1,
                    'description': data.metaDesc,
                    'author': { '@type': 'Organization', 'name': SITE_NAME, 'url': SITE_URL },
                    'publisher': { '@type': 'Organization', 'name': SITE_NAME, 'url': SITE_URL },
                    'mainEntityOfPage': canonicalUrl
                },
                {
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    'mainEntity': data.faqs.map(faq => ({
                        '@type': 'Question',
                        'name': faq.question,
                        'acceptedAnswer': {
                            '@type': 'Answer',
                            'text': faq.answer
                        }
                    }))
                },
                {
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    'itemListElement': [
                        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
                        { '@type': 'ListItem', 'position': 2, 'name': `AdopeCanva vs ${data.name}`, 'item': canonicalUrl }
                    ]
                }
            ]
        });
    }, [normalizedSlug, data]);

    return (
        <div className="min-h-screen bg-[#070709] text-zinc-100 py-16 px-4 md:px-8">
            <div className="max-w-5xl mx-auto space-y-16 animate-fade-in">
                {/* Header Badge & Hero */}
                <div className="text-center space-y-5 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                        <Sparkles size={14} />
                        <span>2026 Competitive Benchmark</span>
                    </div>

                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight font-unbounded leading-tight">
                        {data.h1}
                    </h1>

                    <p className="text-base md:text-lg text-zinc-400 font-medium">
                        {data.tagline}
                    </p>
                </div>

                {/* Quick Side-by-Side Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Competitor Box */}
                    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 md:p-8 space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                            <div>
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Traditional Option</span>
                                <h3 className="text-xl font-bold text-zinc-300 mt-1">{data.name}</h3>
                            </div>
                            <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                                <Lock size={20} />
                            </div>
                        </div>

                        <ul className="space-y-3.5 text-sm text-zinc-400">
                            {data.weaknesses.map((w, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <X className="text-red-500/80 shrink-0 mt-0.5" size={16} />
                                    <span>{w}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* AdopeCanva Box */}
                    <div className="bg-gradient-to-br from-indigo-950/40 to-zinc-900/60 border border-indigo-500/30 rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden shadow-2xl shadow-indigo-950/30">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex items-center justify-between pb-4 border-b border-indigo-500/20">
                            <div>
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Modern In-Browser Suite</span>
                                <h3 className="text-xl font-bold text-white mt-1">AdopeCanva</h3>
                            </div>
                            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                <Zap size={20} />
                            </div>
                        </div>

                        <ul className="space-y-3.5 text-sm text-zinc-200">
                            {data.strengths.map((s, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <Check className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                                    <span className="font-medium">{s}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Feature Comparison Matrix Table */}
                <div className="space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl md:text-3xl font-bold text-white font-unbounded">Head-to-Head Feature Matrix</h2>
                        <p className="text-sm text-zinc-400">Direct technical comparison between {data.name} and AdopeCanva</p>
                    </div>

                    <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/80 overflow-hidden shadow-xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-800/60 border-b border-zinc-800">
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-zinc-400">Feature / Capability</th>
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-zinc-400 text-center">{data.name}</th>
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-indigo-400 text-center bg-indigo-500/10">AdopeCanva</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-sm">
                                {data.comparisonRows.map((row, i) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 px-6 text-zinc-300 font-semibold">{row.feature}</td>
                                        <td className="py-4 px-6 text-center text-zinc-400">
                                            {typeof row.competitor === 'boolean' ? (
                                                row.competitor ? <Check className="mx-auto text-emerald-400" size={18} /> : <X className="mx-auto text-zinc-600" size={18} />
                                            ) : (
                                                <span>{row.competitor}</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center font-bold text-white bg-indigo-500/5">
                                            {typeof row.adopecanva === 'boolean' ? (
                                                row.adopecanva ? <Check className="mx-auto text-emerald-400" size={18} /> : <X className="mx-auto text-red-400" size={18} />
                                            ) : (
                                                <span className="text-indigo-300">{row.adopecanva}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Popular Alternatives Quick Links */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">Compare With Other Tools</h3>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {[
                            { slug: 'adobe', label: 'vs Adobe Creative Cloud' },
                            { slug: 'canva', label: 'vs Canva Pro' },
                            { slug: 'ezgif', label: 'vs Ezgif' }
                        ].map(comp => (
                            <Link
                                key={comp.slug}
                                to={`/vs/${comp.slug}`}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${normalizedSlug === comp.slug ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
                            >
                                {comp.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* FAQ Accordions for Rich Snippets */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white font-unbounded text-center">Frequently Asked Questions</h2>
                    <div className="space-y-3 max-w-3xl mx-auto">
                        {data.faqs.map((faq, idx) => (
                            <details key={idx} className="group p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 open:border-indigo-500/40 transition-colors">
                                <summary className="font-bold text-zinc-200 cursor-pointer list-none flex items-center justify-between text-base">
                                    <span>{faq.question}</span>
                                    <span className="text-indigo-400 text-lg group-open:rotate-45 transition-transform">+</span>
                                </summary>
                                <p className="mt-3 text-sm text-zinc-400 leading-relaxed pl-1">
                                    {faq.answer}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>

                {/* Call to Action Banner */}
                <div className="text-center py-12 px-6 bg-gradient-to-b from-indigo-950/30 to-indigo-900/10 rounded-3xl border border-indigo-500/20 space-y-6">
                    <h2 className="text-2xl md:text-4xl font-black text-white font-unbounded">
                        Switch to Instant In-Browser Media Tools
                    </h2>
                    <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto">
                        Zero subscription fees. Zero software installs. 100% private client-side processing.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider font-unbounded shadow-xl shadow-indigo-600/30 active:scale-95 transition-all"
                    >
                        <span>Launch Free Online Tools</span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
