/// <reference lib="dom" />
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { FileData } from '../../types';
import {
    Scissors, Download, LayoutGrid, Instagram, RefreshCw,
    ZoomIn, ChevronRight, Layers, Zap, SplitSquareHorizontal, SplitSquareVertical,
    ImageIcon, Settings2, Package, Eye, ArrowRight, X, Check
} from 'lucide-react';
import JSZip from 'jszip';
import { preprocessImageFileData } from '../../utils/imagePreprocess';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Preset {
    id: string;
    label: string;
    icon: React.ElementType;
    sliceWidth: number;
    sliceHeight: number;
    description: string;
    direction: 'horizontal' | 'vertical';
    color: string;
}

interface SliceResult {
    index: number;
    dataUrl: string;
    width: number;
    height: number;
    label: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const PRESETS: Preset[] = [
    {
        id: 'ig-carousel-h',
        label: 'IG Carousel (Wide)',
        icon: Instagram,
        sliceWidth: 1080,
        sliceHeight: 1350,
        description: '1080×1350 per slice · Horizontal split',
        direction: 'horizontal',
        color: 'from-pink-500 to-purple-600',
    },
    {
        id: 'ig-carousel-sq',
        label: 'IG Square Carousel',
        icon: Instagram,
        sliceWidth: 1080,
        sliceHeight: 1080,
        description: '1080×1080 per slice · Horizontal split',
        direction: 'horizontal',
        color: 'from-orange-500 to-pink-500',
    },
    {
        id: 'ig-story-v',
        label: 'IG Story (Tall)',
        icon: Instagram,
        sliceWidth: 1080,
        sliceHeight: 1920,
        description: '1080×1920 per slice · Vertical split',
        direction: 'vertical',
        color: 'from-purple-500 to-indigo-600',
    },
    {
        id: 'custom',
        label: 'Custom',
        icon: Settings2,
        sliceWidth: 1080,
        sliceHeight: 1080,
        description: 'Set your own pixel dimensions',
        direction: 'horizontal',
        color: 'from-indigo-500 to-blue-600',
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatSize(w: number, h: number) {
    return `${w} × ${h}px`;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export const ImageSplitter: React.FC = () => {
    const [file, setFile] = useState<FileData | null>(null);
    const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
    
    const handleFileSelect = async (selectedFile: FileData) => {
        setProcessing(true);
        const processed = await preprocessImageFileData(selectedFile);
        setFile(processed);
        setProcessing(false);
    };
    const [selectedPreset, setSelectedPreset] = useState<string>('ig-carousel-h');
    const [customW, setCustomW] = useState(1080);
    const [customH, setCustomH] = useState(1080);
    const [customDir, setCustomDir] = useState<'horizontal' | 'vertical'>('horizontal');
    const [slices, setSlices] = useState<SliceResult[]>([]);
    const [processing, setProcessing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [splitDone, setSplitDone] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Active preset config
    const activePreset = PRESETS.find(p => p.id === selectedPreset)!;
    const sliceW = selectedPreset === 'custom' ? customW : activePreset.sliceWidth;
    const sliceH = selectedPreset === 'custom' ? customH : activePreset.sliceHeight;
    const direction = selectedPreset === 'custom' ? customDir : activePreset.direction;

    // Load image from FileData
    useEffect(() => {
        if (!file) {
            setImageEl(null);
            setSlices([]);
            setSplitDone(false);
            return;
        }
        const img = new Image();
        img.onload = () => setImageEl(img);
        img.src = file.previewUrl ?? URL.createObjectURL(file.file);
    }, [file]);

    // Reset slices when options change
    useEffect(() => {
        setSlices([]);
        setSplitDone(false);
    }, [selectedPreset, customW, customH, customDir]);

    // ── Compute expected slice count for preview ─────────────────────────────
    const sliceCount = imageEl
        ? direction === 'horizontal'
            ? Math.ceil(imageEl.naturalWidth / sliceW)
            : Math.ceil(imageEl.naturalHeight / sliceH)
        : 0;

    // ── Split Logic ──────────────────────────────────────────────────────────
    const handleSplit = useCallback(async () => {
        if (!imageEl) return;
        setProcessing(true);
        setSplitDone(false);
        setSlices([]);

        await new Promise<void>(resolve => setTimeout(resolve, 50));

        const results: SliceResult[] = [];
        const canvas = canvasRef.current ?? document.createElement('canvas');

        if (direction === 'horizontal') {
            // Split wide image into left-to-right slices of sliceW×sliceH
            const totalCols = Math.ceil(imageEl.naturalWidth / sliceW);
            for (let i = 0; i < totalCols; i++) {
                const sx = i * sliceW;
                const sw = Math.min(sliceW, imageEl.naturalWidth - sx);
                // Scale to exact sliceH, maintaining proportional source height
                const srcH = Math.min(sliceH, imageEl.naturalHeight);
                canvas.width = sliceW;
                canvas.height = sliceH;
                const ctx = canvas.getContext('2d')!;
                ctx.clearRect(0, 0, sliceW, sliceH);
                ctx.drawImage(imageEl, sx, 0, sw, srcH, 0, 0, sw, srcH);
                results.push({
                    index: i,
                    dataUrl: canvas.toDataURL('image/png'),
                    width: sliceW,
                    height: sliceH,
                    label: `slide_${String(i + 1).padStart(2, '0')}`,
                });
            }
        } else {
            // Split tall image into top-to-bottom slices of sliceW×sliceH
            const totalRows = Math.ceil(imageEl.naturalHeight / sliceH);
            for (let i = 0; i < totalRows; i++) {
                const sy = i * sliceH;
                const sh = Math.min(sliceH, imageEl.naturalHeight - sy);
                const srcW = Math.min(sliceW, imageEl.naturalWidth);
                canvas.width = sliceW;
                canvas.height = sliceH;
                const ctx = canvas.getContext('2d')!;
                ctx.clearRect(0, 0, sliceW, sliceH);
                ctx.drawImage(imageEl, 0, sy, srcW, sh, 0, 0, srcW, sh);
                results.push({
                    index: i,
                    dataUrl: canvas.toDataURL('image/png'),
                    width: sliceW,
                    height: sliceH,
                    label: `slide_${String(i + 1).padStart(2, '0')}`,
                });
            }
        }

        setSlices(results);
        setSplitDone(true);
        setProcessing(false);
    }, [imageEl, sliceW, sliceH, direction]);

    // ── Download Single ──────────────────────────────────────────────────────
    const downloadSingle = (slice: SliceResult) => {
        const a = document.createElement('a');
        a.href = slice.dataUrl;
        a.download = `${slice.label}.png`;
        a.click();
    };

    // ── Download All as ZIP ──────────────────────────────────────────────────
    const downloadAll = useCallback(async () => {
        if (!slices.length) return;
        setDownloading(true);
        try {
            const zip = new JSZip();
            const folder = zip.folder('image-slices')!;
            for (const s of slices) {
                const base64 = s.dataUrl.split(',')[1];
                folder.file(`${s.label}.png`, base64, { base64: true });
            }
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'image-slices.zip';
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setDownloading(false);
        }
    }, [slices]);

    // ─── Upload / Empty State ─────────────────────────────────────────────────
    if (!file) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center gap-3 font-unbounded">
                        <Scissors size={32} />
                        Image Splitter
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Split wide or tall images into perfectly-sized slices for seamless Instagram carousels & stories.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-pink-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept="image/*, .heic, .heif, .avif"
                        label="Drop your image here"
                        description="Supports JPG, PNG, WEBP, AVIF, HEIC"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-pink-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Instagram, label: 'IG Carousel', desc: '1080×1350 seamless presets' },
                        { icon: Zap, label: 'Instant Split', desc: 'No server · 100% local' },
                        { icon: Package, label: 'ZIP Download', desc: 'All slices in one click' },
                        { icon: Eye, label: 'Live Preview', desc: 'See every slice before export' },
                    ].map((feat, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors cursor-default group">
                            <div className="p-2 bg-pink-500/10 rounded-full text-pink-400 group-hover:scale-110 group-hover:bg-pink-500/20 transition-all">
                                <feat.icon size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-zinc-200">{feat.label}</h3>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mt-1 group-hover:text-zinc-400 transition-colors">{feat.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ─── Tool View ────────────────────────────────────────────────────────────
    return (
        <div className="animate-fade-in space-y-6">
            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Top bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                        <Scissors size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white font-unbounded">Image Splitter</h2>
                        {imageEl && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                                Source: {imageEl.naturalWidth} × {imageEl.naturalHeight}px · {sliceCount} slice{sliceCount !== 1 ? 's' : ''} at {formatSize(sliceW, sliceH)}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={() => { setFile(null); setSlices([]); setSplitDone(false); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 bg-zinc-900 transition-all text-sm"
                    >
                        <X size={15} />
                        New Image
                    </button>
                    {splitDone && (
                        <button
                            onClick={downloadAll}
                            disabled={downloading}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl border border-pink-500/40 text-white bg-pink-500/15 hover:bg-pink-500/25 hover:border-pink-500/60 transition-all text-sm font-semibold shadow-lg"
                            style={{ boxShadow: '0 4px 20px rgba(236,72,153,0.15)' }}
                        >
                            {downloading ? (
                                <><RefreshCw size={15} className="animate-spin" /> Zipping…</>
                            ) : (
                                <><Package size={15} /> Download All ({slices.length})</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left: Controls ── */}
                <div className="space-y-5">
                    {/* Preset selection */}
                    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Split Preset</h3>
                        <div className="space-y-2">
                            {PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => setSelectedPreset(preset.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedPreset === preset.id
                                        ? 'border-pink-500/40 bg-pink-500/10 text-white'
                                        : 'border-zinc-800/50 bg-zinc-900/30 text-zinc-400 hover:text-white hover:border-zinc-700'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${preset.color} shrink-0`}>
                                        <preset.icon size={14} className="text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold truncate">{preset.label}</div>
                                        <div className="text-[10px] text-zinc-500 truncate mt-0.5">{preset.description}</div>
                                    </div>
                                    {selectedPreset === preset.id && (
                                        <Check size={14} className="text-pink-400 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom settings */}
                    {selectedPreset === 'custom' && (
                        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 space-y-4 animate-fade-in">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Custom Settings</h3>

                            {/* Direction */}
                            <div>
                                <label className="text-xs text-zinc-400 mb-2 block">Split Direction</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        { val: 'horizontal', label: 'Horizontal', icon: SplitSquareHorizontal },
                                        { val: 'vertical', label: 'Vertical', icon: SplitSquareVertical },
                                    ] as const).map(opt => (
                                        <button
                                            key={opt.val}
                                            onClick={() => setCustomDir(opt.val)}
                                            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs transition-all ${customDir === opt.val
                                                ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                                                : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-zinc-300'
                                            }`}
                                        >
                                            <opt.icon size={18} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Slice width */}
                            <div>
                                <label className="text-xs text-zinc-400 mb-1.5 block">Slice Width (px)</label>
                                <input
                                    type="number"
                                    value={customW}
                                    min={100}
                                    max={10000}
                                    onChange={e => setCustomW(Math.max(100, Number(e.target.value)))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-colors"
                                />
                            </div>

                            {/* Slice height */}
                            <div>
                                <label className="text-xs text-zinc-400 mb-1.5 block">Slice Height (px)</label>
                                <input
                                    type="number"
                                    value={customH}
                                    min={100}
                                    max={10000}
                                    onChange={e => setCustomH(Math.max(100, Number(e.target.value)))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* Info card */}
                    {imageEl && (
                        <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-4 space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Split Preview</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-zinc-400">
                                    <span>Source size</span>
                                    <span className="text-zinc-200 font-medium">{imageEl.naturalWidth} × {imageEl.naturalHeight}px</span>
                                </div>
                                <div className="flex justify-between text-zinc-400">
                                    <span>Slice size</span>
                                    <span className="text-zinc-200 font-medium">{formatSize(sliceW, sliceH)}</span>
                                </div>
                                <div className="flex justify-between text-zinc-400">
                                    <span>Direction</span>
                                    <span className="text-zinc-200 font-medium capitalize">{direction}</span>
                                </div>
                                <div className="flex justify-between text-zinc-400">
                                    <span>Output slices</span>
                                    <span className="text-pink-300 font-bold">{sliceCount}</span>
                                </div>
                            </div>

                            {/* Visual split indicator */}
                            <div className="mt-3">
                                <div
                                    className={`w-full h-16 rounded-lg border border-zinc-700/50 bg-zinc-950 relative overflow-hidden flex ${direction === 'horizontal' ? 'flex-row' : 'flex-col'}`}
                                >
                                    {Array.from({ length: Math.min(sliceCount, 8) }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 border-zinc-700/40 flex items-center justify-center"
                                            style={{
                                                borderRight: direction === 'horizontal' && i < Math.min(sliceCount, 8) - 1 ? '1px dashed rgba(236,72,153,0.4)' : undefined,
                                                borderBottom: direction === 'vertical' && i < Math.min(sliceCount, 8) - 1 ? '1px dashed rgba(236,72,153,0.4)' : undefined,
                                                background: `rgba(236,72,153,${0.03 + (i % 2) * 0.04})`,
                                            }}
                                        >
                                            <span className="text-[9px] text-pink-400/60 font-bold">{i + 1}</span>
                                        </div>
                                    ))}
                                    {sliceCount > 8 && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 text-zinc-400 text-xs font-medium">
                                            {sliceCount} slices
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Split button */}
                    <button
                        onClick={handleSplit}
                        disabled={processing || !imageEl}
                        className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: processing ? 'rgba(236,72,153,0.2)' : 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(168,85,247,0.25))',
                            border: '1px solid rgba(236,72,153,0.4)',
                            boxShadow: processing ? 'none' : '0 8px 32px rgba(236,72,153,0.2)',
                        }}
                    >
                        {processing ? (
                            <><RefreshCw size={18} className="animate-spin" /> Splitting…</>
                        ) : (
                            <><Scissors size={18} /> Split Image</>
                        )}
                    </button>
                </div>

                {/* ── Right: Preview / Source ── */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Source image preview */}
                    {imageEl && !splitDone && (
                        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <ImageIcon size={12} /> Source Image
                            </h3>
                            <div className="relative w-full rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center" style={{ minHeight: 200, maxHeight: 400 }}>
                                <img
                                    src={file.previewUrl ?? URL.createObjectURL(file.file)}
                                    alt="Source"
                                    className="max-w-full max-h-[380px] object-contain rounded-lg"
                                />
                                {/* Slice overlay */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                    {direction === 'horizontal' && Array.from({ length: sliceCount }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 border-r last:border-r-0"
                                            style={{ borderColor: 'rgba(236,72,153,0.5)', borderStyle: 'dashed' }}
                                        />
                                    ))}
                                    {direction === 'vertical' && (
                                        <div className="w-full h-full flex flex-col">
                                            {Array.from({ length: sliceCount }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 border-b last:border-b-0"
                                                    style={{ borderColor: 'rgba(236,72,153,0.5)', borderStyle: 'dashed' }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-center text-xs text-zinc-600">
                                Dashed lines show where the image will be split into {sliceCount} slice{sliceCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    )}

                    {/* Slices grid */}
                    {splitDone && slices.length > 0 && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <LayoutGrid size={12} /> {slices.length} Slices Ready
                                </h3>
                                <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Click to preview · Download individually</span>
                            </div>

                            <div className={`grid gap-3 ${slices.length <= 3 ? 'grid-cols-3' : slices.length <= 6 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                                {slices.map((slice, i) => (
                                    <div
                                        key={i}
                                        className="group relative rounded-xl overflow-hidden border border-zinc-800/60 bg-zinc-900/50 cursor-pointer hover:border-pink-500/40 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                                        style={{ boxShadow: 'none' }}
                                        onClick={() => setPreviewIndex(i)}
                                    >
                                        <img
                                            src={slice.dataUrl}
                                            alt={slice.label}
                                            className="w-full object-cover"
                                            style={{ aspectRatio: `${slice.width}/${slice.height}` }}
                                        />
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                            <button
                                                onClick={e => { e.stopPropagation(); setPreviewIndex(i); }}
                                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                                                title="Preview"
                                            >
                                                <ZoomIn size={14} />
                                            </button>
                                            <button
                                                onClick={e => { e.stopPropagation(); downloadSingle(slice); }}
                                                className="p-2 rounded-full bg-pink-500/30 hover:bg-pink-500/50 text-white transition-all"
                                                title="Download"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
                                        {/* Label badge */}
                                        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between px-1.5">
                                            <span className="text-[9px] font-bold uppercase tracking-widest bg-black/60 text-zinc-300 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                                #{i + 1}
                                            </span>
                                            <span className="text-[9px] text-zinc-500 bg-black/60 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                                {slice.width}×{slice.height}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* IG Order hint */}
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-pink-500/5 border border-pink-500/15">
                                <Instagram size={16} className="text-pink-400 shrink-0" />
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    <span className="text-zinc-200 font-semibold">Instagram tip:</span> Upload slides from <strong className="text-pink-300">right to left</strong> so they display in the correct left-to-right order in your carousel.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Lightbox Preview Modal ── */}
            {previewIndex !== null && slices[previewIndex] && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in"
                    onClick={() => setPreviewIndex(null)}
                >
                    <div
                        className="relative max-w-[90vw] max-h-[90vh] bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                            <span className="text-sm font-semibold text-zinc-200">
                                Slice #{previewIndex + 1} — {slices[previewIndex].width} × {slices[previewIndex].height}px
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => downloadSingle(slices[previewIndex])}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-300 hover:bg-pink-500/30 transition-all text-xs font-semibold"
                                >
                                    <Download size={13} /> Download
                                </button>
                                <button
                                    onClick={() => setPreviewIndex(null)}
                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center">
                            {previewIndex > 0 && (
                                <button
                                    onClick={() => setPreviewIndex(i => i! - 1)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 transition-all z-10"
                                >
                                    <ChevronRight size={20} className="rotate-180" />
                                </button>
                            )}
                            <img
                                src={slices[previewIndex].dataUrl}
                                alt={`Slice ${previewIndex + 1}`}
                                className="max-w-full max-h-[75vh] object-contain"
                            />
                            {previewIndex < slices.length - 1 && (
                                <button
                                    onClick={() => setPreviewIndex(i => i! + 1)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 transition-all z-10"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            )}
                        </div>

                        {/* Thumbnail strip */}
                        <div className="flex gap-1.5 px-4 py-3 border-t border-zinc-800 overflow-x-auto">
                            {slices.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPreviewIndex(i)}
                                    className={`shrink-0 rounded-md overflow-hidden border-2 transition-all ${i === previewIndex ? 'border-pink-500' : 'border-transparent opacity-50 hover:opacity-80'}`}
                                >
                                    <img src={s.dataUrl} alt={`thumb ${i + 1}`} className="h-10 object-cover" style={{ width: 40 * (s.width / s.height) }} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
