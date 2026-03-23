import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FileUploader } from '../../components/FileUploader';
import { FileData } from '../../types';
import { Button } from '../../components/ui/Button';
import { RefreshCcw, Image, ArrowRight, Download, Settings, FileImage, Loader2, Layers, Zap, Shield, RotateCw } from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { CategoryDropdown } from '../../components/CategoryDropdown';

type ImageFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export const ImageConverter: React.FC = () => {
    const isMobile = useIsMobile();
    const [files, setFiles] = useState<FileData[]>([]);
    const [targetFormat, setTargetFormat] = useState<ImageFormat>('image/webp');
    const [quality, setQuality] = useState(90);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedFiles, setProcessedFiles] = useState<{ name: string, url: string, size: string }[]>([]);

    const handleFiles = (newFiles: FileData | FileData[]) => {
        if (Array.isArray(newFiles)) setFiles(prev => [...prev, ...newFiles]);
        else setFiles(prev => [...prev, newFiles]);
        setProcessedFiles([]); // Clear previous results on new upload
    };

    const convertImages = async () => {
        setIsProcessing(true);
        const results = [];

        for (const fileData of files) {
            try {
                const img = await loadImage(fileData.file);
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) continue;

                // Handle transparency for non-PNG/WebP formats
                if (targetFormat === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0);

                const blob = await new Promise<Blob | null>(resolve =>
                    canvas.toBlob(resolve, targetFormat, quality / 100)
                );

                if (blob) {
                    const ext = targetFormat.split('/')[1];
                    const name = fileData.file.name.substring(0, fileData.file.name.lastIndexOf('.')) + '.' + ext;
                    const url = URL.createObjectURL(blob);
                    results.push({
                        name,
                        url,
                        size: (blob.size / 1024).toFixed(1) + ' KB'
                    });
                }
            } catch (e) {
                console.error("Conversion failed for", fileData.file.name, e);
            }
        }
        setProcessedFiles(results);
        setIsProcessing(false);
    };

    const loadImage = (file: File): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.onload = () => resolve(img);
            img.onerror = reject;
        });
    };

    const handleDownloadAll = () => {
        processedFiles.forEach(f => {
            const a = document.createElement('a');
            a.href = f.url;
            a.download = f.name;
            a.click();
        });
    };

    const reset = () => {
        setFiles([]);
        setProcessedFiles([]);
        setIsProcessing(false);
    };

    if (files.length === 0) {
        return (
            <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">

                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight flex items-center justify-center gap-4 font-unbounded">
                        <div className="text-indigo-400"><ArrowRightRightLeft size={42} /></div>
                        <span className="text-white">                            Format Shifter
                        </span>
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium">
                        Convert images between PNG, JPG, and WebP formats instantly.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFilesSelect={handleFiles}
                        onFileSelect={handleFiles}
                        accept="image/png, image/jpeg, image/webp"
                        label="Upload Images to Convert"
                        description="JPG, PNG, WEBP Supported"
                        multiple={true}
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-transparent rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Grid */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    {[
                        { icon: Layers, label: 'Batch Process', desc: 'Convert Multiple Files' },
                        { icon: Zap, label: 'Instant', desc: 'Client-Side Speed' },
                        { icon: Shield, label: 'Secure', desc: 'No Server Upload' },
                        { icon: RotateCw, label: 'Format Shift', desc: 'PNG • JPG • WEBP' }
                    ].map((feat, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors group">
                            <div className="p-3 bg-zinc-900 rounded-full text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
                                <feat.icon size={20} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider font-unbounded">{feat.label}</h3>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1 tracking-tight">{feat.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full bg-[#0c0c0e] text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-7xl mx-auto rounded-[32px] border border-zinc-900 h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)]'}`}>
            {/* Sidebar Controls */}
            <aside className={`${isMobile ? 'order-2 h-1/2' : 'order-1 w-85 border-r'} border-zinc-900 bg-[#0c0c0e] flex flex-col z-20 shrink-0`}>
                <div className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-[#0c0c0e]/80 backdrop-blur-md">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-3 font-unbounded">
                        <Settings size={18} /> SETTINGS
                    </h2>
                    <button onClick={reset} className="text-zinc-600 hover:text-indigo-400 transition-all p-2 hover:bg-indigo-500/5 rounded-xl">
                        <RefreshCcw size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    <section className="space-y-4">
                        <SectionLabel>Target Format</SectionLabel>
                        <div className="w-full">
                            <CategoryDropdown
                                activeCategory={targetFormat}
                                onCategoryChange={(id) => setTargetFormat(id as ImageFormat)}
                                categories={[
                                    { id: 'image/webp', label: 'WEBP' },
                                    { id: 'image/png', label: 'PNG' },
                                    { id: 'image/jpeg', label: 'JPG' }
                                ]}
                                direction="down"
                            />
                        </div>
                    </section>

                    {targetFormat !== 'image/png' && (
                        <section className="space-y-4">
                            <SliderControl
                                label="Quality"
                                value={quality}
                                min={10}
                                max={100}
                                onChange={setQuality}
                                unit="%"
                            />
                            <p className="text-[10px] text-zinc-600 font-medium">Lower quality results in smaller file sizes.</p>
                        </section>
                    )}

                    <div className="pt-4">
                        {!processedFiles.length ? (
                            <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-[0.1em] font-unbounded rounded-2xl" onClick={convertImages} disabled={isProcessing} >
                                {isProcessing ? <Loader2 className="animate-spin" /> : <><ArrowRight className="mr-2" size={18} /> Convert All</>}
                            </Button>
                        ) : (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-2xl flex items-center justify-between">
                                    <span className="text-green-500 font-bold text-xs uppercase tracking-wider">Conversion Complete</span>
                                    <span className="text-green-400 font-mono text-xs">{processedFiles.length} files</span>
                                </div>
                                <Button className="w-full h-14 bg-indigo-600 text-white hover:bg-indigo-500 font-black uppercase text-xs tracking-[0.1em] font-unbounded rounded-2xl" onClick={handleDownloadAll} >
                                    <Download className="mr-2" size={18} /> Download All
                                </Button>
                                <button onClick={() => setProcessedFiles([])} className="w-full text-center text-[10px] text-zinc-500 hover:text-white uppercase font-bold tracking-widest pt-2">
                                    Convert More
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className={`order-3 ${isMobile ? 'h-1/2' : 'flex-1'} relative bg-[#09090b] p-4 md:p-8 overflow-y-auto custom-scrollbar shrink-0`}>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {files.map((f, i) => (
                        <div key={i} className="relative group aspect-square bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                            <img
                                src={f.previewUrl}
                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                                <p className="text-[10px] text-white font-bold truncate">{f.file.name}</p>
                                <p className="text-[9px] text-zinc-500 uppercase">{f.size}</p>
                            </div>
                            {/* Remove button could go here */}
                        </div>
                    ))}

                    <button
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.multiple = true;
                            input.onchange = (e) => handleFiles(Array.from((e.target as HTMLInputElement).files!).map(f => ({
                                file: f, name: f.name, size: (f.size / 1024).toFixed(1) + 'KB', type: f.type, previewUrl: URL.createObjectURL(f)
                            })));
                            input.click();
                        }}
                        className="aspect-square rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/30 flex flex-col items-center justify-center text-zinc-600 hover:text-indigo-400 hover:border-indigo-500/30 transition-all font-unbounded text-[10px] font-black uppercase tracking-widest gap-2"
                    >
                        <FileImage size={24} />
                        <span>Add More</span>
                    </button>
                </div>
            </main>
        </div>
    );
};

// Icon
const ArrowRightRightLeft = ({ size }: { size: number }) => (
    <div className="flex">
        <Image size={size} />
        <ArrowRight size={size} className="mx-1 opacity-50" />
        <FileImage size={size} />
    </div>
);
