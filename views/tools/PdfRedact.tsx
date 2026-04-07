import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import {
    EyeOff, Download, Loader2, Trash2, Undo2, ShieldCheck,
    ChevronLeft, ChevronRight, RefreshCcw, Lock, Shield, Layers,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { PDFDocument, rgb } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface Rect { x: number; y: number; w: number; h: number }
interface PageData { dataUrl: string; width: number; height: number }
interface Pt { x: number; y: number }

type ResizeHandle = 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w';
type DragOp =
    | { kind: 'draw';   start: Pt }
    | { kind: 'move';   idx: number; origRect: Rect; start: Pt }
    | { kind: 'resize'; idx: number; handle: ResizeHandle; origRect: Rect; start: Pt };

const RENDER_SCALE = 2;

const HANDLES: ResizeHandle[] = ['nw','n','ne','e','se','s','sw','w'];
const HANDLE_CURSORS: Record<ResizeHandle, string> = {
    nw:'nw-resize', n:'n-resize', ne:'ne-resize', e:'e-resize',
    se:'se-resize', s:'s-resize', sw:'sw-resize', w:'w-resize',
};

function getHandleCenter(r: Rect, h: ResizeHandle): Pt {
    const mx = r.x + r.w / 2, my = r.y + r.h / 2;
    const m: Record<ResizeHandle, Pt> = {
        nw:{x:r.x,y:r.y},       n:{x:mx,y:r.y},        ne:{x:r.x+r.w,y:r.y},
        e:{x:r.x+r.w,y:my},     se:{x:r.x+r.w,y:r.y+r.h},
        s:{x:mx,y:r.y+r.h},     sw:{x:r.x,y:r.y+r.h},  w:{x:r.x,y:my},
    };
    return m[h];
}

function hitTestHandle(r: Rect, pt: Pt, hitR: number): ResizeHandle | null {
    for (const h of HANDLES) {
        const c = getHandleCenter(r, h);
        if (Math.abs(pt.x - c.x) <= hitR && Math.abs(pt.y - c.y) <= hitR) return h;
    }
    return null;
}

function applyResize(orig: Rect, handle: ResizeHandle, dx: number, dy: number): Rect {
    let { x, y, w, h } = orig;
    if (handle.includes('w')) { x += dx; w -= dx; }
    if (handle.includes('e')) { w += dx; }
    if (handle.includes('n')) { y += dy; h -= dy; }
    if (handle.includes('s')) { h += dy; }
    if (w < 10) { w = 10; if (handle.includes('w')) x = orig.x + orig.w - 10; }
    if (h < 10) { h = 10; if (handle.includes('n')) y = orig.y + orig.h - 10; }
    return { x, y, w, h };
}

export const PdfRedact: React.FC = () => {
    const isMobile = useIsMobile();

    // PDF state
    const [file, setFile]                 = useState<FileData | null>(null);
    const [rawBytes, setRawBytes]         = useState<ArrayBuffer | null>(null);
    const [pageCount, setPageCount]       = useState(0);
    const [currentPage, setCurrentPage]   = useState(1);
    const [pages, setPages]               = useState<Map<number, PageData>>(new Map());
    const [isLoading, setIsLoading]       = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [isExporting, setIsExporting]   = useState(false);
    const [error, setError]               = useState('');

    // Redaction mode
    const [trueRedact, setTrueRedact] = useState(false);

    // Redactions: pageNum → Rect[] in canvas pixel coordinates
    const [redactions, setRedactions] = useState<Map<number, Rect[]>>(new Map());

    // Interaction state
    const [previewRect, setPreviewRect]       = useState<Rect | null>(null);
    const [selectedRectIdx, setSelectedRectIdx] = useState<number | null>(null);
    const [hoveredRectIdx, setHoveredRectIdx]   = useState<number | null>(null);
    const [hoveredHandle, setHoveredHandle]     = useState<ResizeHandle | null>(null);
    const [dragMode, setDragMode]               = useState<'draw'|'move'|'resize'|null>(null);
    const dragRef = useRef<DragOp | null>(null);

    const canvasRef  = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // ── Load PDF ──────────────────────────────────────────────────────────────
    const handleFile = useCallback(async (fd: FileData) => {
        setFile(fd); setIsLoading(true); setError('');
        setPages(new Map()); setRedactions(new Map());
        setCurrentPage(1); setLoadProgress(0); setRawBytes(null);
        try {
            const buf = await fd.file.arrayBuffer();
            setRawBytes(buf.slice(0));
            const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
            setPageCount(doc.numPages);
            const pagesMap = new Map<number, PageData>();
            for (let i = 1; i <= doc.numPages; i++) {
                const page = await doc.getPage(i);
                const vp   = page.getViewport({ scale: RENDER_SCALE });
                const off  = document.createElement('canvas');
                off.width = vp.width; off.height = vp.height;
                const ctx = off.getContext('2d')!;
                ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, vp.width, vp.height);
                await page.render({ canvasContext: ctx, viewport: vp, canvas: off } as any).promise;
                pagesMap.set(i, { dataUrl: off.toDataURL('image/png'), width: vp.width, height: vp.height });
                setLoadProgress(Math.round((i / doc.numPages) * 100));
            }
            setPages(pagesMap);
        } catch {
            setError('Could not open PDF — make sure it is a valid, unencrypted PDF file.');
        } finally { setIsLoading(false); }
    }, []);

    // ── Redraw visible canvas ─────────────────────────────────────────────────
    const redrawCanvas = useCallback(() => {
        const canvas   = canvasRef.current;
        const pageData = pages.get(currentPage);
        if (!canvas || !pageData) return;
        canvas.width = pageData.width; canvas.height = pageData.height;
        const ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            ctx.fillStyle = '#000';
            for (const r of redactions.get(currentPage) ?? []) ctx.fillRect(r.x, r.y, r.w, r.h);
        };
        img.src = pageData.dataUrl;
    }, [pages, currentPage, redactions]);

    useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

    // Reset interaction state on page change
    useEffect(() => {
        setSelectedRectIdx(null); setHoveredRectIdx(null);
        setHoveredHandle(null); dragRef.current = null; setDragMode(null);
    }, [currentPage]);

    // ── Coordinate + hit helpers ──────────────────────────────────────────────
    const toCanvas = (clientX: number, clientY: number): Pt => {
        const canvas = canvasRef.current!;
        const br = canvas.getBoundingClientRect();
        return {
            x: (clientX - br.left) * (canvas.width  / br.width),
            y: (clientY - br.top)  * (canvas.height / br.height),
        };
    };

    const getHitR = (): number => {
        const canvas = canvasRef.current;
        if (!canvas) return 20;
        const br = canvas.getBoundingClientRect();
        return 10 * (canvas.width / br.width);
    };

    const findRectAt = (pt: Pt): number => {
        const rects = redactions.get(currentPage) ?? [];
        for (let i = rects.length - 1; i >= 0; i--) {
            const r = rects[i];
            if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) return i;
        }
        return -1;
    };

    const deleteRect = useCallback((idx: number) => {
        setRedactions(prev => {
            const next  = new Map(prev);
            const rects = [...(prev.get(currentPage) ?? [])];
            rects.splice(idx, 1);
            next.set(currentPage, rects);
            return next;
        });
        setSelectedRectIdx(prev => prev === null ? null : prev === idx ? null : prev > idx ? prev - 1 : prev);
        setHoveredRectIdx(null);
    }, [currentPage]);

    // Keyboard shortcuts
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRectIdx !== null) deleteRect(selectedRectIdx);
            if (e.key === 'Escape') setSelectedRectIdx(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedRectIdx, deleteRect]);

    // ── Mouse handlers ────────────────────────────────────────────────────────
    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const pt   = toCanvas(e.clientX, e.clientY);
        const hitR = getHitR();

        // 1. Check resize handles on selected rect
        if (selectedRectIdx !== null) {
            const selR = (redactions.get(currentPage) ?? [])[selectedRectIdx];
            if (selR) {
                const handle = hitTestHandle(selR, pt, hitR);
                if (handle) {
                    dragRef.current = { kind: 'resize', idx: selectedRectIdx, handle, origRect: { ...selR }, start: pt };
                    setDragMode('resize');
                    return;
                }
                // Body of selected rect → move
                if (pt.x >= selR.x && pt.x <= selR.x + selR.w && pt.y >= selR.y && pt.y <= selR.y + selR.h) {
                    dragRef.current = { kind: 'move', idx: selectedRectIdx, origRect: { ...selR }, start: pt };
                    setDragMode('move');
                    return;
                }
            }
        }

        // 2. Click another rect → select + start move
        const hitIdx = findRectAt(pt);
        if (hitIdx >= 0) {
            const r = (redactions.get(currentPage) ?? [])[hitIdx];
            setSelectedRectIdx(hitIdx);
            dragRef.current = { kind: 'move', idx: hitIdx, origRect: { ...r }, start: pt };
            setDragMode('move');
            return;
        }

        // 3. Empty area → deselect + draw
        setSelectedRectIdx(null);
        dragRef.current = { kind: 'draw', start: pt };
        setDragMode('draw');
        setPreviewRect(null);
    };

    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const pt  = toCanvas(e.clientX, e.clientY);
        const op  = dragRef.current;

        if (!op) {
            // Update hover
            const hitR = getHitR();
            if (selectedRectIdx !== null) {
                const selR = (redactions.get(currentPage) ?? [])[selectedRectIdx];
                if (selR) {
                    const h = hitTestHandle(selR, pt, hitR);
                    if (h) { setHoveredHandle(h); setHoveredRectIdx(selectedRectIdx); return; }
                }
            }
            setHoveredHandle(null);
            const hitIdx = findRectAt(pt);
            setHoveredRectIdx(hitIdx >= 0 ? hitIdx : null);
            return;
        }

        if (op.kind === 'draw') {
            setPreviewRect({ x: Math.min(pt.x, op.start.x), y: Math.min(pt.y, op.start.y), w: Math.abs(pt.x - op.start.x), h: Math.abs(pt.y - op.start.y) });
            return;
        }

        const dx = pt.x - op.start.x, dy = pt.y - op.start.y;
        setRedactions(prev => {
            const next  = new Map(prev);
            const rects = [...(prev.get(currentPage) ?? [])];
            if (op.kind === 'move')   rects[op.idx] = { x: op.origRect.x + dx, y: op.origRect.y + dy, w: op.origRect.w, h: op.origRect.h };
            if (op.kind === 'resize') rects[op.idx] = applyResize(op.origRect, op.handle, dx, dy);
            next.set(currentPage, rects);
            return next;
        });
    };

    const onMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        const op = dragRef.current;
        if (op?.kind === 'draw') {
            const pt = toCanvas(e.clientX, e.clientY);
            const r: Rect = { x: Math.min(pt.x, op.start.x), y: Math.min(pt.y, op.start.y), w: Math.abs(pt.x - op.start.x), h: Math.abs(pt.y - op.start.y) };
            if (r.w > 5 && r.h > 5) {
                setRedactions(prev => { const n = new Map(prev); n.set(currentPage, [...(prev.get(currentPage) ?? []), r]); return n; });
            }
            setPreviewRect(null);
        }
        dragRef.current = null;
        setDragMode(null);
    };

    const onMouseLeave = () => {
        if (dragRef.current?.kind === 'draw') { setPreviewRect(null); dragRef.current = null; setDragMode(null); }
        setHoveredRectIdx(null); setHoveredHandle(null);
    };

    const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        const pt = toCanvas(e.touches[0].clientX, e.touches[0].clientY);
        const hitIdx = findRectAt(pt);
        if (hitIdx >= 0) {
            const r = (redactions.get(currentPage) ?? [])[hitIdx];
            setSelectedRectIdx(hitIdx);
            dragRef.current = { kind: 'move', idx: hitIdx, origRect: { ...r }, start: pt };
            setDragMode('move');
            return;
        }
        setSelectedRectIdx(null);
        dragRef.current = { kind: 'draw', start: pt };
        setDragMode('draw');
    };
    const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        const pt = toCanvas(e.touches[0].clientX, e.touches[0].clientY);
        const op = dragRef.current;
        if (!op) return;
        if (op.kind === 'draw') {
            setPreviewRect({ x: Math.min(pt.x, op.start.x), y: Math.min(pt.y, op.start.y), w: Math.abs(pt.x - op.start.x), h: Math.abs(pt.y - op.start.y) });
        } else if (op.kind === 'move') {
            const dx = pt.x - op.start.x, dy = pt.y - op.start.y;
            setRedactions(prev => {
                const next = new Map(prev); const rects = [...(prev.get(currentPage) ?? [])];
                rects[op.idx] = { x: op.origRect.x + dx, y: op.origRect.y + dy, w: op.origRect.w, h: op.origRect.h };
                next.set(currentPage, rects); return next;
            });
        }
    };
    const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        const t = e.changedTouches[0];
        const op = dragRef.current;
        if (op?.kind === 'draw') {
            const pt = toCanvas(t.clientX, t.clientY);
            const r: Rect = { x: Math.min(pt.x, op.start.x), y: Math.min(pt.y, op.start.y), w: Math.abs(pt.x - op.start.x), h: Math.abs(pt.y - op.start.y) };
            if (r.w > 5 && r.h > 5) {
                setRedactions(prev => { const n = new Map(prev); n.set(currentPage, [...(prev.get(currentPage) ?? []), r]); return n; });
            }
            setPreviewRect(null);
        }
        dragRef.current = null; setDragMode(null);
    };

    // ── Page actions ──────────────────────────────────────────────────────────
    const undoLast = () => setRedactions(prev => {
        const next = new Map(prev);
        next.set(currentPage, (prev.get(currentPage) ?? []).slice(0, -1));
        return next;
    });
    const clearPage = () => setRedactions(prev => { const n = new Map(prev); n.set(currentPage, []); return n; });

    const applyToAllPages = () => {
        const src = redactions.get(currentPage) ?? [];
        if (!src.length) return;
        setRedactions(prev => {
            const next = new Map(prev);
            for (let p = 1; p <= pageCount; p++) {
                if (p === currentPage) continue;
                next.set(p, [...(prev.get(p) ?? []), ...src]);
            }
            return next;
        });
    };

    const repeatLastOnAllPages = () => {
        const src = redactions.get(currentPage) ?? [];
        if (!src.length) return;
        const last = src[src.length - 1];
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

    // ── Derived values ────────────────────────────────────────────────────────
    const totalRedactions = [...redactions.values()].reduce((s, r) => s + r.length, 0);
    const pageRects = redactions.get(currentPage) ?? [];
    const pageData  = pages.get(currentPage);

    const cursor = dragMode === 'move'   ? 'grabbing'
                 : dragMode === 'resize' ? HANDLE_CURSORS[(dragRef.current as Extract<DragOp, {kind:'resize'}>)?.handle ?? 'se']
                 : hoveredHandle         ? HANDLE_CURSORS[hoveredHandle]
                 : hoveredRectIdx !== null && hoveredRectIdx === selectedRectIdx ? 'move'
                 : hoveredRectIdx !== null ? 'pointer'
                 : 'crosshair';

    // ── Export ────────────────────────────────────────────────────────────────
    const exportNormal = async () => {
        if (!rawBytes) return;
        const pdfDoc = await PDFDocument.load(rawBytes);
        const pdfPages = pdfDoc.getPages();
        for (const [pageNum, rects] of redactions) {
            if (!rects.length) continue;
            const page = pdfPages[pageNum - 1];
            const { height: pdfH } = page.getSize();
            for (const r of rects) {
                page.drawRectangle({ x: r.x / RENDER_SCALE, y: pdfH - (r.y + r.h) / RENDER_SCALE, width: r.w / RENDER_SCALE, height: r.h / RENDER_SCALE, color: rgb(0, 0, 0), opacity: 1 });
            }
        }
        const bytes = await pdfDoc.save();
        const blob  = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
        const url   = URL.createObjectURL(blob);
        const a     = document.createElement('a');
        a.href = url; a.download = `redacted-${file?.file.name ?? 'document.pdf'}`; a.click();
        URL.revokeObjectURL(url);
    };

    const exportTrue = async () => {
        const first = pages.get(1)!;
        const pdf   = new jsPDF({ orientation: first.width >= first.height ? 'landscape' : 'portrait', unit: 'px', format: [first.width, first.height] });
        for (let i = 1; i <= pageCount; i++) {
            if (i > 1) { const pd = pages.get(i)!; pdf.addPage([pd.width, pd.height], pd.width >= pd.height ? 'landscape' : 'portrait'); }
            const pd = pages.get(i)!; const rects = redactions.get(i) ?? [];
            const off = document.createElement('canvas'); off.width = pd.width; off.height = pd.height;
            const ctx = off.getContext('2d')!;
            await new Promise<void>(resolve => { const img = new Image(); img.onload = () => { ctx.drawImage(img, 0, 0); ctx.fillStyle = '#000'; rects.forEach(r => ctx.fillRect(r.x, r.y, r.w, r.h)); resolve(); }; img.src = pd.dataUrl; });
            pdf.addImage(off.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pd.width, pd.height);
        }
        pdf.save(`true-redacted-${file?.file.name ?? 'document.pdf'}`);
    };

    const handleExport = async () => {
        if (!pages.size) return;
        setIsExporting(true); setError('');
        try { if (trueRedact) await exportTrue(); else await exportNormal(); }
        catch { setError('Export failed. Please try again.'); }
        finally { setIsExporting(false); }
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
                    <FileUploader onFileSelect={handleFile} accept=".pdf,application/pdf" multiple={false}
                        label="Drop a PDF to start redacting" description="All processing happens in your browser — nothing is uploaded"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-transparent rounded-2xl transition-all" />
                </div>
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    {[
                        { icon: EyeOff,      label: 'Draw Redactions', desc: 'Drag to cover any area' },
                        { icon: Shield,      label: 'Normal Mode',     desc: 'Keeps PDF quality & size' },
                        { icon: Lock,        label: 'True Redact',     desc: 'Text permanently destroyed' },
                        { icon: ShieldCheck, label: 'AI-proof',        desc: 'No text layer in output' },
                    ].map((f, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors group">
                            <div className="p-3 bg-zinc-900 rounded-full text-indigo-400 group-hover:scale-110 transition-transform shadow-inner"><f.icon size={20} /></div>
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

            {/* Page sidebar */}
            <aside className={`${isMobile ? 'h-24 flex-row overflow-x-auto' : 'w-[88px] flex-col overflow-y-auto'} bg-[#0a0a0c] border-zinc-900 flex shrink-0 ${isMobile ? 'border-b' : 'border-r'} gap-1 p-2`}>
                {Array.from({ length: pageCount }, (_, i) => {
                    const pg = i + 1, cnt = (redactions.get(pg) ?? []).length, pd = pages.get(pg);
                    return (
                        <button key={pg} onClick={() => setCurrentPage(pg)}
                            className={`shrink-0 ${isMobile ? 'w-16' : 'w-full'} flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all ${
                                currentPage === pg ? 'border-indigo-500/60 bg-indigo-600/10' : 'border-transparent hover:border-zinc-700 hover:bg-zinc-800/40'
                            }`}>
                            <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 relative">
                                {pd ? <img src={pd.dataUrl} alt={`Page ${pg}`} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-800 animate-pulse" />}
                                {cnt > 0 && <div className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-0.5 bg-indigo-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{cnt}</div>}
                            </div>
                            <span className={`text-[9px] font-bold ${currentPage === pg ? 'text-indigo-400' : 'text-zinc-600'}`}>{pg}</span>
                        </button>
                    );
                })}
            </aside>

            {/* Main area */}
            <main className="flex-1 flex flex-col overflow-hidden">

                {/* Toolbar */}
                <div className="h-12 px-3 border-b border-zinc-900 flex items-center gap-2 shrink-0 bg-[#0c0c0e]/90 backdrop-blur-md">
                    <button onClick={reset} title="Close file" className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-all">
                        <RefreshCcw size={13} />
                    </button>
                    <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[100px]">{file?.file.name}</span>

                    <div className="flex items-center gap-0.5 ml-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                            className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 hover:bg-zinc-800 rounded transition-all"><ChevronLeft size={13} /></button>
                        <span className="text-xs text-zinc-400 font-mono w-12 text-center">{currentPage}/{pageCount}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount}
                            className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 hover:bg-zinc-800 rounded transition-all"><ChevronRight size={13} /></button>
                    </div>

                    <div className="w-px h-5 bg-zinc-800" />

                    <button onClick={undoLast} disabled={pageRects.length === 0}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 transition-all">
                        <Undo2 size={11} /> Undo
                    </button>
                    <button onClick={clearPage} disabled={pageRects.length === 0}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 transition-all">
                        <Trash2 size={11} /> Clear
                    </button>

                    {pageCount > 1 && pageRects.length > 0 && (
                        <>
                            <div className="w-px h-5 bg-zinc-800" />
                            <button onClick={repeatLastOnAllPages} title="Copy the last drawn bar to all pages"
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all">
                                <Layers size={11} /> Last → All
                            </button>
                            <button onClick={applyToAllPages} title="Copy all bars on this page to every other page"
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all">
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
                    <div onClick={() => setTrueRedact(v => !v)}
                        title={trueRedact ? 'True Redact ON — click to switch to Normal.' : 'Normal mode — click to enable True Redact.'}
                        className="flex items-center gap-2 cursor-pointer select-none">
                        <span className={`text-[11px] font-bold transition-colors ${trueRedact ? 'text-rose-300' : 'text-zinc-500'}`}>
                            {trueRedact ? <Lock size={11} className="inline mr-1" /> : <Shield size={11} className="inline mr-1" />}
                            True Redact
                        </span>
                        <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${trueRedact ? 'bg-rose-500' : 'bg-zinc-700'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${trueRedact ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    <Button onClick={handleExport} disabled={isExporting || totalRedactions === 0} variant="primary" className="flex items-center gap-1.5 text-xs font-bold">
                        {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        {isExporting ? 'Exporting…' : 'Export PDF'}
                    </Button>
                </div>

                {/* Mode strip */}
                <div className={`h-7 px-4 flex items-center gap-2 border-b shrink-0 ${trueRedact ? 'bg-rose-950/30 border-rose-900/30' : 'bg-zinc-900/30 border-zinc-800/30'}`}>
                    {trueRedact ? (
                        <><Lock size={10} className="text-rose-400 shrink-0" /><span className="text-[10px] text-rose-300/70"><strong>True Redact ON</strong> — pages rendered as images; text permanently destroyed, unrecoverable by AI.</span></>
                    ) : (
                        <><EyeOff size={10} className="text-zinc-500 shrink-0" /><span className="text-[10px] text-zinc-500"><strong className="text-zinc-400">Normal mode</strong> — black bars on PDF layer. Enable <strong>True Redact</strong> for maximum security.</span></>
                    )}
                </div>

                {/* Canvas area */}
                <div className="flex-1 overflow-auto bg-zinc-950 flex items-start justify-center p-4">
                    <div
                        ref={wrapperRef}
                        className="relative select-none"
                        style={{ cursor, maxWidth: '100%' }}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseLeave}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        <canvas ref={canvasRef} className="block shadow-2xl" style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />

                        {/* SVG overlay — borders only (pointer-events-none) */}
                        {pageData && (pageRects.length > 0 || previewRect) && (
                            <svg className="absolute inset-0 w-full h-full pointer-events-none"
                                viewBox={`0 0 ${pageData.width} ${pageData.height}`} preserveAspectRatio="none">
                                {pageRects.map((r, idx) => (
                                    <rect key={idx} x={r.x} y={r.y} width={r.w} height={r.h} fill="transparent"
                                        stroke={selectedRectIdx === idx ? '#f43f5e' : hoveredRectIdx === idx ? 'rgba(255,255,255,0.25)' : 'transparent'}
                                        strokeWidth={selectedRectIdx === idx ? 3 : 1.5} />
                                ))}
                                {previewRect && (
                                    <rect x={previewRect.x} y={previewRect.y} width={previewRect.w} height={previewRect.h}
                                        fill="rgba(0,0,0,0.85)" stroke="#ef4444" strokeWidth={3} strokeDasharray="12 6" />
                                )}
                            </svg>
                        )}

                        {/* X delete button — appears on hover */}
                        {hoveredRectIdx !== null && dragMode === null && pageData && pageRects[hoveredRectIdx] && (() => {
                            const r = pageRects[hoveredRectIdx];
                            return (
                                <div
                                    style={{ position: 'absolute', left: `${((r.x + r.w) / pageData.width) * 100}%`, top: `${(r.y / pageData.height) * 100}%`, transform: 'translate(-50%, -50%)', width: 20, height: 20, borderRadius: '50%', background: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto', zIndex: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); deleteRect(hoveredRectIdx); }}
                                >
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                        <line x1="2" y1="2" x2="8" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                        <line x1="8" y1="2" x2="2" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                            );
                        })()}

                        {/* Resize handles — appear on selection */}
                        {selectedRectIdx !== null && pageData && pageRects[selectedRectIdx] && (() => {
                            const r = pageRects[selectedRectIdx];
                            return HANDLES.map(handle => {
                                const c = getHandleCenter(r, handle);
                                const isEdge = handle === 'n' || handle === 's' || handle === 'e' || handle === 'w';
                                return (
                                    <div
                                        key={handle}
                                        style={{ position: 'absolute', left: `${(c.x / pageData.width) * 100}%`, top: `${(c.y / pageData.height) * 100}%`, transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: isEdge ? '50%' : '2px', background: 'white', border: '2px solid #f43f5e', cursor: HANDLE_CURSORS[handle], pointerEvents: 'auto', zIndex: 15 }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation(); e.preventDefault();
                                            dragRef.current = { kind: 'resize', idx: selectedRectIdx, handle, origRect: { ...r }, start: toCanvas(e.clientX, e.clientY) };
                                            setDragMode('resize');
                                        }}
                                    />
                                );
                            });
                        })()}

                        {/* Empty hint */}
                        {pages.size > 0 && pageRects.length === 0 && dragMode !== 'draw' && (
                            <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
                                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm text-zinc-400 text-xs px-4 py-2 rounded-full">
                                    <EyeOff size={11} /> Drag to draw · hover a bar to delete · click to move &amp; resize
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
