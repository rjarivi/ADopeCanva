/// <reference lib="dom" />
import React, { useState, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { FileText, Download, Copy, RefreshCcw, Check, Zap, Layers, FileSearch } from 'lucide-react';
import { SectionLabel } from '../../components/EditorControls';
import { useIsMobile } from '../../hooks/useIsMobile';
import { ToolShell } from '../../components/ToolShell';
import { useToolFile } from '../../hooks/useToolFile';
import * as pdfjsLib from 'pdfjs-dist';
import { setupPdfWorker, getPdfDocument, validatePdfFile, classifyPdfError } from '../../utils/pdfWorker';
import { logToolFailure } from '../../utils/toolHealth';

// Shared PDF.js worker (local-first with CDN fallback) — see utils/pdfWorker.ts
setupPdfWorker();

export const PdfToText: React.FC = () => {
    const isMobile = useIsMobile();
    const { file, select, clear } = useToolFile();
    const [extractedText, setExtractedText] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [pageCount, setPageCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = useCallback((newFile: FileData | FileData[]) => {
        const selectedFile = Array.isArray(newFile) ? newFile[0] : newFile;
        if (!selectedFile) return;
        select(selectedFile);
        setExtractedText('');
        setPageCount(0);
        setError(null);
    }, [select]);

    const extractText = useCallback(async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setExtractedText('');

        try {
            const validationError = await validatePdfFile(file.file);
            if (validationError) { setError(validationError); return; }
            const arrayBuffer = await file.file.arrayBuffer();
            const pdf = await getPdfDocument(arrayBuffer, 'pdf-to-text');
            try {
                setPageCount(pdf.numPages);

                let fullText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items
                        .filter((item: any) => 'str' in item && typeof item.str === 'string')
                        .map((item: any) => {
                            const text = item.str;
                            return item.hasEOL ? text + '\n' : text + ' ';
                        })
                        .join('');

                    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
                }

                if (fullText.trim().length === 0) {
                    setExtractedText('');
                    setError('No selectable text found. This document may be scanned or image-based. Try using an OCR tool instead.');
                    return;
                }
                
                setExtractedText(fullText.trim());
            } finally {
                await pdf.destroy();
            }
        } catch (err) {
            logToolFailure('pdf-to-text', err, { stage: 'pdf-extract' });
            setError(classifyPdfError(err));
        } finally {
            setIsProcessing(false);
        }
    }, [file]);

    const handleCopy = useCallback(() => {
        if (!navigator.clipboard) { setError('Clipboard unavailable in this browser context.'); return; }
        navigator.clipboard.writeText(extractedText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch((err) => {
            logToolFailure('pdf-to-text', err, { stage: 'clipboard-copy' });
            setError('Copy failed — your browser blocked clipboard access.');
        });
    }, [extractedText]);

    const handleDownload = useCallback(() => {
        const blob = new Blob([extractedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(file?.file.name ?? 'document.pdf').replace(/\.pdf$/i, '')}-text.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, [extractedText, file]);

    const handleReset = () => {
        clear();
        setExtractedText('');
        setPageCount(0);
        setError(null);
    };

    return (
        <ToolShell
            icon={FileText}
            title="PDF to Text"
            description="Extract text content from PDF documents instantly."
            features={[
                { icon: Zap, label: 'Instant Extract', desc: 'Fast processing' },
                { icon: Layers, label: 'Multi-Page', desc: 'All pages at once' },
                { icon: Copy, label: 'Copy & Paste', desc: 'One-click copy' },
                { icon: FileSearch, label: 'Searchable', desc: 'Full text output' },
            ]}
            file={file}
            accept=".pdf"
            uploadLabel="Upload PDF"
            uploadDescription="Select a PDF file to extract text"
            onFileSelect={handleFileSelect}
            error={error}
        >
            <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

            {/* Settings Panel */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <FileText size={20} /> PDF to Text
                    </h2>
                    <button onClick={handleReset} className="text-zinc-600 hover:text-red-400 transition-colors">
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

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                                <p className="text-xs text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            {!extractedText ? (
                                <Button className="w-full h-12 border-none shadow-lg shadow-red-900/20" onClick={extractText} isLoading={isProcessing} disabled={isProcessing} >
                                    <FileText size={18} className="mr-2" />
                                    {isProcessing ? 'Extracting...' : 'Extract Text'}
                                </Button>
                            ) : (
                                <div className="space-y-3 animate-slide-up">
                                    <Button className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-500 border-none shadow-lg" onClick={handleCopy} >
                                        {copied ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
                                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                                    </Button>
                                    <Button variant="secondary" className="w-full h-12 border-zinc-800" onClick={handleDownload} >
                                        <Download size={16} className="mr-2" /> Download .txt
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
                                Text extraction works best on digital PDFs. Scanned documents or image-based PDFs may not yield results.
                            </p>
                        </section>
                    </div>
                </div>
            </aside>

            {/* Preview Area */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex flex-col p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="relative flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                    {extractedText ? (
                        <textarea
                            readOnly
                            value={extractedText}
                            className="w-full h-full bg-transparent text-zinc-300 text-sm font-mono p-6 resize-none focus:outline-none custom-scrollbar"
                            placeholder="Extracted text will appear here..."
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                            <FileText size={48} className="mb-4 opacity-50" />
                            <p className="text-sm">Click "Extract Text" to begin</p>
                        </div>
                    )}
                </div>

                {extractedText && (
                    <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                        <span>{extractedText.length.toLocaleString()} characters</span>
                        <span>{extractedText.split(/\s+/).filter(w => w).length.toLocaleString()} words</span>
                    </div>
                )}
            </main>
            </div>
        </ToolShell>
    );
};
