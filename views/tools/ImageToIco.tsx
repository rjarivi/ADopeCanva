import React, { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import {
    Image as ImageIcon, Download, CheckCircle, RefreshCcw,
    FileArchive, Zap, Sparkles, Globe, Copy, Check,
    ChevronRight, Package, Shield, ExternalLink, SlidersHorizontal
} from 'lucide-react';
import JSZip from 'jszip';
import { preprocessImageFileData } from '../../utils/imagePreprocess';

// --- ICO Generation ---

async function resizeToCanvas(img: HTMLImageElement, size: number): Promise<Uint8Array> {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('Canvas toBlob failed');
    return new Uint8Array(await blob.arrayBuffer());
}

async function buildIco(img: HTMLImageElement, sizes: number[]): Promise<ArrayBuffer> {
    const pngs = await Promise.all(sizes.map(s => resizeToCanvas(img, s)));
    const count = pngs.length;
    const headerSize = 6 + count * 16;
    const totalSize = headerSize + pngs.reduce((s, p) => s + p.length, 0);
    const buf = new ArrayBuffer(totalSize);
    const view = new DataView(buf);
    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true);
    view.setUint16(4, count, true);
    let offset = headerSize;
    pngs.forEach((png, i) => {
        const base = 6 + i * 16;
        const s = sizes[i];
        view.setUint8(base, s === 256 ? 0 : s);
        view.setUint8(base + 1, s === 256 ? 0 : s);
        view.setUint8(base + 2, 0);
        view.setUint8(base + 3, 0);
        view.setUint16(base + 4, 1, true);
        view.setUint16(base + 6, 32, true);
        view.setUint32(base + 8, png.length, true);
        view.setUint32(base + 12, offset, true);
        new Uint8Array(buf).set(png, offset);
        offset += png.length;
    });
    return buf;
}

// --- Constants ---

const ALL_ICO_SIZES = [16, 32, 48, 64, 128, 256];

type BundlePresetKey = 'standard' | 'extended' | 'custom';

const BUNDLE_PRESETS: { key: BundlePresetKey; label: string; sizes: number[]; desc: string }[] = [
    { key: 'standard', label: 'Standard', sizes: [16, 32, 48], desc: '16, 32, 48px — browser tabs & taskbar' },
    { key: 'extended', label: 'Extended', sizes: [16, 32, 48, 64, 128, 256], desc: '16–256px — max compatibility' },
    { key: 'custom', label: 'Custom', sizes: [], desc: 'Pick your own ICO sizes' },
];

type SinglePresetKey = 'p16' | 'p32' | 'p48' | 'p64' | 'p128' | 'p256' | 'custom';

const SINGLE_PRESETS: { key: SinglePresetKey; label: string; size: number | null }[] = [
    { key: 'p16', label: '16px', size: 16 },
    { key: 'p32', label: '32px', size: 32 },
    { key: 'p48', label: '48px', size: 48 },
    { key: 'p64', label: '64px', size: 64 },
    { key: 'p128', label: '128px', size: 128 },
    { key: 'p256', label: '256px', size: 256 },
    { key: 'custom', label: 'Custom', size: null },
];

// Fixed PNG outputs always in bundle (platform standards)
const BUNDLE_PNG_OUTPUTS: [string, number][] = [
    ['favicon-16x16.png', 16],
    ['favicon-32x32.png', 32],
    ['favicon-48x48.png', 48],
    ['apple-touch-icon.png', 180],
    ['android-chrome-192x192.png', 192],
    ['android-chrome-512x512.png', 512],
];

// --- Snippets ---

const HTML_SNIPPET = `<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;

const NEXTJS_SNIPPET = `// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};`;

const VITE_SNIPPET = `<!-- index.html <head> -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;

const SNIPPETS: Record<string, string> = {
    HTML: HTML_SNIPPET,
    'Next.js': NEXTJS_SNIPPET,
    Vite: VITE_SNIPPET,
};

// --- Subcomponents ---

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={copy}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-zinc-700/50"
        >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
}

function PreviewSizes({ imgSrc }: { imgSrc: string }) {
    const previews = [
        { label: 'original', size: 80 },
        { label: '32px', size: 32 },
        { label: '16px', size: 16 },
    ];
    return (
        <div className="flex items-end gap-5 flex-wrap">
            {previews.map(({ label, size }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                    <div
                        className="rounded-lg border border-zinc-700 bg-[repeating-conic-gradient(#27272a_0%_25%,#1c1c1f_0%_50%)] bg-[length:16px_16px] flex items-center justify-center overflow-hidden"
                        style={{ width: Math.max(size, 32) + 16, height: Math.max(size, 32) + 16 }}
                    >
                        <img
                            src={imgSrc}
                            alt={label}
                            style={{ width: size, height: size, imageRendering: size <= 32 ? 'pixelated' : 'auto', objectFit: 'cover' }}
                        />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">{label}</span>
                </div>
            ))}
        </div>
    );
}

// --- Main Component ---

export const ImageToIco: React.FC = () => {
    const [file, setFile] = useState<FileData | null>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);

    const handleFileSelect = async (selectedFile: FileData) => {
        const processed = await preprocessImageFileData(selectedFile);
        setFile(processed);
    };

    const [bundleMode, setBundleMode] = useState(true);

    // Bundle dimension state
    const [bundlePreset, setBundlePreset] = useState<BundlePresetKey>('standard');
    const [bundleCustomSizes, setBundleCustomSizes] = useState<number[]>([16, 32, 48]);

    // Single ICO dimension state
    const [singlePreset, setSinglePreset] = useState<SinglePresetKey>('p32');
    const [singleCustomValue, setSingleCustomValue] = useState<string>('64');
    const [singleCustomError, setSingleCustomError] = useState<string>('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('HTML');
    const imgRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        if (!file) { setImgSrc(null); return; }
        const url = URL.createObjectURL(file.file);
        setImgSrc(url);
        const img = new Image();
        img.src = url;
        imgRef.current = img;
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // Derived: actual ICO sizes to use
    const bundleIcoSizes = bundlePreset === 'custom'
        ? bundleCustomSizes
        : BUNDLE_PRESETS.find(p => p.key === bundlePreset)!.sizes;

    const singleSize = (() => {
        if (singlePreset === 'custom') {
            const v = parseInt(singleCustomValue, 10);
            return isNaN(v) ? null : v;
        }
        return SINGLE_PRESETS.find(p => p.key === singlePreset)!.size;
    })();

    const canGenerate = bundleMode
        ? bundleIcoSizes.length > 0
        : singleSize !== null && singleSize >= 1 && singleSize <= 256;

    const validateCustomSingle = (val: string) => {
        const n = parseInt(val, 10);
        if (!val) { setSingleCustomError('Enter a size'); return; }
        if (isNaN(n) || n < 1 || n > 256) { setSingleCustomError('Must be 1–256'); return; }
        setSingleCustomError('');
    };

    const handleConvert = async () => {
        const img = imgRef.current;
        if (!img || !canGenerate) return;

        setIsProcessing(true);
        setIsDone(false);
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setDownloadUrl(null);

        try {
            await new Promise<void>((res, rej) => {
                if (img.complete && img.naturalWidth) res();
                else { img.onload = () => res(); img.onerror = rej; }
            });

            if (!bundleMode) {
                const icoBuf = await buildIco(img, [singleSize!]);
                const blob = new Blob([icoBuf], { type: 'image/x-icon' });
                setDownloadUrl(URL.createObjectURL(blob));
            } else {
                const zip = new JSZip();

                // favicon.ico with selected sizes
                const icoBuf = await buildIco(img, bundleIcoSizes);
                zip.file('favicon.ico', icoBuf);

                // Fixed PNG outputs
                for (const [name, size] of BUNDLE_PNG_OUTPUTS) {
                    const png = await resizeToCanvas(img, size);
                    zip.file(name, png);
                }

                // site.webmanifest
                zip.file('site.webmanifest', JSON.stringify({
                    name: '',
                    short_name: '',
                    icons: [
                        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
                        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
                    ],
                    theme_color: '#ffffff',
                    background_color: '#ffffff',
                    display: 'standalone',
                }, null, 2));

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                setDownloadUrl(URL.createObjectURL(zipBlob));
            }

            setIsDone(true);
        } catch (err) {
            console.error(err);
            alert('Error generating favicon. Please try a different image.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!downloadUrl || !file) return;
        const a = document.createElement('a');
        a.href = downloadUrl;
        const base = file.file.name.replace(/\.[^.]+$/, '') || 'favicon';
        a.download = bundleMode ? `${base}_favicon_bundle.zip` : `favicon_${singleSize}x${singleSize}.ico`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleReset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setImgSrc(null);
        setIsDone(false);
        setIsProcessing(false);
        setDownloadUrl(null);
        imgRef.current = null;
    };

    const toggleBundleCustomSize = (size: number) => {
        setBundleCustomSizes(prev =>
            prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size].sort((a, b) => a - b)
        );
    };

    // --- Upload screen ---
    if (!file) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <ImageIcon size={32} /> Favicon Generator
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Convert any image into pixel-perfect favicons and app icons. Full SEO bundle or single ICO — all in your browser.
                    </p>
                </div>

                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept="image/*, .heic, .heif, .avif"
                        label="Upload Image"
                        description="Supports JPG, PNG, WEBP, AVIF, HEIC, SVG"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Zap, label: 'Instant & Private', desc: 'No server uploads' },
                        { icon: Package, label: 'Full SEO Bundle', desc: 'ICO + PNG + Manifest' },
                        { icon: Globe, label: 'App Icon Sizes', desc: 'iOS, Android, PWA' },
                        { icon: Sparkles, label: 'Transparency', desc: 'Alpha preserved' },
                    ].map((feat, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors cursor-default group">
                            <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                                <feat.icon size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-zinc-200">{feat.label}</h3>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mt-1 group-hover:text-zinc-400 transition-colors">{feat.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Credit */}
                <p className="mt-6 text-xs text-zinc-600">
                    Inspired by{' '}
                    <a
                        href="https://github.com/atybdot/favcn"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
                    >
                        favcn <ExternalLink size={10} />
                    </a>
                    {' '}— open source favicon generator
                </p>
            </div>
        );
    }

    // --- Editor screen ---
    return (
        <div className="max-w-4xl mx-auto animate-slide-up space-y-4 pb-10">

            {/* Header bar */}
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {imgSrc && (
                        <div className="w-12 h-12 rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden flex items-center justify-center flex-shrink-0">
                            <img src={imgSrc} alt="preview" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-zinc-100">{file.file.name}</h3>
                        <p className="text-sm text-zinc-500">{file.size} · {file.type}</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset} disabled={isProcessing}>
                    <RefreshCcw size={14} className="mr-1.5" /> Change
                </Button>
            </div>

            {/* Preview + Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Preview */}
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5 space-y-4">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Preview</p>
                    {imgSrc && <PreviewSizes imgSrc={imgSrc} />}
                    <p className="text-xs text-zinc-600">Sizes shown as they appear in a browser tab</p>
                </div>

                {/* Mode + action */}
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5 space-y-4 flex flex-col">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Export Mode</p>

                    {/* Mode radio buttons */}
                    <div className="space-y-2">
                        {[
                            { val: true, icon: Package, label: 'Full SEO Bundle', sub: 'favicon.ico + PNG variants + apple-touch + android + manifest', badge: 'Recommended' },
                            { val: false, icon: ImageIcon, label: 'Single ICO', sub: 'One .ico file at a chosen size', badge: null },
                        ].map(({ val, icon: Icon, label, sub, badge }) => (
                            <button
                                key={String(val)}
                                onClick={() => { if (!isDone) { setBundleMode(val); setIsDone(false); } }}
                                disabled={isDone}
                                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left ${bundleMode === val ? 'border-indigo-500/60 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'}`}
                            >
                                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${bundleMode === val ? 'border-indigo-500' : 'border-zinc-600'}`}>
                                    {bundleMode === val && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-zinc-100 flex items-center gap-2 flex-wrap">
                                        <Icon size={13} className={bundleMode === val ? 'text-indigo-400' : 'text-zinc-500'} />
                                        {label}
                                        {badge && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">{badge}</span>}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1" />

                    {!isDone ? (
                        <Button onClick={handleConvert} isLoading={isProcessing} size="lg" className="w-full h-11" disabled={!canGenerate}>
                            {isProcessing ? 'Generating...' : bundleMode ? 'Generate Bundle' : `Generate ICO${singleSize ? ` (${singleSize}×${singleSize})` : ''}`}
                        </Button>
                    ) : (
                        <div className="space-y-3 animate-scale-in">
                            <div className="flex items-center gap-2 text-green-400 font-medium justify-center p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-sm">
                                <CheckCircle size={16} /> Ready to download!
                            </div>
                            <Button size="lg" className="w-full h-11" onClick={handleDownload}>
                                {bundleMode
                                    ? <><FileArchive size={15} className="mr-2" /> Download Bundle (.zip)</>
                                    : <><Download size={15} className="mr-2" /> Download favicon.ico</>
                                }
                            </Button>
                            <button
                                onClick={() => setIsDone(false)}
                                className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
                            >
                                Change options
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Dimension controls */}
            {!isDone && (
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal size={14} className="text-indigo-400" />
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                            {bundleMode ? 'ICO Sizes in Bundle' : 'Output Size'}
                        </p>
                    </div>

                    {bundleMode ? (
                        <div className="space-y-3">
                            {/* Preset tabs */}
                            <div className="flex gap-2 flex-wrap">
                                {BUNDLE_PRESETS.map(preset => (
                                    <button
                                        key={preset.key}
                                        onClick={() => setBundlePreset(preset.key)}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${bundlePreset === preset.key
                                            ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                                            : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-200'
                                        }`}
                                    >
                                        {preset.label}
                                        {preset.key !== 'custom' && (
                                            <span className="ml-1.5 opacity-60 font-normal">
                                                {preset.sizes.join(', ')}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Custom checkboxes */}
                            {bundlePreset === 'custom' && (
                                <div className="space-y-2">
                                    <p className="text-xs text-zinc-500">Select which sizes to embed in favicon.ico:</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {ALL_ICO_SIZES.map(size => {
                                            const selected = bundleCustomSizes.includes(size);
                                            return (
                                                <button
                                                    key={size}
                                                    onClick={() => toggleBundleCustomSize(size)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${selected
                                                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                                                        : 'bg-zinc-800/30 text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
                                                    }`}
                                                >
                                                    {selected && <Check size={10} className="inline mr-1" />}
                                                    {size}px
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {bundleCustomSizes.length === 0 && (
                                        <p className="text-xs text-amber-400/80">Select at least one size</p>
                                    )}
                                </div>
                            )}

                            {/* Desc */}
                            <p className="text-xs text-zinc-600">
                                {bundlePreset !== 'custom'
                                    ? BUNDLE_PRESETS.find(p => p.key === bundlePreset)!.desc
                                    : `${bundleCustomSizes.length} size${bundleCustomSizes.length !== 1 ? 's' : ''} selected — PNG outputs (16, 32, 48, 180, 192, 512px) are always included`
                                }
                                {bundlePreset !== 'custom' && ' — PNG outputs (16, 32, 48, 180, 192, 512px) are always included'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Single preset chips */}
                            <div className="flex gap-2 flex-wrap">
                                {SINGLE_PRESETS.map(preset => (
                                    <button
                                        key={preset.key}
                                        onClick={() => { setSinglePreset(preset.key); setSingleCustomError(''); }}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${singlePreset === preset.key
                                            ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                                            : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-200'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>

                            {/* Custom input */}
                            {singlePreset === 'custom' && (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            max={256}
                                            value={singleCustomValue}
                                            onChange={e => {
                                                setSingleCustomValue(e.target.value);
                                                validateCustomSingle(e.target.value);
                                            }}
                                            placeholder="e.g. 96"
                                            className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono"
                                        />
                                        <span className="text-xs text-zinc-500">px (1–256)</span>
                                    </div>
                                    {singleCustomError && (
                                        <span className="text-xs text-red-400">{singleCustomError}</span>
                                    )}
                                </div>
                            )}

                            {singlePreset !== 'custom' && (
                                <p className="text-xs text-zinc-600">
                                    Output: {singleSize}×{singleSize}px favicon.ico
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Bundle file list */}
            {bundleMode && (
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Files in bundle</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {/* Dynamic ICO entry */}
                        <div className="flex items-center gap-2">
                            <ChevronRight size={12} className="text-indigo-400 flex-shrink-0" />
                            <span className="text-zinc-200 font-mono text-xs">favicon.ico</span>
                            <span className="text-zinc-600 text-xs">— multi-size ({bundleIcoSizes.join(', ')}px)</span>
                        </div>
                        {[
                            { name: 'favicon-16x16.png', desc: 'small icon' },
                            { name: 'favicon-32x32.png', desc: 'standard icon' },
                            { name: 'favicon-48x48.png', desc: 'taskbar / windows' },
                            { name: 'apple-touch-icon.png', desc: 'iOS home screen (180px)' },
                            { name: 'android-chrome-192x192.png', desc: 'android icon' },
                            { name: 'android-chrome-512x512.png', desc: 'android splash' },
                            { name: 'site.webmanifest', desc: 'PWA manifest' },
                        ].map(({ name, desc }) => (
                            <div key={name} className="flex items-center gap-2">
                                <ChevronRight size={12} className="text-indigo-400 flex-shrink-0" />
                                <span className="text-zinc-200 font-mono text-xs">{name}</span>
                                <span className="text-zinc-600 text-xs">— {desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Installation instructions */}
            {bundleMode && (
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
                    <div className="p-5 border-b border-zinc-800">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Installation</p>
                        <p className="text-sm text-zinc-400">
                            Extract the zip into your{' '}
                            <code className="bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded text-xs font-mono">public</code>
                            {' '}folder, then add the links to your project.
                        </p>
                    </div>

                    <div className="flex border-b border-zinc-800">
                        {Object.keys(SNIPPETS).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2.5 text-sm font-medium transition-colors ${activeTab === tab ? 'text-white border-b-2 border-indigo-500 -mb-px' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 relative">
                        <div className="absolute top-3 right-3">
                            <CopyButton text={SNIPPETS[activeTab]} />
                        </div>
                        <pre className="text-xs text-zinc-300 font-mono leading-relaxed overflow-x-auto pr-16 whitespace-pre-wrap">
                            {SNIPPETS[activeTab]}
                        </pre>
                    </div>

                    <div className="px-5 pb-5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-zinc-600">
                            <Shield size={12} className="text-indigo-500/60" />
                            All files generated locally — nothing is uploaded.
                        </div>
                        <a
                            href="https://github.com/atybdot/favcn"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-zinc-600 hover:text-indigo-400 transition-colors flex items-center gap-1"
                        >
                            Inspired by favcn <ExternalLink size={10} />
                        </a>
                    </div>
                </div>
            )}

            {/* Credit for single mode */}
            {!bundleMode && (
                <div className="flex justify-end">
                    <a
                        href="https://github.com/atybdot/favcn"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-600 hover:text-indigo-400 transition-colors flex items-center gap-1"
                    >
                        Inspired by favcn <ExternalLink size={10} />
                    </a>
                </div>
            )}
        </div>
    );
};
