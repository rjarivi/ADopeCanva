/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Image as ImageIcon, Film, Download, Trash2, Clock, Settings, RefreshCcw, Play, Loader2, AlertCircle, Maximize, Minimize, MoveHorizontal, ChevronDown, ChevronUp, Layers, Wand2, Share2 } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { SectionLabel, SliderControl } from '../../components/EditorControls';

// Helper function for drawing images (used in both preview and generation)
const drawImageToCanvas = (img: HTMLImageElement, ctx: CanvasRenderingContext2D, tW: number, tH: number, mode: 'fit' | 'zoom' | 'stretch') => {
  ctx.clearRect(0, 0, tW, tH);
  if (mode === 'stretch') {
    ctx.drawImage(img, 0, 0, tW, tH);
  } else {
    const scale = mode === 'fit'
      ? Math.min(tW / img.width, tH / img.height)
      : Math.max(tW / img.width, tH / img.height);
    const x = (tW - img.width * scale) / 2;
    const y = (tH - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  }
};

interface GifMakerProps {
  outputFormat?: 'gif' | 'apng' | 'webp';
}

export const GifMaker: React.FC<GifMakerProps> = ({ outputFormat = 'gif' }) => {
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<FileData[]>([]);
  const [interval, setInterval] = useState(0.5); // Seconds per frame
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(300);
  const [fitMode, setFitMode] = useState<'fit' | 'zoom' | 'stretch'>('fit');
  const [effect, setEffect] = useState<'none' | 'crossfade'>('none');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [frameRange, setFrameRange] = useState<[number, number]>([0, 0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultGif, setResultGif] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'photos' | 'settings' | 'export'>('photos');

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    let ffInstance: FFmpeg | null = null;
    const logCallback = ({ message }: { message: string }) => {
      console.log('[GifMaker]', message);
      setLogs(prev => [...prev.slice(-49), message]);
    };

    getFFmpeg()
      .then(ff => {
        ffInstance = ff;
        ff.on('log', logCallback);
        ffmpegRef.current = ff;
        setEngineStatus('ready');
      })
      .catch(e => {
        console.error("Failed to load FFmpeg", e);
        setErrorMessage(e instanceof Error ? e.message : 'Unknown error occurred');
        setEngineStatus('error');
      });

    return () => {
      if (ffInstance) {
        ffInstance.off('log', logCallback);
      }
    };
  }, []);

  // Preload images for smooth preview
  useEffect(() => {
    files.forEach(f => {
      if (!imageCache.current.has(f.previewUrl)) {
        const img = new Image();
        img.src = f.previewUrl;
        imageCache.current.set(f.previewUrl, img);
      }
    });
  }, [files]);

  // Real-time preview loop
  useEffect(() => {
    if (resultGif || files.length === 0) return;

    let animationFrameId: number;
    let lastFrameTime = 0;
    // Map frame range to slice indices
    const startIdx = Math.max(0, frameRange[0]);
    const endIdx = Math.min(files.length - 1, frameRange[1]);
    let currentIdx = startIdx;

    const render = (time: number) => {
      // Run at standard 60fps check, but only update frame if interval passed
      // If interval is very small (< 0.05), we clamp it to avoid browser freeze, though user slider min is 0.1
      const frameDelayMs = Math.max(50, interval * 1000);

      if (time - lastFrameTime > frameDelayMs) {
        const canvas = previewCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Update canvas size matches settings
            if (canvas.width !== width) canvas.width = width;
            if (canvas.height !== height) canvas.height = height;

            const file = files[currentIdx];
            if (file) {
              const img = imageCache.current.get(file.previewUrl);
              // Draw if loaded, or try to draw immediate if available
              if (img && img.complete && img.naturalWidth > 0) {
                drawImageToCanvas(img, ctx, width, height, fitMode);
              } else {
                // Try direct load (might flicker first time)
                const tempImg = new Image();
                tempImg.src = file.previewUrl;
                tempImg.onload = () => drawImageToCanvas(tempImg, ctx, width, height, fitMode);
              }
            }
          }
        }

        lastFrameTime = time;
        currentIdx++;
        if (currentIdx > endIdx) {
          currentIdx = startIdx;
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [resultGif, files, interval, width, height, fitMode, frameRange]);

  const handleFilesSelect = (newFiles: FileData[]) => {
    setFiles(prev => {
      const updated = [...prev, ...newFiles];
      if (prev.length === 0) {
        setFrameRange([0, updated.length - 1]);
      } else {
        setFrameRange(curr => [curr[0], updated.length - 1]);
      }
      return updated;
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = prev.filter((_, i) => i !== index);
      setFrameRange([0, Math.max(0, updated.length - 1)]);
      return updated;
    });
  };

  const handleHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file: File) => ({
        file,
        type: file.type,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        previewUrl: URL.createObjectURL(file)
      }));
      handleFilesSelect(newFiles);
      // Reset input value so same files can be selected again if needed
      e.target.value = '';
    }
  };

  const handleCreateGif = async () => {
    if (isProcessing || files.length === 0 || !ffmpegRef.current) return;
    setIsProcessing(true);
    setProgress(0);
    setResultGif(null);
    setErrorMessage('');
    setLogs([]);

    const ffmpeg = ffmpegRef.current;
    let frameFiles: string[] = [];

    try {
      const targetW = width;
      const targetH = height;

      const processImage = (file: File, tW: number, tH: number, mode: 'fit' | 'zoom' | 'stretch'): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = tW;
            canvas.height = tH;
            const ctx = canvas.getContext('2d')!;

            drawImageToCanvas(img, ctx, tW, tH, mode);

            canvas.toBlob(blob => {
              URL.revokeObjectURL(objectUrl);
              if (blob) resolve(blob);
              else reject(new Error('Canvas blob conversion failed'));
            }, 'image/png');
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image'));
          };
          img.src = objectUrl;
        });
      };

      const blendImages = (blobA: Blob, blobB: Blob, alpha: number, tW: number, tH: number): Promise<Blob> => {
        return new Promise((resolve) => {
          const imgA = new Image();
          const imgB = new Image();
          const urlA = URL.createObjectURL(blobA);
          const urlB = URL.createObjectURL(blobB);
          let loaded = 0;
          const check = () => {
            if (++loaded === 2) {
              const canvas = document.createElement('canvas');
              canvas.width = tW;
              canvas.height = tH;
              const ctx = canvas.getContext('2d')!;
              ctx.drawImage(imgA, 0, 0);
              ctx.globalAlpha = alpha;
              ctx.drawImage(imgB, 0, 0);
              canvas.toBlob(b => {
                URL.revokeObjectURL(urlA);
                URL.revokeObjectURL(urlB);
                resolve(b!);
              }, 'image/png');
            }
          };
          imgA.onload = check;
          imgB.onload = check;
          imgA.src = urlA;
          imgB.src = urlB;
        });
      };

      const selectedFiles = files.slice(frameRange[0], frameRange[1] + 1);
      const framesData: { name: string, duration: number }[] = [];
      let frameCounter = 0;

      console.log('[GifMaker] Preparing frames with quality Canvas rendering...');

      for (let i = 0; i < selectedFiles.length; i++) {
        const currentBlob = await processImage(selectedFiles[i].file, targetW, targetH, fitMode);
        const currentName = `f_${frameCounter.toString().padStart(4, '0')}.png`;
        await writeFileToFFmpeg(ffmpeg, currentName, currentBlob);

        const mainDuration = effect === 'crossfade' && i < selectedFiles.length - 1 ? interval * 0.7 : interval;
        framesData.push({ name: currentName, duration: mainDuration });
        frameFiles.push(currentName);
        frameCounter++;

        if (effect === 'crossfade' && i < selectedFiles.length - 1) {
          const nextBlob = await processImage(selectedFiles[i + 1].file, targetW, targetH, fitMode);
          const steps = 5;
          const transDuration = (interval * 0.3) / steps;
          for (let s = 1; s <= steps; s++) {
            const alpha = s / (steps + 1);
            const tBlob = await blendImages(currentBlob, nextBlob, alpha, targetW, targetH);
            const tName = `f_${frameCounter.toString().padStart(4, '0')}.png`;
            await writeFileToFFmpeg(ffmpeg, tName, tBlob);
            framesData.push({ name: tName, duration: transDuration });
            frameFiles.push(tName);
            frameCounter++;
          }
        }
        setProgress(Math.round(((i + 1) / selectedFiles.length) * 50));
      }

      const outputFilename = `output.${outputFormat}`;
      let concatContent = "";
      for (const fd of framesData) {
        concatContent += `file '${fd.name}'\nduration ${fd.duration.toFixed(3)}\n`;
      }
      if (framesData.length > 0) {
        concatContent += `file '${framesData[framesData.length - 1].name}'\n`;
      }

      await ffmpeg.writeFile('list.txt', concatContent);

      console.log(`[GifMaker] Stitching ${framesData.length} frames to ${outputFormat.toUpperCase()}...`);

      const args = [
        '-threads', '4',
        '-f', 'concat',
        '-safe', '0',
        '-i', 'list.txt'
      ];

      if (outputFormat === 'gif') {
        args.push('-filter_complex', `[0:v]split[a][b];[a]palettegen[p];[b][p]paletteuse`);
        args.push('-f', 'gif');
      } else if (outputFormat === 'apng') {
        args.push('-f', 'apng');
        args.push('-plays', '0');
      } else if (outputFormat === 'webp') {
        args.push('-c:v', 'libwebp');
        args.push('-lossless', '0');
        args.push('-loop', '0');
        args.push('-preset', 'default');
      }

      args.push('-y', outputFilename);

      await ffmpeg.exec(args);

      setProgress(95);
      const mimeType = outputFormat === 'gif' ? 'image/gif' : (outputFormat === 'apng' ? 'image/apng' : 'image/webp');
      const url = await readFileFromFFmpeg(ffmpeg, outputFilename, mimeType);
      setResultGif(url);
      setProgress(100);

      // Cleanup
      for (const f of frameFiles) {
        try { await ffmpeg.deleteFile(f); } catch (e) { }
      }
      try { await ffmpeg.deleteFile('list.txt'); } catch (e) { }
      try { await ffmpeg.deleteFile(outputFilename); } catch (e) { }

    } catch (e) {
      console.error(e);
      setErrorMessage(`Failed to create ${outputFormat.toUpperCase()}. Resource limits might be exceeded.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ... (Rest of UI is mostly fine, minor updates for loading state)

  if (engineStatus === 'loading') {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-pink-500" /></div>;
  }

  if (engineStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
        <div className="bg-red-500/10 p-4 rounded-full text-red-500">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-white">Engine Failed</h3>
        <p className="text-zinc-400 max-w-md">The GIF engine could not load.</p>
        {errorMessage && (
          <p className="text-red-400 text-sm font-mono bg-black/50 p-2 rounded max-w-lg mx-auto">
            {errorMessage}
          </p>
        )}
        <Button onClick={() => window.location.reload()} variant="secondary">Reload Page</Button>
      </div>
    );
  }

  // Helper render code...
  // (Paste full component with FFmpeg logic)

  if (files.length === 0) {
    // ... (Keep existing empty state but update types/imports)
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-500">
            {outputFormat === 'apng' ? 'APNG Maker' : 'GIF Maker'}
          </h2>
          <p className="text-zinc-400">Create animated {outputFormat.toUpperCase()}s from a series of images.</p>
        </div>
        <div className="p-8 bg-surface rounded-3xl shadow-xl border border-zinc-800/50">
          <FileUploader
            onFilesSelect={handleFilesSelect}
            accept="image/*"
            label="Upload Images"
            description="Select multiple PNG, JPG files"
            multiple={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-pink-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

      {/* 1. Navigation Rail / Bottom Bar */}
      <nav className={`${isMobile ? 'order-3 w-full h-16 border-t flex-row justify-around' : 'order-1 w-16 border-r flex-col py-4'} border-zinc-900 bg-zinc-950 flex items-center shrink-0 z-30`}>
        <button
          onClick={() => setActiveTab('photos')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'photos' ? 'text-pink-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square mb-4'}`}
        >
          <Layers size={isMobile ? 22 : 20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Frames</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'settings' ? 'text-pink-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square mb-4'}`}
        >
          <Settings size={isMobile ? 22 : 20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Config</span>
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'export' ? 'text-pink-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square'}`}
        >
          <Play size={isMobile ? 22 : 20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Render</span>
        </button>
      </nav>

      {/* 2. Settings / Content Panel */}
      <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
        <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
          <h2 className="font-semibold text-sm text-zinc-100 uppercase tracking-widest flex items-center gap-2">
            {activeTab === 'photos' && <><Film size={16} className="text-pink-500" /> Storyboard</>}
            {activeTab === 'settings' && <><Settings size={16} className="text-zinc-400" /> Animation</>}
            {activeTab === 'export' && <><Download size={16} className="text-zinc-400" /> Finalize</>}
          </h2>
          <button onClick={() => { setFiles([]); setResultGif(null); }} className="text-zinc-600 hover:text-red-400 transition-colors">
            <RefreshCcw size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {activeTab === 'photos' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-2">
                {files.map((file, i) => (
                  <div key={i} className="group relative aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
                    <img src={file.previewUrl} className="w-full h-full object-cover" alt={`Frame ${i}`} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => removeFile(i)} className="bg-red-500/80 hover:bg-red-500 p-2 rounded-full text-white transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="absolute top-1 left-1 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-mono border border-white/10 uppercase">
                      #{i + 1}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-800 transition-all group"
                >
                  <PlusIcon className="w-6 h-6 text-zinc-600 group-hover:text-pink-500 mb-1" />
                  <span className="text-[10px] text-zinc-600 font-bold uppercase">Add Frame</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <section>
                <SliderControl
                  label="Frame Delay"
                  value={interval}
                  min={0.1}
                  max={2.0}
                  onChange={setInterval}
                  unit="s"
                />
              </section>

              <section>
                <SectionLabel>Dimensions</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <span className="text-[10px] text-zinc-600 font-bold block mb-1">Width</span>
                    <input type="number" value={width} onChange={(e) => setWidth(parseInt(e.target.value) || 400)} className="bg-transparent text-white font-mono w-full outline-none" />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <span className="text-[10px] text-zinc-600 font-bold block mb-1">Height</span>
                    <input type="number" value={height} onChange={(e) => setHeight(parseInt(e.target.value) || 300)} className="bg-transparent text-white font-mono w-full outline-none" />
                  </div>
                </div>
              </section>

              <section>
                <SectionLabel>Scaling & Transitions</SectionLabel>
                <div className="space-y-2">
                  <div className="flex bg-zinc-900 rounded-xl p-1 gap-1">
                    {(['fit', 'zoom', 'stretch'] as const).map((m) => (
                      <button key={m} onClick={() => setFitMode(m)} className={`flex-1 py-1.5 rounded-lg transition-colors text-[10px] uppercase font-bold text-center ${fitMode === m ? 'bg-zinc-800 text-pink-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className="flex bg-zinc-900 rounded-xl p-1 gap-1">
                    {(['none', 'crossfade'] as const).map((e) => (
                      <button key={e} onClick={() => setEffect(e)} className={`flex-1 py-1.5 rounded-lg transition-colors text-[10px] uppercase font-bold text-center ${effect === e ? 'bg-zinc-800 text-pink-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                        {e === 'none' ? 'Cut' : 'Fade'}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {resultGif ? (
                <div className="space-y-4">
                  <div className="aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center">
                    <img src={resultGif} className="max-w-full max-h-full object-contain" alt="Preview" />
                  </div>
                  <Button
                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 border-none shadow-sm font-bold"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = resultGif!;
                      a.download = `created.${outputFormat}`;
                      a.click();
                    }}
                  >
                    <Download size={18} className="mr-2" /> Download {outputFormat.toUpperCase()}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" className="h-10 border-zinc-800" disabled>
                      <Share2 size={16} className="mr-2" /> Share
                    </Button>
                    <Button variant="secondary" className="h-10 text-red-400 border-zinc-800" onClick={() => setResultGif(null)}>
                      <Undo2 className="mr-2" size={16} /> Edit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Queue Meta</p>
                    <p className="text-xs text-zinc-400">{files.length} frames ready for stitch.</p>
                  </div>

                  <Button
                    className="w-full h-12 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 border-none shadow-lg shadow-pink-900/20 group relative overflow-hidden"
                    onClick={handleCreateGif}
                    disabled={isProcessing}
                  >
                    <div className="relative z-10 flex items-center justify-center font-bold tracking-wide uppercase">
                      {isProcessing ? (
                        <>
                          <Loader2 size={18} className="mr-2 animate-spin" />
                          PROGRESS {progress}%
                        </>
                      ) : (
                        <>
                          <Film size={18} className="mr-2" /> Render Animation
                        </>
                      )}
                    </div>
                    {isProcessing && (
                      <div className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300 backdrop-blur-[2px]" style={{ width: `${progress}%` }} />
                    )}
                  </Button>

                  {errorMessage && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500 text-xs shadow-sm">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <p>{errorMessage}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* 3. Preview Area */}
      <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className={`relative shadow-2xl transition-all duration-500 ease-out border border-zinc-800/50 bg-black/40 rounded-2xl overflow-hidden ${isMobile ? 'w-full h-full' : 'w-full max-w-2xl aspect-square'}`}>
          <div className={`relative w-full h-full rounded-2xl overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] flex items-center justify-center transition-all duration-500 ${files.length === 0 ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
            {files.length > 0 ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <canvas ref={previewCanvasRef} className="max-h-full max-w-full block shadow-2xl" style={{ aspectRatio: `${width}/${height}` }} />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-pink-500/90 text-[10px] text-white px-2 py-1 rounded font-bold uppercase tracking-widest backdrop-blur-md">Live Stream</span>
                  <span className="bg-black/60 text-[10px] text-zinc-300 px-2 py-1 rounded font-bold uppercase tracking-widest backdrop-blur-md border border-white/5">{width}x{height}</span>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 max-w-xs">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800">
                  <ImageIcon size={32} className="text-zinc-700" />
                </div>
                <h3 className="text-lg font-bold text-zinc-600 mb-2">No Content</h3>
                <p className="text-sm text-zinc-700 font-medium">Add some frames to begin your sequence.</p>
              </div>
            )}
          </div>
        </div>
        {isMobile && <div className="absolute bottom-2 right-4 text-[10px] text-zinc-800 font-bold tracking-widest uppercase">Stage View</div>}
      </main>

      <input type="file" ref={fileInputRef} onChange={handleHiddenInputChange} className="hidden" multiple accept="image/*" />
    </div>
  );
};

// Simple Plus Icon if it's missing from imports
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const Undo2 = ({ className, size }: { className?: string; size?: number }) => (
  <svg width={size} height={size} className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);
