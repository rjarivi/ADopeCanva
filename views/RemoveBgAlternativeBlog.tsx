import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Eraser, Shield, Check, X, ArrowRight, 
    Share2, Copy, CheckCircle2, ChevronRight, 
    Cpu, ExternalLink 
} from 'lucide-react';
import { BackgroundRemover } from './tools/BackgroundRemover';
import { updateHeadTags, SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../utils/seoHelper';

export const RemoveBgAlternativeBlog: React.FC = () => {
    const navigate = useNavigate();
    const [copiedEmbed, setCopiedEmbed] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const canonicalUrl = `${SITE_URL}/remove-bg-alternative`;
    const embedCode = `<iframe src="${SITE_URL}/bg-remover?embed=true" width="100%" height="650" frameborder="0" style="border-radius: 16px; border: 1px solid #27272a;" title="Free In-Browser Background Remover | AdopeCanva"></iframe>\n<p style="font-size: 12px; color: #71717a; text-align: center; margin-top: 8px;">Free background remover provided by <a href="${SITE_URL}/bg-remover" target="_blank" rel="noopener noreferrer" style="color: #6366f1; text-decoration: underline;">AdopeCanva</a></p>`;

    useEffect(() => {
        window.scrollTo(0, 0);

        const title = 'Best Free Remove.bg Alternative in 2026: 100% In-Browser & Private | AdopeCanva';
        const description = 'Looking for the best Remove.bg alternative? Discover why on-device AI background removal has replaced cloud upload tools. Remove image backgrounds for free with 0 server uploads, no credit limits, and full-resolution transparent PNG exports.';
        const keywords = [
            'remove.bg alternative',
            'best remove.bg alternative',
            'free remove bg alternative',
            'remove.bg shutting down alternative',
            'remove background free',
            'remove background online without upload',
            'transparent background maker',
            'private background remover',
            'unlimited background remover free',
            'on device ai background removal',
            'modnet in browser',
            'photoroom alternative free'
        ];

        updateHeadTags({
            title,
            description,
            keywords,
            canonicalUrl,
            ogType: 'article',
            schemas: [
                {
                    '@context': 'https://schema.org',
                    '@type': 'BlogPosting',
                    'mainEntityOfPage': {
                        '@type': 'WebPage',
                        '@id': canonicalUrl
                    },
                    'headline': 'Best Free Remove.bg Alternative in 2026: 100% In-Browser, Unlimited & Private',
                    'description': description,
                    'image': DEFAULT_OG_IMAGE,
                    'author': {
                        '@type': 'Organization',
                        'name': 'AdopeCanva AI & Privacy Engineering Team',
                        'url': SITE_URL
                    },
                    'publisher': {
                        '@type': 'Organization',
                        'name': SITE_NAME,
                        'url': SITE_URL,
                        'logo': {
                            '@type': 'ImageObject',
                            'url': `${SITE_URL}/adopecanva.svg`
                        }
                    },
                    'datePublished': '2026-09-16',
                    'dateModified': '2026-09-16'
                },
                {
                    '@context': 'https://schema.org',
                    '@type': 'WebApplication',
                    'name': 'AdopeCanva Smart BG Remover',
                    'url': `${SITE_URL}/bg-remover`,
                    'applicationCategory': 'MultimediaApplication, DesignApplication',
                    'operatingSystem': 'All (Web Browser)',
                    'browserRequirements': 'Requires HTML5 and WebAssembly support',
                    'offers': {
                        '@type': 'Offer',
                        'price': '0',
                        'priceCurrency': 'USD'
                    },
                    'featureList': [
                        'Zero server uploads (100% in-browser WebAssembly execution)',
                        'Unlimited full-resolution transparent PNG downloads',
                        'MODNet neural portrait and object matting',
                        'No registration, signup, or subscription fees',
                        'Works completely offline once cached'
                    ]
                },
                {
                    '@context': 'https://schema.org',
                    '@type': 'HowTo',
                    'name': 'How to Remove Backgrounds from Photos for Free with Zero Uploads',
                    'description': 'Follow these 3 easy steps to extract transparent PNG cutouts locally using on-device AI.',
                    'step': [
                        {
                            '@type': 'HowToStep',
                            'position': 1,
                            'name': 'Select or Drop an Image',
                            'text': 'Upload any portrait, product photo, or logo. The image is loaded directly into your browser RAM without touching any cloud server.'
                        },
                        {
                            '@type': 'HowToStep',
                            'position': 2,
                            'name': 'Run In-Browser Neural Matting',
                            'text': 'Click Remove Background. The local MODNet neural network isolates foreground subjects and hair in seconds.'
                        },
                        {
                            '@type': 'HowToStep',
                            'position': 3,
                            'name': 'Download Full-Resolution PNG',
                            'text': 'Save your high-resolution 32-bit transparent PNG cutout with zero watermarks.'
                        }
                    ]
                },
                {
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    'mainEntity': [
                        {
                            '@type': 'Question',
                            'name': 'What is the best alternative to Remove.bg now that it is shutting down?',
                            'acceptedAnswer': {
                                '@type': 'Answer',
                                'text': 'AdopeCanva Smart BG Remover is the #1 free alternative to Remove.bg. Unlike Remove.bg which charges up to $1.99 per image and uploads your photos to external servers, AdopeCanva processes 100% locally on your computer via ONNX WebAssembly. It offers unlimited full-resolution transparent PNG downloads with zero cost and complete privacy.'
                            }
                        },
                        {
                            '@type': 'Question',
                            'name': 'Why are cloud background removers risky for privacy?',
                            'acceptedAnswer': {
                                '@type': 'Answer',
                                'text': 'When you use cloud background removers like Remove.bg or PhotoRoom, your images are transmitted across the internet to remote third-party servers. This poses serious confidentiality and GDPR compliance risks for personal portraits, medical imagery, unreleased e-commerce products, and legal documents. AdopeCanva solves this by executing the entire neural matting model directly inside your browser memory.'
                            }
                        },
                        {
                            '@type': 'Question',
                            'name': 'Does AdopeCanva limit free downloads to low-resolution previews?',
                            'acceptedAnswer': {
                                '@type': 'Answer',
                                'text': 'No. Remove.bg notoriously restricts free users to tiny 0.25-megapixel previews (612×408 px) and charges credits for HD. AdopeCanva exports at full source resolution (up to 4K and beyond) with 100% transparent alpha channels and no watermarks.'
                            }
                        },
                        {
                            '@type': 'Question',
                            'name': 'Do I need an account, credit card, or API key?',
                            'acceptedAnswer': {
                                '@type': 'Answer',
                                'text': 'No. AdopeCanva requires zero account registration, no credit cards, and no API keys. You can use it as often as you want with no limits.'
                            }
                        }
                    ]
                },
                {
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    'itemListElement': [
                        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
                        { '@type': 'ListItem', 'position': 2, 'name': 'Blog & Guides', 'item': `${SITE_URL}/guides` },
                        { '@type': 'ListItem', 'position': 3, 'name': 'Remove.bg Alternative', 'item': canonicalUrl }
                    ]
                }
            ]
        });
    }, [canonicalUrl]);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(canonicalUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        } catch (err) {
            console.error('Failed to copy URL', err);
        }
    };

    const handleCopyEmbed = async () => {
        try {
            await navigator.clipboard.writeText(embedCode);
            setCopiedEmbed(true);
            setTimeout(() => setCopiedEmbed(false), 2000);
        } catch (err) {
            console.error('Failed to copy embed code', err);
        }
    };

    return (
        <article className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 md:px-8">
            <div className="max-w-4xl mx-auto space-y-12">
                
                {/* Breadcrumbs */}
                <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-xs text-zinc-500">
                    <Link to="/" className="hover:text-zinc-300 transition-colors">Home</Link>
                    <span>/</span>
                    <Link to="/guides" className="hover:text-zinc-300 transition-colors">Guides</Link>
                    <span>/</span>
                    <span className="text-zinc-400 font-medium">Remove.bg Alternative</span>
                </nav>

                {/* Header / Hero */}
                <header className="space-y-6 text-left">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                            Industry Update • 2026
                        </span>
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                            <Shield size={12} /> 100% In-Browser & Private
                        </span>
                        <span className="text-xs text-zinc-500">
                            6 min read • Verified by AI Systems Team
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight font-unbounded leading-tight">
                        Best Free Remove.bg Alternative in 2026: 100% In-Browser, Unlimited & Private
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-300 leading-relaxed font-normal">
                        With cloud-based background removers facing shut downs, aggressive subscription paywalls, and mounting privacy concerns, <span className="text-white font-semibold">on-device AI neural matting</span> has taken over. Here is why AdopeCanva is the premier, zero-cost successor to Remove.bg.
                    </p>

                    {/* Author & Share Bar */}
                    <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                AC
                            </div>
                            <div>
                                <div className="font-semibold text-zinc-200">AdopeCanva Core Engineering</div>
                                <div className="text-[11px] text-zinc-500">Client-Side AI & WebAssembly Research</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyLink}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white transition-all text-xs"
                            >
                                {copiedLink ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Share2 size={13} />}
                                <span>{copiedLink ? 'Copied Link!' : 'Share'}</span>
                            </button>
                            <Link
                                to="/vs/remove-bg"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/20 transition-all text-xs font-medium"
                            >
                                <span>View vs Matrix</span>
                                <ChevronRight size={13} />
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Direct Zero-Bounce Intent Resolution: Live Interactive Tool Embed */}
                <section className="bg-zinc-900/90 rounded-3xl p-6 md:p-8 border border-zinc-800 shadow-2xl relative overflow-hidden space-y-4" style={{ boxShadow: '0 8px 32px rgba(79,70,229,0.15)' }}>
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                                <Eraser size={18} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white">Try the Alternative Right Here</h2>
                                <p className="text-xs text-zinc-400">Interactive live tool — no uploads, no account, runs directly on your device.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/bg-remover')}
                            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            <span>Open Dedicated Page</span>
                            <ExternalLink size={12} />
                        </button>
                    </div>

                    {/* Embedded Tool Component */}
                    <div className="pt-2">
                        <BackgroundRemover />
                    </div>
                </section>

                {/* Section 1: The Fall of Remove.bg & Why Cloud Removers Failed */}
                <section className="space-y-4 leading-relaxed text-zinc-300">
                    <h2 className="text-2xl md:text-3xl font-bold text-white font-unbounded tracking-tight pt-4">
                        1. Why Remove.bg Users Are Flocking to Local Alternatives
                    </h2>
                    <p>
                        For years, <strong>Remove.bg</strong> was the default bookmark for graphic designers, e-commerce managers, and casual users who needed to cut out a subject from an image. But behind its convenience lay four fatal compromises that modern creators are no longer willing to accept:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                                <X size={16} />
                                <span>The 0.25MP Downscale Trap</span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Remove.bg’s &ldquo;free&rdquo; tier capped downloads at an abysmal <strong>612 × 408 pixels</strong> (0.25 megapixels). If you needed an original high-resolution photo for print, Shopify, or YouTube thumbnails, you were forced to pay expensive credits.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                                <X size={16} />
                                <span>Extortionate Credit Packs ($1.99/img)</span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Paid credits often expired, and subscriptions started at $9/month for a mere 40 images. For studios processing hundreds of product catalog shots, monthly costs easily surpassed hundreds of dollars.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                                <X size={16} />
                                <span>Severe Data Privacy & Security Risks</span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Every single file was uploaded to remote cloud servers. For corporate headshots, confidential NDA product prototypes, family photos, or medical ID badges, sending unencrypted images over the wire is a major compliance liability.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                                <X size={16} />
                                <span>Network Latency & Server Queues</span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Uploading a 25MB photo over mobile data or slow Wi-Fi, waiting in a server processing queue, and downloading the result created unnecessary friction for everyday creative workflows.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 2: How In-Browser Neural Matting Works (The Tech Paradigm Shift) */}
                <section className="space-y-5 leading-relaxed text-zinc-300">
                    <h2 className="text-2xl md:text-3xl font-bold text-white font-unbounded tracking-tight pt-4">
                        2. How AdopeCanva Runs AI 100% Inside Your Browser
                    </h2>
                    <p>
                        AdopeCanva completely eliminates the server from the equation. Instead of shipping your pixels to a data center, we compile cutting-edge computer vision models into <strong>WebAssembly (WASM)</strong> and execute inference directly on your device’s GPU and multi-core CPU.
                    </p>

                    <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Cpu size={20} className="text-indigo-400" />
                            <span>The Architecture Behind Zero-Upload Background Removal</span>
                        </h3>
                        <ul className="space-y-3 text-sm text-zinc-300">
                            <li className="flex items-start gap-2.5">
                                <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span><strong>Multi-Model Freedom (100% Apache-2.0 Open Source):</strong> Users can choose between multiple client-side models tailored to their content with zero commercial restrictions:
                                    <span className="block mt-1 pl-2 text-xs text-zinc-400 space-y-1">
                                        <span>• <strong>BiRefNet (BG0 Engine):</strong> Bilateral Reference Network (the engine behind open-source projects like <a href="https://bg0.dev" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">bg0.dev</a>). Excels at complex transparent fabrics, fine hair, and crisp multi-subject segmentation.</span><br/>
                                        <span>• <strong>MODNet:</strong> Lightweight (~25MB) portrait specialist designed for fast execution, minimal memory usage, and clean selfies.</span>
                                    </span>
                                </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span><strong>ONNX Runtime Web:</strong> Machine learning weights are formatted in open ONNX standards, executed via WebAssembly SIMD and WebGPU hardware acceleration natively in Chrome, Safari, Firefox, and Edge.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span><strong>Local Memory Pipeline:</strong> When you drop an image, it is read into the browser’s Canvas buffer. The segmentation mask is generated locally, applied via alpha channel compositing, and exported as a 32-bit RGBA PNG. Zero network packets leave your machine.</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Section 3: Feature Matrix Comparison Table */}
                <section className="space-y-5">
                    <h2 className="text-2xl md:text-3xl font-bold text-white font-unbounded tracking-tight pt-4">
                        3. Head-to-Head Comparison: Remove.bg vs AdopeCanva
                    </h2>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                        Here is how the legacy cloud model compares directly with AdopeCanva’s client-side privacy architecture:
                    </p>

                    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/50">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="py-3.5 px-4">Feature / Metric</th>
                                    <th className="py-3.5 px-4 text-rose-400">Remove.bg (Legacy)</th>
                                    <th className="py-3.5 px-4 text-indigo-400 font-bold bg-indigo-950/20">AdopeCanva Smart BG Remover</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-zinc-300 text-xs md:text-sm">
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-white">Cost per HD Image</td>
                                    <td className="py-3.5 px-4 text-rose-400 font-medium">$0.20 to $1.99 / image</td>
                                    <td className="py-3.5 px-4 text-emerald-400 font-bold bg-indigo-950/20">$0 Free Forever (Unlimited)</td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-white">Free Export Resolution</td>
                                    <td className="py-3.5 px-4 text-zinc-400">Low-res 0.25MP preview (612×408)</td>
                                    <td className="py-3.5 px-4 text-emerald-400 font-bold bg-indigo-950/20">Full Original Resolution (4K+)</td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-white">Where Pixels Are Processed</td>
                                    <td className="py-3.5 px-4 text-zinc-400">Remote Cloud Servers</td>
                                    <td className="py-3.5 px-4 text-indigo-300 font-semibold bg-indigo-950/20">100% In-Browser RAM (Local)</td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-white">File Upload Required</td>
                                    <td className="py-3.5 px-4 text-rose-400">Yes (Mandatory server upload)</td>
                                    <td className="py-3.5 px-4 text-emerald-400 font-bold bg-indigo-950/20">Never (0 Server Uploads)</td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-white">Account / Signup Required</td>
                                    <td className="py-3.5 px-4 text-zinc-400">Yes (Required for full-res)</td>
                                    <td className="py-3.5 px-4 text-emerald-400 font-bold bg-indigo-950/20">None (Instant 1-Click Access)</td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-white">Offline Functionality</td>
                                    <td className="py-3.5 px-4 text-rose-400">Fails without internet connection</td>
                                    <td className="py-3.5 px-4 text-emerald-400 font-semibold bg-indigo-950/20">Works Offline Once Model Cached</td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-semibold text-white">Commercial Rights</td>
                                    <td className="py-3.5 px-4 text-zinc-400">Subject to paid licensing tiers</td>
                                    <td className="py-3.5 px-4 text-emerald-400 font-semibold bg-indigo-950/20">100% Royalty-Free Commercial Use</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Section 4: 5 Essential Use Cases */}
                <section className="space-y-5 leading-relaxed text-zinc-300">
                    <h2 className="text-2xl md:text-3xl font-bold text-white font-unbounded tracking-tight pt-4">
                        4. Who Benefits Most from Private In-Browser Background Removal?
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">1</span>
                                <span>Shopify & Amazon E-Commerce Sellers</span>
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Clean, pure-white or transparent backgrounds convert up to 30% better on Amazon and Shopify. Strip messy backgrounds from inventory shots in bulk without incurring hundred-dollar monthly cloud API bills.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">2</span>
                                <span>Confidential Corporate Headshots & HR</span>
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Uploading employee portraits or executive team headshots to unknown third-party cloud servers violates strict corporate privacy policies. AdopeCanva processes all headshots locally with zero data leakage.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">3</span>
                                <span>YouTube Thumbnails & Content Creators</span>
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Cut out portrait reactions and gaming poses with crisp hair strand separation. Layer the transparent PNG cutout directly into our <Link to="/image-editor" className="text-indigo-400 underline hover:text-indigo-300">Pro Image Editor</Link> for borders, glows, and text.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">4</span>
                                <span>Graphic Designers & Agency Teams</span>
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Eliminate tedious pen-tool clipping in Photoshop for standard mockups and marketing banners. Isolate foreground subjects in seconds with zero subscription overhead.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 5: Embed on Your Own Site */}
                <section className="bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-900 rounded-3xl p-6 md:p-8 border border-indigo-500/20 space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400">
                            <Cpu size={14} />
                            <span>Embeddable Widget for Webmasters & Bloggers</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-white font-unbounded">
                            Want to Offer Free Background Removal on Your Own Site?
                        </h2>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                            You can embed the AdopeCanva Smart BG Remover directly into your blog, agency portal, or documentation site. It executes locally in your readers&apos; browsers with zero hosting costs for you.
                        </p>
                    </div>

                    <div className="relative bg-zinc-950 rounded-xl p-4 border border-zinc-800 font-mono text-xs text-zinc-400 overflow-x-auto">
                        <code>{embedCode}</code>
                        <button
                            onClick={handleCopyEmbed}
                            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-sans font-semibold transition-all flex items-center gap-1.5"
                        >
                            {copiedEmbed ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            <span>{copiedEmbed ? 'Copied Code!' : 'Copy Embed Snippet'}</span>
                        </button>
                    </div>
                </section>

                {/* Section 6: FAQ Accordion */}
                <section className="space-y-5">
                    <h2 className="text-2xl md:text-3xl font-bold text-white font-unbounded tracking-tight pt-4">
                        Frequently Asked Questions (FAQs)
                    </h2>
                    
                    <div className="space-y-3">
                        {[
                            {
                                q: 'What is the best free alternative to Remove.bg now that it is shutting down?',
                                a: 'AdopeCanva Smart BG Remover is the premier free alternative. Unlike Remove.bg which requires cloud uploads and paid credits for full-resolution downloads, AdopeCanva uses in-browser neural networks (MODNet with WebAssembly) to isolate subjects locally on your device with 100% privacy, zero uploads, and unlimited free exports.'
                            },
                            {
                                q: 'Is this background remover truly free forever without credit limits?',
                                a: 'Yes. Because AdopeCanva runs the AI model on your local device hardware using client-side WebAssembly, there are no cloud GPU server bills to pay per image. That allows us to keep the tool 100% free with unlimited high-resolution exports forever.'
                            },
                            {
                                q: 'Are my private photos uploaded to any server or used to train AI models?',
                                a: 'Never. Your images never leave your computer or smartphone RAM. No files are saved to any cloud storage, and zero images are harvested for machine learning training. Your privacy is mathematically guaranteed by the architecture.'
                            },
                            {
                                q: 'What image formats and resolutions are supported?',
                                a: 'You can upload PNG, JPG, JPEG, and WebP images. Outputs are exported as 32-bit transparent PNG files at original source resolution (supporting resolutions up to 4K and beyond, bounded only by your browser RAM).'
                            },
                            {
                                q: 'How does it handle fine details like hair and furry pets?',
                                a: 'The underlying MODNet neural matting model is specifically engineered to handle complex alpha gradient transitions, capturing fine wisps of hair, fur, and semi-transparent fabric silhouettes cleanly without jagged pixel artifacts.'
                            },
                            {
                                q: 'Can I use the output cutouts for commercial projects?',
                                a: 'Yes! All transparent PNG cutouts produced by AdopeCanva are 100% royalty-free for both personal and commercial use (Shopify stores, Amazon product listings, freelance client design work, print materials, etc.).'
                            }
                        ].map((faq, i) => (
                            <details key={i} className="group p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 open:border-indigo-500/40 transition-colors">
                                <summary className="font-bold text-zinc-200 cursor-pointer list-none flex items-center justify-between text-base">
                                    <span>{faq.q}</span>
                                    <span className="text-indigo-400 text-lg group-open:rotate-45 transition-transform">+</span>
                                </summary>
                                <p className="mt-3 text-sm text-zinc-400 leading-relaxed pl-1">
                                    {faq.a}
                                </p>
                            </details>
                        ))}
                    </div>
                </section>

                {/* Final CTA Banner */}
                <section className="text-center py-12 px-6 bg-gradient-to-b from-indigo-950/30 to-zinc-900 rounded-3xl border border-indigo-500/20 space-y-6">
                    <h2 className="text-2xl md:text-4xl font-black text-white font-unbounded">
                        Ready to Cut Out Images 100% Privately?
                    </h2>
                    <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto">
                        No credit packs. No low-res preview traps. Zero server uploads. Jump into the dedicated tool page or bookmark it for daily workflow.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/bg-remover')}
                            className="inline-flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/30 active:scale-95 transition-all"
                        >
                            <span>Open Smart BG Remover</span>
                            <ArrowRight size={16} />
                        </button>
                        <Link
                            to="/vs/remove-bg"
                            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-6 py-3.5 rounded-xl font-bold text-sm transition-all"
                        >
                            <span>Compare with Remove.bg</span>
                            <ChevronRight size={15} />
                        </Link>
                    </div>
                </section>

            </div>
        </article>
    );
};
