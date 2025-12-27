/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Download, Sliders, Zap, Image as ImageIcon } from 'lucide-react';

export const ImageCompressor: React.FC = () => {
  const [file, setFile] = useState<FileData | null>(null);
  const [compressionLevel, setCompressionLevel] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<string>('');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('');

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
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
      {/* Sidebar Controls */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-surface p-6 rounded-2xl border border-zinc-800 space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-lg font-semibold truncate max-w-[200px]" title={file.file.name}>{file.file.name}</h3>
             <button onClick={handleReset} className="text-xs text-red-400 hover:underline">Remove</button>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm text-zinc-400">
              <span className="flex items-center gap-2"><Zap size={14} className="text-yellow-500" /> Quality</span>
              <span className="text-white font-mono">{compressionLevel}%</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={compressionLevel} 
              onChange={(e) => setCompressionLevel(parseInt((e.target as HTMLInputElement).value))}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-zinc-500 font-mono">
              <span>Low Quality</span>
              <span>High Quality</span>
            </div>
          </div>

          <div className="p-4 bg-zinc-900 rounded-xl space-y-2 border border-zinc-800/50">
             <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Original</span>
                <span className="text-zinc-300">{file.size}</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Compressed</span>
                <span className="text-primary font-bold">
                  {isProcessing ? 'Calculating...' : compressedSize}
                </span>
             </div>
             {!isProcessing && compressedSize && (
                 <div className="text-xs text-green-500 text-right">
                     saved {((file.file.size - (parseFloat(compressedSize) * 1024 * 1024)) / file.file.size * 100).toFixed(0)}%
                 </div>
             )}
          </div>

          <Button 
            className="w-full" 
            onClick={handleDownload} 
            disabled={!compressedImage || isProcessing}
          >
            <Download size={18} className="mr-2" /> Download
          </Button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="lg:col-span-2">
        <div className="bg-surface rounded-3xl p-2 border border-zinc-800 h-[500px] relative select-none shadow-2xl overflow-hidden group">
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-zinc-900 flex items-center justify-center">
                {originalImageSrc ? (
                    <div className="relative w-full h-full">
                        {/* Original Image Layer (Bottom/Right) - Full Width */}
                        <img 
                            src={originalImageSrc} 
                            alt="Original" 
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        />

                        {/* Compressed Image Layer (Top/Left) - Clipped */}
                        {compressedImage && (
                            <img 
                                src={compressedImage} 
                                alt="Compressed" 
                                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }} 
                            />
                        )}
                        
                        {/* Labels */}
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10 font-bold shadow-lg pointer-events-none">
                            Compressed
                        </div>
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10 font-bold shadow-lg pointer-events-none">
                            Original
                        </div>

                        {/* Slider Handle & Line */}
                        <div 
                            className="absolute inset-y-0"
                            style={{ left: `${sliderPosition}%` }}
                        >
                            <div className="absolute inset-y-0 -left-px w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg -ml-0.5 text-primary">
                                <Sliders size={16} className="rotate-90" />
                            </div>
                        </div>

                        {/* Invisible Range Input */}
                        <input
                        type="range"
                        min="0"
                        max="100"
                        value={sliderPosition}
                        onChange={(e) => setSliderPosition(parseInt((e.target as HTMLInputElement).value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <ImageIcon size={48} className="opacity-50" />
                    </div>
                )}
            </div>
        </div>
        <p className="text-center text-zinc-500 text-sm mt-4">Drag slider to compare quality</p>
      </div>
    </div>
  );
};