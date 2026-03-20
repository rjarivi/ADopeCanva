/// <reference lib="dom" />
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import {
    FileText, Layers, Scissors, RotateCw, Download, Trash2, CheckCircle, Plus,
    Loader2, Settings, RefreshCcw, LayoutGrid, FilePlus, Zap, Shrink,
    ChevronLeft, ChevronRight, X, Maximize2, CheckSquare, Square, ToggleLeft,
    GripVertical
} from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

type Mode = 'merge' | 'split' | 'rotate' | 'reorder' | 'remove' | 'secure' | 'compress';

// Renders a PDF page to a canvas data URL
async function renderPageToDataUrl(file: File, pageIndex: number, scale = 0.4): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    await page.render({ canvasContext: ctx, viewport } as any).promise;
    return canvas.toDataURL('image/jpeg', 0.75);
}

// Parse range string like "1-3,5,7-9" into 0-based indices
function parsePageRanges(rangeStr: string, maxPages: number): number[] {
    const indices = new Set<number>();
    const parts = rangeStr.split(',');
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            for (let i = start; i <= end; i++) {
                if (i >= 1 && i <= maxPages) indices.add(i - 1);
            }
        } else {
            const num = parseInt(trimmed, 10);
            if (!isNaN(num) && num >= 1 && num <= maxPages) indices.add(num - 1);
        }
    }
    return Array.from(indices).sort((a, b) => a - b);
}

export const PdfSuite: React.FC = () => {
    const isMobile = useIsMobile();
    const [mode, setMode] = useState<Mode>('merge');
    const [files, setFiles] = useState<FileData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);

    // Page state
    const [pageCount, setPageCount] = useState<number>(0);
    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [rotation, setRotation] = useState<number>(0);
    const [password, setPassword] = useState<string>('');
    const [reorderOrder, setReorderOrder] = useState<number[]>([]);

    // Thumbnails: array of data URLs indexed by page
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [thumbnailsLoading, setThumbnailsLoading] = useState(false);

    // Full-page preview
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewPage, setPreviewPage] = useState(0);
    const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
    const [previewLoading, setPreviewLoading] = useState(false);

    // Page range input
    const [rangeInput, setRangeInput] = useState('');
    const [rangeError, setRangeError] = useState('');

    // Compression
    const [compressionQuality, setCompressionQuality] = useState<number>(70);

    // Drag-and-drop reorder
    const dragSrcIndex = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // ── Thumbnail generation ──────────────────────────────────────────────────

    const generateThumbnails = useCallback(async (file: File, count: number) => {
        setThumbnailsLoading(true);
        const thumbs: string[] = new Array(count).fill('');
        setThumbnails([...thumbs]);
        for (let i = 0; i < count; i++) {
            try {
                const url = await renderPageToDataUrl(file, i, 0.35);
                thumbs[i] = url;
                setThumbnails([...thumbs]);
            } catch {
                // keep empty string on failure
            }
        }
        setThumbnailsLoading(false);
    }, []);

    // ── PDF info loading ──────────────────────────────────────────────────────

    const loadPdfInfo = useCallback(async (file: File) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const count = pdfDoc.getPageCount();
            setPageCount(count);
            setSelectedPages([]);
            setReorderOrder(Array.from({ length: count }, (_, i) => i));
            setRangeInput('');
            setRangeError('');
            await generateThumbnails(file, count);
        } catch (e) {
            console.error(e);
            alert('Failed to load PDF. It might be encrypted or corrupted.');
        }
    }, [generateThumbnails]);

    const handleModeChange = (newMode: Mode) => {
        setMode(newMode);
        setIsDone(false);
        setIsProcessing(false);
        setResultBytes(null);
        setRotation(0);
        setPassword('');
        setRangeInput('');
        setRangeError('');
        if (newMode !== 'merge' && files.length > 1) {
            setFiles([files[0]]);
            loadPdfInfo(files[0].file);
        } else if (files.length > 0 && newMode !== 'merge') {
            loadPdfInfo(files[0].file);
        }
    };

    const handleFileSelect = async (newFiles: FileData | FileData[]) => {
        if (Array.isArray(newFiles)) {
            setFiles(prev => [...prev, ...newFiles]);
        } else {
            setFiles([newFiles]);
            if (mode !== 'merge') {
                await loadPdfInfo(newFiles.file);
            }
        }
    };

    // ── Selection helpers ─────────────────────────────────────────────────────

    const togglePageSelection = (pageIndex: number) => {
        setSelectedPages(prev =>
            prev.includes(pageIndex)
                ? prev.filter(p => p !== pageIndex)
                : [...prev, pageIndex]
        );
    };

    const selectAll = () => setSelectedPages(Array.from({ length: pageCount }, (_, i) => i));
    const deselectAll = () => setSelectedPages([]);
    const invertSelection = () =>
        setSelectedPages(
            Array.from({ length: pageCount }, (_, i) => i).filter(i => !selectedPages.includes(i))
        );

    // Apply range string
    const applyRange = () => {
        if (!rangeInput.trim()) { setRangeError(''); return; }
        const indices = parsePageRanges(rangeInput, pageCount);
        if (indices.length === 0) {
            setRangeError('No valid pages found for this range.');
            return;
        }
        setRangeError('');
        setSelectedPages(indices);
    };

    // ── Full-page preview ─────────────────────────────────────────────────────

    const openPreview = async (pageIndex: number) => {
        setPreviewPage(pageIndex);
        setPreviewOpen(true);
        setPreviewLoading(true);
        setPreviewDataUrl('');
        try {
            const file = files[0]?.file;
            if (!file) return;
            const url = await renderPageToDataUrl(file, pageIndex, 1.5);
            setPreviewDataUrl(url);
        } catch {
            // ignore
        } finally {
            setPreviewLoading(false);
        }
    };

    const navigatePreview = useCallback(async (delta: number) => {
        const next = Math.max(0, Math.min(pageCount - 1, previewPage + delta));
        if (next === previewPage) return;
        setPreviewPage(next);
        setPreviewLoading(true);
        setPreviewDataUrl('');
        try {
            const file = files[0]?.file;
            if (!file) return;
            const url = await renderPageToDataUrl(file, next, 1.5);
            setPreviewDataUrl(url);
        } catch {
            // ignore
        } finally {
            setPreviewLoading(false);
        }
    }, [previewPage, pageCount, files]);

    // Keyboard navigation for preview
    useEffect(() => {
        if (!previewOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') navigatePreview(-1);
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') navigatePreview(1);
            if (e.key === 'Escape') setPreviewOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [previewOpen, navigatePreview]);

    // ── Drag-and-drop reorder ─────────────────────────────────────────────────

    const handleDragStart = (e: React.DragEvent, index: number) => {
        dragSrcIndex.current = index;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const srcIndex = dragSrcIndex.current;
        if (srcIndex === null || srcIndex === dropIndex) {
            setDragOverIndex(null);
            return;
        }
        setReorderOrder(prev => {
            const next = [...prev];
            const [removed] = next.splice(srcIndex, 1);
            next.splice(dropIndex, 0, removed);
            return next;
        });
        dragSrcIndex.current = null;
        setDragOverIndex(null);
        setSelectedPages([]);
    };

    const handleDragEnd = () => {
        dragSrcIndex.current = null;
        setDragOverIndex(null);
    };

    // ── Processing ────────────────────────────────────────────────────────────

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
                const indicesToExtract = selectedPages.length > 0
                    ? selectedPages.sort((a, b) => a - b)
                    : srcDoc.getPageIndices();
                const copiedPages = await resultDoc.copyPages(srcDoc, indicesToExtract);
                copiedPages.forEach((page) => resultDoc.addPage(page));
            } else if (mode === 'remove') {
                const srcFile = files[0].file;
                const arrayBuffer = await srcFile.arrayBuffer();
                const srcDoc = await PDFDocument.load(arrayBuffer);
                const allIndices = srcDoc.getPageIndices();
                const indicesToKeep = allIndices.filter(idx => !selectedPages.includes(idx));
                if (indicesToKeep.length === 0) throw new Error('Cannot remove all pages.');
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
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'px', hotfixes: ['px_scaling'] });
                const totalPages = pdf.numPages;
                for (let i = 1; i <= totalPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Canvas context not available');
                    await page.render({ canvasContext: ctx, viewport } as any).promise;
                    const imgData = canvas.toDataURL('image/jpeg', compressionQuality / 100);
                    if (i > 1) {
                        doc.addPage([viewport.width, viewport.height]);
                    } else {
                        doc.internal.pageSize.width = viewport.width;
                        doc.internal.pageSize.height = viewport.height;
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
            console.error('PDF Processing Error', e);
            alert('An error occurred while processing the PDF.');
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
        const suffix = mode === 'merge' ? 'merged' : mode === 'split' ? 'extracted' : mode === 'compress' ? 'compressed' : mode === 'reorder' ? 'reordered' : mode === 'remove' ? 'trimmed' : 'rotated';
        a.download = `${name}_${suffix}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const isSingleFileMode = mode !== 'merge';
    const showSelectionTools = mode === 'split' || mode === 'remove' || mode === 'rotate';

    // ── Upload screen ─────────────────────────────────────────────────────────

    if (files.length === 0) {
        return (
            <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
                <div className="flex-none space-y-3 mb-10">
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight flex items-center justify-center gap-3 font-unbounded">
                        <div className="text-indigo-400"><FileText size={42} /></div>
                        <span className="text-white">PDF Studio</span>
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium">
                        Professional toolkit to merge, split, rotate and reorder PDF documents.
                    </p>
                </div>
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFilesSelect={handleFileSelect}
                        onFileSelect={handleFileSelect}
                        accept=".pdf"
                        label={`Upload PDF${mode === 'merge' ? 's' : ''}`}
                        description={mode === 'merge' ? 'Select multiple documents to combine' : 'Select a document to process pages'}
                        multiple={mode === 'merge'}
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-transparent rounded-2xl transition-all"
                    />
                </div>
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

    // ── Main editor layout ────────────────────────────────────────────────────

    return (
        <>
            {/* Full-page preview modal */}
            {previewOpen && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setPreviewOpen(false)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        {/* Close */}
                        <button
                            onClick={() => setPreviewOpen(false)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-indigo-500/50 transition-all"
                        >
                            <X size={20} />
                        </button>

                        {/* Page counter */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-black text-zinc-300 font-unbounded tracking-widest">
                            PAGE {previewPage + 1} / {pageCount}
                        </div>

                        {/* Prev */}
                        <button
                            onClick={() => navigatePreview(-1)}
                            disabled={previewPage === 0}
                            className="absolute left-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-indigo-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        {/* Image */}
                        <div className="max-w-[70vw] max-h-[85vh] flex items-center justify-center">
                            {previewLoading ? (
                                <div className="flex flex-col items-center gap-4 text-zinc-500">
                                    <Loader2 size={40} className="animate-spin text-indigo-400" />
                                    <span className="text-xs font-bold uppercase tracking-widest font-unbounded">Rendering Page...</span>
                                </div>
                            ) : previewDataUrl ? (
                                <img
                                    src={previewDataUrl}
                                    alt={`Page ${previewPage + 1}`}
                                    className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-zinc-800"
                                />
                            ) : (
                                <div className="text-zinc-600 text-sm">Failed to render page.</div>
                            )}
                        </div>

                        {/* Next */}
                        <button
                            onClick={() => navigatePreview(1)}
                            disabled={previewPage === pageCount - 1}
                            className="absolute right-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-indigo-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={24} />
                        </button>

                        {/* Key hint */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-zinc-600 text-[10px] font-bold uppercase tracking-widest font-unbounded">
                            <span className="px-2 py-1 bg-zinc-900/80 rounded border border-zinc-800">A / ←</span>
                            <span>Prev</span>
                            <span className="px-2 py-1 bg-zinc-900/80 rounded border border-zinc-800">D / →</span>
                            <span>Next</span>
                            <span className="px-2 py-1 bg-zinc-900/80 rounded border border-zinc-800">ESC</span>
                            <span>Close</span>
                        </div>
                    </div>
                </div>
            )}

            <div className={`w-full bg-[#0c0c0e] text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-7xl mx-auto rounded-[32px] border border-zinc-900 h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)]'}`}>

                {/* ── Sidebar ── */}
                <aside className={`${isMobile ? 'order-3 h-1/2' : 'order-2 w-72 border-l'} border-zinc-900 bg-[#0c0c0e] flex flex-col z-20 shrink-0`}>
                    <div className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-[#0c0c0e]/80 backdrop-blur-md">
                        <h2 className="font-black text-xs text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-3 font-unbounded">
                            <Settings size={18} /> CONFIGURATION
                        </h2>
                        <button
                            onClick={() => {
                                setFiles([]);
                                setIsDone(false);
                                setIsProcessing(false);
                                setResultBytes(null);
                                setThumbnails([]);
                                setPageCount(0);
                                setSelectedPages([]);
                                setReorderOrder([]);
                                setRangeInput('');
                            }}
                            className="text-zinc-600 hover:text-red-400 transition-all p-2 hover:bg-red-500/5 rounded-xl"
                            title="Reset Project"
                        >
                            <RefreshCcw size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">

                        {/* Mode selector */}
                        <section className="space-y-4">
                            <SectionLabel>Utility Mode</SectionLabel>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'merge', icon: Layers, label: 'Merge' },
                                    { id: 'split', icon: Scissors, label: 'Split' },
                                    { id: 'remove', icon: Trash2, label: 'Remove' },
                                    { id: 'reorder', icon: LayoutGrid, label: 'Order' },
                                    { id: 'rotate', icon: RotateCw, label: 'Rotate' },
                                    { id: 'compress', icon: Shrink, label: 'Size' }
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

                        {/* Mode-specific controls */}
                        <section className="space-y-4 pt-2">

                            {mode === 'merge' && (
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
                                                    const fs = (e.target as HTMLInputElement).files;
                                                    if (fs) {
                                                        const fileDataArray = Array.from(fs).map(f => ({
                                                            file: f,
                                                            name: f.name,
                                                            size: (f.size / 1024).toFixed(1) + ' KB',
                                                            type: f.type,
                                                            previewUrl: URL.createObjectURL(f)
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
                            )}

                            {mode === 'rotate' && (
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
                            )}

                            {mode === 'compress' && (
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
                                            Compression rasterizes pages to images. Text will no longer be selectable.
                                        </p>
                                    </div>
                                </>
                            )}

                            {mode === 'secure' && (
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
                                        <p className="text-[9px] text-zinc-600 italic">Security features processed in your browser. Your password never leaves your device.</p>
                                    </div>
                                </>
                            )}

                            {mode === 'reorder' && (
                                <>
                                    <SectionLabel>Page Sequencing</SectionLabel>
                                    <div className="bg-[#121214] border border-zinc-800/50 p-4 rounded-2xl flex flex-col gap-3">
                                        <div className="flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                                            <span>Current Sequence</span>
                                            <button
                                                onClick={() => setReorderOrder(Array.from({ length: pageCount }, (_, i) => i))}
                                                className="text-indigo-400 hover:underline"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                        <div className="max-h-32 overflow-y-auto custom-scrollbar flex flex-wrap gap-1.5">
                                            {reorderOrder.map((idx, i) => (
                                                <div key={i} className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] font-black text-zinc-400">
                                                    {idx + 1}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-zinc-600 leading-relaxed">
                                            Drag pages in the workspace to reorder. Changes reflected above.
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* Selection tools for split/remove/rotate */}
                            {showSelectionTools && pageCount > 0 && (
                                <>
                                    <SectionLabel>Selection</SectionLabel>

                                    {/* Select all / Invert / Clear */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={selectAll}
                                            className="flex flex-col items-center gap-1 p-2 rounded-xl border border-zinc-800/50 bg-[#121214] text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/40 transition-all text-[8px] font-black uppercase font-unbounded"
                                        >
                                            <CheckSquare size={14} />
                                            All
                                        </button>
                                        <button
                                            onClick={invertSelection}
                                            className="flex flex-col items-center gap-1 p-2 rounded-xl border border-zinc-800/50 bg-[#121214] text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/40 transition-all text-[8px] font-black uppercase font-unbounded"
                                        >
                                            <ToggleLeft size={14} />
                                            Invert
                                        </button>
                                        <button
                                            onClick={deselectAll}
                                            className="flex flex-col items-center gap-1 p-2 rounded-xl border border-zinc-800/50 bg-[#121214] text-zinc-500 hover:text-red-400 hover:border-red-500/40 transition-all text-[8px] font-black uppercase font-unbounded"
                                        >
                                            <Square size={14} />
                                            Clear
                                        </button>
                                    </div>

                                    {/* Page range input */}
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-unbounded">Page Ranges</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="e.g. 1-3, 5, 7-9"
                                                value={rangeInput}
                                                onChange={(e) => setRangeInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && applyRange()}
                                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-zinc-300 placeholder:text-zinc-700"
                                            />
                                            <button
                                                onClick={applyRange}
                                                className="px-3 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 text-[10px] font-black hover:bg-indigo-500/20 transition-all font-unbounded"
                                            >
                                                GO
                                            </button>
                                        </div>
                                        {rangeError && <p className="text-[9px] text-red-400 font-bold">{rangeError}</p>}
                                        <p className="text-[9px] text-zinc-600 leading-relaxed">Combine ranges: <span className="text-zinc-500">1-3, 5, 8-10</span></p>
                                    </div>

                                    {/* Stats */}
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

                        {/* Process / Download */}
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
                                    <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 font-black uppercase text-xs tracking-[0.1em] font-unbounded gap-3 rounded-2xl" onClick={handleDownload}>
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
                                    <Button
                                        className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 font-black uppercase text-xs tracking-[0.1em] font-unbounded gap-3 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleProcess}
                                        disabled={isProcessing || files.length === 0}
                                    >
                                        {isProcessing ? (
                                            <Loader2 size={24} className="animate-spin" />
                                        ) : (
                                            <><Zap size={20} fill="currentColor" /> Process Studio</>
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

                    <div className="p-6 border-t border-zinc-900 bg-[#0c0c0e]/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3 text-zinc-600">
                            <Settings size={14} className="animate-spin-slow" />
                            <span className="text-[9px] font-bold uppercase tracking-[0.15em] font-unbounded opacity-60">Engine: browser-native-v2</span>
                        </div>
                    </div>
                </aside>

                {/* ── Main Workspace ── */}
                <main className={`order-1 ${isMobile ? 'h-1/2' : 'flex-1'} relative bg-[#09090b] flex flex-col overflow-hidden shrink-0 shadow-inner`}>
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                    {/* Workspace toolbar */}
                    {isSingleFileMode && pageCount > 0 && (
                        <div className="relative z-10 flex items-center gap-3 px-4 py-3 border-b border-zinc-900 bg-[#0c0c0e]/60 backdrop-blur-sm shrink-0">
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest font-unbounded">{pageCount} pages</span>
                            {thumbnailsLoading && (
                                <span className="flex items-center gap-1.5 text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
                                    <Loader2 size={10} className="animate-spin" /> Loading previews...
                                </span>
                            )}
                            <div className="flex-1" />
                            {mode === 'reorder' && (
                                <span className="text-[9px] text-indigo-400/70 font-bold uppercase tracking-wider font-unbounded flex items-center gap-1.5">
                                    <GripVertical size={12} /> Drag to reorder
                                </span>
                            )}
                            {showSelectionTools && (
                                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
                                    Click to select · double-click to preview
                                </span>
                            )}
                            {!showSelectionTools && mode !== 'reorder' && (
                                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
                                    Double-click to preview
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-4 md:p-8 flex flex-wrap content-start justify-center gap-6">

                            {Array.from({ length: mode === 'reorder' ? reorderOrder.length : (pageCount || files.length) }).map((_, i) => {
                                const originalIndex = mode === 'reorder' ? reorderOrder[i] : i;
                                const isSelected = selectedPages.includes(originalIndex);
                                const thumbSrc = thumbnails[originalIndex] || '';
                                const isDragOver = dragOverIndex === i;

                                return (
                                    <div
                                        key={`${mode}-${i}-${originalIndex}`}
                                        draggable={mode === 'reorder'}
                                        onDragStart={mode === 'reorder' ? (e) => handleDragStart(e, i) : undefined}
                                        onDragOver={mode === 'reorder' ? (e) => handleDragOver(e, i) : undefined}
                                        onDrop={mode === 'reorder' ? (e) => handleDrop(e, i) : undefined}
                                        onDragEnd={mode === 'reorder' ? handleDragEnd : undefined}
                                        onClick={() => {
                                            if (mode === 'reorder') return; // drag handles reorder
                                            togglePageSelection(originalIndex);
                                        }}
                                        onDoubleClick={() => {
                                            if (files[0]?.file && pageCount > 0) openPreview(originalIndex);
                                        }}
                                        className={`
                                            relative group cursor-pointer transition-all duration-300 transform
                                            ${isMobile ? 'w-28' : 'w-44'} aspect-[3/4.5]
                                            rounded-2xl border-2 bg-zinc-900/60 backdrop-blur-xl shadow-xl overflow-hidden select-none
                                            ${isDragOver ? 'border-indigo-400 scale-105 shadow-indigo-500/20' : ''}
                                            ${isSelected && !isDragOver
                                                ? 'border-indigo-500 -translate-y-2 scale-[1.03] ring-4 ring-indigo-500/10 shadow-indigo-500/20'
                                                : !isDragOver ? 'border-zinc-800/50 hover:border-indigo-500/40 hover:-translate-y-1' : ''
                                            }
                                            ${mode === 'reorder' ? 'cursor-grab active:cursor-grabbing' : ''}
                                        `}
                                    >
                                        {/* Thumbnail or placeholder */}
                                        <div className="absolute inset-0">
                                            {thumbSrc ? (
                                                <img
                                                    src={thumbSrc}
                                                    alt={`Page ${originalIndex + 1}`}
                                                    className={`w-full h-full object-cover transition-all duration-300 ${isSelected ? 'opacity-80' : 'opacity-100'}`}
                                                    style={mode === 'rotate' && isSelected ? { transform: `rotate(${rotation}deg)`, transformOrigin: 'center' } : undefined}
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center ${isSelected ? 'bg-indigo-500/5' : 'bg-zinc-900/40'}`}>
                                                    <FileText
                                                        size={isMobile ? 36 : 48}
                                                        className={`transition-all duration-300 ${isSelected ? 'text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]' : 'text-zinc-800'}`}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Overlay on selected */}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none" />
                                        )}

                                        {/* Page number label */}
                                        <div className={`absolute bottom-0 left-0 right-0 py-2 px-2 flex flex-col items-center gap-0.5
                                            ${thumbSrc ? 'bg-gradient-to-t from-black/80 to-transparent' : ''}`}>
                                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] font-unbounded ${isSelected ? 'text-indigo-300' : 'text-zinc-500'}`}>PAGE</span>
                                            <span className={`text-sm font-black font-unbounded leading-none ${isSelected ? 'text-white' : 'text-zinc-400'}`}>{originalIndex + 1}</span>
                                        </div>

                                        {/* Checkmark badge */}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-1 shadow-[0_0_12px_rgba(99,102,241,0.5)] animate-in zoom-in duration-200">
                                                <CheckCircle size={12} strokeWidth={3} />
                                            </div>
                                        )}

                                        {/* Drag handle indicator for reorder */}
                                        {mode === 'reorder' && (
                                            <div className="absolute top-2 left-2 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                                                <GripVertical size={14} />
                                            </div>
                                        )}

                                        {/* Preview button on hover */}
                                        {files[0]?.file && pageCount > 0 && mode !== 'reorder' && (
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                onClick={(e) => { e.stopPropagation(); openPreview(originalIndex); }}>
                                                <div className={`p-1.5 rounded-lg backdrop-blur-sm border transition-all
                                                    ${isSelected ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-black/50 border-zinc-700/50 text-zinc-400 hover:text-white'}`}>
                                                    <Maximize2 size={11} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Drag-over indicator */}
                                        {isDragOver && (
                                            <div className="absolute inset-0 border-2 border-indigo-400 rounded-2xl pointer-events-none" />
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                    </div>
                                );
                            })}

                            {/* Add document button for merge mode */}
                            {mode === 'merge' && (
                                <button
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = '.pdf';
                                        input.multiple = true;
                                        input.onchange = (e) => {
                                            const fs = (e.target as HTMLInputElement).files;
                                            if (fs) {
                                                const fileDataArray = Array.from(fs).map(f => ({
                                                    file: f,
                                                    name: f.name,
                                                    size: (f.size / 1024).toFixed(1) + ' KB',
                                                    type: f.type,
                                                    previewUrl: URL.createObjectURL(f)
                                                }));
                                                handleFileSelect(fileDataArray);
                                            }
                                        };
                                        input.click();
                                    }}
                                    className={`${isMobile ? 'w-28' : 'w-44'} aspect-[3/4.5] rounded-2xl border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 flex flex-col items-center justify-center text-zinc-700 hover:text-indigo-400 transition-all duration-300 group`}
                                >
                                    <div className="p-4 rounded-2xl bg-zinc-900/50 mb-3 group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all">
                                        <FilePlus size={32} />
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] font-unbounded">ADD</span>
                                        <span className="text-xs font-black font-unbounded">DOCUMENT</span>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};
