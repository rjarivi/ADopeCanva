import React, { useState } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Image as ImageIcon, Download, CheckCircle, RefreshCcw, ArrowRightLeft, FileArchive, Zap, Layers, Sparkles } from 'lucide-react';
import JSZip from 'jszip';

const SIZES = [16, 32, 48, 64, 128, 256];

export const ImageToIco: React.FC = () => {
    const [file, setFile] = useState<FileData | null>(null);
    const [targetSizes, setTargetSizes] = useState<number[]>([64]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [convertedUrl, setConvertedUrl] = useState<string | null>(null);

    const handleConvert = async () => {
        if (!file || targetSizes.length === 0) return;
        setIsProcessing(true);
        setIsDone(false);

        try {
            const img = new Image();
            img.src = URL.createObjectURL(file.file);
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const zip = new JSZip();

            for (const size of targetSizes) {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error("Failed to get canvas context");

                // Clear with transparent bg
                ctx.clearRect(0, 0, size, size);

                // Draw image scaled
                ctx.drawImage(img, 0, 0, size, size);

                // Get PNG array buffer
                const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
                if (!pngBlob) continue;

                const pngBuffer = await pngBlob.arrayBuffer();
                const pngBytes = new Uint8Array(pngBuffer);

                // Create ICO buffer
                const icoBufferSize = 22 + pngBytes.length;
                const icoBuffer = new ArrayBuffer(icoBufferSize);
                const view = new DataView(icoBuffer);

                // ICO Header (6 bytes)
                view.setUint16(0, 0, true); // Reserved
                view.setUint16(2, 1, true); // Type (1 = ICO)
                view.setUint16(4, 1, true); // Image count (1)

                // ICO Directory Entry (16 bytes)
                view.setUint8(6, size === 256 ? 0 : size); // Width
                view.setUint8(7, size === 256 ? 0 : size); // Height
                view.setUint8(8, 0); // Color count (0 = >256 colors)
                view.setUint8(9, 0); // Reserved
                view.setUint16(10, 1, true); // Color planes
                view.setUint16(12, 32, true); // Bits per pixel
                view.setUint32(14, pngBytes.length, true); // Size of image data
                view.setUint32(18, 22, true); // Offset of image data

                // Copy PNG data
                const icoBytes = new Uint8Array(icoBuffer);
                icoBytes.set(pngBytes, 22);

                if (targetSizes.length === 1) {
                    const icoBlob = new Blob([icoBuffer], { type: 'image/x-icon' });
                    const url = URL.createObjectURL(icoBlob);
                    setConvertedUrl(url);
                    setIsDone(true);
                    setIsProcessing(false);
                    return;
                }

                zip.file(`favicon_${size}x${size}.ico`, icoBuffer);
            }

            if (targetSizes.length > 1) {
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const zipUrl = URL.createObjectURL(zipBlob);
                setConvertedUrl(zipUrl);
                setIsDone(true);
            }

        } catch (error) {
            console.error(error);
            alert("Error converting image to ICO.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!convertedUrl || !file) return;
        const a = document.createElement('a');
        a.href = convertedUrl;
        const baseName = file.file.name.substring(0, file.file.name.lastIndexOf('.')) || 'favicon';
        if (targetSizes.length > 1) {
            a.download = `${baseName}_icons.zip`;
        } else {
            a.download = `${baseName}_${targetSizes[0]}x${targetSizes[0]}.ico`;
        }
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleReset = () => {
        setFile(null);
        setIsDone(false);
        setIsProcessing(false);
        setConvertedUrl(null);
    };

    if (!file) {
        return (
            <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <ImageIcon size={32} /> Image to ICO Converter
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Convert any image to a favicon (.ico) instantly inside your browser. No server uploads.
                    </p>
                </div>

                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={setFile}
                        accept="image/*"
                        label="Upload Image"
                        description="JPG, PNG, WebP supported"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Zap, label: 'Instant Conversion', desc: 'No Server Uploads' },
                        { icon: Layers, label: 'Multi-Size Support', desc: '16px up to 256px' },
                        { icon: FileArchive, label: 'Batch Export', desc: 'Download Packaged ZIP' },
                        { icon: Sparkles, label: 'Perfect Quality', desc: 'Preserves Transparency' }
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
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-slide-up">
            <div className="bg-surface rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 overflow-hidden">
                            <img src={URL.createObjectURL(file.file)} alt="Upload preview" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-zinc-100">{file.file.name}</h3>
                            <p className="text-sm text-zinc-500">{file.size} • {file.type}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleReset} disabled={isProcessing}>
                        <RefreshCcw size={16} className="mr-2" /> Change File
                    </Button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Select Target Sizes</label>
                                <button
                                    onClick={() => setTargetSizes(targetSizes.length === SIZES.length ? [] : [...SIZES])}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                                >
                                    {targetSizes.length === SIZES.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {SIZES.map(size => {
                                    const isSelected = targetSizes.includes(size);
                                    return (
                                        <button
                                            key={size}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setTargetSizes(targetSizes.filter(s => s !== size));
                                                } else {
                                                    setTargetSizes([...targetSizes, size].sort((a, b) => a - b));
                                                }
                                            }}
                                            disabled={isProcessing || isDone}
                                            className={`
                                                px-4 py-3 rounded-xl text-sm font-semibold transition-all border
                                                ${isSelected
                                                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20 scale-105 z-10'
                                                    : 'bg-zinc-800/50 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                                                }
                                                ${(isProcessing || isDone) ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            {size}x{size}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {!isDone ? (
                            <Button onClick={handleConvert} isLoading={isProcessing || targetSizes.length === 0} size="lg" className="w-full h-14" disabled={targetSizes.length === 0} >
                                {isProcessing ? 'Converting...' : targetSizes.length > 1 ? `Create ${targetSizes.length} ICOs (ZIP)` : `Convert to ICO`}
                            </Button>
                        ) : (
                            <div className="space-y-4 animate-scale-in">
                                <div className="flex items-center gap-2 text-green-400 font-medium justify-center p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                                    <CheckCircle size={20} /> Conversion Complete
                                </div>
                                <Button size="lg" className="w-full h-14" onClick={handleDownload}>
                                    {targetSizes.length > 1 ? <FileArchive size={20} className="mr-2" /> : <Download size={20} className="mr-2" />}
                                    {targetSizes.length > 1 ? 'Download ZIP containing ICOs' : 'Download .ICO'}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="relative aspect-square rounded-2xl bg-black/40 border border-zinc-800 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-500/20 blur-[50px] rounded-full transition-opacity duration-1000 ${(isProcessing || isDone) ? 'opacity-100' : 'opacity-20'}`}></div>

                        {isDone && convertedUrl ? (
                            <div className="space-y-4 animate-fade-in relative z-10 flex flex-col items-center">
                                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl relative shadow-xl">
                                    {targetSizes.length === 1 ? (
                                        <img src={convertedUrl} alt="ICO Preview" style={{ width: Math.min(targetSizes[0], 128), height: Math.min(targetSizes[0], 128), imageRendering: 'pixelated' }} className="rounded" />
                                    ) : (
                                        <FileArchive size={64} className="text-indigo-400" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white font-unbounded uppercase tracking-wider mt-4">Ready!</h3>
                                    <p className="text-zinc-500 text-sm">{targetSizes.length > 1 ? `${targetSizes.length} Favicons Packaged` : `${targetSizes[0]}x${targetSizes[0]} pixels`}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 opacity-40 relative z-10">
                                <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                                    <ArrowRightLeft size={40} />
                                </div>
                                <p className="text-zinc-500 font-medium">Ready to convert</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
