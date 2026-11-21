/// <reference lib="dom" />
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Button } from '../../components/ui/Button';
import { ApiKeyInput } from '../../components/ui/ApiKeyInput';
import { FileData } from '../../types';
import { Eraser, Download, RefreshCcw, Sliders, AlertCircle, Layers, Brush, Sparkles, Paintbrush } from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { preprocessImageFileData } from '../../utils/imagePreprocess';

import { useIsMobile } from '../../hooks/useIsMobile';
import { ToolShell } from '../../components/ToolShell';
import { useToolFile } from '../../hooks/useToolFile';

type BrushMode = 'erase' | 'restore' | null;

export const BackgroundRemover: React.FC = () => {
  const isMobile = useIsMobile();
  const { file, select, clear } = useToolFile();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (selectedFile: FileData | FileData[]) => {
    const first = Array.isArray(selectedFile) ? selectedFile[0] : selectedFile;
    if (!first) return;
    setIsProcessing(true);
    const processed = await preprocessImageFileData(first);
    select(processed);
    setIsProcessing(false);
  };

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [workingImage, setWorkingImage] = useState<string | null>(null); // current touch-up state
  const [isEdited, setIsEdited] = useState(false);
  const [brushMode, setBrushMode] = useState<BrushMode>(null);
  const [brushRadius, setBrushRadius] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [apiKey, setApiKey] = useState('');

  // Touch-up refs: full-resolution offscreen working canvas + brush interaction
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const aiResultImgRef = useRef<HTMLImageElement | null>(null);
  const viewCanvasRef = useRef<HTMLCanvasElement>(null);
  const isBrushingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Brush cursor preview position (CSS px over the display canvas)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const handleReset = () => {
    clear();
    setResultImage(null);
    setWorkingImage(null);
    setIsEdited(false);
    setBrushMode(null);
    setError(null);
    setIsProcessing(false);
    workCanvasRef.current = null;
    aiResultImgRef.current = null;
    originalImgRef.current = null;
  };

  // Sync brush display canvas with the working canvas whenever brush mode toggles on
  useEffect(() => {
    if (!brushMode || !workCanvasRef.current || !viewCanvasRef.current) return;
    const ctx = viewCanvasRef.current.getContext('2d');
    const w = workCanvasRef.current;
    if (ctx && w.width > 0) {
      viewCanvasRef.current.width = w.width;
      viewCanvasRef.current.height = w.height;
      ctx.clearRect(0, 0, w.width, w.height);
      ctx.drawImage(w, 0, 0);
    }
  }, [brushMode, workingImage]);

  const initWorkCanvas = async (aiUrl: string, originalUrl: string | undefined) => {
    const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    try {
      const aiImg = await loadImg(aiUrl);
      aiResultImgRef.current = aiImg;
      if (originalUrl) {
        originalImgRef.current = await loadImg(originalUrl).catch(() => null);
      }
      const c = document.createElement('canvas');
      c.width = aiImg.width;
      c.height = aiImg.height;
      const ctx = c.getContext('2d');
      if (ctx) ctx.drawImage(aiImg, 0, 0);
      workCanvasRef.current = c;
    } catch (e) {
      console.error('Failed to init touch-up canvas', e);
    }
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = reject;
    });
  };

  const handleRemoveBackground = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (!apiKey) throw new Error("Please enter your Gemini API Key first");

      const base64Data = await getBase64(file.file);
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { apiVersion: 'v1alpha' }
      });

      // We use a specific prompt to instruct the model to isolate the subject
      const prompt = "Remove the background from this image. Ensure the main subject is isolated clearly.";

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: file.file.type,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseModalities: ["IMAGE"],
        },
      });

      let foundImage = false;
      if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            const imageUrl = `data:image/png;base64,${base64EncodeString}`;
            await initWorkCanvas(imageUrl, file.previewUrl);
            setWorkingImage(imageUrl);
            setIsEdited(false);
            setResultImage(imageUrl);
            setBrushMode(null);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error("The AI could not process the image background.");
      }

    } catch (err) {
      console.error(err);
      let message = (err as Error).message || "An error occurred while processing the image.";

      // Parse detailed AI errors
      if (message.includes('429') || message.toLowerCase().includes('quota')) {
        message = "Usage limit exceeded. Please try again later or check your API quota.";
      } else if (message.includes('401') || message.toLowerCase().includes('key')) {
        message = "Invalid API Key. Please verify your credentials.";
      } else if (message.includes('{')) {
        try {
          // Attempt to extract friendly message from JSON blob
          const jsonMatch = message.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const errorObj = JSON.parse(jsonMatch[0]);
            if (errorObj.error && errorObj.error.message) {
              message = errorObj.error.message;
            }
          }
        } catch (e) { /* use original message */ }
      }

      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Touch-up brush mechanics ──────────────────────────────────────────────
  const featheredGradient = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    return g;
  };

  // Erase: remove alpha with a soft destination-out gradient stamp
  const stampErase = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = featheredGradient(ctx, x, y, r);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Restore: paint original pixels back through the same feathered brush mask
  const stampRestore = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, r: number) => {
    const size = Math.ceil(r * 2) + 2;
    const ox = Math.round(x - r - 1);
    const oy = Math.round(y - r - 1);
    const stamp = document.createElement('canvas');
    stamp.width = size;
    stamp.height = size;
    const sCtx = stamp.getContext('2d');
    if (!sCtx) return;
    // Soft mask
    sCtx.fillStyle = featheredGradient(sCtx, r + 1, r + 1, r);
    sCtx.beginPath();
    sCtx.arc(r + 1, r + 1, r, 0, Math.PI * 2);
    sCtx.fill();
    // Mask the original pixels into the stamp
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.drawImage(img, ox, oy);
    ctx.drawImage(stamp, ox, oy);
  };

  const canvasPoint = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const view = viewCanvasRef.current;
    const clientPoint = 'touches' in e ? e.touches[0] : e;
    if (!view || !clientPoint) return null;
    const rect = view.getBoundingClientRect();
    const scaleX = view.width / rect.width;
    const scaleY = view.height / rect.height;
    return {
      x: (clientPoint.clientX - rect.left) * scaleX,
      y: (clientPoint.clientY - rect.top) * scaleY,
    };
  };

  const applyStamp = (x: number, y: number) => {
    const work = workCanvasRef.current;
    const view = viewCanvasRef.current;
    const workCtx = work?.getContext('2d');
    const viewCtx = view?.getContext('2d');
    if (!workCtx || !viewCtx || !work) return;
    if (brushMode === 'erase') {
      stampErase(workCtx, x, y, brushRadius);
      stampErase(viewCtx, x, y, brushRadius);
    } else if (brushMode === 'restore' && originalImgRef.current) {
      stampRestore(workCtx, originalImgRef.current, x, y, brushRadius);
      stampRestore(viewCtx, originalImgRef.current, x, y, brushRadius);
    }
  };

  const handleBrushDown = (e: React.MouseEvent) => {
    if (!brushMode) return;
    e.preventDefault();
    const p = canvasPoint(e);
    if (!p) return;
    isBrushingRef.current = true;
    lastPointRef.current = p;
    applyStamp(p.x, p.y);
  };

  const handleBrushMove = (e: React.MouseEvent) => {
    if (!brushMode) return;
    const view = viewCanvasRef.current;
    if (view) {
      const rect = view.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    if (!isBrushingRef.current) return;
    e.preventDefault();
    const p = canvasPoint(e);
    if (!p) return;
    // Interpolate along the drag path for a continuous stroke
    const last = lastPointRef.current ?? p;
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    const step = Math.max(brushRadius * 0.25, 1);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let i = 1; i <= n; i++) {
      applyStamp(last.x + ((p.x - last.x) * i) / n, last.y + ((p.y - last.y) * i) / n);
    }
    lastPointRef.current = p;
  };

  const handleBrushUp = () => {
    if (!isBrushingRef.current) return;
    isBrushingRef.current = false;
    lastPointRef.current = null;
    // Persist the touched-up state as a data URL for export / preview
    const work = workCanvasRef.current;
    if (work) {
      setWorkingImage(work.toDataURL('image/png'));
      setIsEdited(true);
    }
  };

  const resetTouchUp = useCallback(() => {
    const aiImg = aiResultImgRef.current;
    const work = workCanvasRef.current;
    if (!aiImg || !work) return;
    const ctx = work.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, work.width, work.height);
    ctx.drawImage(aiImg, 0, 0);
    const view = viewCanvasRef.current;
    const viewCtx = view?.getContext('2d');
    if (view && viewCtx) {
      view.width = work.width;
      view.height = work.height;
      viewCtx.clearRect(0, 0, view.width, view.height);
      viewCtx.drawImage(work, 0, 0);
    }
    setWorkingImage(work.toDataURL('image/png'));
    setIsEdited(false);
  }, []);

  // ── Exports ───────────────────────────────────────────────────────────────
  const triggerDownload = (dataUrl: string, name: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = name;
    link.click();
  };

  const baseName = file?.file.name.replace(/\.[^.]+$/, '') || 'image';
  const exportSource = workingImage ?? resultImage;

  const handleDownloadPng = () => {
    if (exportSource) triggerDownload(exportSource, `no-bg-${baseName}.png`);
  };

  const handleDownloadJpg = () => {
    if (!exportSource) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff'; // white background for JPG export
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      triggerDownload(c.toDataURL('image/jpeg', 0.92), `no-bg-${baseName}.jpg`);
    };
    img.src = exportSource;
  };

  if (!file) {
    return (
      <ToolShell
        icon={Eraser}
        title="Smart Background Remover"
        description="Isolate subjects instantly using Gemini Vision AI, then refine with an erase/restore brush."
        features={[
          { icon: Eraser, label: 'Instant Clear', desc: 'Remove bg in seconds' },
          { icon: Brush, label: 'Touch-Up Brush', desc: 'Erase & restore edges' },
          { icon: Layers, label: 'Transparent', desc: 'Perfect edge detection' },
          { icon: Download, label: 'PNG & JPG', desc: 'Transparent or white bg' },
        ]}
        file={file}
        accept="image/*, .heic, .heif, .avif"
        uploadLabel="Add Image"
        uploadDescription="Supports JPG, PNG, WEBP, AVIF, HEIC"
        onFileSelect={handleFileSelect}
        error={error}
        headerExtra={
          <div className="w-full max-w-md mx-auto text-left">
            <ApiKeyInput
              serviceName="Gemini"
              localStorageKey="gemini_api_key"
              onKeyChange={setApiKey}
              description="Required — the AI runs via Gemini (this is the one step that leaves your browser)"
            />
          </div>
        }
      >
        <></>
      </ToolShell>
    );
  }

  return (
    <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'h-full max-w-6xl mx-auto rounded-3xl border border-zinc-800 shadow-2xl'}`}>

      {/* 2. Settings Panel */}
      <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 lg:w-84 border-l'} border-zinc-800 bg-zinc-950 flex flex-col z-20 h-full min-h-0`}>
        <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
          <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
            <Eraser size={20} /> BG Remover
          </h2>
          <button onClick={handleReset} className="text-zinc-600 hover:text-red-400 transition-colors">
            <RefreshCcw size={14} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 custom-scrollbar">
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-4">
              <ApiKeyInput
                serviceName="Gemini"
                localStorageKey="gemini_api_key"
                onKeyChange={setApiKey}
                description="Required for Smart BG removal"
              />

              {!resultImage ? (
                <Button className="w-full h-12 border-none shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all" onClick={handleRemoveBackground} isLoading={isProcessing} disabled={isProcessing || !apiKey} >
                  <Eraser size={18} className="mr-2" />
                  {isProcessing ? 'Removing...' : 'Remove Background'}
                </Button>
              ) : (
                <div className="space-y-3 animate-slide-up">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Touch-Up</span>
                    {isEdited && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                        Edited
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setBrushMode(brushMode === 'erase' ? null : 'erase')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${brushMode === 'erase' ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
                      title="Erase leftover background"
                    >
                      <Eraser size={14} /> Erase
                    </button>
                    <button
                      onClick={() => setBrushMode(brushMode === 'restore' ? null : 'restore')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${brushMode === 'restore' ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
                      title="Restore the original subject"
                    >
                      <Paintbrush size={14} /> Restore
                    </button>
                  </div>

                  {brushMode && (
                    <div className="space-y-1 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-400">Brush Radius</span>
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{brushRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min={5} max={120}
                        value={brushRadius}
                        onChange={(e) => setBrushRadius(parseInt(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full"
                      />
                      <button
                        onClick={resetTouchUp}
                        className="w-full mt-2 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-white hover:border-zinc-700 transition-all"
                      >
                        <RefreshCcw size={12} className="mr-1.5 inline -mt-0.5" /> Reset Touch-Up
                      </button>
                    </div>
                  )}

                  <Button className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-500 border-none shadow-lg" onClick={handleDownloadPng}>
                    <Download size={18} className="mr-2" /> Download PNG
                  </Button>
                  <Button variant="secondary" className="w-full h-12 border-zinc-800" onClick={handleDownloadJpg}>
                    <Download size={16} className="mr-2" /> Download JPG (White BG)
                  </Button>
                  <Button variant="secondary" className="w-full h-12 border-zinc-800 font-bold uppercase text-[10px] tracking-widest" onClick={handleReset}>
                    <RefreshCcw size={16} className="mr-2" /> New Image
                  </Button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500 text-xs shadow-sm">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            {!brushMode && resultImage && (
              <section>
                <SliderControl
                  label="Before / After View"
                  value={sliderPosition}
                  min={0}
                  max={100}
                  onChange={setSliderPosition}
                  unit="%"
                />
              </section>
            )}

            <section className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
              <SectionLabel>Subject Tips</SectionLabel>
              <ul className="text-[10px] text-zinc-500 space-y-2 uppercase font-bold tracking-tight">
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500" /> High contrast edges work best</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500" /> Avoid extremely blurry areas</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500" /> Single subject produces cleaner results</li>
              </ul>
            </section>
          </div>
        </div>
      </aside>

      {/* 3. Preview Area */}
      <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} h-full min-h-0 relative bg-[#09090b] flex items-center justify-center p-4 md:p-6 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className={`relative shadow-2xl transition-all duration-500 ease-out border border-zinc-800/50 bg-black/40 rounded-2xl overflow-hidden ${isMobile ? 'w-full h-full' : 'w-full max-w-2xl aspect-square'}`}>
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] flex items-center justify-center">
            {resultImage && brushMode ? (
              <canvas
                ref={viewCanvasRef}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ cursor: cursorPos ? 'none' : brushMode === 'erase' ? 'crosshair' : 'crosshair' }}
                onMouseDown={handleBrushDown}
                onMouseMove={handleBrushMove}
                onMouseUp={handleBrushUp}
                onMouseLeave={() => { handleBrushUp(); setCursorPos(null); }}
              />
            ) : resultImage ? (
              <div className="relative w-full h-full group">
                <img src={workingImage ?? resultImage} alt="No Background" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                <img
                  src={file.previewUrl}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                />

                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest">Original</div>
                <div className="absolute top-4 right-4 bg-indigo-600/90 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20">Clean</div>

                <div className="absolute inset-y-0" style={{ left: `${sliderPosition}%` }}>
                  <div className="absolute inset-y-0 -left-px w-px bg-white/50"></div>
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center shadow-2xl text-indigo-600 ring-2 ring-black/10">
                    <Sliders size={14} className="rotate-90" />
                  </div>
                </div>

                <input
                  type="range"
                  min="0" max="100" value={sliderPosition}
                  onChange={(e) => setSliderPosition(parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                />
              </div>
            ) : (
              <div className="relative w-full h-full">
                <img src={file.previewUrl} alt="Original" className="w-full h-full object-contain" />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in">
                    <div className="w-12 h-12 relative mb-4">
                      <div className="absolute inset-0 border-2 border-zinc-700/30 rounded-full"></div>
                      <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-white font-bold tracking-[0.2em] uppercase text-[10px]">Analyzing Pixels</p>
                  </div>
                )}
              </div>
            )}

            {/* Brush cursor preview circle */}
            {resultImage && brushMode && cursorPos && (
              <div
                className="absolute rounded-full border pointer-events-none z-30"
                style={{
                  left: cursorPos.x,
                  top: cursorPos.y,
                  width: brushRadius * 2,
                  height: brushRadius * 2,
                  transform: 'translate(-50%, -50%)',
                  borderColor: brushMode === 'erase' ? 'rgba(79,70,229,0.8)' : 'rgba(63,230,159,0.8)',
                  background: brushMode === 'erase' ? 'rgba(79,70,229,0.12)' : 'rgba(63,230,159,0.12)',
                }}
              />
            )}
          </div>
        </div>
        {isMobile && <div className="absolute bottom-2 right-4 text-[10px] text-zinc-700 font-bold tracking-widest uppercase">{brushMode ? 'Touch-Up Stage' : 'Isolation Stage'}</div>}
      </main>
    </div>
  );
};

