/// <reference lib="dom" />
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Download, RefreshCcw, Maximize2, Lock, Unlock, Image as ImageIcon, Zap, Crop, Monitor } from 'lucide-react';
import { SectionLabel } from '../../components/EditorControls';
import { useIsMobile } from '../../hooks/useIsMobile';

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

export const ImageResizer: React.FC = () => {
    const isMobile = useIsMobile();
    const [file, setFile] = useState<FileData | null>(null);
    const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
    const [newWidth, setNewWidth] = useState(0);
    const [newHeight, setNewHeight] = useState(0);
    const [aspectLocked, setAspectLocked] = useState(true);
    const [aspectRatio, setAspectRatio] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [originalImageSrc, setOriginalImageSrc] = useState<string>('');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file.file);
            setOriginalImageSrc(url);
            setResultImage(null);

            const img = new Image();
            img.onload = () => {
                setOriginalDimensions({ width: img.width, height: img.height });
                setNewWidth(img.width);
                setNewHeight(img.height);
                setAspectRatio(img.width / img.height);
            };
            img.src = url;

            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    const handleWidthChange = useCallback((value: number) => {
        setNewWidth(value);
        if (aspectLocked && aspectRatio) {
            setNewHeight(Math.round(value / aspectRatio));
        }
    }, [aspectLocked, aspectRatio]);

    const handleHeightChange = useCallback((value: number) => {
        setNewHeight(value);
        if (aspectLocked && aspectRatio) {
            setNewWidth(Math.round(value * aspectRatio));
        }
    }, [aspectLocked, aspectRatio]);

    const applyScale = useCallback((scale: number) => {
        const scaledWidth = Math.round(originalDimensions.width * (scale / 100));
        const scaledHeight = Math.round(originalDimensions.height * (scale / 100));
        setNewWidth(scaledWidth);
        setNewHeight(scaledHeight);
    }, [originalDimensions]);

    const applyPreset = useCallback((preset: typeof PRESETS[0]) => {
        setNewWidth(preset.width);
        setNewHeight(preset.height);
        setAspectLocked(false);
    }, []);

    const handleResize = useCallback(async () => {
        if (!file || !originalImageSrc) return;

        setIsProcessing(true);

        try {
            const img = new Image();
            img.src = originalImageSrc;

            await new Promise((resolve) => {
                img.onload = resolve;
            });

            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Could not get canvas context');
            }

            // Use high-quality image scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            const mimeType = file.file.type.includes('png') ? 'image/png' : 'image/jpeg';
            const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;

            const dataUrl = canvas.toDataURL(mimeType, quality);
            setResultImage(dataUrl);
        } catch (err) {
            console.error('Resize error:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [file, originalImageSrc, newWidth, newHeight]);

    const handleDownload = useCallback(() => {
        if (!resultImage || !file) return;

        const link = document.createElement('a');
        link.href = resultImage;
        const ext = file.file.type.includes('png') ? 'png' : 'jpg';
        link.download = `resized-${newWidth}x${newHeight}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [resultImage, file, newWidth, newHeight]);

    const handleReset = () => {
        setFile(null);
        setResultImage(null);
        setOriginalImageSrc('');
        setNewWidth(0);
        setNewHeight(0);
        setAspectLocked(true);
    };

    if (!file) {
        return (
            <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <Maximize2 size={32} /> Image Resizer
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Resize images with precise dimension control.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={setFile}
                        accept="image/*"
                        label="Upload Image"
                        description="Supports JPG, PNG, WEBP, GIF"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Maximize2, label: 'Precise Control', desc: 'Exact dimensions' },
                        { icon: Lock, label: 'Aspect Lock', desc: 'Keep proportions' },
                        { icon: Crop, label: 'Presets', desc: 'Social media sizes' },
                        { icon: Monitor, label: 'HD Quality', desc: 'Crisp output' }
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

                        {/* Original Size */}
                        <section className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-900/50 space-y-3">
                            <SectionLabel>Original Size</SectionLabel>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500 font-medium">Dimensions</span>
                                <span className="text-xs text-zinc-300 font-mono">{originalDimensions.width} × {originalDimensions.height}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500 font-medium">File Size</span>
                                <span className="text-xs text-zinc-300 font-mono">{file.size}</span>
                            </div>
                        </section>

                        {/* Dimension Controls */}
                        <section className="space-y-4">
                            <SectionLabel>New Dimensions</SectionLabel>

                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Width</label>
                                    <input
                                        type="number"
                                        value={newWidth}
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
                                        value={newHeight}
                                        onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Scale Buttons */}
                        <section className="space-y-3">
                            <SectionLabel>Quick Scale</SectionLabel>
                            <div className="grid grid-cols-3 gap-2">
                                {SCALES.map((scale) => (
                                    <button
                                        key={scale}
                                        onClick={() => applyScale(scale)}
                                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/50 rounded-lg px-3 py-2 text-xs font-bold text-zinc-300 transition-all"
                                    >
                                        {scale}%
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Presets */}
                        <section className="space-y-3">
                            <SectionLabel>Social Media Presets</SectionLabel>
                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
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
                        </section>

                        {/* Actions */}
                        <div className="space-y-3">
                            {!resultImage ? (
                                <Button className="w-full h-12 border-none shadow-lg shadow-indigo-900/20" onClick={handleResize} isLoading={isProcessing} disabled={isProcessing} >
                                    <Zap size={18} className="mr-2" />
                                    {isProcessing ? 'Resizing...' : 'Resize Image'}
                                </Button>
                            ) : (
                                <div className="space-y-3 animate-slide-up">
                                    <Button className="w-full h-12 bg-white text-black hover:bg-zinc-200 border-none shadow-lg" onClick={handleDownload} >
                                        <Download size={18} className="mr-2" /> Download
                                    </Button>
                                    <Button variant="secondary" className="w-full h-12 border-zinc-800" onClick={() => setResultImage(null)}>
                                        <RefreshCcw size={16} className="mr-2" /> Resize Again
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Preview Area */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="relative max-w-full max-h-full flex items-center justify-center">
                    {resultImage ? (
                        <div className="relative">
                            <img
                                src={resultImage}
                                alt="Resized"
                                className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl border border-zinc-800"
                            />
                            <div className="absolute top-4 right-4 bg-indigo-600/90 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest shadow-lg">
                                {newWidth} × {newHeight}
                            </div>
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
