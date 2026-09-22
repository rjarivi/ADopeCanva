/// <reference lib="dom" />
import React, { useState, useCallback } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { FileImage, Download, RefreshCcw, Zap, Layers, Image as ImageIcon, Archive } from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { useIsMobile } from '../../hooks/useIsMobile';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { setupPdfWorker, getPdfDocument, validatePdfFile, classifyPdfError } from '../../utils/pdfWorker';
import { logToolFailure } from '../../utils/toolHealth';

// Shared PDF.js worker (local-first with CDN fallback) — see utils/pdfWorker.ts
setupPdfWorker();

interface PageImage {
    pageNum: number;
    dataUrl: string;
    width: number;
    height: number;
}

export const PdfToJpg: React.FC = () => {
    const isMobile = useIsMobile();
    const [file, setFile] = useState<FileData | null>(null);
    const [pageImages, setPageImages] = useState<PageImage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pageCount, setPageCount] = useState(0);
    const [quality, setQuality] = useState(90);
    const [scale, setScale] = useState(2); // 2x for better quality
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const handleFileSelect = useCallback((newFile: FileData | FileData[]) => {
        const selectedFile = Array.isArray(newFile) ? newFile[0] : newFile;
        setFile(selectedFile);
        setPageImages([]);
        setPageCount(0);
        setError(null);
        setProgress(0);
    }, []);

    const convertToImages = useCallback(async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setPageImages([]);
        setProgress(0);

        try {
            const validationError = await validatePdfFile(file.file);
            if (validationError) { setError(validationError); return; }
            const arrayBuffer = await file.file.arrayBuffer();
            const pdf = await getPdfDocument(arrayBuffer, 'pdf-to-jpg');
            try {
                setPageCount(pdf.numPages);

                const images: PageImage[] = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    setProgress(Math.round((i / pdf.numPages) * 100));

                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: scale });

                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        throw new Error('Could not get canvas context');
                    }

                    await page.render({
                        canvasContext: ctx,
                        viewport: viewport,
                        canvas: canvas
                    } as any).promise;

                    const dataUrl = canvas.toDataURL('image/jpeg', quality / 100);

                    images.push({
                        pageNum: i,
                        dataUrl: dataUrl,
                        width: viewport.width,
                        height: viewport.height
                    });
                    
                    page.cleanup();
                }

                setPageImages(images);
            } finally {
                await pdf.destroy();
            }
        } catch (err) {
            logToolFailure('pdf-to-jpg', err, { stage: 'pdf-convert' });
            setError(classifyPdfError(err));
        } finally {
            setIsProcessing(false);
            setProgress(100);
        }
    }, [file, quality, scale]);

    const downloadSingle = useCallback((image: PageImage) => {
        const baseName = (file?.file.name ?? 'document.pdf').replace(/\.pdf$/i, '');
        const link = document.createElement('a');
        link.href = image.dataUrl;
        link.download = `${baseName}-page-${image.pageNum}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [file]);

    const downloadAll = useCallback(async () => {
        if (pageImages.length === 0) return;

        if (pageImages.length === 1) {
            downloadSingle(pageImages[0]);
            return;
        }

        try {
            const zip = new JSZip();
            const folder = zip.folder('pdf-images');

            for (const image of pageImages) {
                // Convert data URL to blob
                const response = await fetch(image.dataUrl);
                const blob = await response.blob();
                folder?.file(`page-${image.pageNum}.jpg`, blob);
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${(file?.file.name ?? 'document.pdf').replace(/\.pdf$/i, '')}-images.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            logToolFailure('pdf-to-jpg', err, { stage: 'zip-download' });
            setError('Failed to package images. Try downloading pages individually.');
        }
    }, [pageImages, file, downloadSingle]);

    const handleReset = () => {
        setFile(null);
        setPageImages([]);
        setPageCount(0);
        setError(null);
        setProgress(0);
    };

    if (!file) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <FileImage size={32} /> PDF to JPG
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Convert PDF pages to high-quality JPG images.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept=".pdf"
                        label="Upload PDF"
                        description="Select a PDF to convert to images"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Zap, label: 'Fast Convert', desc: 'Instant processing' },
                        { icon: Layers, label: 'All Pages', desc: 'Batch conversion' },
                        { icon: ImageIcon, label: 'High Quality', desc: 'Adjustable DPI' },
                        { icon: Archive, label: 'ZIP Download', desc: 'All at once' }
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
                        <FileImage size={20} /> PDF to JPG
                    </h2>
                    <button onClick={handleReset} className="text-zinc-600 hover:text-indigo-400 transition-colors">
                        <RefreshCcw size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <section className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-900/50 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500 font-medium">File Name</span>
                                <span className="text-xs text-zinc-300 font-mono truncate max-w-[150px]">{file.file.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500 font-medium">File Size</span>
                                <span className="text-xs text-zinc-300 font-mono">{file.size}</span>
                            </div>
                            {pageCount > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-zinc-500 font-medium">Pages</span>
                                    <span className="text-xs text-indigo-400 font-mono font-bold">{pageCount}</span>
                                </div>
                            )}
                        </section>

                        {/* Quality Settings */}
                        <section className="space-y-4">
                            <SectionLabel>Output Settings</SectionLabel>

                            <SliderControl
                                label="Quality"
                                value={quality}
                                min={50}
                                max={100}
                                onChange={setQuality}
                                unit="%"
                            />

                            <div className="group">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-zinc-400">Resolution Scale</span>
                                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{scale}×</span>
                                </div>
                                <select
                                    value={scale}
                                    onChange={(e) => setScale(parseFloat(e.target.value))}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 pr-8 text-sm text-zinc-200 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none appearance-none hover:border-indigo-500/50 transition-colors cursor-pointer"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
                                >
                                    <option value={1}>1× (72 DPI)</option>
                                    <option value={1.5}>1.5× (108 DPI)</option>
                                    <option value={2}>2× (144 DPI)</option>
                                    <option value={3}>3× (216 DPI)</option>
                                    <option value={4}>4× (288 DPI)</option>
                                </select>
                            </div>
                        </section>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                                <p className="text-xs text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {isProcessing && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-zinc-500">
                                    <span>Converting...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {pageImages.length === 0 ? (
                                <Button className="w-full h-12 border-none shadow-lg shadow-indigo-900/20" onClick={convertToImages} isLoading={isProcessing} disabled={isProcessing} >
                                    <FileImage size={18} className="mr-2" />
                                    {isProcessing ? 'Converting...' : 'Convert to JPG'}
                                </Button>
                            ) : (
                                <div className="space-y-3 animate-slide-up">
                                    <Button className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-500 border-none shadow-lg" onClick={downloadAll} >
                                        <Archive size={18} className="mr-2" />
                                        {pageImages.length === 1 ? 'Download JPG' : `Download All (${pageImages.length} images)`}
                                    </Button>
                                    <Button className="w-full h-12 border-none shadow-lg shadow-indigo-900/20" onClick={convertToImages} isLoading={isProcessing} disabled={isProcessing} >
                                        <FileImage size={18} className="mr-2" />
                                        {isProcessing ? 'Converting...' : 'Re-convert with New Settings'}
                                    </Button>
                                    <Button variant="secondary" className="w-full h-12 border-zinc-800" onClick={handleReset}>
                                        <RefreshCcw size={16} className="mr-2" /> Start New
                                    </Button>
                                </div>
                            )}
                        </div>

                        <section className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
                            <SectionLabel>About</SectionLabel>
                            <p className="text-[10px] text-zinc-500 leading-relaxed uppercase font-bold tracking-tight">
                                Converts each PDF page to a high-quality JPG image. All processing happens locally in your browser.
                            </p>
                        </section>
                    </div>
                </div>
            </aside>

            {/* Preview Area */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex flex-col p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="relative flex-1 overflow-auto custom-scrollbar">
                    {pageImages.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {pageImages.map((image) => (
                                <div
                                    key={image.pageNum}
                                    className="group relative bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer"
                                    onClick={() => downloadSingle(image)}
                                >
                                    <img
                                        src={image.dataUrl}
                                        alt={`Page ${image.pageNum}`}
                                        className="w-full h-auto"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-white font-bold">Page {image.pageNum}</span>
                                            <Download size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                            <FileImage size={48} className="mb-4 opacity-50" />
                            <p className="text-sm">Click "Convert to JPG" to begin</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
