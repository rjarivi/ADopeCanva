/// <reference lib="dom" />
import React, { useState } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { FileText, Layers, Scissors, RotateCw, Download, Trash2, CheckCircle, Plus, Loader2 } from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';

type Mode = 'merge' | 'split' | 'rotate';

export const PdfSuite: React.FC = () => {
    const [mode, setMode] = useState<Mode>('merge');
    const [files, setFiles] = useState<FileData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);

    // Split/Rotate specific state
    const [pageCount, setPageCount] = useState<number>(0);
    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [rotation, setRotation] = useState<number>(0);

    const handleModeChange = (newMode: Mode) => {
        setMode(newMode);
        setFiles([]);
        setIsDone(false);
        setIsProcessing(false);
        setResultBytes(null);
        setPageCount(0);
        setSelectedPages([]);
        setRotation(0);
    };

    const loadPdfInfo = async (file: File) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            setPageCount(pdfDoc.getPageCount());
            // Select all by default for Rotate, none for Split?
            // For Split, maybe none.
            setSelectedPages([]);
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

                // If nothing selected, maybe extract all? Or alert user?
                const indicesToExtract = selectedPages.length > 0 ? selectedPages.sort((a, b) => a - b) : srcDoc.getPageIndices();

                const copiedPages = await resultDoc.copyPages(srcDoc, indicesToExtract);
                copiedPages.forEach((page) => resultDoc.addPage(page));

            } else if (mode === 'rotate') {
                const srcFile = files[0].file;
                const arrayBuffer = await srcFile.arrayBuffer();
                const srcDoc = await PDFDocument.load(arrayBuffer);
                const pages = srcDoc.getPages();

                // Apply rotation to selected pages, or all if none selected
                const targetIndices = selectedPages.length > 0 ? selectedPages : srcDoc.getPageIndices();

                targetIndices.forEach(idx => {
                    const page = pages[idx];
                    const currentRot = page.getRotation().angle;
                    page.setRotation(degrees(currentRot + rotation));
                });

                // For Rotate, we modify in place (conceptually), so we copy functionality to resultDoc?
                // Actually PDFDocument.load returns a doc we can save directly.
                // So we don't need resultDoc = create(). We just use srcDoc.
                const bytes = await srcDoc.save();
                setResultBytes(bytes);
                setIsDone(true);
                setIsProcessing(false);
                return; // Exit early for rotate as logic differs slightly
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
        const suffix = mode === 'merge' ? 'merged' : mode === 'split' ? 'extracted' : 'rotated';
        a.download = `${name}_${suffix}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            {/* Header & Tabs */}
            <div className="text-center space-y-6">
                <h2 className="text-3xl font-bold text-white">PDF Suite</h2>
                <div className="inline-flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
                    <button
                        onClick={() => handleModeChange('merge')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${mode === 'merge' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <Layers size={16} /> Merge
                    </button>
                    <button
                        onClick={() => handleModeChange('split')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${mode === 'split' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <Scissors size={16} /> Split
                    </button>
                    <button
                        onClick={() => handleModeChange('rotate')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${mode === 'rotate' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <RotateCw size={16} /> Rotate
                    </button>
                </div>
            </div>

            {/* Workspace */}
            <div className="bg-surface rounded-3xl border border-zinc-800 overflow-hidden shadow-xl min-h-[500px] flex flex-col">

                {/* Empty State / Uploader */}
                {files.length === 0 ? (
                    <div className="flex-1 p-12 flex flex-col items-center justify-center">
                        <FileUploader
                            onFilesSelect={handleFileSelect}
                            onFileSelect={handleFileSelect} // Both props to support single/multi
                            accept=".pdf"
                            label={`Upload PDF${mode === 'merge' ? 's' : ''}`}
                            description={mode === 'merge' ? 'Combine multiple PDFs into one' : mode === 'split' ? 'Extract pages from a PDF' : 'Rotate pages in a PDF'}
                            multiple={mode === 'merge'}
                        />
                    </div>
                ) : isDone ? (
                    /* Success View */
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-slide-up">
                        <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                            <CheckCircle size={48} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                            PDF {mode === 'merge' ? 'Merged' : mode === 'split' ? 'Split' : 'Rotated'}!
                        </h3>
                        <p className="text-zinc-400 mb-8">Your document is ready to download.</p>
                        <div className="flex gap-4">
                            <Button className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 border-none" onClick={handleDownload}>
                                <Download size={18} className="mr-2" /> Download PDF
                            </Button>
                            <Button variant="secondary" onClick={() => { setIsDone(false); setFiles([]); setPageCount(0); setSelectedPages([]); }}>
                                Process Another
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Processing/Config View */
                    <div className="flex-1 flex flex-col lg:flex-row">

                        {/* Sidebar / File List */}
                        <div className="w-full lg:w-80 border-r border-zinc-800 bg-zinc-900/30 p-6 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-zinc-300">Files ({files.length})</h4>
                                {mode === 'merge' && (
                                    /* In a real app we'd add 'add more' logic here properly */
                                    <span className="text-xs text-zinc-500">Processing order follows list</span>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {files.map((file, i) => (
                                    <div key={i} className="bg-surface border border-zinc-700 p-3 rounded-xl flex items-center gap-3 group">
                                        <div className="w-8 h-8 bg-red-500/10 text-red-500 rounded flex items-center justify-center">
                                            <FileText size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-zinc-200 truncate">{file.file.name}</p>
                                            <p className="text-xs text-zinc-500">{file.size}</p>
                                        </div>
                                        <button onClick={() => setFiles(f => f.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Main Action Area */}
                        <div className="flex-1 p-8 bg-zinc-900/10 flex flex-col items-center justify-center relative">
                            {isProcessing && (
                                <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                                    <Loader2 className="animate-spin text-red-500 mb-4" size={48} />
                                    <p className="text-zinc-300 font-medium">Processing Document...</p>
                                </div>
                            )}

                            {(mode === 'split' || mode === 'rotate') && (
                                <div className="w-full max-w-3xl mb-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-zinc-400 text-sm">
                                            {mode === 'split' ? 'Select pages to EXPORT:' : 'Select pages to ROTATE:'}
                                        </p>
                                        {mode === 'rotate' && (
                                            <div className="flex items-center gap-4">
                                                <span className="text-white font-bold">{rotation}°</span>
                                                <Button size="sm" variant="secondary" onClick={() => setRotation(r => (r + 90) % 360)}>
                                                    <RotateCw size={14} className="mr-1" /> +90°
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {Array.from({ length: pageCount }).map((_, i) => (
                                            <div
                                                key={i}
                                                onClick={() => togglePageSelection(i)}
                                                className={`
                                                aspect-[3/4] rounded shadow-sm transition-all cursor-pointer relative group border-2
                                                ${selectedPages.includes(i) ? 'border-red-500 bg-red-500/10' : 'border-zinc-700 bg-zinc-800 hover:border-zinc-500'}
                                            `}
                                            >
                                                <div className="absolute inset-0 flex items-center justify-center text-zinc-500 font-bold opacity-50 select-none">
                                                    {i + 1}
                                                </div>
                                                {/* Visual Rotation Indicator */}
                                                {mode === 'rotate' && selectedPages.includes(i) && rotation !== 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <RotateCw className="text-red-500 opacity-50" size={24} style={{ transform: `rotate(${rotation}deg)` }} />
                                                    </div>
                                                )}

                                                <div className={`absolute top-1 right-1 w-3 h-3 rounded-full border ${selectedPages.includes(i) ? 'bg-red-500 border-red-500' : 'border-zinc-500'}`}></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 text-xs text-zinc-500 text-center">
                                        {selectedPages.length === 0
                                            ? (mode === 'split' ? "No pages selected (All will be extracted)" : "No pages selected (All will be rotated)")
                                            : `${selectedPages.length} pages selected`
                                        }
                                    </div>
                                </div>
                            )}

                            <div className="text-center space-y-4">
                                <Button
                                    onClick={handleProcess}
                                    className="px-8 py-3 text-lg bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 border-none"
                                >
                                    {mode === 'merge' ? 'Merge Files' : mode === 'split' ? 'Extract Selected' : 'Apply Rotation'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};