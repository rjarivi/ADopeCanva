import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import {
    FileCode2, Copy, Check, Trash2, Download, Eye, EyeOff,
    AlertTriangle, Code2, Maximize2, Minimize2, RefreshCw
} from 'lucide-react';

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="45" fill="url(#grad)" />
  <text x="50" y="55" font-family="sans-serif" font-size="12" font-weight="bold"
    fill="white" text-anchor="middle">SVG</text>
</svg>`;

export const SvgConverter: React.FC = () => {
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [previewBg, setPreviewBg] = useState<'dark' | 'light' | 'transparent'>('dark');
    const previewRef = useRef<HTMLDivElement>(null);

    // Validate SVG on code change
    useEffect(() => {
        if (!code.trim()) {
            setError(null);
            return;
        }
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(code, 'image/svg+xml');
            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                setError('Invalid SVG: ' + (parserError.textContent?.split('\n')[0] ?? 'Parse error'));
            } else {
                setError(null);
            }
        } catch {
            setError('Failed to parse SVG');
        }
    }, [code]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!code.trim() || error) return;
        const blob = new Blob([code], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleLoadSample = () => {
        setCode(SAMPLE_SVG);
    };

    const bgClasses: Record<typeof previewBg, string> = {
        dark: 'bg-zinc-950',
        light: 'bg-white',
        transparent: 'bg-transparent checkerboard',
    };

    const isValid = code.trim() && !error;

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <FileCode2 size={32} className="text-violet-400" />
                    <div>
                        <h2 className="text-2xl font-black text-white font-unbounded">SVG Code → SVG</h2>
                        <p className="text-xs text-zinc-500">Paste SVG markup, preview and download instantly</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Preview Background Toggle */}
                    <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex">
                        {(['dark', 'light', 'transparent'] as const).map(bg => (
                            <button
                                key={bg}
                                onClick={() => setPreviewBg(bg)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all capitalize ${
                                    previewBg === bg
                                        ? 'bg-violet-600 text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                {bg}
                            </button>
                        ))}
                    </div>

                    <Button variant="secondary" onClick={handleLoadSample} size="sm">
                        <RefreshCw size={14} className="md:mr-2" />
                        <span className="hidden md:inline">Sample</span>
                    </Button>
                    <Button variant="secondary" onClick={() => setCode('')} size="sm" disabled={!code}>
                        <Trash2 size={14} className="md:mr-2" />
                        <span className="hidden md:inline">Clear</span>
                    </Button>
                    <Button variant="secondary" onClick={handleCopy} size="sm" disabled={!code}>
                        {copied ? <Check size={14} className="md:mr-2 text-green-400" /> : <Copy size={14} className="md:mr-2" />}
                        <span className="hidden md:inline">{copied ? 'Copied!' : 'Copy'}</span>
                    </Button>
                    <Button
                        onClick={handleDownload}
                        size="sm"
                        disabled={!isValid}
                        className="bg-violet-600 hover:bg-violet-700 text-white border-none disabled:opacity-40"
                    >
                        <Download size={14} className="mr-2" /> Download SVG
                    </Button>
                </div>
            </div>

            {/* Main Editor + Preview */}
            <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
                {/* Code Editor */}
                <div className="flex-1 flex flex-col bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
                    <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Code2 size={14} className="text-zinc-500" />
                            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">SVG Code</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {code && (
                                <span className="text-[10px] font-mono text-zinc-600">
                                    {code.length.toLocaleString()} chars
                                </span>
                            )}
                            {error && (
                                <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono">
                                    <AlertTriangle size={10} /> Invalid SVG
                                </span>
                            )}
                            {isValid && (
                                <span className="text-[10px] text-green-400 font-mono">✓ Valid SVG</span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        <textarea
                            className="w-full h-full bg-zinc-950 p-5 font-mono text-sm text-zinc-300 resize-none outline-none leading-relaxed custom-scrollbar focus:bg-black transition-colors"
                            placeholder={`Paste your SVG code here...\n\nExample:\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="40" fill="#6366f1" />\n</svg>`}
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            spellCheck={false}
                        />

                        {/* Error Overlay */}
                        {error && code && (
                            <div className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl backdrop-blur-md text-xs font-mono flex items-start gap-2 shadow-2xl animate-in fade-in">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <span className="break-words">{error}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="flex-1 flex flex-col bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
                    <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye size={14} className="text-zinc-500" />
                            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Live Preview</span>
                        </div>
                        <button
                            onClick={() => setShowPreview(v => !v)}
                            className="text-xs flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                            {showPreview ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    <div
                        ref={previewRef}
                        className={`flex-1 flex items-center justify-center p-6 transition-colors duration-300 ${
                            previewBg === 'transparent'
                                ? 'bg-[length:16px_16px] bg-[position:0_0,8px_8px]'
                                : bgClasses[previewBg]
                        }`}
                        style={
                            previewBg === 'transparent'
                                ? {
                                    backgroundImage:
                                        'linear-gradient(45deg,#3f3f46 25%,transparent 25%),' +
                                        'linear-gradient(-45deg,#3f3f46 25%,transparent 25%),' +
                                        'linear-gradient(45deg,transparent 75%,#3f3f46 75%),' +
                                        'linear-gradient(-45deg,transparent 75%,#3f3f46 75%)',
                                    backgroundSize: '16px 16px',
                                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                                }
                                : undefined
                        }
                    >
                        {showPreview ? (
                            isValid ? (
                                <div
                                    className="max-w-full max-h-full overflow-auto"
                                    dangerouslySetInnerHTML={{ __html: code }}
                                />
                            ) : (
                                <div className="text-center space-y-3">
                                    <FileCode2 size={48} className="text-zinc-700 mx-auto" />
                                    <p className="text-zinc-600 text-sm">
                                        {code.trim()
                                            ? 'Fix the SVG errors to see a preview'
                                            : 'Paste SVG code to see a live preview'}
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="text-center space-y-3">
                                <EyeOff size={48} className="text-zinc-700 mx-auto" />
                                <p className="text-zinc-600 text-sm">Preview hidden</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Feature Highlights */}
            <div className="flex-none max-w-full w-full grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {[
                    { icon: Eye, label: 'Live Preview', desc: 'Instant rendering' },
                    { icon: AlertTriangle, label: 'Validation', desc: 'Real-time error check' },
                    { icon: Download, label: 'Download SVG', desc: 'Export clean .svg file' },
                    { icon: Maximize2, label: 'Scalable', desc: 'Infinite resolution' },
                ].map((feat, i) => (
                    <div
                        key={i}
                        className="flex flex-col items-center text-center space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors cursor-default group"
                    >
                        <div className="p-2 bg-violet-500/10 rounded-full text-violet-400 group-hover:scale-110 group-hover:bg-violet-500/20 transition-all">
                            <feat.icon size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-200">{feat.label}</h3>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mt-1 group-hover:text-zinc-400 transition-colors">
                                {feat.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
