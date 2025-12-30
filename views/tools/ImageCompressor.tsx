/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Download, Sliders, Zap, Image as ImageIcon, RefreshCcw, Settings, Share2, Trash2, Maximize } from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';

import { useIsMobile } from '../../hooks/useIsMobile';

export const ImageCompressor: React.FC = () => {
  const isMobile = useIsMobile();
  const [file, setFile] = useState<FileData | null>(null);
  const [compressionLevel, setCompressionLevel] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<string>('');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'compress' | 'resize' | 'export'>('compress');

  useEffect(() => {
    if (file) {
      setOriginalImageSrc(URL.createObjectURL(file.file));
      setCompressedImage(null); // Reset on new file
      handleCompress(file.file, compressionLevel);
    }
    return () => {
      if (originalImageSrc) URL.revokeObjectURL(originalImageSrc);
    };
  }, [file]);

  // Debounce compression to avoid lag while dragging slider
  useEffect(() => {
    if (!file) return;
    const timer = setTimeout(() => {
      handleCompress(file.file, compressionLevel);
    }, 300);
    return () => clearTimeout(timer);
  }, [compressionLevel]);

  const handleCompress = (inputFile: File, quality: number) => {
    setIsProcessing(true);
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
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        // Compress: force JPEG for compression visibility or keep original type if supported
        // Using jpeg allows for visible artifacts reduction (compression)
        const type = inputFile.type === 'image/png' ? 'image/jpeg' : inputFile.type;
        const newDataUrl = canvas.toDataURL(type, quality / 100);

        setCompressedImage(newDataUrl);

        // Calculate size
        const head = 'data:' + type + ';base64,';
        const sizeInBytes = Math.round((newDataUrl.length - head.length) * 3 / 4);
        setCompressedSize((sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB');

        setIsProcessing(false);
      };
    };
  };

  const handleDownload = () => {
    if (compressedImage) {
      const link = document.createElement('a');
      link.href = compressedImage;
      link.download = `compressed-${file?.file.name.split('.')[0]}.jpg`;
      link.click();
    }
  };

  const handleReset = () => {
    setFile(null);
    setCompressedImage(null);
    setCompressionLevel(70);
  };

  if (!file) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
            Smart Image Compressor
          </h2>
          <p className="text-zinc-400">Reduce file size without losing visible quality.</p>
        </div>
        <div className="p-8 bg-surface rounded-3xl shadow-xl shadow-black/20 border border-zinc-800/50">
          <FileUploader
            onFileSelect={setFile}
            accept="image/*"
            label="Upload Image"
            description="Supports JPG, PNG, WEBP"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-blue-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

      {/* 1. Navigation */}
      <nav className={`${isMobile ? 'order-3 w-full h-16 border-t flex-row justify-around' : 'order-1 w-16 border-r flex-col py-4'} border-zinc-900 bg-zinc-950 flex items-center shrink-0 z-30`}>
        <button
          onClick={() => setActiveTab('compress')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'compress' ? 'text-blue-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square mb-4'}`}
        >
          <Zap size={isMobile ? 22 : 20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Compress</span>
        </button>
        <button
          onClick={() => setActiveTab('resize')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'resize' ? 'text-blue-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square mb-4'}`}
        >
          <Maximize size={isMobile ? 22 : 20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Resize</span>
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'export' ? 'text-blue-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square'}`}
        >
          <Download size={isMobile ? 22 : 20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Export</span>
        </button>
      </nav>

      {/* 2. Settings Panel */}
      <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
        <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
          <h2 className="font-semibold text-sm text-zinc-100 uppercase tracking-widest flex items-center gap-2">
            {activeTab === 'compress' && <><Zap size={16} className="text-blue-400" /> Optimization</>}
            {activeTab === 'resize' && <><Settings size={16} className="text-zinc-400" /> Image Config</>}
            {activeTab === 'export' && <><Download size={16} className="text-zinc-400" /> Save Result</>}
          </h2>
          <button onClick={handleReset} className="text-zinc-600 hover:text-red-400 transition-colors">
            <RefreshCcw size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {activeTab === 'compress' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <section>
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
                  <span className="text-xs text-blue-400 font-mono font-bold">
                    {isProcessing ? '???' : compressedSize}
                  </span>
                </div>
                {!isProcessing && compressedSize && (
                  <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Reduction</span>
                    <span className="text-xs text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded-full">
                      -{((file.file.size - (parseFloat(compressedSize) * 1024 * 1024)) / file.file.size * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'resize' && (
            <div className="space-y-6 animate-in fade-in duration-300">
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
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Compression is applied using client-side canvas rendering. No images are uploaded to any server.
                  Best for web use and social media.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {compressedImage ? (
                <div className="space-y-4">
                  <div className="aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center">
                    <img src={compressedImage} className="max-w-full max-h-full object-contain" alt="Compressed Preview" />
                  </div>
                  <Button
                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 border-none shadow-sm font-bold"
                    onClick={handleDownload}
                  >
                    <Download size={18} className="mr-2" /> Download Result
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" className="h-10 border-zinc-800" disabled>
                      <Share2 size={16} className="mr-2" /> Share
                    </Button>
                    <Button variant="secondary" className="h-10 text-red-400 border-zinc-800" onClick={handleReset}>
                      <Trash2 size={16} className="mr-2" /> Reset
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                    <ImageIcon size={20} className="text-zinc-700" />
                  </div>
                  <p className="text-sm text-zinc-500">Wait for compression to finish.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* 3. Preview Area */}
      <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className={`relative shadow-2xl transition-all duration-500 ease-out border border-zinc-800/50 bg-black/40 rounded-2xl overflow-hidden ${isMobile ? 'w-full h-full' : 'w-full max-w-2xl aspect-square'}`}>
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] flex items-center justify-center">
            {originalImageSrc ? (
              <div className="relative w-full h-full group">
                <img src={originalImageSrc} alt="Original" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                {compressedImage && (
                  <img
                    src={compressedImage}
                    alt="Compressed"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                  />
                )}

                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest shadow-xl">Optimized</div>
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest">Original</div>

                <div className="absolute inset-y-0" style={{ left: `${sliderPosition}%` }}>
                  <div className="absolute inset-y-0 -left-px w-0.5 bg-white/30 backdrop-blur-md"></div>
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center shadow-2xl text-blue-600 ring-2 ring-black/10">
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