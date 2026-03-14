/// <reference lib="dom" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/EditorControls';
import {
    Code2, Download, Copy, Check, RefreshCcw, Maximize2,
    Eye, Layers, Zap, Shield, MonitorPlay
} from 'lucide-react';
import html2canvas from 'html2canvas';

type ExportFormat = 'png' | 'jpeg' | 'webp';
type CanvasScale = 1 | 2 | 3;

const STARTER_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 800px;
    height: 450px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1117 100%);
    font-family: 'Inter', system-ui, sans-serif;
    overflow: hidden;
  }
  .card {
    text-align: center;
    padding: 48px;
    border-radius: 24px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(99,102,241,0.3);
    backdrop-filter: blur(20px);
    box-shadow: 0 0 80px rgba(99,102,241,0.15), 0 32px 64px rgba(0,0,0,0.5);
  }
  .badge {
    display: inline-block;
    padding: 6px 16px;
    background: rgba(99,102,241,0.15);
    border: 1px solid rgba(99,102,241,0.4);
    border-radius: 100px;
    color: #818cf8;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 24px;
  }
  h1 {
    font-size: 48px;
    font-weight: 900;
    color: #fff;
    letter-spacing: -0.03em;
    line-height: 1.1;
    margin-bottom: 16px;
  }
  h1 span { color: #818cf8; }
  p {
    font-size: 18px;
    color: rgba(255,255,255,0.5);
    line-height: 1.6;
    max-width: 400px;
    margin: 0 auto;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">✦ Adopt Canva</div>
    <h1>Turn <span>HTML</span><br/>into Images</h1>
    <p>Edit the code on the left to design anything — then export as PNG, JPEG, or WebP.</p>
  </div>
</body>
</html>`;

export const HtmlToImage: React.FC = () => {
    const [code, setCode] = useState(STARTER_TEMPLATE);
    const [format, setFormat] = useState<ExportFormat>('png');
    const [scale, setScale] = useState<CanvasScale>(2);
    const [quality, setQuality] = useState(95);
    const [isCapturing, setIsCapturing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [previewKey, setPreviewKey] = useState(0);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const previewDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Update preview with debounce
    useEffect(() => {
        clearTimeout(previewDebounce.current);
        previewDebounce.current = setTimeout(() => {
            setPreviewKey(k => k + 1);
        }, 600);
        return () => clearTimeout(previewDebounce.current);
    }, [code]);

    const getBlobUrl = useCallback(() => {
        const blob = new Blob([code], { type: 'text/html' });
        return URL.createObjectURL(blob);
    }, [code]);

    const [blobUrl, setBlobUrl] = useState<string>('');

    useEffect(() => {
        const url = getBlobUrl();
        setBlobUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [previewKey, getBlobUrl]);

    const capture = async (): Promise<HTMLCanvasElement | null> => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentDocument || !iframe.contentDocument.body) return null;

        try {
            const canvas = await html2canvas(iframe.contentDocument.body, {
                scale,
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                logging: false,
                width: iframe.contentDocument.documentElement.scrollWidth,
                height: iframe.contentDocument.documentElement.scrollHeight,
                windowWidth: iframe.contentDocument.documentElement.scrollWidth,
                windowHeight: iframe.contentDocument.documentElement.scrollHeight,
            });
            return canvas;
        } catch (e) {
            console.error('Capture failed:', e);
            return null;
        }
    };

    const handleDownload = async () => {
        setIsCapturing(true);
        try {
            const canvas = await capture();
            if (!canvas) return;

            const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
            const q = format === 'png' ? 1 : quality / 100;
            const dataUrl = canvas.toDataURL(mimeType, q);

            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `html-export.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } finally {
            setIsCapturing(false);
        }
    };

    const handleCopyImage = async () => {
        setIsCapturing(true);
        try {
            const canvas = await capture();
            if (!canvas) return;
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                try {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                } catch { /* Clipboard API blocked in some browsers */ }
            }, 'image/png');
        } finally {
            setIsCapturing(false);
        }
    };

    const FORMATS: { id: ExportFormat; label: string }[] = [
        { id: 'png', label: 'PNG' },
        { id: 'jpeg', label: 'JPEG' },
        { id: 'webp', label: 'WebP' },
    ];

    const SCALES: { value: CanvasScale; label: string }[] = [
        { value: 1, label: '1× (72 dpi)' },
        { value: 2, label: '2× (144 dpi)' },
        { value: 3, label: '3× (216 dpi)' },
    ];

    return (
        <div className="max-w-7xl mx-auto h-[85vh] flex flex-col animate-slide-up selection:bg-indigo-500/30">

            {/* Top bar */}
            <div className="flex items-center justify-between mb-3 gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <Code2 size={18} className="text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white font-unbounded tracking-tight">HTML → Image</h2>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Design in code · Export as image</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="border-zinc-800 hover:border-indigo-500/50 text-xs"
                        onClick={() => setCode(STARTER_TEMPLATE)}
                    >
                        <RefreshCcw size={13} className="mr-1.5" /> Reset
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="border-zinc-800 hover:border-indigo-500/50 text-xs"
                        onClick={handleCopyImage}
                        disabled={isCapturing}
                    >
                        {copied ? <Check size={13} className="mr-1.5 text-green-400" /> : <Copy size={13} className="mr-1.5" />}
                        {copied ? 'Copied!' : 'Copy Image'}
                    </Button>
                    <Button
                        size="sm"
                        className="bg-white text-black hover:bg-zinc-200 border-none text-xs font-bold"
                        onClick={handleDownload}
                        isLoading={isCapturing}
                        disabled={isCapturing}
                    >
                        <Download size={13} className="mr-1.5" /> Export {format.toUpperCase()}
                    </Button>
                </div>
            </div>

            {/* Main split layout */}
            <div className="flex-1 flex gap-4 min-h-0">

                {/* Left: Code Editor */}
                <div className="w-[420px] shrink-0 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-xl">
                    <div className="h-10 px-4 border-b border-zinc-800 flex items-center gap-2 shrink-0">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest ml-1">index.html</span>
                    </div>
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="flex-1 bg-transparent p-4 font-mono text-xs text-zinc-300 resize-none outline-none leading-relaxed custom-scrollbar focus:ring-1 focus:ring-indigo-500/30 placeholder:text-zinc-700"
                        spellCheck={false}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                    />
                </div>

                {/* Middle: Preview */}
                <div className="flex-1 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-xl relative">
                    {/* preview label */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-lg px-2.5 py-1.5">
                        <Eye size={11} className="text-indigo-400" />
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Live Preview</span>
                    </div>

                    {/* checkerboard bg */}
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                    <iframe
                        ref={iframeRef}
                        key={blobUrl}
                        src={blobUrl}
                        sandbox="allow-scripts allow-same-origin"
                        className="flex-1 w-full border-0 rounded-2xl"
                        title="HTML Preview"
                    />
                </div>

                {/* Right: Settings */}
                <div className="w-52 shrink-0 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-xl">
                    <div className="h-10 px-4 border-b border-zinc-800 flex items-center gap-2 shrink-0">
                        <MonitorPlay size={13} className="text-indigo-400" />
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-unbounded">Export</span>
                    </div>

                    <div className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">

                        {/* Format */}
                        <section className="space-y-2">
                            <SectionLabel>Format</SectionLabel>
                            <div className="flex flex-col gap-1.5">
                                {FORMATS.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setFormat(f.id)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all border ${format === f.id
                                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                            : 'border-zinc-800 text-zinc-500 hover:border-indigo-500/40 hover:text-zinc-300 hover:bg-indigo-500/5'
                                            }`}
                                    >
                                        {f.label}
                                        {format === f.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Scale */}
                        <section className="space-y-2">
                            <SectionLabel>Resolution</SectionLabel>
                            <div className="flex flex-col gap-1.5">
                                {SCALES.map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => setScale(s.value)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all border ${scale === s.value
                                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                            : 'border-zinc-800 text-zinc-500 hover:border-indigo-500/40 hover:text-zinc-300 hover:bg-indigo-500/5'
                                            }`}
                                    >
                                        {s.label}
                                        {scale === s.value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Quality (JPEG/WebP only) */}
                        {format !== 'png' && (
                            <section className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <SectionLabel>Quality</SectionLabel>
                                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{quality}%</span>
                                </div>
                                <input
                                    type="range" min={60} max={100} value={quality}
                                    onChange={(e) => setQuality(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </section>
                        )}

                        {/* Info */}
                        <section className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-800 space-y-2">
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Tips</p>
                            <ul className="space-y-1.5 text-[9px] text-zinc-600 font-bold uppercase leading-relaxed">
                                <li>Set explicit <span className="text-zinc-400">width + height</span> on body</li>
                                <li>Use inline styles for fonts</li>
                                <li><span className="text-zinc-400">2×</span> recommended for sharp exports</li>
                            </ul>
                        </section>

                        <Button
                            className="w-full h-10 bg-white text-black hover:bg-zinc-200 border-none text-[10px] font-black uppercase tracking-widest"
                            onClick={handleDownload}
                            isLoading={isCapturing}
                            disabled={isCapturing}
                        >
                            <Download size={14} className="mr-1.5" /> Export
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
};
