/// <reference lib="dom" />
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { FileText, Download, RefreshCcw, Type, AlignLeft, Zap, Settings } from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { useIsMobile } from '../../hooks/useIsMobile';
import { jsPDF } from 'jspdf';

export const TextToPdf: React.FC = () => {
    const isMobile = useIsMobile();
    const [text, setText] = useState<string>('');
    const [fontSize, setFontSize] = useState(12);
    const [lineSpacing, setLineSpacing] = useState(1.5);
    const [marginSize, setMarginSize] = useState(20);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [charCount, setCharCount] = useState(0);
    const [wordCount, setWordCount] = useState(0);

    useEffect(() => {
        setCharCount(text.length);
        setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    }, [text]);

    const generatePdf = useCallback(() => {
        if (!text.trim()) return;

        setIsProcessing(true);

        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const maxWidth = pageWidth - (marginSize * 2);

            doc.setFontSize(fontSize);

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
    }, [text, fontSize, lineSpacing, marginSize, pdfPreviewUrl]);

    const handleDownload = useCallback(() => {
        if (!text.trim()) return;

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const maxWidth = pageWidth - (marginSize * 2);

        doc.setFontSize(fontSize);

        const lines = doc.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.352778 * lineSpacing;

        let y = marginSize;

        for (const line of lines) {
            if (y + lineHeight > pageHeight - marginSize) {
                doc.addPage();
                y = marginSize;
            }
            doc.text(line, marginSize, y);
            y += lineHeight;
        }

        doc.save('document.pdf');
    }, [text, fontSize, lineSpacing, marginSize]);

    const handleReset = () => {
        setText('');
        setFontSize(12);
        setLineSpacing(1.5);
        setMarginSize(20);
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
        }
        setPdfPreviewUrl(null);
    };

    const hasText = text.trim().length > 0;

    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-emerald-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

            {/* Settings Panel */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-emerald-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <FileText size={20} /> Text to PDF
                    </h2>
                    <button onClick={handleReset} className="text-zinc-600 hover:text-emerald-400 transition-colors">
                        <RefreshCcw size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="space-y-8 animate-in fade-in duration-300">

                        {/* Stats */}
                        <section className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-900/50 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500 font-medium">Characters</span>
                                <span className="text-xs text-zinc-300 font-mono">{charCount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500 font-medium">Words</span>
                                <span className="text-xs text-emerald-400 font-mono font-bold">{wordCount.toLocaleString()}</span>
                            </div>
                        </section>

                        {/* Typography Settings */}
                        <section className="space-y-4">
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
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-zinc-400">Line Spacing</span>
                                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{lineSpacing}×</span>
                                </div>
                                <select
                                    value={lineSpacing}
                                    onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none"
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
                        <div className="space-y-3">
                            <Button className="w-full h-12 border-none shadow-lg shadow-emerald-900/20" onClick={generatePdf} isLoading={isProcessing} disabled={isProcessing || !hasText} >
                                <Zap size={18} className="mr-2" />
                                {isProcessing ? 'Generating...' : 'Preview PDF'}
                            </Button>

                            {pdfPreviewUrl && (
                                <Button className="w-full h-12 bg-white text-black hover:bg-zinc-200 border-none shadow-lg" onClick={handleDownload} >
                                    <Download size={18} className="mr-2" /> Download PDF
                                </Button>
                            )}
                        </div>

                        {/* Info */}
                        <section className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
                            <SectionLabel>About</SectionLabel>
                            <p className="text-[10px] text-zinc-500 leading-relaxed uppercase font-bold tracking-tight">
                                Creates A4 PDFs with automatic page breaks. Supports multi-page documents with customizable typography.
                            </p>
                        </section>
                    </div>
                </div>
            </aside>

            {/* Editor Area */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex flex-col p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                {!pdfPreviewUrl ? (
                    <div className="relative flex-1 flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <Type size={16} className="text-zinc-500" />
                            <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Enter your text</span>
                        </div>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="flex-1 w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-200 text-sm font-mono p-6 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all custom-scrollbar"
                            placeholder="Type or paste your text here...

Your text will be converted to a professional PDF document with customizable font size, line spacing, and margins.

Supports multi-page documents with automatic page breaks."
                        />
                    </div>
                ) : (
                    <div className="relative flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-emerald-400" />
                                <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest">PDF Preview</span>
                            </div>
                            <button
                                onClick={() => {
                                    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
                                    setPdfPreviewUrl(null);
                                }}
                                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                ← Back to Editor
                            </button>
                        </div>
                        <iframe
                            src={pdfPreviewUrl}
                            className="flex-1 w-full bg-white rounded-2xl"
                            title="PDF Preview"
                        />
                    </div>
                )}
            </main>
        </div>
    );
};
