import React, { useState, useRef } from 'react';
import { pipeline, env } from '@huggingface/transformers';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Eraser, Download, RefreshCcw, Sliders, AlertCircle, Layers, Sparkles, Cpu, ShieldCheck } from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { preprocessImageFileData } from '../../utils/imagePreprocess';
import { useIsMobile } from '../../hooks/useIsMobile';

// Optimize browser environments: allow local cached models via browser Cache API
env.allowLocalModels = false;

export const BackgroundRemover: React.FC = () => {
  const isMobile = useIsMobile();
  const [file, setFile] = useState<FileData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelStatus, setModelStatus] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<number | null>(null);

  // Cached transformer pipeline
  const pipelineRef = useRef<any>(null);

  const handleFileSelect = async (selectedFile: FileData) => {
    setIsProcessing(true);
    const processed = await preprocessImageFileData(selectedFile);
    setFile(processed);
    setIsProcessing(false);
  };

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);

  const handleReset = () => {
    if (resultImage && resultImage.startsWith('blob:')) {
      URL.revokeObjectURL(resultImage);
    }
    setFile(null);
    setResultImage(null);
    setError(null);
    setIsProcessing(false);
    setModelStatus(null);
    setModelProgress(null);
  };

  const handleRemoveBackground = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setModelStatus('Initializing local neural model...');
    setModelProgress(null);

    try {
      if (!pipelineRef.current) {
        pipelineRef.current = await pipeline('background-removal', 'Xenova/modnet', {
          progress_callback: (p: any) => {
            if (p.status === 'progress' && typeof p.progress === 'number') {
              setModelStatus(`Downloading model: ${Math.round(p.progress)}%`);
              setModelProgress(Math.round(p.progress));
            } else if (p.status === 'done') {
              setModelStatus('Model ready. Running neural matting...');
              setModelProgress(null);
            } else if (p.status === 'initiate') {
              setModelStatus(`Loading: ${p.file || 'model components'}...`);
            }
          }
        });
      }

      setModelStatus('Segmenting foreground subject...');
      const segmenter = pipelineRef.current;

      const imageUrl = file.previewUrl || URL.createObjectURL(file.file);
      const output = await segmenter(imageUrl);

      const rawImage = Array.isArray(output) ? output[0] : output;

      let blob: Blob;
      if (typeof rawImage.toBlob === 'function') {
        blob = await rawImage.toBlob();
      } else {
        const canvas = rawImage.toCanvas();
        blob = await new Promise<Blob>((res, rej) => {
          canvas.toBlob((b: Blob | null) => b ? res(b) : rej(new Error('Canvas export failed')), 'image/png');
        });
      }

      const cleanUrl = URL.createObjectURL(blob);
      setResultImage(cleanUrl);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "An error occurred while processing the image.");
    } finally {
      setIsProcessing(false);
      setModelStatus(null);
      setModelProgress(null);
    }
  };

  if (!file) {
    return (
      <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
        {/* Header */}
        <div className="flex-none space-y-3 mb-10">
          <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
            <Eraser size={32} /> Smart Background Remover
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Isolate subjects instantly with 100% private on-device neural AI. Zero uploads, zero API keys.
          </p>
        </div>

        {/* Upload Area */}
        <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <FileUploader
            onFileSelect={handleFileSelect}
            accept="image/*, .heic, .heif, .avif"
            label="Upload Image"
            description="Supports JPG, PNG, WEBP, AVIF, HEIC"
            className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
          />
        </div>

        {/* Feature Highlights */}
        <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          {[
            { icon: ShieldCheck, label: '100% Private', desc: 'Runs locally in browser' },
            { icon: Cpu, label: 'No API Key', desc: 'Free on-device model' },
            { icon: Layers, label: 'Transparent', desc: 'Clean alpha matting' },
            { icon: Download, label: 'HD Export', desc: 'Full resolution PNG' }
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
    <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

      {/* Settings Panel */}
      <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
        <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
          <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
            <Eraser size={20} /> BG Remover
          </h2>
          <button onClick={handleReset} className="text-zinc-600 hover:text-red-400 transition-colors">
            <RefreshCcw size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                <Cpu size={14} />
                <span>On-Device Neural AI</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                🔒 100% Private. Runs directly in your browser with zero server uploads or API keys required.
              </p>
            </div>

            <div className="space-y-4">
              {!resultImage ? (
                <Button
                  className="w-full h-12 border-none shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all"
                  onClick={handleRemoveBackground}
                  isLoading={isProcessing}
                  disabled={isProcessing}
                >
                  <Eraser size={18} className="mr-2" />
                  {isProcessing ? (modelStatus || 'Processing...') : 'Remove Background'}
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
                    <Download size={18} className="mr-2" /> Download PNG
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full h-12 border-zinc-800 font-bold uppercase text-[10px] tracking-widest"
                    onClick={handleReset}
                  >
                    <RefreshCcw size={16} className="mr-2" /> New Image
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
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500 text-xs shadow-sm">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>

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
      <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className={`relative shadow-2xl transition-all duration-500 ease-out border border-zinc-800/50 bg-black/40 rounded-2xl overflow-hidden ${isMobile ? 'w-full h-full' : 'w-full max-w-2xl aspect-square'}`}>
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] flex items-center justify-center">
            {resultImage ? (
              <div className="relative w-full h-full group">
                <img src={resultImage} alt="No Background" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
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
          </div>
        </div>
        {isMobile && <div className="absolute bottom-2 right-4 text-[10px] text-zinc-700 font-bold tracking-widest uppercase">Isolation Stage</div>}
      </main>
    </div>
  );
};