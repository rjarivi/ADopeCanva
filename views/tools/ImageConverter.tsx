import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FileUploader } from '../../components/FileUploader';
import { FileData } from '../../types';
import { Button } from '../../components/ui/Button';
import { 
    RefreshCcw, Image, ArrowRight, Download, Settings, FileImage, 
    Loader2, Layers, Zap, Shield, RotateCw, Check, Archive, Trash2, Sliders, Maximize2
} from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { CategoryDropdown } from '../../components/CategoryDropdown';
import { preprocessImageFileData } from '../../utils/imagePreprocess';
import { encodeImageDataToBMP, encodePngToIco } from '../../utils/imageEncoders';
import { trackToolUsage } from '../../utils/analytics';
import JSZip from 'jszip';

export type ImageTargetFormat = 'image/webp' | 'image/png' | 'image/jpeg' | 'image/avif' | 'image/x-icon' | 'image/bmp';

interface ImageConverterProps {
    title?: string;
    description?: string;
    accept?: string;
    initialTargetFormat?: ImageTargetFormat;
}

interface ConvertedFile {
    originalName: string;
    name: string;
    url: string;
    blob: Blob;
    originalSize: string;
    newSize: string;
    reductionPercent: number;
    width: number;
    height: number;
}

export const ImageConverter: React.FC<ImageConverterProps> = ({
    title = "Universal Image Converter",
    description = "Convert images between WebP, PNG, JPG, AVIF, HEIC, BMP, and ICO formats with 100% client-side privacy.",
    accept = "image/*, .png, .jpg, .jpeg, .webp, .avif, .heic, .heif, .gif, .bmp, .tiff, .tif, .svg, .ico",
    initialTargetFormat = 'image/webp'
}) => {
    const isMobile = useIsMobile();
    const [files, setFiles] = useState<FileData[]>([]);
    const [targetFormat, setTargetFormat] = useState<ImageTargetFormat>(initialTargetFormat);
    const [quality, setQuality] = useState(90);
    const [scale, setScale] = useState<number>(1);
    const [stripMetadata, setStripMetadata] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [processedFiles, setProcessedFiles] = useState<ConvertedFile[]>([]);

    const formatOptions: { id: ImageTargetFormat; label: string; ext: string; desc: string }[] = [
        { id: 'image/webp', label: 'WEBP', ext: 'webp', desc: 'Modern high compression' },
        { id: 'image/png', label: 'PNG', ext: 'png', desc: 'Lossless transparency' },
        { id: 'image/jpeg', label: 'JPG', ext: 'jpg', desc: 'Universal compatibility' },
        { id: 'image/avif', label: 'AVIF', ext: 'avif', desc: 'Next-gen compact size' },
        { id: 'image/x-icon', label: 'ICO', ext: 'ico', desc: 'Website Favicon' },
        { id: 'image/bmp', label: 'BMP', ext: 'bmp', desc: 'Uncompressed Bitmap' }
    ];

    const handleFiles = async (newFiles: FileData | FileData[]) => {
        setIsProcessing(true);
        const filesArray = Array.isArray(newFiles) ? newFiles : [newFiles];
        const processedList: FileData[] = [];
        for (const fileData of filesArray) {
            const processed = await preprocessImageFileData(fileData);
            processedList.push(processed);
        }
        setFiles(prev => [...prev, ...processedList]);
        setProcessedFiles([]);
        setIsProcessing(false);
    };

    const convertImages = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setProgress(0);
        const results: ConvertedFile[] = [];

        for (let i = 0; i < files.length; i++) {
            const fileData = files[i];
            try {
                const img = await loadImage(fileData.file);
                const outWidth = Math.max(1, Math.round(img.naturalWidth * scale));
                const outHeight = Math.max(1, Math.round(img.naturalHeight * scale));

                const canvas = document.createElement('canvas');
                canvas.width = outWidth;
                canvas.height = outHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) continue;

                // Handle transparency fill for JPG/BMP
                if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, outWidth, outHeight);
                }

                ctx.drawImage(img, 0, 0, outWidth, outHeight);

                let outputBlob: Blob | null = null;
                const currentOpt = formatOptions.find(f => f.id === targetFormat) || formatOptions[0];

                if (targetFormat === 'image/bmp') {
                    const imgData = ctx.getImageData(0, 0, outWidth, outHeight);
                    outputBlob = encodeImageDataToBMP(imgData);
                } else if (targetFormat === 'image/x-icon') {
                    // For ICO, export a 32x32 or 64x64 icon canvas
                    const icoCanvas = document.createElement('canvas');
                    const icoSize = Math.min(64, Math.max(16, outWidth));
                    icoCanvas.width = icoSize;
                    icoCanvas.height = icoSize;
                    const icoCtx = icoCanvas.getContext('2d');
                    if (icoCtx) {
                        icoCtx.drawImage(img, 0, 0, icoSize, icoSize);
                        const pngBlob = await new Promise<Blob | null>(res => icoCanvas.toBlob(res, 'image/png'));
                        if (pngBlob) {
                            outputBlob = await encodePngToIco(pngBlob, icoSize);
                        }
                    }
                } else {
                    // Try native toBlob with fallback for AVIF/WebP
                    outputBlob = await new Promise<Blob | null>(resolve => {
                        canvas.toBlob(
                            (b) => {
                                if (b) resolve(b);
                                else {
                                    // Fallback to WebP or PNG if AVIF isn't supported by browser engine
                                    canvas.toBlob(resolve, 'image/webp', quality / 100);
                                }
                            },
                            targetFormat,
                            targetFormat === 'image/png' ? undefined : quality / 100
                        );
                    });
                }

                if (outputBlob) {
                    const originalName = fileData.file.name;
                    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || 'image';
                    const name = `${nameWithoutExt}.${currentOpt.ext}`;
                    const url = URL.createObjectURL(outputBlob);
                    const originalBytes = fileData.file.size;
                    const newBytes = outputBlob.size;
                    const reductionPercent = originalBytes > 0 ? Math.round(((originalBytes - newBytes) / originalBytes) * 100) : 0;

                    results.push({
                        originalName,
                        name,
                        url,
                        blob: outputBlob,
                        originalSize: formatBytes(originalBytes),
                        newSize: formatBytes(newBytes),
                        reductionPercent,
                        width: outWidth,
                        height: outHeight
                    });
                }
            } catch (e) {
                console.error("Conversion failed for", fileData.file.name, e);
            }

            setProgress(Math.round(((i + 1) / files.length) * 100));
        }

        setProcessedFiles(results);
        if (results.length > 0) {
            trackToolUsage('image-converter', targetFormat.split('/')[1] || 'convert');
        }
        setIsProcessing(false);
    };

    const loadImage = (file: File): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Image load failed')); };
        });
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const handleDownloadSingle = (file: ConvertedFile) => {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        a.click();
    };

    const handleDownloadAllZip = async () => {
        if (processedFiles.length === 0) return;
        const zip = new JSZip();
        processedFiles.forEach(f => {
            zip.file(f.name, f.blob);
        });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = `adopecanva-converted-images.zip`;
        a.click();
    };

    const reset = () => {
        setFiles([]);
        setProcessedFiles([]);
        setProgress(0);
        setIsProcessing(false);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setProcessedFiles([]);
    };

    if (files.length === 0) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-8">
                    <h1 className="text-3xl lg:text-5xl font-black tracking-tight flex items-center justify-center gap-3 font-unbounded text-white">
                        <RotateCw size={36} className="text-indigo-400" />
                        <span>{title}</span>
                    </h1>
                    <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto font-medium">
                        {description}
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none" />
                    <FileUploader
                        onFilesSelect={handleFiles}
                        onFileSelect={handleFiles}
                        accept={accept}
                        label="Drop Images to Convert (Batch Supported)"
                        description="Supports PNG, JPG, WebP, AVIF, HEIC, GIF, BMP, TIFF, SVG, ICO"
                        multiple={true}
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-transparent rounded-2xl transition-all"
                    />
                </div>

                {/* Supported Formats Pill Row */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-3xl mx-auto">
                    {['PNG', 'JPG / JPEG', 'WebP', 'AVIF', 'iPhone HEIC / HEIF', 'BMP', 'ICO', 'SVG', 'GIF'].map((fmt, i) => (
                        <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400">
                            {fmt}
                        </span>
                    ))}
                </div>

                {/* Feature Grid */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {[
                        { icon: Layers, label: 'Batch Convert', desc: 'Multi-File & ZIP Export' },
                        { icon: Zap, label: 'Instant & Fast', desc: 'Client-Side Hardware Render' },
                        { icon: Shield, label: '100% Private', desc: 'No Server Byte Transfer' },
                        { icon: RotateCw, label: 'Universal Shift', desc: 'WebP • AVIF • PNG • JPG • ICO' }
                    ].map((feat, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors group">
                            <div className="p-2.5 bg-zinc-900 rounded-full text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
                                <feat.icon size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider font-unbounded">{feat.label}</h3>
                                <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{feat.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full bg-[#0c0c0e] text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-7xl mx-auto rounded-[32px] border border-zinc-900 h-full shadow-[0_0_50px_rgba(0,0,0,0.5)]'}`}>
            {/* Sidebar Controls */}
            <aside className={`${isMobile ? 'order-2 h-1/2' : 'order-1 w-80 border-r'} border-zinc-900 bg-[#0c0c0e] flex flex-col z-20 shrink-0`}>
                <div className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-[#0c0c0e]/80 backdrop-blur-md">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-3 font-unbounded">
                        <Settings size={16} /> CONVERSION SETTINGS
                    </h2>
                    <button onClick={reset} title="Reset all" className="text-zinc-500 hover:text-indigo-400 transition-all p-2 hover:bg-indigo-500/5 rounded-xl">
                        <RefreshCcw size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Target Format Selector */}
                    <section className="space-y-3">
                        <SectionLabel>Target Output Format</SectionLabel>
                        <div className="grid grid-cols-2 gap-2">
                            {formatOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => { setTargetFormat(opt.id); setProcessedFiles([]); }}
                                    className={`p-3 rounded-xl border text-left transition-all ${targetFormat === opt.id ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'}`}
                                >
                                    <div className="font-bold text-sm">{opt.label}</div>
                                    <div className="text-[10px] text-zinc-500 truncate mt-0.5">{opt.desc}</div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Quality Slider (for lossy formats) */}
                    {targetFormat !== 'image/png' && targetFormat !== 'image/bmp' && (
                        <section className="space-y-3">
                            <SliderControl
                                label="Quality Compression"
                                value={quality}
                                min={10}
                                max={100}
                                onChange={(v) => { setQuality(v); setProcessedFiles([]); }}
                                unit="%"
                            />
                            <p className="text-[11px] text-zinc-500">80–90% produces virtually lossless output with up to 70% smaller size.</p>
                        </section>
                    )}

                    {/* Scale Multiplier */}
                    <section className="space-y-2">
                        <SectionLabel>Scale Dimension</SectionLabel>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: '100% (Original)', val: 1 },
                                { label: '50% (Half)', val: 0.5 },
                                { label: '200% (2x)', val: 2 }
                            ].map((s, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { setScale(s.val); setProcessedFiles([]); }}
                                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${scale === s.val ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Privacy EXIF Scrub Option */}
                    <section className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                        <div className="pr-3">
                            <div className="text-xs font-bold text-zinc-200">Strip EXIF / GPS Metadata</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">Scrub private location tags from output</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={stripMetadata}
                            onChange={(e) => setStripMetadata(e.target.checked)}
                            className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
                        />
                    </section>

                    {/* Convert Button / Progress / Results */}
                    <div className="pt-2">
                        {!processedFiles.length ? (
                            <Button 
                                className="w-full h-13 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-wider font-unbounded rounded-xl shadow-lg shadow-indigo-600/20" 
                                onClick={convertImages} 
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={16} />
                                        <span>Converting ({progress}%)...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <ArrowRight size={16} />
                                        <span>Convert {files.length} {files.length === 1 ? 'Image' : 'Images'}</span>
                                    </div>
                                )}
                            </Button>
                        ) : (
                            <div className="space-y-3 animate-fade-in">
                                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                        <Check size={16} />
                                        <span>Conversion Ready</span>
                                    </div>
                                    <span className="text-emerald-300 font-mono text-xs font-bold">{processedFiles.length} files</span>
                                </div>
                                <Button 
                                    className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-500 font-black uppercase text-xs tracking-wider font-unbounded rounded-xl flex items-center justify-center gap-2" 
                                    onClick={handleDownloadAllZip}
                                >
                                    <Archive size={16} />
                                    <span>Download All (.ZIP)</span>
                                </Button>
                                <button 
                                    onClick={() => setProcessedFiles([])} 
                                    className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 font-semibold tracking-wide pt-1"
                                >
                                    Reconfigure Settings
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main File Management & Results Workspace */}
            <main className={`order-3 ${isMobile ? 'h-1/2' : 'flex-1'} relative bg-[#09090b] p-4 md:p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between`}>
                {processedFiles.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                            <div>
                                <h3 className="text-base font-bold text-white">Converted Results</h3>
                                <p className="text-xs text-zinc-400">All files converted in-memory with zero server byte transfers</p>
                            </div>
                            <Button 
                                onClick={handleDownloadAllZip}
                                className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2"
                            >
                                <Download size={14} />
                                <span>Save All ZIP</span>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {processedFiles.map((f, i) => (
                                <div key={i} className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-4 shadow-md hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700/50">
                                            <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-zinc-200 truncate">{f.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                                                <span>{f.originalSize} → <strong className="text-emerald-400">{f.newSize}</strong></span>
                                                {f.reductionPercent > 0 && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        -{f.reductionPercent}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDownloadSingle(f)}
                                        className="p-2.5 rounded-xl bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white transition-colors shrink-0 shadow"
                                        title="Download this file"
                                    >
                                        <Download size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                            <div>
                                <h3 className="text-base font-bold text-white">Selected Files ({files.length})</h3>
                                <p className="text-xs text-zinc-400">Ready to convert to {targetFormat.split('/')[1].toUpperCase()}</p>
                            </div>
                            <Button 
                                onClick={reset}
                                variant="ghost"
                                className="h-8 px-3 text-xs text-zinc-400 hover:text-red-400 border-zinc-800"
                            >
                                Clear All
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
                            {files.map((f, i) => (
                                <div key={i} className="relative group aspect-square bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-md">
                                    <img
                                        src={f.previewUrl}
                                        alt={f.file.name}
                                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3">
                                        <p className="text-xs text-white font-bold truncate">{f.file.name}</p>
                                        <p className="text-[10px] text-zinc-400 uppercase mt-0.5">{f.size}</p>
                                    </div>
                                    <button
                                        onClick={() => removeFile(i)}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove file"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = accept;
                                    input.multiple = true;
                                    input.onchange = (e) => handleFiles(Array.from((e.target as HTMLInputElement).files!).map(f => ({
                                        file: f, name: f.name, size: (f.size / 1024).toFixed(1) + 'KB', type: f.type, previewUrl: URL.createObjectURL(f)
                                    })));
                                    input.click();
                                }}
                                className="aspect-square rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/30 flex flex-col items-center justify-center text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/40 transition-all font-unbounded text-[10px] font-black uppercase tracking-wider gap-2 group"
                            >
                                <FileImage size={24} className="group-hover:scale-110 transition-transform" />
                                <span>Add More</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
