/// <reference lib="dom" />
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Download, Sliders, Zap, Image as ImageIcon, RefreshCcw, Settings, Share2, Trash2, Maximize } from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { preprocessImageFileData } from '../../utils/imagePreprocess';
import { ToolShell } from '../../components/ToolShell';
import { useToolFile } from '../../hooks/useToolFile';

import { useIsMobile } from '../../hooks/useIsMobile';

export const ImageCompressor: React.FC = () => {
  const isMobile = useIsMobile();
  const { file, select, clear } = useToolFile();
  const [compressionLevel, setCompressionLevel] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<string>('');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('');
  // activeTab state removed as per instructions

  const handleFileSelect = async (selectedFile: FileData | FileData[]) => {
    const first = Array.isArray(selectedFile) ? selectedFile[0] : selectedFile;
    if (!first) return;
    setIsProcessing(true);
    const processed = await preprocessImageFileData(first);
    select(processed);
    setIsProcessing(false);
  };

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file.file);
      setOriginalImageSrc(url);
      setResultImage(null); // Reset on new file
      setCompressedSize(''); // Reset compressed size
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  // Debounce compression to avoid lag while dragging slider - this useEffect is removed as compression is now manual.

  const handleCompress = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    setResultImage(null); // Clear previous result
    setCompressedSize(''); // Clear previous size

    const inputFile = file.file;
    const quality = compressionLevel;

    try {
      const reader = new FileReader();
      reader.readAsDataURL(inputFile);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setIsProcessing(false);
            return;
          }

          // Compress: force JPEG for compression visibility or keep original type if supported
          const type = inputFile.type === 'image/png' ? 'image/jpeg' : inputFile.type;

          if (type === 'image/jpeg') {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0);

          const newDataUrl = canvas.toDataURL(type, quality / 100);

          setResultImage(newDataUrl);

          // Calculate size
          const head = 'data:' + type + ';base64,';
          const sizeInBytes = Math.round((newDataUrl.length - head.length) * 3 / 4);
          setCompressedSize((sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB');

          setIsProcessing(false);
        };
        img.onerror = () => {
          setIsProcessing(false);
          console.error("Error loading image for compression.");
        };
      };
      reader.onerror = () => {
        setIsProcessing(false);
        console.error("Error reading file for compression.");
      };
    } catch (error) {
      console.error("Compression failed:", error);
      setIsProcessing(false);
    }
  }, [file, compressionLevel]);


  const handleDownload = () => {
    if (resultImage) {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `compressed-${file?.file.name.split('.')[0]}.jpg`;
      link.click();
    }
  };

  const handleReset = () => {
    clear();
    setResultImage(null);
    setCompressionLevel(70);
    setCompressedSize('');
  };

  if (!file) {
    return (
      <ToolShell
        icon={Zap}
        title="Smart Image Compressor"
        description="Reduce file size without losing visible quality."
        features={[
          { icon: Zap, label: 'Instant Shrink', desc: 'Fast compression' },
          { icon: Sliders, label: 'Adjustable', desc: 'Control quality level' },
          { icon: Download, label: 'Web Ready', desc: 'Perfect for sharing' },
          { icon: Maximize, label: 'HD Preview', desc: 'Compare Before/After' },
        ]}
        file={file}
        accept="image/*, .heic, .heif, .avif"
        uploadLabel="Upload Image"
        uploadDescription="Supports JPG, PNG, WEBP, AVIF, HEIC"
        onFileSelect={handleFileSelect}
      >
        <></>
      </ToolShell>
    );
  }

  return (
    <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

      {/* 1. Navigation */}
      {/* Navigation removed for unified UX */}

      {/* 2. Settings Panel */}
      <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
        <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
          <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
            <Zap size={20} /> Image Optimizer
          </h2>
          <button onClick={handleReset} className="text-zinc-600 hover:text-red-400 transition-colors">
            <RefreshCcw size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="space-y-8 animate-in fade-in duration-300">
            <section className="space-y-4">
              <SliderControl
                label="Compression Quality"
                value={compressionLevel}
                min={10}
                max={100}
                onChange={setCompressionLevel}
                unit="%"
              />
              <div className="flex justify-between mt-2 text-[10px] text-zinc-600 uppercase font-bold tracking-tighter">
                <span>Smaller File</span>
                <span>Better Quality</span>
              </div>
            </section>

            <section className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-900/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500 font-medium">Original Size</span>
                <span className="text-xs text-zinc-300 font-mono">{file.size}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500 font-medium">Predicted Size</span>
                <span className="text-xs text-indigo-400 font-mono font-bold">
                  {isProcessing ? '???' : compressedSize}
                </span>
              </div>
              {!isProcessing && compressedSize && (
                <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Reduction</span>
                  <span className="text-xs text-indigo-500 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full">
                    -{((file.file.size - (parseFloat(compressedSize) * 1024 * 1024)) / file.file.size * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </section>

            <div className="space-y-3">
              {!resultImage ? (
                <Button
                  className="w-full h-12 border-none shadow-lg shadow-indigo-900/20"
                  onClick={handleCompress}
                  isLoading={isProcessing}
                  disabled={isProcessing}
                >
                  <Zap size={18} className="mr-2" />
                  {isProcessing ? 'Optimizing...' : 'Process Image'}
                </Button>
              ) : (
                <div className="space-y-3 animate-slide-up">
                  <Button className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-500 border-none shadow-lg" onClick={() => {
                    const link = document.createElement('a');
                    link.href = resultImage!;
                    const type = file!.file.type === 'image/png' ? 'image/jpeg' : file!.file.type;
                    const ext = type === 'image/jpeg' ? 'jpg' : 'png';
                    link.download = `optimized-${file!.file.name.replace(/\.[^/.]+$/, '')}.${ext}`;
                    link.click();
                  }}
                  >
                    <Download size={18} className="mr-2" /> Download Result
                  </Button>
                  <Button variant="secondary" className="w-full h-12 border-zinc-800" onClick={handleReset}>
                    <RefreshCcw size={16} className="mr-2" /> Start New
                  </Button>
                </div>
              )}
            </div>

            <section>
              <SliderControl
                label="Preview Comparison"
                value={sliderPosition}
                min={0}
                max={100}
                onChange={setSliderPosition}
                unit="%"
              />
            </section>

            <section className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
              <SectionLabel>Optimization Info</SectionLabel>
              <p className="text-[10px] text-zinc-500 leading-relaxed uppercase font-bold tracking-tight">
                Compression is applied using client-side canvas rendering. No images are uploaded to any server.
                Best for web use and social media.
              </p>
            </section>
          </div>
        </div>
      </aside>

      {/* 3. Preview Area */}
      <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className={`relative shadow-2xl transition-all duration-500 ease-out border border-zinc-800/50 bg-black/40 rounded-2xl overflow-hidden ${isMobile ? 'w-full h-full' : 'w-full max-w-2xl aspect-square'}`}>
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-checkerboard flex items-center justify-center">
            {originalImageSrc ? (
              <div className="relative w-full h-full group">
                <img src={originalImageSrc} alt="Original" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                {resultImage && (
                  <img
                    src={resultImage}
                    alt="Compressed"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                  />
                )}

                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest">Original</div>
                <div className="absolute top-4 right-4 bg-indigo-600/90 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20">Optimized</div>

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
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon size={48} className="text-zinc-800 animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};