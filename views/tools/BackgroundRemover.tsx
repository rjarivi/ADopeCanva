import React, { useState, useRef } from 'react';
import { pipeline, env } from '@huggingface/transformers';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { ToolShell } from '../../components/ToolShell';
import { useToolFile } from '../../hooks/useToolFile';
import { Eraser, Download, RefreshCcw, Sliders, AlertCircle, Layers, Sparkles, Cpu, ShieldCheck, Check, Zap } from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { preprocessImageFileData } from '../../utils/imagePreprocess';
import { useIsMobile } from '../../hooks/useIsMobile';

// Optimize browser environments: allow local cached models via browser Cache API
env.allowLocalModels = false;

export interface BackgroundModel {
  id: string;
  name: string;
  tag: string;
  size: string;
  modelId: string;
  description: string;
  recommendedFor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: React.ElementType;
}

export const BG_MODELS: BackgroundModel[] = [
  {
    id: 'birefnet-bg0',
    name: 'BiRefNet (BG0 Engine)',
    tag: 'Ultra-HD Matting',
    size: '~94 MB',
    modelId: 'studioludens/birefnet-lite-512',
    description: 'Bilateral Reference Network (exact engine powering bg0.dev). 100% open-source (Apache-2.0). Optimized for browser memory with WebGPU/WASM precision.',
    recommendedFor: 'Complex edges, transparency, products, studio photos',
    badgeBg: 'bg-violet-500/10',
    badgeText: 'text-violet-400',
    badgeBorder: 'border-violet-500/30',
    icon: Sparkles
  },
  {
    id: 'modnet-fast',
    name: 'MODNet (Fast)',
    tag: 'Portraits & Hair',
    size: '~25 MB',
    modelId: 'Xenova/modnet',
    description: 'Lightweight on-device matting network (Apache-2.0). Instant initial load with minimal RAM usage, specially trained for people, portraits, and headshots.',
    recommendedFor: 'Portraits, selfies, low-memory devices',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-400',
    badgeBorder: 'border-indigo-500/30',
    icon: Zap
  }
];

export const BackgroundRemover: React.FC = () => {
  const isMobile = useIsMobile();
  const { file, select, clear } = useToolFile();
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelStatus, setModelStatus] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('birefnet-bg0');
  const [processedModelId, setProcessedModelId] = useState<string | null>(null);

  // Cached transformer pipelines by model ID
  const pipelinesRef = useRef<Record<string, any>>({});

  const activeModel = BG_MODELS.find(m => m.id === selectedModelId) || BG_MODELS[0];

  const handleFileSelect = async (selectedFile: FileData | FileData[]) => {
    const first = Array.isArray(selectedFile) ? selectedFile[0] : selectedFile;
    if (!first) return;
    setIsProcessing(true);
    const processed = await preprocessImageFileData(first);
    select(processed);
    setIsProcessing(false);
  };

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);

  const handleReset = () => {
    if (resultImage && resultImage.startsWith('blob:')) {
      URL.revokeObjectURL(resultImage);
    }
    clear();
    setResultImage(null);
    setError(null);
    setIsProcessing(false);
    setModelStatus(null);
    setModelProgress(null);
    setProcessedModelId(null);
  };

  const handleRemoveBackground = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setModelStatus(`Initializing ${activeModel.name}...`);
    setModelProgress(null);

    try {
      if (!pipelinesRef.current[activeModel.id]) {
        const progressCb = (p: any) => {
          if (p.status === 'progress' && typeof p.progress === 'number') {
            setModelStatus(`Downloading ${activeModel.name}: ${Math.round(p.progress)}%`);
            setModelProgress(Math.round(p.progress));
          } else if (p.status === 'done') {
            setModelStatus('Model ready. Running neural matting...');
            setModelProgress(null);
          } else if (p.status === 'initiate') {
            setModelStatus(`Loading: ${p.file || 'model components'}...`);
          }
        };

        // Determine pipeline loading configuration
        // BiRefNet uses fp16 (model_fp16.onnx ~94MB) or fp32 (model.onnx ~183MB), never quantized
        let pipeInstance: any;
        const tasks: Array<'background-removal' | 'image-segmentation'> = ['background-removal', 'image-segmentation'];
        const dtypes: any[] = activeModel.id === 'birefnet-bg0' ? ['fp16', 'fp32'] : [undefined];

        let loadSuccess = false;
        let lastLoadError: any = null;

        for (const task of tasks) {
          if (loadSuccess) break;
          for (const dtype of dtypes) {
            try {
              const opts: any = { progress_callback: progressCb };
              if (dtype) opts.dtype = dtype;
              pipeInstance = await pipeline(task as any, activeModel.modelId, opts);
              loadSuccess = true;
              break;
            } catch (err: any) {
              lastLoadError = err;
              console.warn(`Failed loading ${task} with dtype ${dtype}:`, err?.message || err);
            }
          }
        }

        if (!loadSuccess || !pipeInstance) {
          throw lastLoadError || new Error(`Failed to load ${activeModel.name}.`);
        }

        pipelinesRef.current[activeModel.id] = pipeInstance;
      }

      setModelStatus(`Segmenting with ${activeModel.name}...`);
      const segmenter = pipelinesRef.current[activeModel.id];

      const imageUrl = file.previewUrl || URL.createObjectURL(file.file);
      const output = await segmenter(imageUrl);

      const rawImage = Array.isArray(output) ? output[0] : output;

      let blob: Blob;

      // Handle rawImage with mask property (image-segmentation output)
      if (rawImage?.mask) {
        // Load original image to preserve full native resolution
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = imageUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        // Draw full-resolution original image
        ctx.drawImage(img, 0, 0);

        // Composite the mask using destination-in
        ctx.globalCompositeOperation = 'destination-in';
        const maskCanvas = rawImage.mask.toCanvas ? rawImage.mask.toCanvas() : rawImage.mask;
        ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);

        blob = await new Promise<Blob>((res, rej) => {
          canvas.toBlob((b: Blob | null) => b ? res(b) : rej(new Error('Canvas export failed')), 'image/png');
        });
      } else if (typeof rawImage.toBlob === 'function') {
        blob = await rawImage.toBlob();
      } else {
        const canvas = rawImage.toCanvas ? rawImage.toCanvas() : rawImage;
        blob = await new Promise<Blob>((res, rej) => {
          canvas.toBlob((b: Blob | null) => b ? res(b) : rej(new Error('Canvas export failed')), 'image/png');
        });
      }

      const cleanUrl = URL.createObjectURL(blob);
      if (resultImage && resultImage.startsWith('blob:')) {
        URL.revokeObjectURL(resultImage);
      }
      setResultImage(cleanUrl);
      setProcessedModelId(activeModel.id);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || `An error occurred while processing with ${activeModel.name}.`);
    } finally {
      setIsProcessing(false);
      setModelStatus(null);
      setModelProgress(null);
    }
  };

  if (!file) {
    return (
      <ToolShell
        icon={Eraser}
        title="Smart Background Remover"
        description="Isolate subjects with 100% private, on-device AI. Choose between BiRefNet (bg0 engine) or MODNet — both 100% open-source with full commercial rights."
        features={[
          { icon: ShieldCheck, label: '100% Private', desc: 'No Server Uploads' },
          { icon: Cpu, label: 'Multi-Model', desc: 'BiRefNet & MODNet' },
          { icon: Sparkles, label: 'BG0 Powered', desc: 'Neural WebAssembly' },
          { icon: Download, label: 'Full 4K Export', desc: 'Lossless Transparent PNG' },
        ]}
        file={file}
        accept="image/*, .heic, .heif, .avif"
        uploadLabel="Upload Image"
        uploadDescription="Supports JPG, PNG, WEBP, AVIF, HEIC — processed locally in browser"
        onFileSelect={handleFileSelect}
        error={error}
        headerExtra={
          <div className="text-left">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Cpu size={14} className="text-indigo-400" /> Choose Neural Matting Model
            </span>
            <span className="text-[11px] text-zinc-500 font-medium">100% Apache-2.0 • On-Device WebAssembly</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BG_MODELS.map((model) => {
              const isSelected = selectedModelId === model.id;
              const ModelIcon = model.icon;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setSelectedModelId(model.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-500/50 bg-zinc-900 shadow-lg'
                      : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
                  }`}
                  style={isSelected ? { boxShadow: '0 8px 32px rgba(79,70,229,0.15)', background: 'rgba(79,70,229,0.08)' } : undefined}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${model.badgeBg} ${model.badgeText}`}>
                        <ModelIcon size={16} />
                      </div>
                      <span className="text-xs font-bold text-white tracking-tight">{model.name}</span>
                    </div>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mb-2.5">
                    {model.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-zinc-800/60">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${model.badgeBg} ${model.badgeText} border ${model.badgeBorder}`}>
                      {model.tag}
                    </span>
                    <span className="text-zinc-500 font-mono font-medium">{model.size}</span>
                  </div>
                </button>
              );
            })}
          </div>
          </div>
        }
      >
        <></>
      </ToolShell>
    );
  }

  return (
    <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

      {/* Settings Panel */}
      <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-84 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
        <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
          <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
            <Eraser size={18} /> BG Remover
          </h2>
          <button onClick={handleReset} title="Reset image" className="text-zinc-500 hover:text-red-400 transition-colors">
            <RefreshCcw size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Model Selector in Sidebar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionLabel>AI Model</SectionLabel>
                <span className="text-[10px] text-zinc-500 font-mono">{activeModel.size}</span>
              </div>
              <div className="space-y-2">
                {BG_MODELS.map((model) => {
                  const isSelected = selectedModelId === model.id;
                  const isProcessed = processedModelId === model.id && resultImage;
                  const ModelIcon = model.icon;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setSelectedModelId(model.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'border-indigo-500/50 bg-zinc-900 text-white shadow-sm'
                          : 'border-zinc-800/80 bg-zinc-900/30 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                      style={isSelected ? { background: 'rgba(79,70,229,0.12)' } : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${model.badgeBg} ${model.badgeText}`}>
                          <ModelIcon size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate text-zinc-200 flex items-center gap-1.5">
                            <span>{model.name}</span>
                            {isProcessed && <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-normal">Active</span>}
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate">{model.recommendedFor}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 pt-1">
              {!resultImage || processedModelId !== selectedModelId ? (
                <Button
                  className="w-full h-12 border-none shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all"
                  onClick={handleRemoveBackground}
                  isLoading={isProcessing}
                  disabled={isProcessing}
                >
                  <Eraser size={18} className="mr-2" />
                  {isProcessing
                    ? (modelStatus || 'Processing...')
                    : resultImage
                      ? `Re-run with ${activeModel.name}`
                      : `Remove BG (${activeModel.name.split(' ')[0]})`}
                </Button>
              ) : (
                <div className="space-y-3 animate-slide-up">
                  <Button
                    className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-500 border-none shadow-lg"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = resultImage;
                      link.download = `no-bg-${file.file.name.replace(/\.[^/.]+$/, '')}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <Download size={18} className="mr-2" /> Download Full HD PNG
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full h-11 border-zinc-800 font-bold uppercase text-[10px] tracking-widest hover:border-zinc-700"
                    onClick={handleReset}
                  >
                    <RefreshCcw size={15} className="mr-2" /> New Image
                  </Button>
                </div>
              )}

              {modelStatus && isProcessing && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-indigo-400 font-medium">
                    <span>{modelStatus}</span>
                    {modelProgress !== null && <span>{modelProgress}%</span>}
                  </div>
                  {modelProgress !== null && (
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${modelProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2 text-red-400 text-xs shadow-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{error}</p>
                  </div>
                  {selectedModelId !== 'modnet-fast' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModelId('modnet-fast');
                        setError(null);
                      }}
                      className="text-[11px] text-indigo-400 underline hover:text-indigo-300 block font-medium"
                    >
                      → Switch to lightweight MODNet (25 MB)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Slider View Control */}
            {resultImage && (
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

            {/* Subject Tips */}
            <section className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
              <SectionLabel>Privacy & Commercial Rights</SectionLabel>
              <ul className="text-[10px] text-zinc-500 space-y-2 uppercase font-bold tracking-tight">
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500" /> 100% Client-Side WebAssembly</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500" /> 100% Apache-2.0 Open Source</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500" /> Commercial Use Allowed ($0)</li>
              </ul>
            </section>
          </div>
        </div>
      </aside>

      {/* Preview Area */}
      <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-zinc-950 flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className={`relative shadow-2xl transition-all duration-500 ease-out border border-zinc-800/50 bg-black/40 rounded-2xl overflow-hidden ${isMobile ? 'w-full h-full' : 'w-full max-w-2xl aspect-square'}`}>
          {/* Offline pure CSS checkerboard for transparency */}
          <div
            className="relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              backgroundImage: 'repeating-conic-gradient(#18181b 0% 25%, #27272a 0% 50%)',
              backgroundSize: '20px 20px'
            }}
          >
            {resultImage ? (
              <div className="relative w-full h-full group">
                <img src={resultImage} alt="No Background" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                <img
                  src={file.previewUrl}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                />

                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur text-[10px] text-zinc-300 px-2.5 py-1 rounded-lg border border-white/10 font-bold uppercase tracking-widest">Original</div>
                <div className="absolute top-4 right-4 bg-indigo-600/90 backdrop-blur text-[10px] text-white px-2.5 py-1 rounded-lg border border-white/10 font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                  {processedModelId ? BG_MODELS.find(m => m.id === processedModelId)?.tag || 'Cutout' : 'Clean'}
                </div>

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
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in p-6 text-center">
                    <div className="w-12 h-12 relative mb-4">
                      <div className="absolute inset-0 border-2 border-zinc-700/30 rounded-full"></div>
                      <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-white font-bold tracking-[0.2em] uppercase text-xs mb-1">
                      {modelStatus || 'Running Neural Matting'}
                    </p>
                    <p className="text-zinc-400 text-[11px]">
                      Processing locally via {activeModel.name}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {isMobile && <div className="absolute bottom-2 right-4 text-[10px] text-zinc-700 font-bold tracking-widest uppercase">Isolation Stage</div>}
      </main>
    </div>
  );
};
