/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Image as ImageIcon, Film, Download, Trash2, Clock, Settings, RefreshCcw, Play, Loader2, AlertCircle, Maximize, Minimize, MoveHorizontal, ChevronDown, ChevronUp, Layers, Wand2 } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';

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
    <div className="w-[98%] max-w-[1800px] mx-auto p-4 lg:p-6 space-y-6 animate-slide-up pb-24">
      {/* Main Workspace: Settings & Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[50vh]">

        {/* Left Sidebar: Controls */}
        <div className="lg:col-span-3 flex flex-col h-full bg-surface rounded-3xl border border-zinc-800 p-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings size={18} className="text-pink-500" /> Settings
            </h3>
            <Button variant="ghost" size="sm" onClick={() => { setFiles([]); setResultGif(null); }}>
              <RefreshCcw size={16} className="mr-2" /> Reset
            </Button>
          </div>

          <div className="space-y-6 flex-1">
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-2"><Clock size={14} /> Frame Delay</span>
                <span className="text-white font-mono text-xs bg-zinc-800 px-2 py-1 rounded">{interval}s</span>
              </label>
              <input
                type="range" min="0.1" max="2.0" step="0.1"
                value={interval}
                onChange={(e) => setInterval(parseFloat((e.target as HTMLInputElement).value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase">Width</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value) || 400)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-pink-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase">Height</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 300)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-pink-500 outline-none"
                />
              </div>
            </div>

            <div className="bg-zinc-900/30 rounded-xl p-1">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full p-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Wand2 size={14} className="text-pink-500" />
                  Advanced Properties
                </div>
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showAdvanced && (
                <div className="p-3 space-y-4 animate-fade-in border-t border-zinc-800/50 mt-1">
                  {/* Fit Mode */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Image Fit</label>
                    <div className="flex bg-zinc-950 rounded-lg p-1 gap-1">
                      {(['fit', 'zoom', 'stretch'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setFitMode(m)}
                          className={`flex-1 py-1.5 rounded-md transition-colors text-[10px] uppercase font-bold text-center ${fitMode === m ? 'bg-zinc-800 text-pink-400 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transition */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Transition</label>
                    <div className="flex bg-zinc-950 rounded-lg p-1 gap-1">
                      {(['none', 'crossfade'] as const).map((e) => (
                        <button
                          key={e}
                          onClick={() => setEffect(e)}
                          className={`flex-1 py-1.5 rounded-md transition-colors text-[10px] uppercase font-bold text-center ${effect === e ? 'bg-zinc-800 text-pink-400 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                          {e === 'none' ? 'Cut' : 'Fade'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Range */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 uppercase flex justify-between">
                      Range <span className="text-pink-500/50 text-[10px]">PRO</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number" min="1" max={files.length}
                        value={frameRange[0] + 1}
                        placeholder="Start"
                        onChange={(e) => setFrameRange([Math.max(0, parseInt(e.target.value) - 1), frameRange[1]])}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 outline-none focus:border-pink-500"
                      />
                      <span className="text-zinc-600">-</span>
                      <input
                        type="number" min="1" max={files.length}
                        value={frameRange[1] + 1}
                        placeholder="End"
                        onChange={(e) => setFrameRange([frameRange[0], Math.min(files.length - 1, parseInt(e.target.value) - 1)])}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center space-y-1">
                <p className="text-red-400 text-sm font-medium">{errorMessage}</p>
              </div>
            )}
          </div>

          <div className="pt-4 mt-auto">
            <Button
              className="w-full h-12 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 border-none shadow-lg shadow-pink-900/20 group relative overflow-hidden"
              onClick={handleCreateGif}
              disabled={isProcessing}
            >
              <div className="relative z-10 flex items-center justify-center font-bold tracking-wide">
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    RENDERING {progress}%
                  </>
                ) : (
                  <>
                    <Film size={18} className="mr-2 group-hover:scale-110 transition-transform" /> GENERATE {outputFormat.toUpperCase()}
                  </>
                )}
              </div>
              {isProcessing && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300 backdrop-blur-[2px]"
                  style={{ width: `${progress}%` }}
                />
              )}
            </Button>
          </div>
        </div>

        {/* Center: Stage / Preview */}
        <div className="lg:col-span-9 bg-black/40 rounded-3xl border border-zinc-800 backdrop-blur-sm flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] opacity-10 pointer-events-none"></div>

          {/* Top bar controls overlay */}
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full border border-white/10">
              {width} x {height} px
            </div>
            <div className="bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full border border-white/10">
              {interval}s / frame
            </div>
          </div>

          <div className="relative z-10 p-8 max-w-full max-h-full flex items-center justify-center">
            {resultGif ? (
              <div className="text-center space-y-6 animate-fade-in">
                <div className="bg-zinc-800/50 p-1 rounded-xl shadow-2xl inline-block border border-white/10">
                  <img src={resultGif} alt={`Generated ${outputFormat.toUpperCase()}`} className="max-h-[40vh] max-w-full rounded-lg shadow-black/50 shadow-lg" />
                </div>
                <div>
                  <Button onClick={() => {
                    const a = document.createElement('a');
                    a.href = resultGif!;
                    a.download = `created.${outputFormat}`;
                    a.click();
                  }} className="bg-white text-black hover:bg-zinc-200 border-none font-bold">
                    <Download size={18} className="mr-2" /> Download Result
                  </Button>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="text-center">
                <div className="w-20 h-20 border-4 border-zinc-800 border-t-pink-500 rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className="text-xl font-bold text-white mb-2">Creating Animation</h3>
                <p className="text-zinc-400">Stitching {files.length} frames together...</p>
              </div>
            ) : (
              <div className={`relative w-full h-full flex items-center justify-center transition-all duration-500 ${files.length === 0 ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                {files.length > 0 ? (
                  <div className="relative shadow-2xl shadow-black/50 rounded-lg overflow-hidden ring-1 ring-white/10 bg-black">
                    <canvas
                      ref={previewCanvasRef}
                      className="max-h-[40vh] max-w-full block" // block removes weird bottom space
                      style={{ aspectRatio: `${width}/${height}` }}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-pink-500/80 text-white text-[10px] font-bold uppercase rounded tracking-wider backdrop-blur-md">
                      Live Preview
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700/50">
                      <ImageIcon size={40} className="text-zinc-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-700">No Image Selected</h3>
                    <p className="text-zinc-600 max-w-xs mx-auto">Upload images to start creating your GIF animation sequence.</p>
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="mt-4 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500">
                      Select Images
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div >

      {/* Bottom Timeline */}
      {
        files.length > 0 && (
          <div className="bg-surface rounded-2xl border border-zinc-800 p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3 px-2">
              <h4 className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                <Film size={14} /> Timeline ({files.length} Frames)
              </h4>
              <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} className="text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 h-8 text-xs">
                + Add Frames
              </Button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
              {files.map((file, i) => (
                <div key={i} className="group relative min-w-[100px] h-[100px] bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0 snap-center hover:border-zinc-600 transition-colors">
                  <img src={file.previewUrl} alt={`Frame ${i}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => removeFile(i)} className="bg-red-500/80 hover:bg-red-500 p-1.5 rounded-full text-white transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-mono border border-white/10">
                    #{i + 1}
                  </div>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="min-w-[100px] h-[100px] bg-zinc-900/50 rounded-lg border border-zinc-800 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-800 hover:border-zinc-600 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center mb-1 group-hover:bg-zinc-700">
                  <span className="text-xl text-zinc-500 group-hover:text-white pb-1">+</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium">Add Frame</span>
              </button>
            </div>
          </div>
        )
      }

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleHiddenInputChange}
        className="hidden"
        multiple
        accept="image/*"
      />
    </div >
  );
};
