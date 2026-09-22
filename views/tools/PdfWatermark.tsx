/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { 
  FileText, 
  Download, 
  RefreshCcw, 
  Eye, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Sliders, 
  Type, 
  Hash,
  Stamp,
  RotateCw,
  Zap
} from 'lucide-react';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { setupPdfWorker, getPdfDocument, validatePdfFile, classifyPdfError } from '../../utils/pdfWorker';
import { logToolFailure } from '../../utils/toolHealth';

// Shared PDF.js worker (local-first with CDN fallback) — see utils/pdfWorker.ts
setupPdfWorker();

type ToolMode = 'watermark' | 'numbering';
type NumberPosition = 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';

const WATERMARK_PRESETS = ['CONFIDENTIAL', 'DRAFT', 'SAMPLE', 'COPY', 'RESTRICTED'];
const COLOR_PRESETS = [
  { label: 'Crimson', hex: '#EF4444', rgb: { r: 239, g: 68, b: 68 } },
  { label: 'Indigo', hex: '#6366F1', rgb: { r: 99, g: 102, b: 241 } },
  { label: 'Slate Gray', hex: '#71717A', rgb: { r: 113, g: 113, b: 122 } },
  { label: 'Deep Black', hex: '#000000', rgb: { r: 0, g: 0, b: 0 } },
];

export const PdfWatermark: React.FC = () => {
  const [file, setFile] = useState<FileData | null>(null);
  const [activeTab, setActiveTab] = useState<ToolMode>('watermark');
  const [pageCount, setPageCount] = useState<number>(0);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Watermark state
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(30); // 10-100%
  const [watermarkAngle, setWatermarkAngle] = useState<number>(45); // 0, 45, 90
  const [watermarkFontSize, setWatermarkFontSize] = useState<number>(54);
  const [watermarkColor, setWatermarkColor] = useState(COLOR_PRESETS[0]);
  const [watermarkPages, setWatermarkPages] = useState<'all' | 'first' | 'odd' | 'even'>('all');

  // Page numbering state
  const [enableNumbering, setEnableNumbering] = useState<boolean>(false);
  const [numberFormat, setNumberFormat] = useState<string>('Page {n} of {total}');
  const [numberPosition, setNumberPosition] = useState<NumberPosition>('bottom-center');
  const [numberFontSize, setNumberFontSize] = useState<number>(11);
  const [numberStartAt, setNumberStartAt] = useState<number>(1);
  const [numberMargin, setNumberMargin] = useState<number>(24);

  // Status
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfJsDoc, setPdfJsDoc] = useState<any>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load PDF when file is selected
  useEffect(() => {
    if (!file) {
      setPageCount(0);
      setCurrentPageIndex(0);
      setPdfJsDoc(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const validationError = await validatePdfFile(file.file);
        if (validationError) { if (!cancelled) { setLoadError(validationError); } return; }
        const buf = await file.file.arrayBuffer();
        if (cancelled) return;
        const doc = await getPdfDocument(buf, 'pdf-watermark');
        if (cancelled) { try { await doc.destroy(); } catch { /* ignore */ } return; }
        // Destroy previous doc to avoid worker leaks
        setPdfJsDoc((prev: any) => { if (prev) { try { prev.destroy(); } catch { /* ignore */ } } return doc; });
        setPageCount(doc.numPages);
        setCurrentPageIndex(0);
      } catch (err) {
        if (!cancelled) {
          logToolFailure('pdf-watermark', err, { stage: 'pdf-preview-load' });
          setLoadError(classifyPdfError(err));
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  // Destroy PDF.js doc on unmount
  useEffect(() => {
    return () => { setPdfJsDoc((prev: any) => { if (prev) { try { prev.destroy(); } catch { /* ignore */ } } return null; }); };
  }, []);

  // Render preview canvas with watermark and page numbers
  useEffect(() => {
    if (!pdfJsDoc || !previewCanvasRef.current) return;

    let isCurrent = true;
    const renderPreview = async () => {
      setPreviewLoading(true);
      try {
        const page = await pdfJsDoc.getPage(currentPageIndex + 1);
        if (!isCurrent) return;

        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const viewport = page.getViewport({ scale: 1.2 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render base PDF page
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        if (!isCurrent) return;

        // Render watermark preview overlay if enabled for this page
        const shouldWatermark = 
          watermarkPages === 'all' ||
          (watermarkPages === 'first' && currentPageIndex === 0) ||
          (watermarkPages === 'odd' && currentPageIndex % 2 === 0) ||
          (watermarkPages === 'even' && currentPageIndex % 2 === 1);

        if (shouldWatermark && watermarkText.trim()) {
          ctx.save();
          ctx.translate(viewport.width / 2, viewport.height / 2);
          ctx.rotate((-watermarkAngle * Math.PI) / 180);
          ctx.globalAlpha = watermarkOpacity / 100;
          ctx.fillStyle = watermarkColor.hex;
          ctx.font = `bold ${watermarkFontSize * 1.2}px Helvetica, Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore();
        }

        // Render page numbering preview overlay
        if (enableNumbering || activeTab === 'numbering') {
          const num = currentPageIndex + numberStartAt;
          const label = numberFormat
            .replace('{n}', num.toString())
            .replace('{total}', pageCount.toString());

          ctx.save();
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = '#18181b';
          ctx.font = `${numberFontSize * 1.2}px Helvetica, Arial, sans-serif`;

          const margin = numberMargin * 1.2;
          let x = viewport.width / 2;
          let y = viewport.height - margin;
          let textAlign: CanvasTextAlign = 'center';

          if (numberPosition.includes('left')) {
            x = margin;
            textAlign = 'left';
          } else if (numberPosition.includes('right')) {
            x = viewport.width - margin;
            textAlign = 'right';
          }

          if (numberPosition.includes('top')) {
            y = margin + (numberFontSize * 1.2);
          }

          ctx.textAlign = textAlign;
          ctx.fillText(label, x, y);
          ctx.restore();
        }
      } catch (err) {
        console.error('Failed to render preview canvas:', err);
      } finally {
        if (isCurrent) setPreviewLoading(false);
      }
    };

    renderPreview();

    return () => {
      isCurrent = false;
    };
  }, [
    pdfJsDoc,
    currentPageIndex,
    watermarkText,
    watermarkOpacity,
    watermarkAngle,
    watermarkFontSize,
    watermarkColor,
    watermarkPages,
    enableNumbering,
    activeTab,
    numberFormat,
    numberPosition,
    numberFontSize,
    numberStartAt,
    numberMargin
  ]);

  // Process and Stamp PDF using pdf-lib
  const handleStampAndDownload = async () => {
    if (!file) return;
    setIsProcessing(true);
    setLoadError(null);

    try {
      const buffer = await file.file.arrayBuffer();
      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      } catch (loadErr) {
        logToolFailure('pdf-watermark', loadErr, { stage: 'pdf-lib-load' });
        setLoadError(classifyPdfError(loadErr));
        return;
      }
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        // 1. Watermark Stamp
        const shouldWatermark = 
          watermarkPages === 'all' ||
          (watermarkPages === 'first' && i === 0) ||
          (watermarkPages === 'odd' && i % 2 === 0) ||
          (watermarkPages === 'even' && i % 2 === 1);

        if (shouldWatermark && watermarkText.trim()) {
          const textWidth = font.widthOfTextAtSize(watermarkText, watermarkFontSize);
          const rad = (watermarkAngle * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);

          // Center coordinate
          const x = (width / 2) - (textWidth / 2) * cos;
          const y = (height / 2) - (textWidth / 2) * sin;

          page.drawText(watermarkText, {
            x,
            y,
            size: watermarkFontSize,
            font: font,
            color: rgb(
              watermarkColor.rgb.r / 255, 
              watermarkColor.rgb.g / 255, 
              watermarkColor.rgb.b / 255
            ),
            opacity: watermarkOpacity / 100,
            rotate: degrees(watermarkAngle)
          });
        }

        // 2. Page Numbering
        if (enableNumbering || activeTab === 'numbering') {
          const num = i + numberStartAt;
          const label = numberFormat
            .replace('{n}', num.toString())
            .replace('{total}', pages.length.toString());

          const textWidth = regularFont.widthOfTextAtSize(label, numberFontSize);
          let x = (width / 2) - (textWidth / 2);
          let y = numberMargin;

          if (numberPosition.includes('left')) {
            x = numberMargin;
          } else if (numberPosition.includes('right')) {
            x = width - textWidth - numberMargin;
          }

          if (numberPosition.includes('top')) {
            y = height - numberMargin - numberFontSize;
          }

          page.drawText(label, {
            x,
            y,
            size: numberFontSize,
            font: regularFont,
            color: rgb(0.15, 0.15, 0.15),
            opacity: 0.85
          });
        }
      }

      const stampedPdfBytes = await pdfDoc.save();
      const blob = new Blob([stampedPdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const baseName = file.file.name.replace(/\.[^/.]+$/, '');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}_stamped.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      logToolFailure('pdf-watermark', err, { stage: 'pdf-stamp' });
      setLoadError('Export failed. If the PDF is password-protected, unlock it first and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
  };

  // Upload view per AGENTS.md
  if (!file) {
    return (
      <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center py-10">
        {/* Header */}
        <div className="flex-none space-y-3 mb-10">
          <h2 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3 font-unbounded">
            <div className="text-indigo-400 p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <Stamp size={36} />
            </div>
            <span className="text-white">PDF Watermark</span>
          </h2>
          <p className="text-base text-zinc-400 max-w-xl mx-auto">
            Stamp confidential watermarks, custom branding, and page numbers onto any PDF document.
          </p>
        </div>

        {/* Upload Area */}
        <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-3 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <FileUploader
            onFileSelect={setFile}
            accept=".pdf,application/pdf"
            label="Drop PDF Document Here"
            description="Supports multi-page PDF documents of any size"
            className="w-full h-full min-h-[260px] border-2 border-dashed border-zinc-800/80 hover:border-indigo-500/50 bg-zinc-950/40 rounded-2xl transition-all"
          />
        </div>

        {/* Feature Highlights Grid */}
        <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          {[
            { icon: Stamp, label: 'Custom Watermarks', desc: 'CONFIDENTIAL, DRAFT & More' },
            { icon: Hash, label: 'Page Numbers', desc: 'Custom Headers & Footers' },
            { icon: Eye, label: 'Live Page Preview', desc: 'Interactive Visual Check' },
            { icon: ShieldCheck, label: '100% Client-Side', desc: 'No Cloud Uploads' }
          ].map((feat, i) => (
            <div 
              key={i} 
              className="flex flex-col items-center text-center space-y-2 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 hover:border-zinc-700/60 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <feat.icon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-200">{feat.label}</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl animate-fade-in space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Stamp size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-unbounded">PDF Watermark & Numberer</h2>
            <p className="text-xs text-zinc-400 truncate max-w-sm sm:max-w-md">{file.file.name}</p>
          </div>
        </div>

        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleReset}
          className="text-xs border-zinc-800 hover:bg-zinc-800"
        >
          <RefreshCcw size={14} className="mr-1.5" />
          New Document
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live PDF Page Canvas Preview */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} className="text-indigo-400" />
                <span>Live Document Preview</span>
              </span>
              <span className="font-mono text-indigo-400">{pageCount} Total Pages</span>
            </div>

            {/* Canvas Container */}
            <div className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center min-h-[460px] p-2">
              {previewLoading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 size={28} className="animate-spin text-indigo-400" />
                </div>
              )}
              {loadError && !previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 max-w-sm text-center">
                    <p className="text-xs text-red-400">{loadError}</p>
                  </div>
                </div>
              )}
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-[500px] object-contain shadow-2xl rounded-md"
              />
            </div>

            {/* Page Navigation */}
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPageIndex === 0}
                onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                className="text-xs"
              >
                <ChevronLeft size={14} className="mr-1" />
                Prev Page
              </Button>

              <span className="text-xs font-mono text-zinc-400">
                Page <span className="text-white font-bold">{currentPageIndex + 1}</span> of {pageCount}
              </span>

              <Button
                variant="secondary"
                size="sm"
                disabled={currentPageIndex >= pageCount - 1}
                onClick={() => setCurrentPageIndex(prev => Math.min(pageCount - 1, prev + 1))}
                className="text-xs"
              >
                Next Page
                <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Controls & Stamp Action */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 space-y-5">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('watermark')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'watermark'
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Stamp size={14} />
                Watermark Stamp
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('numbering')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'numbering'
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Hash size={14} />
                Page Numbering
              </button>
            </div>

            {/* TAB 1: WATERMARK SETTINGS */}
            {activeTab === 'watermark' && (
              <div className="space-y-4 animate-fade-in">
                {/* Text input & Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Enter watermark text..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none font-bold"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {WATERMARK_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWatermarkText(preset)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                          watermarkText === preset
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity & Angle Sliders */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Opacity</span>
                      <span className="font-mono text-indigo-400">{watermarkOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(parseInt(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Angle</span>
                      <span className="font-mono text-indigo-400">{watermarkAngle}°</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[0, 45, 90].map((ang) => (
                        <button
                          key={ang}
                          type="button"
                          onClick={() => setWatermarkAngle(ang)}
                          className={`py-1 text-[11px] font-bold rounded-lg border transition-all ${
                            watermarkAngle === ang
                              ? 'bg-indigo-600/20 border-indigo-500 text-white'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {ang}°
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Font Size & Color Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Font Size</span>
                      <span className="font-mono text-indigo-400">{watermarkFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={24}
                      max={96}
                      value={watermarkFontSize}
                      onChange={(e) => setWatermarkFontSize(parseInt(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs text-zinc-400">Color</span>
                    <div className="flex gap-2 pt-0.5">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => setWatermarkColor(c)}
                          className={`w-7 h-7 rounded-lg border transition-transform hover:scale-110 ${
                            watermarkColor.label === c.label ? 'ring-2 ring-indigo-500 scale-105' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Target Pages */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Apply To Pages
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { key: 'all', label: 'All Pages' },
                      { key: 'first', label: 'First Only' },
                      { key: 'odd', label: 'Odd Pages' },
                      { key: 'even', label: 'Even Pages' }
                    ].map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setWatermarkPages(p.key as any)}
                        className={`py-2 text-[11px] font-bold rounded-lg border transition-all ${
                          watermarkPages === p.key
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PAGE NUMBERING SETTINGS */}
            {activeTab === 'numbering' && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Format Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Page {n} of {total}',
                      '{n} / {total}',
                      'Page {n}',
                      '{n}'
                    ].map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setNumberFormat(fmt)}
                        className={`py-2 px-3 text-xs font-mono font-bold rounded-xl border text-left transition-all ${
                          numberFormat === fmt
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Placement
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'top-left', label: 'Top Left' },
                      { key: 'top-center', label: 'Top Center' },
                      { key: 'top-right', label: 'Top Right' },
                      { key: 'bottom-left', label: 'Bottom Left' },
                      { key: 'bottom-center', label: 'Bottom Center' },
                      { key: 'bottom-right', label: 'Bottom Right' }
                    ].map((pos) => (
                      <button
                        key={pos.key}
                        type="button"
                        onClick={() => setNumberPosition(pos.key as any)}
                        className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                          numberPosition === pos.key
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Margins & Start Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Start Number</span>
                      <span className="font-mono text-indigo-400">{numberStartAt}</span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={numberStartAt}
                      onChange={(e) => setNumberStartAt(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Margin</span>
                      <span className="font-mono text-indigo-400">{numberMargin}px</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={48}
                      value={numberMargin}
                      onChange={(e) => setNumberMargin(parseInt(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stamp & Download CTA */}
            <div className="pt-2">
              <Button
                onClick={handleStampAndDownload}
                disabled={isProcessing}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-unbounded text-sm rounded-xl transition-all shadow-[0_8px_32px_rgba(79,70,229,0.25)] hover:shadow-[0_8px_32px_rgba(79,70,229,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Stamping PDF...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Stamp & Download PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
