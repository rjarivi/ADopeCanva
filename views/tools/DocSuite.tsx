/// <reference lib="dom" />
import React, { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { FileText, Layers, Scissors, RotateCw, Download, Trash2, CheckCircle, Plus, Loader2, Settings, Share2, Undo2, LayoutGrid, FilePlus } from 'lucide-react';
import { SectionLabel } from '../../components/EditorControls';
import { PDFDocument, degrees } from 'pdf-lib';

type Mode = 'merge' | 'split' | 'rotate';

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
    const [activeTab, setActiveTab] = useState<'tools' | 'pages' | 'export'>('tools');

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
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-red-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

            {/* 1. Navigation Rail / Bottom Bar */}
            <nav className={`${isMobile ? 'order-3 w-full h-16 border-t flex-row justify-around' : 'order-1 w-16 border-r flex-col py-4'} border-zinc-900 bg-zinc-950 flex items-center shrink-0 z-30`}>
                <button
                    onClick={() => setActiveTab('tools')}
                    className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'tools' ? 'text-red-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square mb-4'}`}
                >
                    <Layers size={isMobile ? 22 : 20} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Modes</span>
                </button>
                <button
                    onClick={() => setActiveTab('pages')}
                    className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'pages' ? 'text-red-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square mb-4'}`}
                >
                    <LayoutGrid size={isMobile ? 22 : 20} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Pages</span>
                </button>
                <button
                    onClick={() => setActiveTab('export')}
                    className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'export' ? 'text-red-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square'}`}
                >
                    <Download size={isMobile ? 22 : 20} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Export</span>
                </button>
            </nav>

            {/* 2. Settings Panel */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-semibold text-sm text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                        {activeTab === 'tools' && <><Layers size={16} className="text-red-500" /> Toolkit</>}
                        {activeTab === 'pages' && <><LayoutGrid size={16} className="text-zinc-400" /> Document</>}
                        {activeTab === 'export' && <><Download size={16} className="text-zinc-400" /> Finalize</>}
                    </h2>
                    <button onClick={() => { setFiles([]); setIsDone(false); setIsProcessing(false); setResultBytes(null); }} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    {activeTab === 'tools' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <section>
                                <SectionLabel>Utility Modes</SectionLabel>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'merge', icon: Layers, label: 'Combine PDFs', desc: 'Merge multiple documents into one' },
                                        { id: 'split', icon: Scissors, label: 'Extract Pages', desc: 'Split a PDF into separate files' },
                                        { id: 'rotate', icon: RotateCw, label: 'Rotate Pages', desc: 'Correct page orientation' }
                                    ].map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => handleModeChange(m.id as Mode)}
                                            className={`flex flex-col items-start gap-1 p-4 rounded-2xl border transition-all text-left ${mode === m.id ? 'bg-red-500/10 border-red-500 text-red-500 shadow-sm' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-300'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <m.icon size={18} />
                                                <span className="font-bold uppercase tracking-wider text-xs">{m.label}</span>
                                            </div>
                                            <span className="text-[10px] opacity-60 ml-7">{m.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {mode === 'merge' && (
                                <section>
                                    <SectionLabel>Combine Queue ({files.length})</SectionLabel>
                                    <div className="space-y-2">
                                        {files.map((file, i) => (
                                            <div key={i} className="bg-zinc-900 border border-zinc-800/50 p-3 rounded-xl flex items-center gap-3">
                                                <div className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center shrink-0">
                                                    <FileText size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-zinc-300 font-bold truncate uppercase">{file.file.name}</p>
                                                    <p className="text-[9px] text-zinc-600">{file.size}</p>
                                                </div>
                                                <button onClick={() => setFiles(f => f.filter((_, idx) => idx !== i))} className="text-zinc-700 hover:text-red-400 p-1">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setActiveTab('tools')} // Already here, but visually feedback
                                            className="w-full flex items-center justify-center gap-2 p-3 border border-zinc-800 border-dashed rounded-xl text-zinc-600 hover:text-zinc-400 transition-colors"
                                        >
                                            <FilePlus size={14} />
                                            <span className="text-[10px] font-bold uppercase">Enqueue More</span>
                                        </button>
                                    </div>
                                </section>
                            )}
                        </div>
                    )}

                    {activeTab === 'pages' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {mode === 'rotate' && (
                                <section>
                                    <SectionLabel>Global Rotation</SectionLabel>
                                    <div className="flex bg-zinc-900 rounded-xl p-1 gap-1">
                                        {[0, 90, 180, 270].map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => setRotation(r)}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${rotation === r ? 'bg-zinc-800 text-red-500' : 'text-zinc-600'}`}
                                            >
                                                {r}°
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section>
                                <SectionLabel>Page Statistics</SectionLabel>
                                <div className="grid grid-cols-2 gap-2 text-center font-bold">
                                    <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800/50">
                                        <p className="text-zinc-600 text-[8px] uppercase tracking-widest mb-1">Total</p>
                                        <p className="text-xl text-zinc-200">{pageCount || files.length}</p>
                                    </div>
                                    <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800/50 text-red-500">
                                        <p className="text-zinc-600 text-[8px] uppercase tracking-widest mb-1">Selected</p>
                                        <p className="text-xl">{selectedPages.length || (mode === 'split' ? 'ALL' : 'ALL')}</p>
                                    </div>
                                </div>
                            </section>

                            <Button
                                className="w-full h-12 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 uppercase font-bold text-xs"
                                onClick={handleProcess}
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Run Transformer'}
                            </Button>
                        </div>
                    )}

                    {activeTab === 'export' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {isDone ? (
                                <div className="space-y-4">
                                    <div className="aspect-[3/4] bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center p-8 text-center text-red-500 shadow-inner">
                                        <CheckCircle size={48} className="mb-4" />
                                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Build Success</p>
                                        <h3 className="text-lg text-zinc-200 mt-2">Document Ready</h3>
                                    </div>
                                    <Button className="w-full h-12 bg-red-500 hover:bg-red-600 font-bold" onClick={handleDownload}>
                                        <Download size={18} className="mr-2" /> Download PDF
                                    </Button>
                                    <Button variant="secondary" className="w-full border-zinc-800" onClick={() => { setIsDone(false); setFiles([]); }}>
                                        <Undo2 size={16} className="mr-2" /> Start New
                                    </Button>
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-zinc-900 shadow-inner rounded-3xl border border-zinc-800/50">
                                    <Loader2 className={`mx-auto mb-4 text-zinc-800 ${isProcessing ? 'animate-spin text-red-500' : ''}`} size={32} />
                                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest italic">{isProcessing ? 'Compiling PDF Data...' : 'Waiting for Process'}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* 3. Action / Preview Area */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                {files.length === 0 ? (
                    <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
                        <FileUploader
                            onFilesSelect={handleFileSelect}
                            onFileSelect={handleFileSelect}
                            accept=".pdf"
                            label={`Select Document${mode === 'merge' ? 's' : ''}`}
                            description={mode === 'merge' ? 'Combine multiple PDFs' : 'Extract or Rotate pages'}
                            multiple={mode === 'merge'}
                        />
                    </div>
                ) : (
                    <div className="w-full h-full p-4 md:p-12 overflow-y-auto custom-scrollbar flex flex-wrap content-start justify-center gap-4">
                        {Array.from({ length: pageCount || files.length }).map((_, i) => (
                            <div
                                key={i}
                                onClick={() => togglePageSelection(i)}
                                className={`
                                    relative group cursor-pointer transition-all duration-300
                                    ${isMobile ? 'w-24 aspect-[3/4]' : 'w-32 aspect-[3/4]'}
                                    rounded-lg border-2 bg-zinc-900 shadow-xl overflow-hidden
                                    ${selectedPages.includes(i) ? 'border-red-500 -translate-y-1' : 'border-zinc-800 hover:border-zinc-700'}
                                `}
                            >
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                                    <div className={`w-full h-full rounded border border-dashed border-zinc-800 flex items-center justify-center transition-transform duration-300 ${mode === 'rotate' && selectedPages.includes(i) ? `rotate-[${rotation}deg]` : ''}`} style={{ transform: mode === 'rotate' && selectedPages.includes(i) ? `rotate(${rotation}deg)` : 'none' }}>
                                        <FileText size={isMobile ? 24 : 32} className={`${selectedPages.includes(i) ? 'text-red-500' : 'text-zinc-800'}`} />
                                    </div>
                                    <span className={`text-[10px] font-bold mt-2 ${selectedPages.includes(i) ? 'text-red-500' : 'text-zinc-700'}`}>PAGE {i + 1}</span>
                                </div>

                                {selectedPages.includes(i) && (
                                    <div className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5">
                                        <CheckCircle size={10} className="text-white" />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}

                        {mode === 'merge' && (
                            <button
                                onClick={() => setActiveTab('tools')}
                                className="w-32 aspect-[3/4] rounded-lg border-2 border-dashed border-zinc-800 hover:border-zinc-700 flex flex-col items-center justify-center text-zinc-800 hover:text-zinc-600 transition-all font-bold"
                            >
                                <FilePlus size={24} className="mb-2" />
                                <span className="text-[10px] uppercase">Add PDF</span>
                            </button>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};