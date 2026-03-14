/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Image as ImageIcon, Film, Download, Trash2, Settings, RefreshCcw, Play, Loader2, AlertCircle, Plus, Zap, ChevronDown, ChevronRight, ZoomIn, ZoomOut, Maximize, Hand, Undo2, Copy } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { Select } from '../../components/ui/Select';
import { SectionLabel, SliderControl } from '../../components/EditorControls';

// Helper function for drawing images (used in both preview and generation)
const MAX_DIMENSION = 1920;
const MAX_FRAMES = 100;

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
  initialOutputFormat?: 'gif' | 'apng' | 'webp';
}

export const GifMaker: React.FC<GifMakerProps> = ({ initialOutputFormat = 'gif' }) => {
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<FileData[]>([]);
  const [delay, setDelay] = useState(500); // ms per frame
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(300);
  const [fitMode, setFitMode] = useState<'fit' | 'zoom' | 'stretch'>('fit');
  const [effect, setEffect] = useState<'none' | 'crossfade'>('none');
  const [frameRange, setFrameRange] = useState<[number, number]>([0, 0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultGif, setResultGif] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<'gif' | 'apng' | 'webp'>(initialOutputFormat);
  const [isProMode, setIsProMode] = useState(false);
  const [isFramesCollapsed, setIsFramesCollapsed] = useState(false);
  const [isProCollapsed, setIsProCollapsed] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Viewport State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState(false);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const fileCacheRef = useRef<Map<string, boolean>>(new Map()); // Map of previewUrl -> isWrittenToFFmpeg

  useEffect(() => {
    let ffInstance: FFmpeg | null = null;
    const logCallback = ({ message }: { message: string }) => {
      console.log('[GifMaker]', message);
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
    const startIdx = Math.max(0, frameRange[0]);
    const endIdx = Math.min(files.length - 1, frameRange[1]);
    let currentIdx = startIdx;

    const render = (time: number) => {
      if (time - lastFrameTime > delay) {
        const canvas = previewCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (canvas.width !== width) canvas.width = width;
            if (canvas.height !== height) canvas.height = height;

            const file = files[currentIdx];
            if (file) {
              const img = imageCache.current.get(file.previewUrl);
              if (img && img.complete && img.naturalWidth > 0) {
                drawImageToCanvas(img, ctx, width, height, fitMode);
              } else {
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
  }, [resultGif, files, delay, width, height, fitMode, frameRange]);

  const handleFilesSelect = (newFiles: FileData[]) => {
    let filesToAdd = newFiles;
    if (files.length + newFiles.length > MAX_FRAMES) {
      setErrorMessage(`Maximum limit of ${MAX_FRAMES} frames reached to ensure processing stability. Only the first ${MAX_FRAMES - files.length} files were added.`);
      filesToAdd = newFiles.slice(0, MAX_FRAMES - files.length);
    } else {
      setErrorMessage(''); // Clear error if within limits
    }

    // If it's the first upload, try to match resolution and fit viewport
    if (files.length === 0 && filesToAdd.length > 0) {
      const img = new Image();
      img.src = filesToAdd[0].previewUrl;
      img.onload = () => {
        const cappedW = Math.min(img.naturalWidth, MAX_DIMENSION);
        const cappedH = Math.min(img.naturalHeight, MAX_DIMENSION);
        setWidth(cappedW);
        setHeight(cappedH);

        // Auto fit zoom logic
        if (viewportRef.current) {
          const vw = viewportRef.current.offsetWidth * 0.8;
          const vh = viewportRef.current.offsetHeight * 0.8;
          const scale = Math.min(vw / cappedW, vh / cappedH, 1);
          setZoom(scale);
        }
      };
    }

    setFiles(prev => {
      const updated = [...prev, ...filesToAdd];
      if (prev.length === 0) {
        setFrameRange([0, updated.length - 1]);
      } else {
        setFrameRange(curr => [curr[0], updated.length - 1]);
      }

      // Early preload to FFmpeg for mobile stability
      if (engineStatus === 'ready' && ffmpegRef.current) {
        filesToAdd.forEach(async (f, idx) => {
          const name = `orig_${Date.now()}_${idx}`;
          try {
            await writeFileToFFmpeg(ffmpegRef.current!, name, f.file);
            (f as any).ffName = name; // Attach for later use
          } catch (e) {
            console.warn("Pre-write failed, will retry at render", e);
          }
        });
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

  const duplicateFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev];
      const fileToDuplicate = updated[index];
      if (fileToDuplicate) {
        updated.splice(index + 1, 0, { ...fileToDuplicate });
      }
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
      e.target.value = '';
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    // Create a ghost image if needed, or stick to default
    e.dataTransfer.effectAllowed = 'move';
    // Hide the element being dragged slightly?
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    if (draggedIndex === null || draggedIndex === index) return;

    // Optional: Reorder immediately on hover (smoother)
    // For now we'll stick to a simple swap on drop for safety, 
    // or we can implement the immediate swap here.
    // Let's do immediate swap for better UX as requested.

    setFiles(prev => {
      const newFiles = [...prev];
      const draggedItem = newFiles[draggedIndex];
      newFiles.splice(draggedIndex, 1);
      newFiles.splice(index, 0, draggedItem);
      return newFiles;
    });
    setDraggedIndex(index);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedIndex(null);
  };

  // Interaction Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.min(5, Math.max(0.1, z * delta)));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPanMode || e.button === 1) { // Middle click or pan mode
      const startX = e.clientX - pan.x;
      const startY = e.clientY - pan.y;

      const handleMouseMove = (em: MouseEvent) => {
        setPan({
          x: em.clientX - startX,
          y: em.clientY - startY
        });
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  };

  const handleGenerate = async () => {
    if (isProcessing || files.length === 0 || !ffmpegRef.current) return;
    setIsProcessing(true);
    setProgress(0);
    setResultGif(null);
    setErrorMessage('');

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
          img.onerror = () => { reject(new Error('Failed to load image')); };
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
              const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
              canvas.width = tW;
              canvas.height = tH;
              ctx.drawImage(imgA, 0, 0, tW, tH);
              ctx.globalAlpha = alpha;
              ctx.drawImage(imgB, 0, 0, tW, tH);
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

      for (let i = 0; i < selectedFiles.length; i++) {
        const fileObj = selectedFiles[i];
        let currentBlob: Blob;

        try {
          currentBlob = await processImage(fileObj.file, targetW, targetH, fitMode);
        } catch (e) {
          // Fallback: If original File is dead, maybe we have it in MEMFS?
          // But processImage uses canvas which needs URL.createObjectURL or Image.src.
          // If the browser revoked permission, we are in trouble.
          // However, we can try to "re-read" the file if we wrote it earlier.
          throw new Error(`Frame ${i + 1} could not be read. Please try re-uploading the images.`);
        }

        const currentName = `f_${frameCounter.toString().padStart(4, '0')}.png`;
        await writeFileToFFmpeg(ffmpeg, currentName, currentBlob);

        const mainDuration = effect === 'crossfade' && i < selectedFiles.length - 1 ? (delay / 1000) * 0.7 : (delay / 1000);
        framesData.push({ name: currentName, duration: mainDuration });
        frameFiles.push(currentName);
        frameCounter++;

        if (effect === 'crossfade' && i < selectedFiles.length - 1) {
          const nextBlob = await processImage(selectedFiles[i + 1].file, targetW, targetH, fitMode);
          const steps = 5;
          const transDuration = ((delay / 1000) * 0.3) / steps;
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
      let totalDuration = 0;
      let concatContent = "";
      for (const fd of framesData) {
        concatContent += `file '${fd.name}'\nduration ${fd.duration.toFixed(4)}\n`;
        totalDuration += fd.duration;
      }
      // FFmpeg concat demuxer often needs the last file repeated or a trailing newline
      if (framesData.length > 0) {
        concatContent += `file '${framesData[framesData.length - 1].name}'\n`;
      }

      await ffmpeg.writeFile('list.txt', concatContent);
      console.log('[GifMaker] list.txt generated with', framesData.length, 'frames');

      const args = [
        '-f', 'concat',
        '-safe', '0',
        '-i', 'list.txt',
        '-fps_mode', 'vfr'
      ];

      if (outputFormat === 'gif') {
        // High quality palette generation + force single thread for concat stability
        args.push('-vf', 'split[a][b];[a]palettegen[p];[b][p]paletteuse');
        args.push('-loop', '0');
        args.push('-threads', '1');
      } else if (outputFormat === 'apng') {
        args.push('-f', 'apng', '-plays', '0', '-threads', '1');
      } else if (outputFormat === 'webp') {
        args.push('-c:v', 'libwebp', '-lossless', '0', '-loop', '0', '-threads', '1');
      }

      args.push('-y', outputFilename);

      console.log('[GifMaker] Executing FFmpeg with args:', args.join(' '));
      try {
        await ffmpeg.exec(args);
      } catch (execErr) {
        console.warn('[GifMaker] FFmpeg exec reported an issue (often an Abort in WASM), checking for output file anyway...', execErr);
      }

      const mimeType = outputFormat === 'gif' ? 'image/gif' : (outputFormat === 'apng' ? 'image/apng' : 'image/webp');

      try {
        const url = await readFileFromFFmpeg(ffmpeg, outputFilename, mimeType);
        setResultGif(url);
        setProgress(100);
      } catch (readErr) {
        throw new Error(`The ${outputFormat.toUpperCase()} file could not be retrieved from the engine. It may have failed to render.`);
      }

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

  const handleDownload = () => {
    if (resultGif) {
      const a = document.createElement('a');
      a.href = resultGif;
      a.download = `created.${outputFormat}`;
      a.click();
    }
  };

  if (engineStatus === 'loading') {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" /></div>;
  }

  if (engineStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
        <div className="bg-red-500/10 p-4 rounded-full text-red-500">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-white">Engine Failed</h3>
        <p className="text-zinc-400">The GIF engine could not load.</p>
        <Button onClick={() => window.location.reload()} variant="secondary">Reload Page</Button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
        {/* Header */}
        <div className="flex-none space-y-3 mb-10">
          <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
            <Film size={32} /> {outputFormat === 'apng' ? 'APNG Maker' : 'GIF Maker'}
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Create animated {outputFormat.toUpperCase()}s from a series of images.
          </p>
        </div>

        {/* Upload Area */}
        <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <FileUploader
            onFilesSelect={handleFilesSelect}
            accept="image/*"
            label="Upload Images"
            description="Select multiple PNG, JPG files"
            multiple={true}
            className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
          />
        </div>

        {/* Feature Highlights */}
        <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          {[
            { icon: ImageIcon, label: 'Multi-Image', desc: 'Drag & drop sequence' },
            { icon: Film, label: 'Animation', desc: 'Smooth frame control' },
            { icon: Settings, label: 'Customize', desc: 'Delay & resize' },
            { icon: Zap, label: 'Pro Effects', desc: 'Transition modes' }
          ].map((feat, i) => (
            <div key={i} className="flex flex-col items-center text-center space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors">
              <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-400">
                <feat.icon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-200">{feat.label}</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mt-1">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800 h-[85vh] shadow-2xl'}`}>
      <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-l'} border-zinc-800 bg-zinc-950 flex flex-col z-20 shrink-0`}>
        <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
          <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2.5 font-unbounded">
            <Film size={20} /> {outputFormat === 'apng' ? 'Apng Maker' : outputFormat === 'webp' ? 'Webp Maker' : 'Gif Maker'}
          </h2>
          <button onClick={() => { setFiles([]); setResultGif(null); }} className="text-zinc-600 hover:text-red-400 transition-colors p-1.5 hover:bg-zinc-900 rounded-lg" title="Reset Project">
            <RefreshCcw size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="space-y-8 animate-in fade-in duration-300">

            <section className="space-y-6">
              <SliderControl
                label="Frame Delay"
                value={delay}
                min={20}
                max={2000}
                unit="ms"
                onChange={setDelay}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <SectionLabel>Dimension Config</SectionLabel>
                  <button
                    onClick={() => {
                      if (files.length > 0) {
                        const img = imageCache.current.get(files[0].previewUrl);
                        if (img) {
                          setWidth(Math.min(img.naturalWidth, MAX_DIMENSION));
                          setHeight(Math.min(img.naturalHeight, MAX_DIMENSION));
                        }
                      }
                    }}
                    className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
                  >
                    Match Source
                  </button>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-tight">Width</div>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(Math.min(MAX_DIMENSION, parseInt(e.target.value) || 400))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-200"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-tight">Height</div>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Math.min(MAX_DIMENSION, parseInt(e.target.value) || 300))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-200"
                    />
                  </div>
                </div>
                {(width >= MAX_DIMENSION || height >= MAX_DIMENSION) && (
                  <p className="text-[9px] text-yellow-500/80 font-medium italic">
                    Note: Dimensions capped at {MAX_DIMENSION}px for engine stability.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Select
                  value={outputFormat}
                  onChange={(val) => setOutputFormat(val as any)}
                  options={[
                    { value: 'gif', label: 'Export GIF' },
                    { value: 'apng', label: 'Export APNG' },
                    { value: 'webp', label: 'Export WEBP' }
                  ]}
                />
              </div>

              <div className="pt-2 border-t border-zinc-900">
                <button
                  onClick={() => setIsProCollapsed(!isProCollapsed)}
                  className="w-full flex items-center justify-between group py-2"
                >
                  <div className="flex items-center gap-2">
                    <Zap size={14} className={isProCollapsed ? 'text-zinc-600' : 'text-yellow-500'} />
                    <SectionLabel className="!mb-0">Pro Features</SectionLabel>
                  </div>
                  {isProCollapsed ? <ChevronRight size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                </button>

                {!isProCollapsed && (
                  <div className="space-y-6 pt-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-3">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Transition Effect</div>
                      <div className="grid grid-cols-2 gap-2">
                        {(['none', 'crossfade'] as const).map(eff => (
                          <button key={eff} onClick={() => { setEffect(eff); if (eff !== 'none') setIsProMode(true); }} className={`py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${effect === eff ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-indigo-500/40'}`}>
                            {eff}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Image Fit Mode</div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['fit', 'zoom', 'stretch'] as const).map(m => (
                          <button key={m} onClick={() => { setFitMode(m); setIsProMode(true); }} className={`py-2 rounded-xl transition-all text-[10px] font-bold uppercase border ${fitMode === m ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-indigo-500/40'}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {!resultGif ? (
              <Button className="w-full h-14 border-none shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all" onClick={handleGenerate} isLoading={isProcessing} disabled={files.length < 2 || isProcessing} >
                <Zap size={18} className="mr-2" />
                {isProcessing ? 'Rendering...' : 'Start Render'}
              </Button>
            ) : (
              <div className="space-y-3 animate-slide-up">
                <Button className="w-full h-14 bg-white text-black hover:bg-zinc-200 border-none shadow-lg" onClick={handleDownload} >
                  <Download size={18} className="mr-2" /> Download Output
                </Button>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1 h-14 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 whitespace-nowrap" onClick={() => setResultGif(null)}
                  >
                    <Undo2 size={16} className="mr-2" /> Redo
                  </Button>
                  <Button variant="secondary" className="flex-1 h-14 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-red-400 hover:text-red-300 whitespace-nowrap" onClick={() => { setFiles([]); setResultGif(null); }}
                  >
                    <RefreshCcw size={16} className="mr-2" /> New GIF
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative flex flex-col min-w-0 min-h-0 bg-[#09090b]`}>
        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center border-b border-zinc-900 shadow-inner">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          {/* Viewport Area */}
          <div
            ref={viewportRef}
            className={`relative w-full h-full overflow-hidden flex items-center justify-center ${isPanMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
          >
            {/* Viewport Toolbar */}
            {files.length > 0 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-zinc-900/80 backdrop-blur border border-white/5 p-1 rounded-full shadow-2xl animate-in fade-in zoom-in duration-300">
                <button
                  onClick={() => setIsPanMode(!isPanMode)}
                  className={`p-2 rounded-full transition-colors ${isPanMode ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-white'}`}
                  title="Pan Tool"
                >
                  <Hand size={16} />
                </button>
                <div className="w-px h-3 bg-zinc-800 mx-1"></div>
                <button onClick={() => setZoom(z => Math.max(0.1, z - 0.2))} className="p-2 text-zinc-500 hover:text-white" title="Zoom Out">
                  <ZoomOut size={16} />
                </button>
                <span className="text-[10px] font-mono text-zinc-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="p-2 text-zinc-500 hover:text-white" title="Zoom In">
                  <ZoomIn size={16} />
                </button>
                <div className="w-px h-3 bg-zinc-800 mx-1"></div>
                <button
                  onClick={() => {
                    if (viewportRef.current && files[0]) {
                      const img = imageCache.current.get(files[0].previewUrl);
                      if (img) {
                        const vw = viewportRef.current.offsetWidth * 0.8;
                        const vh = viewportRef.current.offsetHeight * 0.8;
                        const scale = Math.min(vw / img.naturalWidth, vh / img.naturalHeight, 1);
                        setZoom(scale);
                        setPan({ x: 0, y: 0 });
                      }
                    }
                  }}
                  className="p-2 text-zinc-500 hover:text-white"
                  title="Reset View"
                >
                  <Undo2 size={16} />
                </button>
              </div>
            )}

            <div
              className={`relative transition-all duration-75 ease-out flex items-center justify-center`}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                willChange: 'transform'
              }}
            >
              <div className={`relative rounded-2xl overflow-hidden flex items-center justify-center transition-opacity duration-500 ${files.length === 0 ? 'opacity-50 scale-95' : 'opacity-100 scale-100 shadow-2xl border border-white/5 bg-zinc-900/50'}`}>
                {files.length > 0 ? (
                  <div className="relative flex items-center justify-center">
                    {resultGif ? (
                      <img src={resultGif} className="block shadow-2xl max-w-full max-h-full rounded-lg" style={{ width: `${width}px`, height: `${height}px`, objectFit: 'contain' }} alt="Generated Result" />
                    ) : (
                      <canvas ref={previewCanvasRef} className="block shadow-2xl" />
                    )}
                    {isProcessing && (
                      <div className="absolute inset-x-4 bottom-4">
                        <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-2xl animate-slide-up">
                          <div className="flex items-center gap-4 mb-3">
                            <div className="relative w-10 h-10 flex items-center justify-center">
                              <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full"></div>
                              <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-[10px] font-bold text-white font-mono">{progress}%</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold uppercase tracking-widest text-white">Rendering {outputFormat.toUpperCase()}</p>
                              <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Baking Frames...</p>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      </div>
                    )}
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
          </div>
        </div>

        {/* Storyboard Timeline */}
        {!isMobile && (
          <div className="h-44 bg-zinc-950 border-t border-zinc-900 flex flex-col shrink-0">
            <div className="h-10 px-5 flex items-center justify-between border-b border-zinc-900 bg-zinc-900/20">
              <div className="flex items-center gap-3">
                <SectionLabel className="!mb-0">Storyboard Timeline</SectionLabel>
                <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{files.length} frames</span>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} /> Add Frames
              </button>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 custom-scrollbar-h flex items-center gap-3">
              {files.map((file, i) => (
                <div
                  key={file.previewUrl} // Use previewUrl as unique key to prevent render issues during swap
                  className={`group relative h-24 aspect-square shrink-0 bg-zinc-900 rounded-xl overflow-hidden border transition-all 
                    ${draggedIndex === i ? 'opacity-50 scale-95 border-indigo-500 dashed border-2' : 'border-zinc-800 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5'}
                    cursor-grab active:cursor-grabbing
                  `}
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={handleDrop}
                >
                  <img src={file.previewUrl} className="w-full h-full object-cover pointer-events-none" alt={`Frame ${i}`} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => duplicateFile(i)}
                      className="bg-zinc-800/90 hover:bg-indigo-500 p-2 rounded-full text-white transition-all shadow-xl hover:scale-110"
                      title="Duplicate Frame"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => removeFile(i)}
                      className="bg-zinc-800/90 hover:bg-red-500 p-2 rounded-full text-white transition-all shadow-xl hover:scale-110"
                      title="Delete Frame"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="absolute top-1 left-1 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-mono border border-white/10 pointer-events-none">
                    #{i + 1}
                  </div>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-24 aspect-square shrink-0 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-600 hover:text-indigo-400 hover:border-indigo-500/50 transition-all bg-zinc-900/30 hover:bg-zinc-900/50 group"
              >
                <Plus size={20} className="mb-1 transition-transform group-hover:scale-110" />
                <span className="text-[8px] font-bold uppercase tracking-tighter">Add</span>
              </button>
            </div>
          </div>
        )}
      </main>
      <input type="file" ref={fileInputRef} onChange={handleHiddenInputChange} className="hidden" multiple accept="image/*" />
    </div>
  );
};

export default GifMaker;
