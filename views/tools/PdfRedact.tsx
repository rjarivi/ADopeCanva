import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import {
    EyeOff, Download, Loader2, Trash2, Undo2, ShieldCheck,
    FileText, ChevronLeft, ChevronRight, RefreshCcw, Lock, Shield, Layers,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { PDFDocument, rgb } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface Rect { x: number; y: number; w: number; h: number }
interface PageData { dataUrl: string; width: number; height: number }

const RENDER_SCALE = 2; // 2× quality for rendering

export const PdfRedact: React.FC = () => {
    const isMobile = useIsMobile();

    // PDF state
    const [file, setFile]               = useState<FileData | null>(null);
    const [rawBytes, setRawBytes]       = useState<ArrayBuffer | null>(null);
    const [pageCount, setPageCount]     = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pages, setPages]             = useState<Map<number, PageData>>(new Map());
    const [isLoading, setIsLoading]     = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError]             = useState('');

    // Redaction mode
    const [trueRedact, setTrueRedact]   = useState(false); // false = normal (pdf-lib), true = rasterize

    // Redactions: pageNum → Rect[] in canvas pixel coordinates
    const [redactions, setRedactions]   = useState<Map<number, Rect[]>>(new Map());

    // Drawing
    const [isDrawing, setIsDrawing]     = useState(false);
    const drawStartRef = useRef<{ x: number; y: number } | null>(null);
    const [previewRect, setPreviewRect] = useState<Rect | null>(null);

    const canvasRef  = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // ── Load PDF ──────────────────────────────────────────────────────────────
    const handleFile = useCallback(async (fd: FileData) => {
        setFile(fd);
        setIsLoading(true);
        setError('');
        setPages(new Map());
        setRedactions(new Map());
        setCurrentPage(1);
        setLoadProgress(0);
        setRawBytes(null);

        try {
            const buf = await fd.file.arrayBuffer();
            setRawBytes(buf.slice(0)); // keep original bytes for normal export
            const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
            setPageCount(doc.numPages);

            const pagesMap = new Map<number, PageData>();
            for (let i = 1; i <= doc.numPages; i++) {
                const page = await doc.getPage(i);
                const vp   = page.getViewport({ scale: RENDER_SCALE });
                const offscreen = document.createElement('canvas');
                offscreen.width  = vp.width;
                offscreen.height = vp.height;
                const ctx = offscreen.getContext('2d')!;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, vp.width, vp.height);
                await page.render({ canvasContext: ctx, viewport: vp, canvas: offscreen } as any).promise;
                pagesMap.set(i, { dataUrl: offscreen.toDataURL('image/png'), width: vp.width, height: vp.height });
                setLoadProgress(Math.round((i / doc.numPages) * 100));
            }
            setPages(pagesMap);
        } catch {
            setError('Could not open PDF — make sure it is a valid, unencrypted PDF file.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Redraw visible canvas ─────────────────────────────────────────────────
    const redrawCanvas = useCallback(() => {
        const canvas   = canvasRef.current;
        const pageData = pages.get(currentPage);
        if (!canvas || !pageData) return;
        canvas.width  = pageData.width;
        canvas.height = pageData.height;
        const ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            ctx.fillStyle = '#000';
            for (const r of redactions.get(currentPage) ?? []) {
                ctx.fillRect(r.x, r.y, r.w, r.h);
            }
        };
        img.src = pageData.dataUrl;
    }, [pages, currentPage, redactions]);

    useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

    // ── Canvas coordinate helpers ─────────────────────────────────────────────
    const toCanvasCoords = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current!;
        const rect   = canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (canvas.width  / rect.width),
            y: (clientY - rect.top)  * (canvas.height / rect.height),
        };
    };

    // ── Drawing handlers ──────────────────────────────────────────────────────
    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        drawStartRef.current = toCanvasCoords(e.clientX, e.clientY);
        setIsDrawing(true);
        setPreviewRect(null);
    };
    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDrawing || !drawStartRef.current) return;
        const p = toCanvasCoords(e.clientX, e.clientY);
        const s = drawStartRef.current;
        setPreviewRect({ x: Math.min(p.x, s.x), y: Math.min(p.y, s.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
    };
    const commitDraw = (clientX: number, clientY: number) => {
        if (!isDrawing || !drawStartRef.current) return;
        const p = toCanvasCoords(clientX, clientY);
        const s = drawStartRef.current;
        const r: Rect = { x: Math.min(p.x, s.x), y: Math.min(p.y, s.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) };
        if (r.w > 5 && r.h > 5) {
            setRedactions(prev => {
                const next = new Map(prev);
                next.set(currentPage, [...(prev.get(currentPage) ?? []), r]);
                return next;
            });
        }
        setIsDrawing(false);
        drawStartRef.current = null;
        setPreviewRect(null);
    };
    const onMouseUp    = (e: React.MouseEvent<HTMLDivElement>) => commitDraw(e.clientX, e.clientY);
    const onMouseLeave = () => { setIsDrawing(false); drawStartRef.current = null; setPreviewRect(null); };

    const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        drawStartRef.current = toCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
        setIsDrawing(true);
    };
    const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!isDrawing || !drawStartRef.current) return;
        const p = toCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
        const s = drawStartRef.current;
        setPreviewRect({ x: Math.min(p.x, s.x), y: Math.min(p.y, s.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
    };
    const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        const t = e.changedTouches[0];
        commitDraw(t.clientX, t.clientY);
    };

    // ── Page actions ──────────────────────────────────────────────────────────
    const undoLast = () => setRedactions(prev => {
        const next = new Map(prev);
        next.set(currentPage, (prev.get(currentPage) ?? []).slice(0, -1));
        return next;
    });
    const clearPage = () => setRedactions(prev => { const n = new Map(prev); n.set(currentPage, []); return n; });

    // Copy all bars from current page → every other page (merges, does not overwrite)
    const applyToAllPages = () => {
        const sourceRects = redactions.get(currentPage) ?? [];
        if (!sourceRects.length) return;
        setRedactions(prev => {
            const next = new Map(prev);
            for (let p = 1; p <= pageCount; p++) {
                if (p === currentPage) continue;
                next.set(p, [...(prev.get(p) ?? []), ...sourceRects]);
            }
            return next;
        });
    };

    // Copy only the last-drawn bar on this page → every other page
    const repeatLastOnAllPages = () => {
        const sourceRects = redactions.get(currentPage) ?? [];
        if (!sourceRects.length) return;
        const last = sourceRects[sourceRects.length - 1];
        setRedactions(prev => {
            const next = new Map(prev);
            for (let p = 1; p <= pageCount; p++) {
                if (p === currentPage) continue;
                next.set(p, [...(prev.get(p) ?? []), last]);
            }
            return next;
        });
    };

    const reset = () => {
        setFile(null); setRawBytes(null); setPageCount(0); setPages(new Map());
        setRedactions(new Map()); setCurrentPage(1); setError('');
    };

    const totalRedactions = [...redactions.values()].reduce((s, r) => s + r.length, 0);
    const pageRects = redactions.get(currentPage) ?? [];
    const pageData  = pages.get(currentPage);

    // ── Export — Normal (pdf-lib, vector, fast) ───────────────────────────────
    const exportNormal = async () => {
        if (!rawBytes) return;
        const pdfDoc = await PDFDocument.load(rawBytes);
        const pdfPages = pdfDoc.getPages();

        for (const [pageNum, rects] of redactions) {
            if (!rects.length) continue;
            const page       = pdfPages[pageNum - 1];
            const { height: pdfH } = page.getSize();
            const pd = pages.get(pageNum);
            if (!pd) continue;

            for (const r of rects) {
                // Convert canvas pixels → PDF units (un-scale + flip Y axis)
                const x = r.x / RENDER_SCALE;
                const w = r.w / RENDER_SCALE;
                const h = r.h / RENDER_SCALE;
                const y = pdfH - (r.y + r.h) / RENDER_SCALE; // pdf Y is bottom-up
                page.drawRectangle({ x, y, width: w, height: h, color: rgb(0, 0, 0), opacity: 1 });
            }
        }

        const bytes = await pdfDoc.save();
        const blob  = new Blob([bytes], { type: 'application/pdf' });
        const url   = URL.createObjectURL(blob);
        const a     = document.createElement('a');
        a.href = url; a.download = `redacted-${file?.file.name ?? 'document.pdf'}`; a.click();
        URL.revokeObjectURL(url);
    };

    // ── Export — True Redact (rasterize, image-only, no text layer) ───────────
    const exportTrue = async () => {
        const first = pages.get(1)!;
        const pdf   = new jsPDF({
            orientation: first.width >= first.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [first.width, first.height],
        });

        for (let i = 1; i <= pageCount; i++) {
            if (i > 1) {
                const pd = pages.get(i)!;
                pdf.addPage([pd.width, pd.height], pd.width >= pd.height ? 'landscape' : 'portrait');
            }
            const pd    = pages.get(i)!;
            const rects = redactions.get(i) ?? [];
            const offscreen = document.createElement('canvas');
            offscreen.width = pd.width; offscreen.height = pd.height;
            const ctx = offscreen.getContext('2d')!;

            await new Promise<void>(resolve => {
                const img  = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    ctx.fillStyle = '#000';
                    rects.forEach(r => ctx.fillRect(r.x, r.y, r.w, r.h));
                    resolve();
                };
                img.src = pd.dataUrl;
            });

            // addImage — pure pixel data, no text content stream
            pdf.addImage(offscreen.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pd.width, pd.height);
        }
        pdf.save(`true-redacted-${file?.file.name ?? 'document.pdf'}`);
    };

    const handleExport = async () => {
        if (!pages.size) return;
        setIsExporting(true);
        setError('');
        try {
            if (trueRedact) await exportTrue();
            else             await exportNormal();
        } catch {
            setError('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // ── Pre-upload landing ────────────────────────────────────────────────────
    if (!file && !isLoading) {
        return (
            <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
                <div className="flex-none space-y-3 mb-10">
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight flex items-center justify-center gap-4 font-unbounded">
                        <div className="text-indigo-400"><EyeOff size={42} /></div>
                        <span className="text-white">PDF Redactor</span>
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium">
                        Draw black bars over sensitive information. Choose normal or true permanent redaction.
                    </p>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                </div>

                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={handleFile}
                        accept=".pdf,application/pdf"
                        multiple={false}
                        label="Drop a PDF to start redacting"
                        description="All processing happens in your browser — nothing is uploaded"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-transparent rounded-2xl transition-all"
                    />
                </div>

                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    {[
                        { icon: EyeOff,       label: 'Draw Redactions', desc: 'Drag to cover any area' },
                        { icon: Shield,       label: 'Normal Mode',     desc: 'Keeps PDF quality & size' },
                        { icon: Lock,         label: 'True Redact',     desc: 'Text permanently destroyed' },
                        { icon: ShieldCheck,  label: 'AI-proof',        desc: 'No text layer in output' },
                    ].map((f, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors group">
                            <div className="p-3 bg-zinc-900 rounded-full text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
                                <f.icon size={20} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider font-unbounded">{f.label}</h3>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1 tracking-tight">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="h-[85vh] flex flex-col items-center justify-center gap-4 text-zinc-400">
                <Loader2 size={32} className="animate-spin text-indigo-400" />
                <p className="text-sm">Rendering pages… {loadProgress}%</p>
                <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${loadProgress}%` }} />
                </div>
            </div>
        );
    }

    // ── Editor workspace ──────────────────────────────────────────────────────
    return (
        <div className={`w-full bg-[#0c0c0e] text-zinc-200 flex overflow-hidden selection:bg-indigo-500/30 ${
            isMobile ? 'flex-col h-screen' : 'flex-row max-w-7xl mx-auto rounded-[32px] border border-zinc-900 h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)]'
        }`}>

            {/* ── Page sidebar ─────────────────────────────────────────────── */}
            <aside className={`${isMobile ? 'h-24 flex-row overflow-x-auto' : 'w-[88px] flex-col overflow-y-auto'} bg-[#0a0a0c] border-zinc-900 flex shrink-0 ${isMobile ? 'border-b' : 'border-r'} gap-1 p-2`}>
                {Array.from({ length: pageCount }, (_, i) => {
                    const pg  = i + 1;
                    const cnt = (redactions.get(pg) ?? []).length;
                    const pd  = pages.get(pg);
                    return (
                        <button
                            key={pg}
                            onClick={() => setCurrentPage(pg)}
                            className={`shrink-0 ${isMobile ? 'w-16' : 'w-full'} flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all ${
                                currentPage === pg
                                    ? 'border-indigo-500/60 bg-indigo-600/10'
                                    : 'border-transparent hover:border-zinc-700 hover:bg-zinc-800/40'
                            }`}
                        >
                            <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 relative">
                                {pd
                                    ? <img src={pd.dataUrl} alt={`Page ${pg}`} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full bg-zinc-800 animate-pulse" />
                                }
                                {cnt > 0 && (
                                    <div className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-0.5 bg-indigo-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                        {cnt}
                                    </div>
                                )}
                            </div>
                            <span className={`text-[9px] font-bold ${currentPage === pg ? 'text-indigo-400' : 'text-zinc-600'}`}>{pg}</span>
                        </button>
                    );
                })}
            </aside>

            {/* ── Main area ────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">

                {/* Toolbar */}
                <div className="h-12 px-3 border-b border-zinc-900 flex items-center gap-2 shrink-0 bg-[#0c0c0e]/90 backdrop-blur-md">
                    <button onClick={reset} title="Close file"
                        className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-all">
                        <RefreshCcw size={13} />
                    </button>
                    <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[100px]">{file?.file.name}</span>

                    {/* Page nav */}
                    <div className="flex items-center gap-0.5 ml-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                            className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 hover:bg-zinc-800 rounded transition-all">
                            <ChevronLeft size={13} />
                        </button>
                        <span className="text-xs text-zinc-400 font-mono w-12 text-center">{currentPage}/{pageCount}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount}
                            className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 hover:bg-zinc-800 rounded transition-all">
                            <ChevronRight size={13} />
                        </button>
                    </div>

                    <div className="w-px h-5 bg-zinc-800" />

                    {/* Edit actions */}
                    <button onClick={undoLast} disabled={pageRects.length === 0}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 transition-all">
                        <Undo2 size={11} /> Undo
                    </button>
                    <button onClick={clearPage} disabled={pageRects.length === 0}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 transition-all">
                        <Trash2 size={11} /> Clear
                    </button>

                    {/* Repeat on all pages */}
                    {pageCount > 1 && pageRects.length > 0 && (
                        <>
                            <div className="w-px h-5 bg-zinc-800" />
                            <button
                                onClick={repeatLastOnAllPages}
                                title="Copy the last drawn bar to all pages at the same position"
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-indigo-800/60 bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-300 transition-all"
                            >
                                <Layers size={11} /> Last → All
                            </button>
                            <button
                                onClick={applyToAllPages}
                                title={`Copy all ${pageRects.length} bar${pageRects.length !== 1 ? 's' : ''} from this page to every other page`}
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-indigo-700/60 bg-indigo-800/20 hover:bg-indigo-800/40 text-indigo-200 transition-all"
                            >
                                <Layers size={11} /> Page → All
                            </button>
                        </>
                    )}

                    {totalRedactions > 0 && (
                        <span className="px-2 py-1 rounded-md bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold">
                            {totalRedactions} bar{totalRedactions !== 1 ? 's' : ''}
                        </span>
                    )}

                    <div className="flex-1" />

                    {/* True Redact toggle */}
                    <div
                        onClick={() => setTrueRedact(v => !v)}
                        title={trueRedact
                            ? 'True Redact ON — text permanently destroyed. Click to switch to Normal.'
                            : 'Normal mode — black bar on PDF layer. Click to enable True Redact.'}
                        className="flex items-center gap-2 cursor-pointer select-none group"
                    >
                        <span className={`text-[11px] font-bold transition-colors ${trueRedact ? 'text-rose-300' : 'text-zinc-500'}`}>
                            {trueRedact ? <Lock size={11} className="inline mr-1" /> : <Shield size={11} className="inline mr-1" />}
                            True Redact
                        </span>
                        {/* Toggle pill */}
                        <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${trueRedact ? 'bg-rose-500' : 'bg-zinc-700'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${trueRedact ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    <Button
                        onClick={handleExport}
                        disabled={isExporting || totalRedactions === 0}
                        variant="primary"
                        className="flex items-center gap-1.5 text-xs font-bold"
                    >
                        {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        {isExporting ? 'Exporting…' : 'Export PDF'}
                    </Button>
                </div>

                {/* Mode info strip */}
                <div className={`h-7 px-4 flex items-center gap-2 border-b shrink-0 ${
                    trueRedact
                        ? 'bg-rose-950/30 border-rose-900/30'
                        : 'bg-zinc-900/30 border-zinc-800/30'
                }`}>
                    {trueRedact ? (
                        <>
                            <Lock size={10} className="text-rose-400 shrink-0" />
                            <span className="text-[10px] text-rose-300/70">
                                <strong>True Redact ON</strong> — pages rendered as images; text is permanently destroyed and cannot be recovered, even by AI.
                            </span>
                        </>
                    ) : (
                        <>
                            <EyeOff size={10} className="text-zinc-500 shrink-0" />
                            <span className="text-[10px] text-zinc-500">
                                <strong className="text-zinc-400">Normal mode</strong> — black bars drawn on PDF layer. Faster & smaller file, but underlying text may be extractable. Enable <strong>True Redact</strong> for maximum security.
                            </span>
                        </>
                    )}
                </div>

                {/* Canvas area */}
                <div className="flex-1 overflow-auto bg-zinc-950 flex items-start justify-center p-4">
                    <div
                        ref={wrapperRef}
                        className="relative select-none"
                        style={{ cursor: 'crosshair', maxWidth: '100%' }}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseLeave}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        <canvas
                            ref={canvasRef}
                            className="block shadow-2xl"
                            style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                        />

                        {/* SVG overlay — live preview rect while dragging */}
                        {previewRect && pageData && (
                            <svg
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                viewBox={`0 0 ${pageData.width} ${pageData.height}`}
                                preserveAspectRatio="none"
                            >
                                <rect
                                    x={previewRect.x} y={previewRect.y}
                                    width={previewRect.w} height={previewRect.h}
                                    fill="rgba(0,0,0,0.85)"
                                    stroke="#ef4444"
                                    strokeWidth={3}
                                    strokeDasharray="12 6"
                                />
                            </svg>
                        )}

                        {pages.size > 0 && pageRects.length === 0 && !isDrawing && (
                            <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
                                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm text-zinc-400 text-xs px-4 py-2 rounded-full">
                                    <EyeOff size={11} /> Drag to draw a redaction bar
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="h-8 px-4 flex items-center gap-2 bg-red-950/30 border-t border-red-900/30 shrink-0">
                        <span className="text-[11px] text-red-400">{error}</span>
                    </div>
                )}
            </main>
        </div>
    );
};
