import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/EditorControls';
import {
    Code2, Download, Copy, Check, RefreshCcw,
    Eye, MonitorPlay, Zap, Shield, Image
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
    <div class="badge">✦ ADopeCanva</div>
    <h1>Turn <span>HTML</span><br/>into Images</h1>
    <p>Edit the code on the left — then export as PNG, JPEG, or WebP.</p>
  </div>
</body>
</html>`;

/**
 * Capture HTML code as a canvas by injecting it into an off-screen div.
 * Uses DOMParser to extract styles + body content, applies them to a
 * temporary container, runs html2canvas, then cleans up.
 */
const captureHtml = async (code: string, scale: CanvasScale): Promise<HTMLCanvasElement | null> => {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(code, 'text/html');

    // Extract body dimensions from CSS
    const allStyles = Array.from(parsed.querySelectorAll('style'))
        .map(s => s.textContent || '')
        .join('\n');
    const bodyInlineStyle = parsed.body.getAttribute('style') || '';

    const wMatch = bodyInlineStyle.match(/width:\s*(\d+)px/) ||
        allStyles.match(/body\s*\{[^}]*width:\s*(\d+)px/);
    const hMatch = bodyInlineStyle.match(/height:\s*(\d+)px/) ||
        allStyles.match(/body\s*\{[^}]*height:\s*(\d+)px/);
    const capW = wMatch ? parseInt(wMatch[1]) : 800;
    const capH = hMatch ? parseInt(hMatch[1]) : 450;

    // Build off-screen container
    const wrap = document.createElement('div');
    wrap.setAttribute('data-hti', '');
    wrap.style.cssText = `position:fixed;left:-99999px;top:0;width:${capW}px;height:${capH}px;overflow:hidden;`;

    // Apply body background / layout props to the container
    const bodyStyle = parsed.body.style;
    (['background', 'backgroundColor', 'display', 'alignItems', 'justifyContent', 'flexDirection'] as const)
        .forEach(prop => {
            const val = bodyStyle[prop as any];
            if (val) (wrap.style as any)[prop] = val;
        });

    wrap.innerHTML = parsed.body.innerHTML;

    // Scoped style: rewrite `body` selector → [data-hti] so it doesn't affect the parent page
    const tempStyle = document.createElement('style');
    tempStyle.textContent = allStyles.replace(/\bbody\b/g, '[data-hti]');
    document.head.appendChild(tempStyle);
    document.body.appendChild(wrap);

    try {
        return await html2canvas(wrap, {
            scale,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
            width: capW,
            height: capH,
            windowWidth: capW,
            windowHeight: capH,
        });
    } catch (err) {
        console.error('html2canvas error:', err);
        return null;
    } finally {
        document.head.removeChild(tempStyle);
        document.body.removeChild(wrap);
    }
};

export const HtmlToImage: React.FC = () => {
    const [code, setCode] = useState(STARTER_TEMPLATE);
    const [format, setFormat] = useState<ExportFormat>('png');
    const [scale, setScale] = useState<CanvasScale>(2);
    const [quality, setQuality] = useState(95);
    const [isCapturing, setIsCapturing] = useState(false);
    const [copied, setCopied] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Debounce preview updates → write directly to iframe srcdoc
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (iframeRef.current) {
                iframeRef.current.srcdoc = code;
            }
        }, 500);
        return () => clearTimeout(debounceRef.current);
    }, [code]);

    // Set initial iframe content
    useEffect(() => {
        if (iframeRef.current) {
            iframeRef.current.srcdoc = STARTER_TEMPLATE;
        }
    }, []);

    const handleDownload = useCallback(async () => {
        setIsCapturing(true);
        try {
            const canvas = await captureHtml(code, scale);
            if (!canvas) return;
            const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
            const q = format === 'png' ? 1 : quality / 100;
            const a = document.createElement('a');
            a.href = canvas.toDataURL(mime, q);
            a.download = `html-export.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } finally {
            setIsCapturing(false);
        }
    }, [code, format, scale, quality]);

    const handleCopyImage = useCallback(async () => {
        setIsCapturing(true);
        try {
            const canvas = await captureHtml(code, scale);
            if (!canvas) return;
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                try {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                } catch { /* clipboard write may be blocked */ }
            }, 'image/png');
        } finally {
            setIsCapturing(false);
        }
    }, [code, scale]);

    const FORMATS: { id: ExportFormat; label: string; desc: string }[] = [
        { id: 'png', label: 'PNG', desc: 'Lossless, supports transparency' },
        { id: 'jpeg', label: 'JPEG', desc: 'Smaller file, no transparency' },
        { id: 'webp', label: 'WebP', desc: 'Best compression ratio' },
    ];

    const SCALES: { value: CanvasScale; label: string; desc: string }[] = [
        { value: 1, label: '1×', desc: '72 dpi — standard web' },
        { value: 2, label: '2×', desc: '144 dpi — retina' },
        { value: 3, label: '3×', desc: '216 dpi — print ready' },
    ];

    return (
        <div className="max-w-[1400px] mx-auto flex flex-col gap-3 animate-slide-up selection:bg-indigo-500/30" style={{ height: 'calc(100vh - 140px)', minHeight: 560 }}>

            {/* Top bar */}
            <div className="flex items-center justify-between shrink-0 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
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
                        className="border-zinc-800 hover:border-indigo-500/40 text-xs gap-1.5"
                        onClick={() => {
                            setCode(STARTER_TEMPLATE);
                            if (iframeRef.current) iframeRef.current.srcdoc = STARTER_TEMPLATE;
                        }}
                    >
                        <RefreshCcw size={12} /> Reset
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="border-zinc-800 hover:border-indigo-500/40 text-xs gap-1.5"
                        onClick={handleCopyImage}
                        disabled={isCapturing}
                    >
                        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                        {copied ? 'Copied!' : 'Copy Image'}
                    </Button>
                    <Button
                        size="sm"
                        className="bg-indigo-600 text-white hover:bg-indigo-500 border-none text-xs font-black gap-1.5"
                        onClick={handleDownload}
                        isLoading={isCapturing}
                        disabled={isCapturing}
                    >
                        <Download size={12} /> Export {format.toUpperCase()}
                    </Button>
                </div>
            </div>

            {/* 3-column layout */}
            <div className="flex-1 flex gap-3 min-h-0">

                {/* Code Editor */}
                <div className="w-[400px] shrink-0 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-xl">
                    <div className="h-9 px-4 border-b border-zinc-800 flex items-center gap-2 shrink-0 bg-zinc-950/60">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest ml-1 font-mono">index.html</span>
                    </div>
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="flex-1 bg-transparent p-4 font-mono text-[11px] text-zinc-300 resize-none outline-none leading-relaxed custom-scrollbar"
                        spellCheck={false}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                    />
                </div>

                {/* Live Preview */}
                <div className="flex-1 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-xl relative min-w-0">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(#a5b4fc 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg px-2.5 py-1.5 pointer-events-none">
                        <Eye size={11} className="text-indigo-400" />
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Live Preview</span>
                    </div>
                    <iframe
                        ref={iframeRef}
                        className="flex-1 w-full border-0"
                        title="HTML Preview"
                        sandbox="allow-scripts"
                    />
                </div>

                {/* Export Settings */}
                <div className="w-[196px] shrink-0 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-xl">
                    <div className="h-9 px-4 border-b border-zinc-800 flex items-center gap-2 shrink-0 bg-zinc-950/60">
                        <MonitorPlay size={12} className="text-indigo-400" />
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-unbounded">Export</span>
                    </div>

                    <div className="flex-1 p-3 space-y-5 overflow-y-auto custom-scrollbar">

                        <section className="space-y-1.5">
                            <SectionLabel>Format</SectionLabel>
                            <div className="flex flex-col gap-1">
                                {FORMATS.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setFormat(f.id)}
                                        className={`flex items-start justify-between px-3 py-2 rounded-xl text-left transition-all border ${format === f.id
                                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                            : 'border-zinc-800 text-zinc-500 hover:border-indigo-500/40 hover:text-zinc-300 hover:bg-indigo-500/5'
                                            }`}
                                    >
                                        <div>
                                            <div className="text-[11px] font-black">{f.label}</div>
                                            <div className="text-[9px] opacity-60 font-medium mt-0.5">{f.desc}</div>
                                        </div>
                                        {format === f.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-1.5">
                            <SectionLabel>Resolution</SectionLabel>
                            <div className="flex flex-col gap-1">
                                {SCALES.map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => setScale(s.value)}
                                        className={`flex items-start justify-between px-3 py-2 rounded-xl text-left transition-all border ${scale === s.value
                                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                            : 'border-zinc-800 text-zinc-500 hover:border-indigo-500/40 hover:text-zinc-300 hover:bg-indigo-500/5'
                                            }`}
                                    >
                                        <div>
                                            <div className="text-[11px] font-black">{s.label}</div>
                                            <div className="text-[9px] opacity-60 font-medium mt-0.5">{s.desc}</div>
                                        </div>
                                        {scale === s.value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {format !== 'png' && (
                            <section className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <SectionLabel>Quality</SectionLabel>
                                    <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-bold">{quality}%</span>
                                </div>
                                <input
                                    type="range" min={60} max={100} value={quality}
                                    onChange={(e) => setQuality(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </section>
                        )}

                        <section className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-800/60 space-y-2">
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Tips</p>
                            <ul className="space-y-1.5">
                                <li className="text-[9px] text-zinc-500">Set explicit <span className="text-zinc-300 font-bold">width + height</span> on body</li>
                                <li className="text-[9px] text-zinc-500">Use <span className="text-zinc-300 font-bold">inline styles</span> for custom fonts</li>
                                <li className="text-[9px] text-zinc-500"><span className="text-zinc-300 font-bold">2×</span> recommended for sharp exports</li>
                            </ul>
                        </section>

                        <Button
                            className="w-full bg-indigo-600 text-white hover:bg-indigo-500 border-none text-[10px] font-black uppercase tracking-widest gap-1.5"
                            onClick={handleDownload}
                            isLoading={isCapturing}
                            disabled={isCapturing}
                        >
                            <Download size={13} /> Export
                        </Button>
                    </div>
                </div>
            </div>

            {/* Feature strip */}
            <div className="shrink-0 grid grid-cols-4 gap-3">
                {[
                    { icon: Code2, label: 'Live Editor', desc: 'HTML + CSS with instant preview' },
                    { icon: Image, label: 'PNG / JPEG / WebP', desc: 'Export at up to 3× resolution' },
                    { icon: Zap, label: 'Instant Capture', desc: 'No server — runs in your browser' },
                    { icon: Shield, label: '100% Private', desc: 'Your code never leaves your device' },
                ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="flex items-start gap-3 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/60 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                            <Icon size={14} className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-zinc-300">{label}</p>
                            <p className="text-[10px] text-zinc-600 leading-relaxed mt-0.5">{desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
