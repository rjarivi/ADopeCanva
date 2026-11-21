/// <reference lib="dom" />
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { FileText, Download, RefreshCcw, Type, Zap, Copy, Check, Trash2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { useIsMobile } from '../../hooks/useIsMobile';
import { jsPDF } from 'jspdf';

const SELECT_ARROW_STYLE = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' } as const;

const SELECT_CLASS = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 pr-8 text-sm text-zinc-200 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none appearance-none hover:border-indigo-500/50 transition-colors cursor-pointer";

export const TextToPdf: React.FC = () => {
    const isMobile = useIsMobile();
    const [text, setText] = useState<string>('');
    const [fontSize, setFontSize] = useState(12);
    const [lineSpacing, setLineSpacing] = useState(1.5);
    const [marginSize, setMarginSize] = useState(20);
    const [paperSize, setPaperSize] = useState<'a4' | 'letter' | 'legal'>('a4');
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [fontFamily, setFontFamily] = useState<'helvetica' | 'times' | 'courier'>('helvetica');
    const [pageNumbers, setPageNumbers] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [charCount, setCharCount] = useState(0);
    const [wordCount, setWordCount] = useState(0);
    const [editorFontSize, setEditorFontSize] = useState<number>(14);
    const [copied, setCopied] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setCharCount(text.length);
        setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    }, [text]);

    // Many non-Latin characters → warn: jsPDF built-in fonts embed only Latin-1
    const nonLatinRatio = useMemo(() => {
        if (!text) return 0;
        const nonLatin = (text.match(/[^\u0000-\u024F\u2000-\u206F]/g) || []).length;
        return nonLatin / text.length;
    }, [text]);
    const showNonLatinWarning = nonLatinRatio > 0.15;

    // Shared PDF builder for both preview and download
    const buildPdf = useCallback(() => {
        const doc = new jsPDF({ orientation, unit: 'mm', format: paperSize });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        // Landscape pages get bigger widths — clamp the textbox to the printable area
        const maxWidth = Math.max(20, Math.min(pageWidth - (marginSize * 2), pageWidth * 0.85));

        doc.setFontSize(fontSize);
        doc.setFont(fontFamily, 'normal');

        const lines = doc.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.352778 * lineSpacing; // Convert pt to mm

        let y = marginSize;

        for (const line of lines) {
            if (y + lineHeight > pageHeight - marginSize) {
                doc.addPage();
                y = marginSize;
            }
            doc.text(line, marginSize, y);
            y += lineHeight;
        }

        if (pageNumbers) {
            const total = doc.getNumberOfPages();
            for (let i = 1; i <= total; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(110);
                doc.text(`${i} / ${total}`, pageWidth - marginSize - 2, pageHeight - (marginSize / 2));
            }
        }

        return doc;
    }, [text, fontSize, lineSpacing, marginSize, paperSize, orientation, fontFamily, pageNumbers]);

    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        };
    }, [pdfPreviewUrl]);

    const generatePdf = useCallback(() => {
        if (!text.trim()) return;

        setIsProcessing(true);

        try {
            const doc = buildPdf();

            // Generate blob URL for preview
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);

            if (pdfPreviewUrl) {
                URL.revokeObjectURL(pdfPreviewUrl);
            }
            setPdfPreviewUrl(url);
        } catch (err) {
            console.error('PDF generation error:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [text, buildPdf, pdfPreviewUrl]);

    const handleDownload = useCallback(() => {
        if (!text.trim()) return;

        buildPdf().save('document.pdf');
    }, [text, buildPdf]);

    const handleCopyText = useCallback(() => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [text]);

    const handleClearText = useCallback(() => {
        setText('');
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
        }
    }, [pdfPreviewUrl]);

    const handleFitViewport = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '';
        }
    }, []);

    const handleReset = () => {
        setText('');
        setFontSize(12);
        setLineSpacing(1.5);
        setMarginSize(20);
        setPaperSize('a4');
        setOrientation('portrait');
        setFontFamily('helvetica');
        setPageNumbers(false);
        setEditorFontSize(14);
        if (textareaRef.current) {
            textareaRef.current.style.height = '';
        }
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
        }
        setPdfPreviewUrl(null);
    };

    const hasText = text.trim().length > 0;

    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'h-full max-w-6xl mx-auto rounded-3xl border border-zinc-800 shadow-2xl'}`}>

            {/* Settings Panel */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 lg:w-88 border-l'} border-zinc-800 bg-zinc-950 flex flex-col z-20 h-full min-h-0`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <FileText size={20} /> Text to PDF
                    </h2>
                    <button onClick={handleReset} title="Reset all settings and text" className="text-zinc-600 hover:text-indigo-400 transition-colors">
                        <RefreshCcw size={14} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 custom-scrollbar">
                    <div className="space-y-4 animate-in fade-in duration-300">

                        {/* Stats */}
                        <section className="bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-900/50 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500 font-medium">Characters</span>
                                <span className="text-xs text-zinc-300 font-mono">{charCount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500 font-medium">Words</span>
                                <span className="text-xs text-indigo-400 font-mono font-bold">{wordCount.toLocaleString()}</span>
                            </div>
                        </section>

                        {/* Page Setup */}
                        <section className="space-y-3">
                            <SectionLabel>Page Setup</SectionLabel>

                            <div className="group">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs text-zinc-400">Paper Size</span>
                                </div>
                                <select value={paperSize} onChange={(e) => setPaperSize(e.target.value as 'a4' | 'letter' | 'legal')} className={SELECT_CLASS} style={SELECT_ARROW_STYLE}>
                                    <option value="a4">A4 (210 × 297 mm)</option>
                                    <option value="letter">Letter (8.5 × 11 in)</option>
                                    <option value="legal">Legal (8.5 × 14 in)</option>
                                </select>
                            </div>

                            <div className="group">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs text-zinc-400">Orientation</span>
                                </div>
                                <select value={orientation} onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')} className={SELECT_CLASS} style={SELECT_ARROW_STYLE}>
                                    <option value="portrait">Portrait</option>
                                    <option value="landscape">Landscape</option>
                                </select>
                            </div>

                            <div className="group">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs text-zinc-400">Font Family</span>
                                </div>
                                <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value as 'helvetica' | 'times' | 'courier')} className={SELECT_CLASS} style={SELECT_ARROW_STYLE}>
                                    <option value="helvetica">Helvetica (Sans)</option>
                                    <option value="times">Times (Serif)</option>
                                    <option value="courier">Courier (Mono)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    id="tto-pdf-numbers"
                                    type="checkbox"
                                    checked={pageNumbers}
                                    onChange={(e) => setPageNumbers(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-offset-0 focus:ring-indigo-500/50"
                                />
                                <label htmlFor="tto-pdf-numbers" className="text-xs text-zinc-500 cursor-pointer select-none">Print page numbers</label>
                            </div>

                            {showNonLatinWarning && (
                                <p className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 leading-relaxed">
                                    Default PDF fonts may not render non-Latin text correctly — characters like that may appear garbled. Use a Latin transcription or a dedicated Unicode font loader.
                                </p>
                            )}
                        </section>

                        {/* Typography Settings */}
                        <section className="space-y-3">
                            <SectionLabel>Typography</SectionLabel>

                            <SliderControl
                                label="Font Size"
                                value={fontSize}
                                min={8}
                                max={24}
                                onChange={setFontSize}
                                unit="pt"
                            />

                            <div className="group">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs text-zinc-400">Line Spacing</span>
                                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{lineSpacing}×</span>
                                </div>
                                <select
                                    value={lineSpacing}
                                    onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                                    className={SELECT_CLASS}
                                    style={SELECT_ARROW_STYLE}
                                >
                                    <option value={1}>Single (1×)</option>
                                    <option value={1.15}>Compact (1.15×)</option>
                                    <option value={1.5}>Normal (1.5×)</option>
                                    <option value={2}>Double (2×)</option>
                                    <option value={2.5}>Wide (2.5×)</option>
                                </select>
                            </div>

                            <SliderControl
                                label="Margin"
                                value={marginSize}
                                min={10}
                                max={40}
                                onChange={setMarginSize}
                                unit="mm"
                            />
                        </section>

                        {/* Actions */}
                        <div className="space-y-2.5 pt-1">
                            <Button className="w-full h-11 border-none shadow-lg shadow-indigo-900/20" onClick={generatePdf} isLoading={isProcessing} disabled={isProcessing || !hasText} >
                                <Zap size={16} className="mr-2" />
                                {isProcessing ? 'Generating...' : 'Preview PDF'}
                            </Button>

                            {pdfPreviewUrl && (
                                <Button className="w-full h-11 bg-indigo-600 text-white hover:bg-indigo-500 border-none shadow-lg" onClick={handleDownload} >
                                    <Download size={16} className="mr-2" /> Download PDF
                                </Button>
                            )}
                        </div>

                        {/* Info */}
                        <section className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-800">
                            <SectionLabel>About</SectionLabel>
                            <p className="text-[10px] text-zinc-500 leading-relaxed uppercase font-bold tracking-tight">
                                Creates A4 PDFs with automatic page breaks. Supports multi-page documents with customizable typography.
                            </p>
                        </section>
                    </div>
                </div>
            </aside>

            {/* Editor Area */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} h-full min-h-0 relative bg-[#09090b] flex flex-col p-4 md:p-6 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                {!pdfPreviewUrl ? (
                    <div className="relative flex-1 min-h-0 flex flex-col">
                        {/* Editor Header Bar with Resizable Text controls */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-zinc-900/80">
                            <div className="flex items-center gap-2">
                                <Type size={16} className="text-indigo-400" />
                                <span className="text-xs text-zinc-300 font-bold uppercase tracking-widest font-unbounded">Enter text</span>
                                <span className="hidden sm:inline-block text-[11px] text-zinc-600 font-mono">
                                    ({charCount.toLocaleString()} chars · {wordCount.toLocaleString()} words)
                                </span>
                            </div>

                            {/* Resizable Text Controls & Actions */}
                            <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-1">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider px-1.5 hidden sm:inline">Text Size</span>
                                <button
                                    type="button"
                                    onClick={() => setEditorFontSize(prev => Math.max(11, prev - 1))}
                                    className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-[11px] font-bold transition-colors"
                                    title="Decrease text size (A-)"
                                >
                                    A-
                                </button>
                                <span className="text-[11px] font-mono font-bold text-indigo-400 px-1 min-w-[28px] text-center">
                                    {editorFontSize}px
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setEditorFontSize(prev => Math.min(24, prev + 1))}
                                    className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-[11px] font-bold transition-colors"
                                    title="Increase text size (A+)"
                                >
                                    A+
                                </button>

                                <div className="w-[1px] h-3.5 bg-zinc-800 mx-1" />

                                <button
                                    type="button"
                                    onClick={handleFitViewport}
                                    className="px-2 h-6 rounded-md bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] font-medium flex items-center gap-1 transition-colors"
                                    title="Reset textarea height to fit viewport"
                                >
                                    Fit Viewport
                                </button>

                                {hasText && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleCopyText}
                                            className="w-6 h-6 rounded-md bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 flex items-center justify-center transition-colors"
                                            title="Copy text to clipboard"
                                        >
                                            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClearText}
                                            className="w-6 h-6 rounded-md bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors"
                                            title="Clear text"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Resizable Textarea fitting viewport by default */}
                        <div className="relative flex-1 min-h-0 flex flex-col">
                            <textarea
                                ref={textareaRef}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                style={{ fontSize: `${editorFontSize}px` }}
                                className="flex-1 min-h-[160px] w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-200 font-mono p-5 md:p-6 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all custom-scrollbar leading-relaxed"
                                placeholder="Type or paste your text here...

Your text will be converted to a professional PDF document with customizable font size, line spacing, and margins.

Supports multi-page documents with automatic page breaks."
                            />
                        </div>

                        {/* Subtle helper bar */}
                        <div className="flex items-center justify-between text-[10px] text-zinc-600 mt-2 px-1">
                            <span>Default layout fits into viewport · Drag bottom-right corner to manually resize text area</span>
                            <span className="font-mono">{charCount.toLocaleString()} chars · {wordCount.toLocaleString()} words</span>
                        </div>
                    </div>
                ) : (
                    <div className="relative flex-1 min-h-0 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-indigo-400" />
                                <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest font-unbounded">PDF Preview</span>
                            </div>
                            <button
                                onClick={() => {
                                    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
                                    setPdfPreviewUrl(null);
                                }}
                                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
                            >
                                ← Back to Editor
                            </button>
                        </div>
                        <iframe
                            src={pdfPreviewUrl}
                            className="flex-1 min-h-0 w-full bg-white rounded-2xl"
                            title="PDF Preview"
                        />
                    </div>
                )}
            </main>
        </div>
    );
};
