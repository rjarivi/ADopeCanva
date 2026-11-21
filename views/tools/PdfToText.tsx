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

interface ExtractResult {
    fileName: string;
    text: string;
    pages: number;
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
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                if (i >= 1 && i <= maxPages) indices.add(i - 1);
            }
        } else {
            const num = parseInt(trimmed, 10);
            if (!isNaN(num) && num >= 1 && num <= maxPages) indices.add(num - 1);
        }
    }
    return Array.from(indices).sort((a, b) => a - b);
}

const RANGE_PLACEHOLDER = 'e.g. 1-3, 5, 8-10 (blank = all pages)';

export const PdfToText: React.FC = () => {
    const isMobile = useIsMobile();
    const { files, file, select, clear } = useToolFile({ multiple: true });
    const [results, setResults] = useState<ExtractResult[]>([]);
    const [extractedText, setExtractedText] = useState<string>('');
    const [rangeInput, setRangeInput] = useState('');
    const [rangeError, setRangeError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [pageCount, setPageCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editorFontSize, setEditorFontSize] = useState<number>(14);

    const handleFileSelect = useCallback((newFiles: FileData | FileData[]) => {
        const arr = Array.isArray(newFiles) ? newFiles : [newFiles];
        select(arr);
        setResults([]);
        setExtractedText('');
        setPageCount(0);
        setRangeInput('');
        setRangeError('');
        setError(null);
    }, [select]);

    const extractText = useCallback(async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setError(null);
        setExtractedText('');
        setResults([]);
        setRangeError('');

        try {
            const out: ExtractResult[] = [];
            for (const file of files) {
                const validationError = await validatePdfFile(file.file);
                if (validationError) { setError(validationError); continue; }
                const arrayBuffer = await file.file.arrayBuffer();
                const pdf = await getPdfDocument(arrayBuffer, 'pdf-to-text');
                try {
                if (files.length === 1) setPageCount(pdf.numPages);

                // Resolve the range against this file's page count
                let pageIndices: number[] = pdf.numPages
                    ? Array.from({ length: pdf.numPages }, (_, i) => i)
                    : [];
                if (rangeInput.trim()) {
                    const parsed = parsePageRanges(rangeInput, pdf.numPages);
                    if (parsed.length === 0) {
                        setRangeError(`No valid pages in "${rangeInput}" (file has ${pdf.numPages} pages).`);
                        if (files.length === 1) { setIsProcessing(false); return; }
                        continue;
                    }
                    pageIndices = parsed;
                }

                let fullText = '';
                for (const idx of pageIndices) {
                    const page = await pdf.getPage(idx + 1);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items
                        .filter((item: any) => 'str' in item && typeof item.str === 'string')
                        .map((item: any) => {
                            const text = item.str;
                            return item.hasEOL ? text + '\n' : text + ' ';
                        })
                        .join('');

                    fullText += `--- Page ${idx + 1} ---\n${pageText}\n\n`;
                }

                if (!fullText.trim()) {
                    out.push({ fileName: file.file.name, text: '', pages: pdf.numPages });
                } else {
                    out.push({ fileName: file.file.name, text: fullText.trim(), pages: pdf.numPages });
                }
                } finally {
                    await pdf.destroy();
                }
            }

            if (files.length === 1) {
                setExtractedText(out[0]?.text ?? '');
                setResults([]);
            } else {
                // Combined output with file headers for batch mode
                const combined = out
                    .map(r => `===== ${r.fileName} =====\n${r.text}`)
                    .join('\n\n');
                setResults(out);
                setExtractedText(combined);
            }
            const noText = out.length > 0 && out.every(r => !r.text);
            if (noText) {
                setError('No selectable text found in the document(s). They may be scanned or image-based — try an OCR tool instead.');
            }
        } catch (err) {
            logToolFailure('pdf-to-text', err, { stage: 'pdf-extract' });
            setError(classifyPdfError(err));
        } finally {
            setIsProcessing(false);
        }
    }, [files, rangeInput]);

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
        if (!extractedText) return;
        const blob = new Blob([extractedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const base = files.length === 1
            ? (files[0].file.name ?? 'document.pdf').replace(/\.pdf$/i, '') + '-text'
            : 'batch-text';
        a.download = `${base}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, [extractedText, files]);

    const handleReset = () => {
        clear();
        setResults([]);
        setExtractedText('');
        setPageCount(0);
        setRangeInput('');
        setRangeError('');
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
            file={files}
            multiple={true}
            accept=".pdf"
            uploadLabel="Add PDF"
            uploadDescription="Select one PDF, or several for batch extraction"
            onFileSelect={handleFileSelect}
            error={error}
        >
            <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'h-full max-w-6xl mx-auto rounded-3xl border border-zinc-800 shadow-2xl'}`}>

            {/* Settings Panel */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 lg:w-84 border-l'} border-zinc-800 bg-zinc-950 flex flex-col z-20 h-full min-h-0`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <FileText size={20} /> PDF to Text
                    </h2>
                    <button onClick={handleReset} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <RefreshCcw size={14} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 custom-scrollbar">
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <section className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-900/50 space-y-2.5">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500 font-medium">Files</span>
                                <span className="text-xs text-indigo-400 font-mono font-bold truncate max-w-[170px]">{files.length === 1 ? files[0].file.name : `${files.length} files (batch)`}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500 font-medium">Size</span>
                                <span className="text-xs text-zinc-300 font-mono">{files.map(f => f.size).join(', ') || '—'}</span>
                            </div>
                            {pageCount > 0 && files.length === 1 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-zinc-500 font-medium">Pages</span>
                                    <span className="text-xs text-indigo-400 font-mono font-bold">{pageCount}</span>
                                </div>
                            )}
                        </section>

                        {/* Page range */}
                        <section className="space-y-2.5">
                            <SectionLabel>Page Range</SectionLabel>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={rangeInput}
                                    onChange={(e) => { setRangeInput(e.target.value); setRangeError(''); }}
                                    onKeyDown={(e) => e.key === 'Enter' && extractText()}
                                    placeholder={RANGE_PLACEHOLDER}
                                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500/50 outline-none text-zinc-300 placeholder:text-zinc-700 font-mono"
                                />
                            </div>
                            {rangeError && <p className="text-[10px] text-red-400 font-bold leading-relaxed">{rangeError}</p>}
                            <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-tight leading-relaxed">
                                Combine ranges: <span className="text-zinc-500 font-mono normal-case">1-3, 5, 8-10</span>. Leave blank for all pages.
                            </p>
                        </section>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
                                <p className="text-xs text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2.5 pt-1">
                            {!extractedText ? (
                                <Button className="w-full h-11 border-none shadow-lg shadow-indigo-900/20" onClick={extractText} isLoading={isProcessing} disabled={isProcessing} >
                                    <FileText size={16} className="mr-2" />
                                    {isProcessing ? 'Extracting...' : files.length === 1 ? 'Extract Text' : `Extract From ${files.length} Files`}
                                </Button>
                            ) : (
                                <div className="space-y-2.5 animate-slide-up">
                                    <Button className="w-full h-11 bg-indigo-600 text-white hover:bg-indigo-500 border-none shadow-lg" onClick={handleCopy} >
                                        {copied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
                                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                                    </Button>
                                    <Button variant="secondary" className="w-full h-10 border-zinc-800" onClick={handleDownload} >
                                        <Download size={15} className="mr-2" /> Download .txt
                                    </Button>
                                    <Button variant="secondary" className="w-full h-10 border-zinc-800" onClick={handleReset}>
                                        <RefreshCcw size={15} className="mr-2" /> Start New
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Per-file batch results */}
                        {results.length > 0 && (
                            <section className="space-y-2.5">
                                <SectionLabel>Batch Results</SectionLabel>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                    {results.map(r => (
                                        <div key={r.fileName} className="bg-[#0e0e11] border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                                            <span className="text-[10px] text-zinc-300 font-mono truncate">{r.fileName}</span>
                                            <span className="text-[10px] text-zinc-500 font-mono shrink-0">{r.text.length.toLocaleString()} ch</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-800">
                            <SectionLabel>About</SectionLabel>
                            <p className="text-[10px] text-zinc-500 leading-relaxed uppercase font-bold tracking-tight">
                                Text extraction works best on digital PDFs. Scanned documents or image-based PDFs may not yield results.
                            </p>
                        </section>
                    </div>
                </div>
            </aside>

            {/* Preview Area */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} h-full min-h-0 relative bg-[#09090b] flex flex-col p-4 md:p-6 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="relative flex-1 min-h-0 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
                    {extractedText ? (
                        <>
                            {/* Toolbar for text size */}
                            <div className="h-10 px-4 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between shrink-0">
                                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Extracted Text</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider px-1">Text Size</span>
                                    <button
                                        type="button"
                                        onClick={() => setEditorFontSize(prev => Math.max(11, prev - 1))}
                                        className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-[10px] font-bold"
                                        title="Decrease text size"
                                    >
                                        A-
                                    </button>
                                    <span className="text-[10px] font-mono font-bold text-indigo-400 px-1 min-w-[24px] text-center">
                                        {editorFontSize}px
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setEditorFontSize(prev => Math.min(24, prev + 1))}
                                        className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-[10px] font-bold"
                                        title="Increase text size"
                                    >
                                        A+
                                    </button>
                                </div>
                            </div>
                            <textarea
                                readOnly
                                value={extractedText}
                                style={{ fontSize: `${editorFontSize}px` }}
                                className="flex-1 w-full bg-transparent text-zinc-300 font-mono p-5 md:p-6 resize-none focus:outline-none custom-scrollbar leading-relaxed"
                                placeholder="Extracted text will appear here..."
                            />
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                            <FileText size={48} className="mb-4 opacity-50" />
                            <p className="text-sm">Click "Extract Text" to begin</p>
                        </div>
                    )}
                </div>

                {extractedText && (
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500 px-1">
                        <span>{extractedText.length.toLocaleString()} characters</span>
                        <span>{extractedText.split(/\s+/).filter(w => w).length.toLocaleString()} words</span>
                    </div>
                )}
            </main>
            </div>
        </ToolShell>
    );
};
