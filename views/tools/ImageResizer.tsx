/// <reference lib="dom" />
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Download, RefreshCcw, Maximize2, Lock, Unlock, Image as ImageIcon, Zap, Crop, Monitor, Package, Trash2, Percent } from 'lucide-react';
import JSZip from 'jszip';
import { SectionLabel } from '../../components/EditorControls';
import { useIsMobile } from '../../hooks/useIsMobile';
import { preprocessImageFileData } from '../../utils/imagePreprocess';

const PRESETS = [
    { name: 'Instagram Post', width: 1080, height: 1080, icon: '📸' },
    { name: 'Instagram Story', width: 1080, height: 1920, icon: '📱' },
    { name: 'Facebook Cover', width: 820, height: 312, icon: '📘' },
    { name: 'Twitter Header', width: 1500, height: 500, icon: '🐦' },
    { name: 'LinkedIn Banner', width: 1584, height: 396, icon: '💼' },
    { name: 'YouTube Thumbnail', width: 1280, height: 720, icon: '▶️' },
    { name: 'HD 1080p', width: 1920, height: 1080, icon: '🖥️' },
    { name: '4K UHD', width: 3840, height: 2160, icon: '📺' },
];

const SCALES = [25, 50, 75, 100, 150, 200];

const FORMATS = [
    { id: 'image/png', label: 'PNG', ext: 'png' },
    { id: 'image/jpeg', label: 'JPG', ext: 'jpg' },
    { id: 'image/webp', label: 'WEBP', ext: 'webp' },
];

interface BatchResult {
    name: string;      // output filename
    dataUrl: string;
    width: number;
    height: number;
}

type SharedMode = 'scale' | 'preset' | 'custom';
// Per-file target mode:
// 'relative' → scaled relative to that file's own dimensions (scale %, or contain-fit into shared dims)
// 'absolute' → exact shared dimensions
type TargetMode = 'relative' | 'absolute';

interface ResizedFile {
    file: FileData;
    targetMode: TargetMode;
}

const getExt = (mime: string) => FORMATS.find(f => f.id === mime)?.ext ?? 'png';

export const ImageResizer: React.FC = () => {
    const isMobile = useIsMobile();
    const [files, setFiles] = useState<ResizedFile[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
    const [sharedWidth, setSharedWidth] = useState(0);
    const [sharedHeight, setSharedHeight] = useState(0);
    const [sharedMode, setSharedMode] = useState<SharedMode>('scale');
    const [scalePct, setScalePct] = useState(100);
    const [aspectLocked, setAspectLocked] = useState(true);
    const [aspectRatio, setAspectRatio] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [results, setResults] = useState<BatchResult[]>([]);
    const [exportFormat, setExportFormat] = useState('image/png');
    const [exportQuality, setExportQuality] = useState(92);
    const [sliderPosition, setSliderPosition] = useState(50);
    const [originals, setOriginals] = useState<HTMLImageElement[]>([]);
    const originalImageSrc = files[activeIndex]?.file.previewUrl ?? '';
    const file = files[activeIndex]?.file ?? null;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFilesSelect = async (selectedFiles: FileData[]) => {
        if (!selectedFiles.length) return;
        setIsProcessing(true);
        const processed = await Promise.all(selectedFiles.map(f => preprocessImageFileData(f)));
        setFiles(prev => [
            ...prev,
            ...processed.map(f => ({ file: f, targetMode: (sharedMode === 'scale' ? 'relative' : 'absolute') as TargetMode }))
        ]);
        setIsProcessing(false);
    };

    const handleFileSelect = async (selectedFile: FileData) => {
        await handleFilesSelect([selectedFile]);
    };

    // Load image elements for all files (for processing + dims)
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const imgs = await Promise.all(files.map(rf => new Promise<HTMLImageElement>((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(img);
                img.src = rf.file.previewUrl ?? URL.createObjectURL(rf.file.file);
            })));
            if (cancelled) return;
            setOriginals(imgs);
            const active = imgs[activeIndex];
            if (active) {
                setOriginalDimensions({ width: active.width, height: active.height });
                if (sharedMode === 'scale' && activeIndex === 0 && files.length > 0 && sharedWidth === 0) {
                    setSharedWidth(active.width);
                    setSharedHeight(active.height);
                    setAspectRatio(active.width / active.height);
                }
            }
        };
        load();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files]);

    const handleWidthChange = useCallback((value: number) => {
        setSharedMode('custom');
        setSharedWidth(value);
        if (aspectLocked && aspectRatio) setSharedHeight(Math.round(value / aspectRatio));
    }, [aspectLocked, aspectRatio]);

    const handleHeightChange = useCallback((value: number) => {
        setSharedMode('custom');
        setSharedHeight(value);
        if (aspectLocked && aspectRatio) setSharedWidth(Math.round(value * aspectRatio));
    }, [aspectLocked, aspectRatio]);

    const targetFor = useCallback((img: HTMLImageElement, targetMode: TargetMode): { w: number; h: number } => {
        if (sharedMode === 'scale') {
            return { w: Math.round(img.width * (scalePct / 100)), h: Math.round(img.height * (scalePct / 100)) };
        }
        if (targetMode === 'absolute') {
            return { w: sharedWidth, h: sharedHeight };
        }
        // relative: contain-fit into shared dimensions, preserving own aspect
        const scale = Math.min(sharedWidth / img.width, sharedHeight / img.height);
        return { w: Math.max(1, Math.round(img.width * scale)), h: Math.max(1, Math.round(img.height * scale)) };
    }, [sharedMode, scalePct, sharedWidth, sharedHeight]);

    const applyScale = useCallback((scale: number) => {
        setSharedMode('scale');
        setScalePct(scale);
    }, []);

    const applyPreset = useCallback((preset: typeof PRESETS[0]) => {
        setSharedMode('preset');
        setSharedWidth(preset.width);
        setSharedHeight(preset.height);
    }, []);

    const handleBatchResize = useCallback(async () => {
        if (!files.length || !originals.length) return;

        setIsProcessing(true);
        setProgress(0);
        setResults([]);

        try {
            const outResults: BatchResult[] = [];
            for (let i = 0; i < files.length; i++) {
                const img = originals[i];
                if (!img) continue;
                const { w, h } = targetFor(img, files[i].targetMode);

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Could not get canvas context');

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, w, h);

                const mime = exportFormat;
                const dataUrl = canvas.toDataURL(mime, mime === 'image/png' ? undefined : exportQuality / 100);

                const srcName = files[i].file.file.name.replace(/\.[^.]+$/, '') || 'image';
                outResults.push({
                    name: `resized-${srcName}-${w}x${h}.${getExt(mime)}`,
                    dataUrl,
                    width: w,
                    height: h,
                });
                setProgress(i + 1);
            }
            setResults(outResults);
        } catch (err) {
            console.error('Resize error:', err);
        } finally {
            setIsProcessing(false);
            setProgress(null);
        }
    }, [files, originals, targetFor, exportFormat, exportQuality]);

    const downloadOne = useCallback((result: BatchResult) => {
        const link = document.createElement('a');
        link.href = result.dataUrl;
        link.download = result.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const handleDownload = useCallback(() => {
        const result = results[activeIndex];
        if (result) downloadOne(result);
    }, [results, activeIndex, downloadOne]);

    const handleDownloadAllZip = useCallback(async () => {
        if (!results.length) return;
        const zip = new JSZip();
        const folder = zip.folder('resized-images')!;
        for (const r of results) {
            const base64 = r.dataUrl.split(',')[1];
            folder.file(r.name, base64, { base64: true });
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resized-images.zip';
        a.click();
        URL.revokeObjectURL(url);
    }, [results]);

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setActiveIndex(prev => Math.max(0, prev > index ? prev - 1 : (prev === index ? Math.max(0, prev - 1) : prev)));
        setResults([]);
        setOriginals([]);
    };

    const handleReset = () => {
        setFiles([]);
        setResults([]);
        setOriginals([]);
        setSharedWidth(0);
        setSharedHeight(0);
        setScalePct(100);
        setAspectLocked(true);
        setActiveIndex(0);
        setSliderPosition(50);
    };

    if (!files.length) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <Maximize2 size={32} /> Image Resizer
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Resize images with precise dimension control. Batch supported.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFilesSelect={handleFilesSelect}
                        multiple={true}
                        onFileSelect={handleFileSelect}
                        accept="image/*, .heic, .heif, .avif"
                        label="Upload Images"
                        description="Supports JPG, PNG, WEBP, GIF, AVIF, HEIC · paste or drop multiple"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Maximize2, label: 'Precise Control', desc: 'Exact dimensions' },
                        { icon: Lock, label: 'Aspect Lock', desc: 'Keep proportions' },
                        { icon: Crop, label: 'Presets', desc: 'Social media sizes' },
                        { icon: Package, label: 'Batch & ZIP', desc: 'Resize many at once' }
                    ].map((feat, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors">
                            <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-400">
                                <feat.icon size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-zinc-200">{feat.label}</h3>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mt-1">{feat.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const activeResult = results.length === files.length ? results[activeIndex] : undefined;

    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

            {/* Settings Panel */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <Maximize2 size={20} /> Image Resizer
                    </h2>
                    <button onClick={handleReset} className="text-zinc-600 hover:text-indigo-400 transition-colors">
                        <RefreshCcw size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="space-y-6 animate-in fade-in duration-300">

                        {/* File List (Batch) */}
                        <section className="space-y-2">
                            <SectionLabel>Files ({files.length})</SectionLabel>
                            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1.5">
                                {files.map((rf, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setActiveIndex(i)}
                                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition-all ${i === activeIndex ? 'bg-indigo-500/15 border-indigo-500/40' : 'bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700'}`}
                                    >
                                        <img src={rf.file.previewUrl} alt="" className="w-8 h-8 rounded object-cover border border-zinc-800" />
                                        <span className="text-[11px] text-zinc-300 truncate flex-1">{rf.file.file.name}</span>
                                        {sharedMode !== 'scale' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFiles(prev => prev.map((f, j) => j === i ? { ...f, targetMode: f.targetMode === 'relative' ? 'absolute' : 'relative' } : f));
                                                }}
                                                className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border shrink-0 ${rf.targetMode === 'absolute' ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300' : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'}`}
                                                title={rf.targetMode === 'absolute' ? 'Exact shared dimensions' : 'Scale from own dimensions'}
                                            >
                                                <Percent size={10} className="inline -mt-0.5" /> {rf.targetMode === 'absolute' ? 'Abs' : 'Rel'}
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                            className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                                            title="Remove file"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Settings mode switch */}
                        <section className="space-y-3">
                            <SectionLabel>Shared Resize Settings</SectionLabel>
                            <div className="grid grid-cols-3 gap-1.5">
                                {([
                                    { id: 'scale', label: 'Scale %' },
                                    { id: 'preset', label: 'Preset' },
                                    { id: 'custom', label: 'Custom' },
                                ] as const).map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSharedMode(m.id)}
                                        className={`py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${sharedMode === m.id ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {sharedMode === 'scale' ? (
                            <section className="space-y-3">
                                <SectionLabel>Quick Scale (per-file dimensions)</SectionLabel>
                                <div className="grid grid-cols-3 gap-2">
                                    {SCALES.map((scale) => (
                                        <button
                                            key={scale}
                                            onClick={() => applyScale(scale)}
                                            className={`bg-zinc-900 hover:bg-zinc-800 border rounded-lg px-3 py-2 text-xs font-bold transition-all ${sharedMode === 'scale' && scalePct === scale ? 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10' : 'border-zinc-800 hover:border-indigo-500/50 text-zinc-300'}`}
                                        >
                                            {scale}%
                                        </button>
                                    ))}
                                </div>
                            </section>
                        ) : (
                            <section className="space-y-4">
                                <SectionLabel>{sharedMode === 'preset' ? 'Target Dimensions' : 'Custom Dimensions'}</SectionLabel>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Width</label>
                                        <input
                                            type="number"
                                            value={sharedWidth}
                                            onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setAspectLocked(!aspectLocked)}
                                        className={`mt-5 p-2 rounded-lg transition-colors ${aspectLocked ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}
                                        title={aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                                    >
                                        {aspectLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                    </button>
                                    <div className="flex-1">
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Height</label>
                                        <input
                                            type="number"
                                            value={sharedHeight}
                                            onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none"
                                        />
                                    </div>
                                </div>

                                {sharedMode === 'preset' && (
                                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                                        {PRESETS.map((preset) => (
                                            <button
                                                key={preset.name}
                                                onClick={() => applyPreset(preset)}
                                                className="flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/50 rounded-lg px-3 py-2 text-xs transition-all group"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span>{preset.icon}</span>
                                                    <span className="font-medium text-zinc-300">{preset.name}</span>
                                                </span>
                                                <span className="text-zinc-600 group-hover:text-indigo-400 font-mono text-[10px]">
                                                    {preset.width}×{preset.height}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Output format */}
                        <section className="space-y-3">
                            <SectionLabel>Output Format</SectionLabel>
                            <div className="grid grid-cols-3 gap-2">
                                {FORMATS.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setExportFormat(f.id)}
                                        className={`py-2 rounded-lg border text-xs font-bold transition-all ${exportFormat === f.id ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            {exportFormat !== 'image/png' && (
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-xs text-zinc-400">Quality</span>
                                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{exportQuality}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={10} max={100}
                                        value={exportQuality}
                                        onChange={(e) => setExportQuality(parseInt(e.target.value))}
                                        className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full"
                                    />
                                </div>
                            )}
                        </section>

                        {/* Actions */}
                        <div className="space-y-3">
                            {!results.length || results.length !== files.length ? (
                                <Button
                                    className="w-full h-12 border-none shadow-lg shadow-indigo-900/20"
                                    onClick={handleBatchResize}
                                    isLoading={isProcessing}
                                    disabled={isProcessing}
                                >
                                    <Zap size={18} className="mr-2" />
                                    {isProcessing ? `Resizing ${progress}/${files.length}...` : files.length > 1 ? `Resize ${files.length} Images` : 'Resize Image'}
                                </Button>
                            ) : (
                                <div className="space-y-3 animate-slide-up">
                                    <Button className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-500 border-none shadow-lg" onClick={handleDownload}>
                                        <Download size={18} className="mr-2" /> Download Current
                                    </Button>
                                    {files.length > 1 && (
                                        <Button className="w-full h-12 btn-secondary border-zinc-800 bg-zinc-900" variant="secondary" onClick={handleDownloadAllZip}>
                                            <Package size={16} className="mr-2" /> Download All (ZIP)
                                        </Button>
                                    )}
                                    <Button variant="secondary" className="w-full h-12 border-zinc-800" onClick={() => { setResults([]); setSliderPosition(50); }}>
                                        <RefreshCcw size={16} className="mr-2" /> Resize Again
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Preview Area: before/after */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="relative max-w-full max-h-full flex items-center justify-center">
                    {activeResult && originalImageSrc ? (
                        <div className="relative group">
                            <img
                                src={originalImageSrc}
                                alt="Original"
                                className="absolute inset-0 w-full h-full max-w-[60vw] max-h-[60vh] object-contain rounded-2xl"
                            />
                            <img
                                src={activeResult.dataUrl}
                                alt="Resized"
                                className="relative max-w-[60vw] max-h-[60vh] object-contain rounded-2xl shadow-2xl border border-zinc-800"
                                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                            />
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest">
                                Before · {originalDimensions.width}×{originalDimensions.height}
                            </div>
                            <div className="absolute top-4 right-4 bg-indigo-600/90 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest shadow-lg">
                                {activeResult.width} × {activeResult.height}
                            </div>
                            <input
                                type="range" min={0} max={100} value={sliderPosition}
                                onChange={(e) => setSliderPosition(parseInt(e.target.value))}
                                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                    ) : originalImageSrc ? (
                        <div className="relative">
                            <img
                                src={originalImageSrc}
                                alt="Original"
                                className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl border border-zinc-800"
                            />
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest">
                                Original
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-600">
                            <ImageIcon size={48} className="mb-4 opacity-50" />
                            <p className="text-sm">Upload an image to start</p>
                        </div>
                    )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
            </main>
        </div>
    );
};
