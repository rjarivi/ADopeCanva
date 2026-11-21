/// <reference lib="dom" />
import React, { useState, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { ToolShell } from '../../components/ToolShell';
import { useToolFile } from '../../hooks/useToolFile';
import { FileData } from '../../types';
import { Download, Sliders, Zap, Image as ImageIcon, RefreshCcw, Trash2, Maximize, Package } from 'lucide-react';
import JSZip from 'jszip';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { preprocessImageFileData } from '../../utils/imagePreprocess';

import { useIsMobile } from '../../hooks/useIsMobile';

type FormatChoice = 'source' | 'image/jpeg' | 'image/png' | 'image/webp';

const FORMAT_OPTIONS: { id: FormatChoice; label: string }[] = [
    { id: 'source', label: 'Source' },
    { id: 'image/jpeg', label: 'JPG' },
    { id: 'image/png', label: 'PNG' },
    { id: 'image/webp', label: 'WEBP' },
];

interface CompressedResult {
    name: string;
    dataUrl: string;
    mime: string;
    size: string;
}

const EXT_BY_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

// Resolve the honest output mime: keep the source type when the browser can
// re-encode it, otherwise fall back to JPEG.
const resolveMime = (sourceType: string, choice: FormatChoice): string => {
    if (choice !== 'source') {
        // Only promise formats canvas can actually encode
        if (choice === 'image/png' || choice === 'image/webp' || choice === 'image/jpeg') return choice;
    }
    if (EXT_BY_MIME[sourceType]) return sourceType;
    return 'image/jpeg';
};

export const ImageCompressor: React.FC = () => {
    const isMobile = useIsMobile();
    const [files, setFiles] = useState<FileData[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [compressionLevel, setCompressionLevel] = useState(70);
    const [formatChoice, setFormatChoice] = useState<FormatChoice>('source');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [results, setResults] = useState<CompressedResult[]>([]);
    const [sliderPosition, setSliderPosition] = useState(50);
    const [fileError, setFileError] = useState<string | null>(null);

    const file = files[activeIndex] ?? null;
    const originalImageSrc = file?.previewUrl ?? '';
    const resultImage = results[activeIndex]?.dataUrl ?? null;

    const handleFilesSelect = async (selectedFiles: FileData[]) => {
        if (!selectedFiles.length) return;
        setIsProcessing(true);
        const processed = await Promise.all(selectedFiles.map(f => preprocessImageFileData(f)));
        setFiles(prev => [...prev, ...processed]);
        setIsProcessing(false);
    };

    const handleFileSelect = async (selectedFile: FileData) => {
        await handleFilesSelect([selectedFile]);
    };

    const removeFile = (i: number) => {
        setFiles(prev => prev.filter((_, j) => j !== i));
        setResults([]);
        setActiveIndex(prev => Math.max(0, Math.min(prev, prev > i ? prev - 1 : prev - 1)));
        setSliderPosition(50);
    };

    const compressOne = useCallback(async (f: FileData): Promise<CompressedResult> => {
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(f.file);
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error('Could not read file'));
        });

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error('Could not load image'));
            i.src = dataUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        ctx.drawImage(img, 0, 0);

        const mime = resolveMime(f.file.type, formatChoice);
        const newDataUrl = canvas.toDataURL(mime, compressionLevel / 100);

        const head = 'data:' + mime + ';base64,';
        const sizeInBytes = Math.round((newDataUrl.length - head.length) * 3 / 4);
        const baseName = f.file.name.replace(/\.[^.]+$/, '') || 'image';
        const ext = EXT_BY_MIME[mime] ?? 'jpg';

        return {
            name: `compressed-${baseName}.${ext}`,
            dataUrl: newDataUrl,
            mime,
            size: (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB',
        };
    }, [formatChoice, compressionLevel]);

    const handleCompress = useCallback(async () => {
        if (!files.length) return;
        setIsProcessing(true);
        setProgress(0);
        setResults([]);
        try {
            const out: CompressedResult[] = [];
            for (let i = 0; i < files.length; i++) {
                out.push(await compressOne(files[i]));
                setProgress(i + 1);
            }
            setResults(out);
            setSliderPosition(50);
        } catch (error) {
            console.error('Compression failed:', error);
            setFileError('Compression failed for one or more images — try a different format or lower quality.');
        } finally {
            setIsProcessing(false);
            setProgress(null);
        }
    }, [files, compressOne]);

    const downloadOne = (r: CompressedResult) => {
        const link = document.createElement('a');
        link.href = r.dataUrl;
        link.download = r.name; // extension now matches the actual encoded format
        link.click();
    };

    const handleDownload = () => {
        const r = results[activeIndex];
        if (r) downloadOne(r);
    };

    const handleDownloadAllZip = async () => {
        if (!results.length) return;
        const zip = new JSZip();
        const folder = zip.folder('compressed-images')!;
        for (const r of results) {
            folder.file(r.name, r.dataUrl.split(',')[1], { base64: true });
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'compressed-images.zip';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        setFiles([]);
        setResults([]);
        setCompressionLevel(70);
        setFormatChoice('source');
        setActiveIndex(0);
        setSliderPosition(50);
        setFileError(null);
    };

    const activeResult = results.length === files.length ? results[activeIndex] : undefined;

    if (!files.length) {
        return (
            <ToolShell
                icon={Zap}
                title="Smart Image Compressor"
                description="Reduce file size without losing visible quality."
                features={[
                    { icon: Zap, label: 'Instant Shrink', desc: 'Fast compression' },
                    { icon: Sliders, label: 'Adjustable', desc: 'Control quality level' },
                    { icon: Download, label: 'Web Ready', desc: 'Perfect for sharing' },
                    { icon: Package, label: 'Batch & ZIP', desc: 'Compress many at once' },
                ]}
                file={files}
                multiple={true}
                accept="image/*, .heic, .heif, .avif"
                uploadLabel="Add Images"
                uploadDescription="Supports JPG, PNG, WEBP, AVIF, HEIC · batch supported"
                onFileSelect={handleFilesSelect}
                error={fileError}
            >
                <></>
            </ToolShell>
        );
    }

    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'h-full max-w-6xl mx-auto rounded-3xl border border-zinc-800 shadow-2xl'}`}>

            {/* 2. Settings Panel */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 lg:w-84 border-l'} border-zinc-800 bg-zinc-950 flex flex-col z-20 h-full min-h-0`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <Zap size={20} /> Image Optimizer
                    </h2>
                    <button onClick={handleReset} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <RefreshCcw size={14} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 custom-scrollbar">
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* File list */}
                        <section className="space-y-2">
                            <SectionLabel>Files ({files.length})</SectionLabel>
                            <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1.5">
                                {files.map((f, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setActiveIndex(i)}
                                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition-all ${i === activeIndex ? 'bg-indigo-500/15 border-indigo-500/40' : 'bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700'}`}
                                    >
                                        <img src={f.previewUrl} alt="" className="w-7 h-7 rounded object-cover border border-zinc-800" />
                                        <span className="text-[11px] text-zinc-300 truncate flex-1">{f.file.name}</span>
                                        <span className="text-[9px] text-zinc-500 font-mono shrink-0 uppercase">{EXT_BY_MIME[resolveMime(f.file.type, formatChoice)]}</span>
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

                        {/* Output format */}
                        <section className="space-y-3">
                            <SectionLabel>Output Format</SectionLabel>
                            <div className="grid grid-cols-4 gap-1.5">
                                {FORMAT_OPTIONS.map(o => (
                                    <button
                                        key={o.id}
                                        onClick={() => setFormatChoice(o.id)}
                                        disabled={isProcessing}
                                        className={`py-2 rounded-lg border text-[10px] font-bold transition-all disabled:opacity-40 ${formatChoice === o.id ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-zinc-600 leading-relaxed">
                                Source = keeps the original file format (falls back to JPG if the browser can't re-encode it).
                            </p>
                        </section>

                        <section className="space-y-4">
                            <SliderControl
                                label="Compression Quality"
                                value={compressionLevel}
                                min={10}
                                max={100}
                                onChange={setCompressionLevel}
                                unit="%"
                            />
                            <div className="flex justify-between mt-2 text-[10px] text-zinc-600 uppercase font-bold tracking-tighter">
                                <span>Smaller File</span>
                                <span>Better Quality</span>
                            </div>
                        </section>

                        {file && (
                            <section className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-900/50 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-zinc-500 font-medium">Original Size</span>
                                    <span className="text-xs text-zinc-300 font-mono">{file.size}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-zinc-500 font-medium">Predicted Size</span>
                                    <span className="text-xs text-indigo-400 font-mono font-bold">
                                        {isProcessing ? '???' : (activeResult?.size || '—')}
                                    </span>
                                </div>
                                {activeResult && (
                                    <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Reduction</span>
                                        <span className="text-xs text-indigo-500 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                            -{((file.file.size - parseFloat(activeResult.size) * 1024 * 1024) / file.file.size * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                )}
                            </section>
                        )}

                        <div className="space-y-3">
                            {!results.length || results.length !== files.length ? (
                                <Button
                                    className="w-full h-12 border-none shadow-lg shadow-indigo-900/20"
                                    onClick={handleCompress}
                                    isLoading={isProcessing}
                                    disabled={isProcessing}
                                >
                                    <Zap size={18} className="mr-2" />
                                    {isProcessing ? `Optimizing ${progress}/${files.length}...` : files.length > 1 ? `Process ${files.length} Images` : 'Process Image'}
                                </Button>
                            ) : (
                                <div className="space-y-3 animate-slide-up">
                                    <Button className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-500 border-none shadow-lg" onClick={handleDownload}>
                                        <Download size={18} className="mr-2" /> Download Current
                                    </Button>
                                    {files.length > 1 && (
                                        <Button variant="secondary" className="w-full h-12 border-zinc-800 bg-zinc-900" onClick={handleDownloadAllZip}>
                                            <Package size={16} className="mr-2" /> Download All (ZIP)
                                        </Button>
                                    )}
                                    <Button variant="secondary" className="w-full h-12 border-zinc-800" onClick={handleReset}>
                                        <RefreshCcw size={16} className="mr-2" /> Start New
                                    </Button>
                                </div>
                            )}
                        </div>

                        <section>
                            <SliderControl
                                label="Preview Comparison"
                                value={sliderPosition}
                                min={0}
                                max={100}
                                onChange={setSliderPosition}
                                unit="%"
                            />
                        </section>

                        <section className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
                            <SectionLabel>Optimization Info</SectionLabel>
                            <p className="text-[10px] text-zinc-500 leading-relaxed uppercase font-bold tracking-tight">
                                Compression is applied using client-side canvas rendering. No images are uploaded to any server.
                                Best for web use and social media.
                            </p>
                        </section>
                    </div>
                </div>
            </aside>

            {/* 3. Preview Area */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} h-full min-h-0 relative bg-[#09090b] flex items-center justify-center p-4 md:p-6 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className={`relative shadow-2xl transition-all duration-500 ease-out border border-zinc-800/50 bg-black/40 rounded-2xl overflow-hidden ${isMobile ? 'w-full h-full' : 'w-full max-w-2xl aspect-square'}`}>
                    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] flex items-center justify-center">
                        {originalImageSrc ? (
                            <div className="relative w-full h-full group">
                                <img src={originalImageSrc} alt="Original" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                                {resultImage && (
                                    <img
                                        src={resultImage}
                                        alt="Compressed"
                                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                                    />
                                )}

                                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest">Original</div>
                                <div className="absolute top-4 right-4 bg-indigo-600/90 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20">Optimized</div>

                                <div className="absolute inset-y-0" style={{ left: `${sliderPosition}%` }}>
                                    <div className="absolute inset-y-0 -left-px w-px bg-white/50"></div>
                                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center shadow-2xl text-indigo-600 ring-2 ring-black/10">
                                        <Sliders size={14} className="rotate-90" />
                                    </div>
                                </div>

                                <input
                                    type="range"
                                    min="0" max="100" value={sliderPosition}
                                    onChange={(e) => setSliderPosition(parseInt(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                                />
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon size={48} className="text-zinc-800 animate-pulse" />
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
