/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { 
  Palette, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Pipette, 
  Code, 
  RefreshCcw, 
  Layers, 
  Sliders, 
  CheckCircle2,
  FileText
} from 'lucide-react';

interface ColorItem {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  population: number;
  textColor: string;
}

type PaletteMood = 'dominant' | 'vibrant' | 'muted' | 'light' | 'dark' | 'pastel';

// RGB to HEX conversion
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// RGB to HSL conversion
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

// Calculate luminance for black/white text contrast
function getContrastingTextColor(r: number, g: number, b: number): string {
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '#09090b' : '#ffffff';
}

// Color quantization using 3D spatial box partitioning
function extractColorsFromImageData(imageData: ImageData, targetCount: number = 8): ColorItem[] {
  const data = imageData.data;
  const pixelCount = data.length / 4;
  const sampleStep = Math.max(1, Math.floor(pixelCount / 10000)); // Sample ~10k pixels for speed
  const colorBuckets: Map<string, { r: number; g: number; b: number; count: number }> = new Map();

  for (let i = 0; i < data.length; i += sampleStep * 4) {
    const a = data[i + 3];
    if (a < 128) continue; // Skip transparent pixels

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Quantize into 5-bit color space (32 levels per channel)
    const qr = Math.round(r / 8) * 8;
    const qg = Math.round(g / 8) * 8;
    const qb = Math.round(b / 8) * 8;
    const key = `${qr},${qg},${qb}`;

    const existing = colorBuckets.get(key);
    if (existing) {
      existing.count++;
      existing.r += r;
      existing.g += g;
      existing.b += b;
    } else {
      colorBuckets.set(key, { r, g, b, count: 1 });
    }
  }

  // Convert buckets to average colors
  const rawColors: { r: number; g: number; b: number; count: number }[] = [];
  colorBuckets.forEach(bucket => {
    rawColors.push({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
      count: bucket.count
    });
  });

  // Sort by frequency
  rawColors.sort((a, b) => b.count - a.count);

  // Filter out colors that are too close to each other (Euclidean color distance)
  const distinctColors: { r: number; g: number; b: number; count: number }[] = [];
  const minDistanceSq = 25 * 25; // Minimum color separation

  for (const c of rawColors) {
    let isDuplicate = false;
    for (const chosen of distinctColors) {
      const dr = c.r - chosen.r;
      const dg = c.g - chosen.g;
      const db = c.b - chosen.b;
      const distSq = dr * dr + dg * dg + db * db;
      if (distSq < minDistanceSq) {
        isDuplicate = true;
        chosen.count += c.count; // Merge counts
        break;
      }
    }
    if (!isDuplicate) {
      distinctColors.push(c);
      if (distinctColors.length >= targetCount * 2) break;
    }
  }

  return distinctColors.slice(0, targetCount).map(c => {
    const hex = rgbToHex(c.r, c.g, c.b);
    const hsl = rgbToHsl(c.r, c.g, c.b);
    return {
      hex,
      rgb: { r: c.r, g: c.g, b: c.b },
      hsl,
      population: c.count,
      textColor: getContrastingTextColor(c.r, c.g, c.b)
    };
  });
}

export const PaletteExtractor: React.FC = () => {
  const [file, setFile] = useState<FileData | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [palette, setPalette] = useState<ColorItem[]>([]);
  const [selectedColor, setSelectedColor] = useState<ColorItem | null>(null);
  const [colorCount, setColorCount] = useState<number>(6);
  const [mood, setMood] = useState<PaletteMood>('dominant');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);
  const [pickedColors, setPickedColors] = useState<ColorItem[]>([]);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load image preview
  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      setPalette([]);
      setSelectedColor(null);
      setPickedColors([]);
      return;
    }

    const url = URL.createObjectURL(file.file);
    setImageSrc(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Extract colors when image loads
  const processImage = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale down for ultra-fast processing
    const maxDim = 400;
    let width = img.naturalWidth || 400;
    let height = img.naturalHeight || 400;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const rawPalette = extractColorsFromImageData(imageData, 12);
      
      // Filter according to mood
      let filtered = [...rawPalette];
      if (mood === 'vibrant') {
        filtered = filtered.sort((a, b) => (b.hsl.s * 1.5 + (100 - Math.abs(b.hsl.l - 50))) - (a.hsl.s * 1.5 + (100 - Math.abs(a.hsl.l - 50))));
      } else if (mood === 'muted') {
        filtered = filtered.sort((a, b) => a.hsl.s - b.hsl.s);
      } else if (mood === 'light') {
        filtered = filtered.sort((a, b) => b.hsl.l - a.hsl.l);
      } else if (mood === 'dark') {
        filtered = filtered.sort((a, b) => a.hsl.l - b.hsl.l);
      } else if (mood === 'pastel') {
        filtered = filtered.filter(c => c.hsl.l > 60 && c.hsl.s > 20 && c.hsl.s < 80);
        if (filtered.length < colorCount) filtered = rawPalette;
      }

      const finalPalette = filtered.slice(0, colorCount);
      setPalette(finalPalette);
      if (finalPalette.length > 0 && !selectedColor) {
        setSelectedColor(finalPalette[0]);
      }
    } catch (err) {
      console.error('Failed to extract color palette:', err);
    }
  };

  useEffect(() => {
    if (imageSrc && imgRef.current?.complete) {
      processImage();
    }
  }, [imageSrc, colorCount, mood]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Eyedropper click on image
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * img.naturalWidth);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * img.naturalHeight);

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);

    const newColor: ColorItem = {
      hex,
      rgb: { r, g, b },
      hsl,
      population: 1,
      textColor: getContrastingTextColor(r, g, b)
    };

    setSelectedColor(newColor);
    setPickedColors(prev => [newColor, ...prev.slice(0, 7)]);
  };

  // Export formats
  const getCssVariables = () => {
    return `:root {\n` + palette.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n') + `\n}`;
  };

  const getTailwindConfig = () => {
    const obj: Record<string, string> = {};
    palette.forEach((c, i) => {
      obj[`brand-${i + 1}`] = c.hex;
    });
    return `// tailwind.config.js\ncolors: ${JSON.stringify(obj, null, 2)}`;
  };

  const getJsonExport = () => {
    return JSON.stringify(
      palette.map(c => ({
        hex: c.hex,
        rgb: `rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})`,
        hsl: `hsl(${c.hsl.h}, ${c.hsl.s}%, ${c.hsl.l}%)`
      })),
      null,
      2
    );
  };

  // Download high-resolution PNG palette card
  const downloadPaletteCard = () => {
    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark background per AGENTS.md
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    // Title & Branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('COLOR PALETTE', 60, 80);

    ctx.fillStyle = '#71717a';
    ctx.font = '18px monospace';
    ctx.fillText(`ADopeCanva • ${palette.length} Swatches • ${mood.toUpperCase()}`, 60, 115);

    // Render color swatches
    const swatchCount = palette.length;
    const margin = 60;
    const gap = 16;
    const totalGap = (swatchCount - 1) * gap;
    const swatchWidth = (width - margin * 2 - totalGap) / swatchCount;
    const swatchHeight = 360;
    const startY = 160;

    palette.forEach((color, i) => {
      const x = margin + i * (swatchWidth + gap);
      // Swatch rectangle
      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.roundRect(x, startY, swatchWidth, swatchHeight, 16);
      ctx.fill();

      // Info banner inside swatch at bottom
      ctx.fillStyle = color.textColor;
      ctx.font = 'bold 20px monospace';
      ctx.fillText(color.hex, x + 16, startY + swatchHeight - 40);

      ctx.font = '14px monospace';
      ctx.fillStyle = color.textColor === '#ffffff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
      ctx.fillText(`${color.hsl.h}°, ${color.hsl.s}%`, x + 16, startY + swatchHeight - 18);
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `palette_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Upload view
  if (!file) {
    return (
      <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center py-10">
        {/* Header */}
        <div className="flex-none space-y-3 mb-10">
          <h2 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3 font-unbounded">
            <div className="text-indigo-400 p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <Palette size={36} />
            </div>
            <span className="text-white">Palette Extractor</span>
          </h2>
          <p className="text-base text-zinc-400 max-w-xl mx-auto">
            Extract beautiful color palettes, dominant shades, and CSS variables from any image.
          </p>
        </div>

        {/* Upload Area */}
        <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-3 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <FileUploader
            onFileSelect={setFile}
            accept="image/*,.png,.jpg,.jpeg,.webp,.avif,.svg"
            label="Drop Image Here to Extract Colors"
            description="Supports PNG, JPG, WebP, AVIF, and SVG images"
            className="w-full h-full min-h-[260px] border-2 border-dashed border-zinc-800/80 hover:border-indigo-500/50 bg-zinc-950/40 rounded-2xl transition-all"
          />
        </div>

        {/* Feature Highlights Grid */}
        <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          {[
            { icon: Palette, label: 'Dominant Swatches', desc: '5 to 10 Key Colors' },
            { icon: Sparkles, label: 'Smart Moods', desc: 'Vibrant, Muted & Light' },
            { icon: Code, label: 'Developer Export', desc: 'CSS Vars & Tailwind' },
            { icon: Download, label: 'PNG Swatch Card', desc: 'Instant High-Res Export' }
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
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Palette size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-unbounded">Color Palette Extractor</h2>
            <p className="text-xs text-zinc-400 truncate max-w-sm sm:max-w-md">{file.file.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={downloadPaletteCard}
            className="text-xs bg-indigo-600/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/20"
          >
            <Download size={14} className="mr-1.5" />
            Download Swatch Card
          </Button>

          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => setFile(null)}
            className="text-xs border-zinc-800 hover:bg-zinc-800"
          >
            <RefreshCcw size={14} className="mr-1.5" />
            New Image
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image with Interactive Pipette */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Pipette size={14} className="text-indigo-400" />
                <span>Click image to sample colors</span>
              </span>
              <span className="text-[11px] font-mono text-indigo-400">{file.size}</span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black/40 border border-zinc-800 flex items-center justify-center group cursor-crosshair">
              {imageSrc && (
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Source"
                  onLoad={processImage}
                  onClick={handleImageClick}
                  className="w-full max-h-[360px] object-contain"
                />
              )}
            </div>

            {/* Custom Picked Colors Row */}
            {pickedColors.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                <div className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">Sampled Points</div>
                <div className="flex flex-wrap gap-2">
                  {pickedColors.map((color, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className="w-7 h-7 rounded-lg border border-white/20 transition-transform hover:scale-110 shadow-sm"
                      style={{ backgroundColor: color.hex }}
                      title={`${color.hex} - Click to select`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selected Color Inspector Card */}
          {selectedColor && (
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl border border-white/10 shadow-md shrink-0"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold font-mono text-white">{selectedColor.hex}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedColor.hex, 'inspect-hex')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {copiedKey === 'inspect-hex' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copiedKey === 'inspect-hex' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    rgb({selectedColor.rgb.r}, {selectedColor.rgb.g}, {selectedColor.rgb.b})
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-xs">
                <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 uppercase">Hue</div>
                  <div className="text-zinc-200 font-bold">{selectedColor.hsl.h}°</div>
                </div>
                <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 uppercase">Saturation</div>
                  <div className="text-zinc-200 font-bold">{selectedColor.hsl.s}%</div>
                </div>
                <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 uppercase">Lightness</div>
                  <div className="text-zinc-200 font-bold">{selectedColor.hsl.l}%</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Palette Grid & Export Options */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 space-y-5">
            {/* Mood Controls & Swatch Count */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/60 pb-4">
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                {(['dominant', 'vibrant', 'muted', 'light', 'dark', 'pastel'] as PaletteMood[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                      mood === m 
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40' 
                        : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/40 border border-zinc-800'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Count Selector */}
              <div className="flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800 rounded-lg p-1">
                {[5, 6, 8, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setColorCount(num)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      colorCount === num ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Interactive Swatches Grid */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {palette.map((color, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedColor(color)}
                    className={`group relative rounded-xl p-3 border transition-all cursor-pointer flex flex-col justify-between h-28 ${
                      selectedColor?.hex === color.hex 
                        ? 'border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.25)]' 
                        : 'border-zinc-800/80 hover:border-zinc-700'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    <div className="flex items-center justify-between">
                      <span 
                        className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded backdrop-blur-sm"
                        style={{ 
                          backgroundColor: color.textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)',
                          color: color.textColor 
                        }}
                      >
                        #{idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(color.hex, `swatch-${idx}`);
                        }}
                        className="p-1 rounded backdrop-blur-sm transition-transform hover:scale-110"
                        style={{ 
                          backgroundColor: color.textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)',
                          color: color.textColor 
                        }}
                        title="Copy HEX"
                      >
                        {copiedKey === `swatch-${idx}` ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>

                    <div>
                      <div 
                        className="font-mono font-bold text-sm"
                        style={{ color: color.textColor }}
                      >
                        {color.hex}
                      </div>
                      <div 
                        className="text-[11px] font-mono opacity-80"
                        style={{ color: color.textColor }}
                      >
                        {color.hsl.h}°, {color.hsl.s}%, {color.hsl.l}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Export Code Snippets */}
            <div className="space-y-3 pt-3 border-t border-zinc-800/60">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Developer Export
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(palette.map(c => c.hex).join(', '), 'all-hex')}
                  className="text-xs border-zinc-800 hover:border-zinc-700 justify-center"
                >
                  {copiedKey === 'all-hex' ? <Check size={13} className="text-emerald-400 mr-1.5" /> : <Copy size={13} className="mr-1.5" />}
                  HEX List
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(getCssVariables(), 'css-vars')}
                  className="text-xs border-zinc-800 hover:border-zinc-700 justify-center"
                >
                  {copiedKey === 'css-vars' ? <Check size={13} className="text-emerald-400 mr-1.5" /> : <Code size={13} className="mr-1.5" />}
                  CSS Vars
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(getTailwindConfig(), 'tailwind')}
                  className="text-xs border-zinc-800 hover:border-zinc-700 justify-center"
                >
                  {copiedKey === 'tailwind' ? <Check size={13} className="text-emerald-400 mr-1.5" /> : <FileText size={13} className="mr-1.5" />}
                  Tailwind
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(getJsonExport(), 'json')}
                  className="text-xs border-zinc-800 hover:border-zinc-700 justify-center"
                >
                  {copiedKey === 'json' ? <Check size={13} className="text-emerald-400 mr-1.5" /> : <Layers size={13} className="mr-1.5" />}
                  JSON
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
