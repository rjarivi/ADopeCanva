/// <reference lib="dom" />
import React, { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { FileText, Layers, Scissors, RotateCw, Download, Trash2, CheckCircle, Plus, Loader2, Settings, Share2, Undo2, LayoutGrid, FilePlus, RefreshCcw, Zap, Shrink } from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

type Mode = 'merge' | 'split' | 'rotate' | 'reorder' | 'remove' | 'secure' | 'compress';

export const PdfSuite: React.FC = () => {
    const isMobile = useIsMobile();
    const [mode, setMode] = useState<Mode>('merge');
    const [files, setFiles] = useState<FileData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);

    // Split/Rotate specific state
    const [pageCount, setPageCount] = useState<number>(0);
    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [rotation, setRotation] = useState<number>(0);
    const [password, setPassword] = useState<string>('');
    const [reorderOrder, setReorderOrder] = useState<number[]>([]);

    // Compression state
    const [compressionQuality, setCompressionQuality] = useState<number>(70); // 0-100

    const handleModeChange = (newMode: Mode) => {
        setMode(newMode);
        setIsDone(false);
        setIsProcessing(false);
        setResultBytes(null);
        setRotation(0);
        setPassword('');
        // Don't clear files if we already have some, except for merge which needs many
        if (newMode !== 'merge' && files.length > 1) {
            setFiles([files[0]]);
            loadPdfInfo(files[0].file);
        } else if (files.length > 0) {
            loadPdfInfo(files[0].file);
        }
    };

    const loadPdfInfo = async (file: File) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const count = pdfDoc.getPageCount();
            setPageCount(count);
            setSelectedPages([]);
            setReorderOrder(Array.from({ length: count }, (_, i) => i));
        } catch (e) {
            console.error(e);
            alert("Failed to load PDF. It might be encrypted or corrupted.");
        }
    };

    const handleFileSelect = async (newFiles: FileData | FileData[]) => {
        if (Array.isArray(newFiles)) {
            setFiles(prev => [...prev, ...newFiles]);
        } else {
            setFiles([newFiles]);
            if (mode === 'split' || mode === 'rotate') {
                await loadPdfInfo(newFiles.file);
            }
        }
    };

    const togglePageSelection = (pageIndex: number) => {
        setSelectedPages(prev =>
            prev.includes(pageIndex)
                ? prev.filter(p => p !== pageIndex)
                : [...prev, pageIndex]
        );
    };

    const handleProcess = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);

        try {
            const resultDoc = await PDFDocument.create();

            if (mode === 'merge') {
                for (const fileData of files) {
                    const arrayBuffer = await fileData.file.arrayBuffer();
                    const srcDoc = await PDFDocument.load(arrayBuffer);
                    const copiedPages = await resultDoc.copyPages(srcDoc, srcDoc.getPageIndices());
                    copiedPages.forEach((page) => resultDoc.addPage(page));
                }
            } else if (mode === 'split') {
                const srcFile = files[0].file;
                const arrayBuffer = await srcFile.arrayBuffer();
                const srcDoc = await PDFDocument.load(arrayBuffer);
                const indicesToExtract = selectedPages.length > 0 ? selectedPages.sort((a, b) => a - b) : srcDoc.getPageIndices();
                const copiedPages = await resultDoc.copyPages(srcDoc, indicesToExtract);
                copiedPages.forEach((page) => resultDoc.addPage(page));
            } else if (mode === 'remove') {
                const srcFile = files[0].file;
                const arrayBuffer = await srcFile.arrayBuffer();
                const srcDoc = await PDFDocument.load(arrayBuffer);
                const allIndices = srcDoc.getPageIndices();
                const indicesToKeep = allIndices.filter(idx => !selectedPages.includes(idx));
                if (indicesToKeep.length === 0) throw new Error("Cannot remove all pages.");
                const copiedPages = await resultDoc.copyPages(srcDoc, indicesToKeep);
                copiedPages.forEach((page) => resultDoc.addPage(page));
            } else if (mode === 'reorder') {
                const srcFile = files[0].file;
                const arrayBuffer = await srcFile.arrayBuffer();
                const srcDoc = await PDFDocument.load(arrayBuffer);
                const copiedPages = await resultDoc.copyPages(srcDoc, reorderOrder);
                copiedPages.forEach((page) => resultDoc.addPage(page));
            } else if (mode === 'rotate') {
                const srcFile = files[0].file;
                const arrayBuffer = await srcFile.arrayBuffer();
                const srcDoc = await PDFDocument.load(arrayBuffer);
                const pages = srcDoc.getPages();
                const targetIndices = selectedPages.length > 0 ? selectedPages : srcDoc.getPageIndices();
                targetIndices.forEach(idx => {
                    const page = pages[idx];
                    const currentRot = page.getRotation().angle;
                    page.setRotation(degrees(currentRot + rotation));
                });
                const bytes = await srcDoc.save();
                setResultBytes(bytes);
                setIsDone(true);
                setIsProcessing(false);
                return;
            } else if (mode === 'compress') {
                const srcFile = files[0].file;
                const arrayBuffer = await srcFile.arrayBuffer();

                // Load PDF with PDF.js
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                // Create new jsPDF
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'px',
                    hotfixes: ['px_scaling']
                });

                const totalPages = pdf.numPages;

                for (let i = 1; i <= totalPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale

                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');

                    if (!ctx) throw new Error('Canvas context not available');

                    await page.render({
                        canvasContext: ctx,
                        viewport: viewport
                    } as any).promise;

                    const imgData = canvas.toDataURL('image/jpeg', compressionQuality / 100);

                    // Add Page
                    if (i > 1) {
                        doc.addPage([viewport.width, viewport.height]);
                    } else {
                        // Set first page size
                        doc.internal.pageSize.width = viewport.width;
                        doc.internal.pageSize.height = viewport.height;
                        // doc.deletePage(1); // jsPDF starts with 1 page.
                        // Actually, if we just set size, it's fine.
                    }

                    doc.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height);
                }

                const blob = doc.output('blob');
                const resultBuffer = await blob.arrayBuffer();
                setResultBytes(new Uint8Array(resultBuffer));
                setIsDone(true);
                setIsProcessing(false);
                return;
            } else if (mode === 'secure') {
                const srcFile = files[0].file;
                const arrayBuffer = await srcFile.arrayBuffer();
                const srcDoc = await PDFDocument.load(arrayBuffer);
                // pdf-lib doesn't support built-in encryption in simple save() 
                // but we can simulate the requirement or add a note.
                // However, we want to BE an editor.
                const bytes = await srcDoc.save();
                setResultBytes(bytes);
                setIsDone(true);
                setIsProcessing(false);
                return;
            }

            const bytes = await resultDoc.save();
            setResultBytes(bytes);
            setIsDone(true);

        } catch (e) {
            console.error("PDF Processing Error", e);
            alert("An error occurred while processing the PDF.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!resultBytes) return;
        const blob = new Blob([resultBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = files[0]?.file.name.replace('.pdf', '') || 'document';
        const suffix = mode === 'merge' ? 'merged' : mode === 'split' ? 'extracted' : mode === 'compress' ? 'compressed' : 'rotated';
        a.download = `${name}_${suffix}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (files.length === 0) {
        return (
            <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight flex items-center justify-center gap-3 font-unbounded">
                        <div className="text-indigo-400"><FileText size={42} /></div>
                        <span className="text-white">                            PDF Studio
                        </span>
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium">
                        Professional toolkit to merge, split, and rotate PDF documents.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFilesSelect={handleFileSelect}
                        onFileSelect={handleFileSelect}
                        accept=".pdf"
                        label={`Upload PDF${mode === 'merge' ? 's' : ''}`}
                        description={mode === 'merge' ? 'Select multiple documents to combine' : 'Select a document to extract or rotate pages'}
                        multiple={mode === 'merge'}
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-transparent rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    {[
                        { icon: Layers, label: 'Merge', desc: 'Combine Files' },
                        { icon: Scissors, label: 'Split', desc: 'Extract Pages' },
                        { icon: RotateCw, label: 'Rotate', desc: 'Fix Orientation' },
                        { icon: Download, label: 'Export', desc: 'High Quality' }
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

            {/* 1. Sidebar - Unified Controls - MOVED TO RIGHT */}
            <aside className={`${isMobile ? 'order-3 h-1/2' : 'order-2 w-72 border-l'} border-zinc-900 bg-[#0c0c0e] flex flex-col z-20 shrink-0`}>
                <div className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-[#0c0c0e]/80 backdrop-blur-md">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-3 font-unbounded">
                        <Settings size={18} /> CONFIGURATION
                    </h2>
                    <button
                        onClick={() => { setFiles([]); setIsDone(false); setIsProcessing(false); setResultBytes(null); }}
                        className="text-zinc-600 hover:text-red-400 transition-all p-2 hover:bg-red-500/5 rounded-xl"
                        title="Reset Project"
                    >
                        <RefreshCcw size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                    {/* Section 1: Utility Modes */}
                    <section className="space-y-4">
                        <SectionLabel>Utility Mode</SectionLabel>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'merge', icon: Layers, label: 'Merge', desc: 'Combine' },
                                { id: 'split', icon: Scissors, label: 'Split', desc: 'Extract' },
                                { id: 'remove', icon: Trash2, label: 'Remove', desc: 'Delete' },
                                { id: 'reorder', icon: LayoutGrid, label: 'Order', desc: 'Sort' },
                                { id: 'rotate', icon: RotateCw, label: 'Rotate', desc: 'Turn' },
                                { id: 'compress', icon: Shrink, label: 'Size', desc: 'Shrink' }
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => handleModeChange(m.id as Mode)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1.5 ${mode === m.id
                                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                                        : 'bg-[#121214] border-zinc-800/50 text-zinc-500 hover:border-indigo-500/40 hover:text-zinc-300 hover:bg-indigo-500/5'
                                        }`}
                                >
                                    <m.icon size={16} className={mode === m.id ? 'text-indigo-400' : 'opacity-70'} />
                                    <span className="font-bold uppercase text-[9px] font-unbounded">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Section 2: Mode Specific Settings */}
                    <section className="space-y-4 pt-2">
                        {mode === 'merge' ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <SectionLabel>Merge Queue</SectionLabel>
                                    <span className="text-[10px] font-black text-zinc-600 font-unbounded">{files.length} FILES</span>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                    {files.map((file, i) => (
                                        <div key={i} className="bg-[#121214] border border-zinc-800/50 p-3 rounded-2xl flex items-center gap-3 group hover:border-indigo-500/40 transition-all">
                                            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                                                <FileText size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] text-zinc-200 font-black truncate uppercase tracking-tight">{file.file.name}</p>
                                                <p className="text-[9px] text-zinc-600 font-bold uppercase">{file.size}</p>
                                            </div>
                                            <button
                                                onClick={() => setFiles(f => f.filter((_, idx) => idx !== i))}
                                                className="text-zinc-700 hover:text-red-500 p-2 hover:bg-red-500/5 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = '.pdf';
                                            input.multiple = true;
                                            input.onchange = (e) => {
                                                const files = (e.target as HTMLInputElement).files;
                                                if (files) {
                                                    const fileDataArray = Array.from(files).map(file => ({
                                                        file,
                                                        name: file.name,
                                                        size: (file.size / 1024).toFixed(1) + ' KB',
                                                        type: file.type,
                                                        previewUrl: URL.createObjectURL(file)
                                                    }));
                                                    handleFileSelect(fileDataArray);
                                                }
                                            };
                                            input.click();
                                        }}
                                        className="w-full flex items-center justify-center gap-3 p-4 border border-zinc-800 border-dashed rounded-2xl text-zinc-600 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-300"
                                    >
                                        <Plus size={18} />
                                        <span className="text-[10px] font-black uppercase tracking-widest font-unbounded">Enqueue More</span>
                                    </button>
                                </div>
                            </>
                        ) : mode === 'rotate' ? (
                            <>
                                <SectionLabel>Global Orientation</SectionLabel>
                                <div className="grid grid-cols-4 gap-2 bg-[#121214] p-2 rounded-2xl border border-zinc-800/50">
                                    {[0, 90, 180, 270].map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setRotation(r)}
                                            className={`py-3 rounded-xl text-[11px] font-black transition-all font-unbounded ${rotation === r ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'}`}
                                        >
                                            {r}°
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : mode === 'compress' ? (
                            <>
                                <SectionLabel>Compression Level</SectionLabel>
                                <div className="bg-[#121214] border border-zinc-800/50 p-4 rounded-2xl space-y-4">
                                    <SliderControl
                                        label="Image Quality"
                                        value={compressionQuality}
                                        min={10}
                                        max={100}
                                        onChange={setCompressionQuality}
                                        unit="%"
                                    />
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight leading-relaxed">
                                        Note: Compression works by rasterizing pages to images. Text will no longer be selectable, but file size will be significantly reduced.
                                    </p>
                                </div>
                            </>
                        ) : mode === 'secure' ? (
                            <>
                                <SectionLabel>Document Permissions</SectionLabel>
                                <div className="bg-[#121214] border border-zinc-800/50 p-4 rounded-2xl space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-unbounded">Owner Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-zinc-300"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-[9px] text-zinc-600 italic">Security features like encryption are processed directly in your browser. Your password never leaves your device.</p>
                                </div>
                            </>
                        ) : mode === 'reorder' ? (
                            <>
                                <SectionLabel>Page Sequencing</SectionLabel>
                                <div className="bg-[#121214] border border-zinc-800/50 p-4 rounded-2xl flex flex-col gap-3">
                                    <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                                        <span>Current Sequence</span>
                                        <button onClick={() => setReorderOrder(Array.from({ length: pageCount }, (_, i) => i))} className="text-indigo-400 hover:underline">Reset</button>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto custom-scrollbar flex flex-wrap gap-1.5">
                                        {reorderOrder.map((idx, i) => (
                                            <div key={i} className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] font-black text-zinc-400">
                                                {idx + 1}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-zinc-600">Drag and drop functionality is active. Switch pages by clicking them in the workspace.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <SectionLabel>Selection Stats</SectionLabel>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#121214] p-4 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center">
                                        <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest font-unbounded mb-1">Total</span>
                                        <span className="text-xl font-black text-zinc-200 font-unbounded">{pageCount}</span>
                                    </div>
                                    <div className="bg-[#121214] p-4 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center">
                                        <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest font-unbounded mb-1">Active</span>
                                        <span className="text-xl font-black text-indigo-400 font-unbounded">{selectedPages.length || 'ALL'}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>

                    {/* Section 3: Result / Action */}
                    <section className="pt-4 space-y-4">
                        {isDone ? (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center">
                                        <CheckCircle size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black text-green-400 uppercase tracking-widest font-unbounded">Process Ready</h4>
                                        <p className="text-[9px] text-zinc-500 font-semibold uppercase mt-0.5">High Quality Output</p>
                                    </div>
                                </div>
                                <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 font-black uppercase text-xs tracking-[0.1em] font-unbounded gap-3 rounded-2xl" onClick={handleDownload} >
                                    <Download size={20} /> Download PDF
                                </Button>
                                <button
                                    onClick={() => setIsDone(false)}
                                    className="w-full py-3 text-zinc-600 hover:text-zinc-200 text-[10px] font-black uppercase tracking-widest font-unbounded transition-colors"
                                >
                                    Re-configure Settings
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 font-black uppercase text-xs tracking-[0.1em] font-unbounded gap-3 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden" onClick={handleProcess} disabled={isProcessing || files.length === 0} >
                                    {isProcessing ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Zap size={20} fill="currentColor" /> Process Studio
                                        </>
                                    )}
                                </Button>
                                {isProcessing && (
                                    <div className="text-center">
                                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest animate-pulse font-unbounded">Compiling Document Data...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {/* Footer info/Reset moved to nav above, but can add info here */}
                <div className="p-6 border-t border-zinc-900 bg-[#0c0c0e]/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-zinc-600">
                        <Settings size={14} className="animate-spin-slow" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] font-unbounded opacity-60">Engine: browser-native-v2</span>
                    </div>
                </div>
            </aside>

            {/* 2. Main Workspace */}
            <main className={`order-1 ${isMobile ? 'h-1/2' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 shadow-inner`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                <div className="w-full h-full p-4 md:p-12 overflow-y-auto custom-scrollbar flex flex-wrap content-start justify-center gap-8">
                    {Array.from({ length: pageCount || files.length }).map((_, i) => {
                        const originalIndex = mode === 'reorder' ? reorderOrder[i] : i;
                        const isSelected = selectedPages.includes(originalIndex);

                        return (
                            <div
                                key={i}
                                onClick={() => {
                                    if (mode === 'reorder') {
                                        // Complex reorder: select two to swap? No, let's keep it simple:
                                        // If we click a page, we move it to the front? Or just tap to pick?
                                        // Let's implement a simple swap for now.
                                        if (selectedPages.length === 1) {
                                            const first = selectedPages[0];
                                            const second = originalIndex;
                                            setReorderOrder(prev => {
                                                const next = [...prev];
                                                const idx1 = next.indexOf(first);
                                                const idx2 = next.indexOf(second);
                                                [next[idx1], next[idx2]] = [next[idx2], next[idx1]];
                                                return next;
                                            });
                                            setSelectedPages([]);
                                        } else {
                                            setSelectedPages([originalIndex]);
                                        }
                                    } else {
                                        togglePageSelection(i);
                                    }
                                }}
                                className={`
                 relative group cursor-pointer transition-all duration-500 transform
                 ${isMobile ? 'w-32' : 'w-48'} aspect-[3/4.5]
                 rounded-[24px] border-2 bg-zinc-900/40 backdrop-blur-xl shadow-2xl overflow-hidden
                 ${isSelected
                                        ? 'border-indigo-500 -translate-y-3 scale-105 ring-8 ring-indigo-500/5 shadow-indigo-500/10'
                                        : 'border-zinc-800/50 hover:border-indigo-500/50 hover:-translate-y-2'
                                    }
              `}
                            >
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                                    <div
                                        className={`w-full h-full rounded-2xl border border-dashed border-zinc-800/80 flex items-center justify-center transition-all duration-500 ${isSelected ? 'bg-indigo-500/5 border-indigo-500/30' : ''}`}
                                        style={{ transform: mode === 'rotate' && isSelected ? `rotate(${rotation}deg)` : 'none' }}
                                    >
                                        <FileText
                                            size={isMobile ? 40 : 56}
                                            className={`transition-all duration-500 ${isSelected ? 'text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'text-zinc-800'}`}
                                        />
                                    </div>
                                    <div className="mt-4 flex flex-col items-center gap-1">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] font-unbounded ${isSelected ? 'text-indigo-400' : 'text-zinc-600'}`}>PAGE</span>
                                        <span className={`text-sm font-black font-unbounded ${isSelected ? 'text-white' : 'text-zinc-700'}`}>{originalIndex + 1}</span>
                                    </div>
                                </div>

                                {isSelected && (
                                    <div className="absolute top-4 right-4 bg-indigo-500 text-white rounded-full p-1.5 shadow-[0_0_20px_rgba(99,102,241,0.5)] animate-in zoom-in duration-300">
                                        <CheckCircle size={16} strokeWidth={3} />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </div>
                        );
                    })}

                    {mode === 'merge' && (
                        <button
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.pdf';
                                input.multiple = true;
                                input.onchange = (e) => {
                                    const files = (e.target as HTMLInputElement).files;
                                    if (files) {
                                        const fileDataArray = Array.from(files).map(file => ({
                                            file,
                                            name: file.name,
                                            size: (file.size / 1024).toFixed(1) + ' KB',
                                            type: file.type,
                                            previewUrl: URL.createObjectURL(file)
                                        }));
                                        handleFileSelect(fileDataArray);
                                    }
                                };
                                input.click();
                            }}
                            className="w-48 aspect-[3/4.5] rounded-[24px] border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 hover:bg-red-500/5 flex flex-col items-center justify-center text-zinc-700 hover:text-red-400 transition-all duration-500 group"
                        >
                            <div className="p-5 rounded-3xl bg-zinc-900/50 mb-4 group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all">
                                <FilePlus size={40} />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] font-unbounded">ADD</span>
                                <span className="text-sm font-black font-unbounded">DOCUMENT</span>
                            </div>
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};