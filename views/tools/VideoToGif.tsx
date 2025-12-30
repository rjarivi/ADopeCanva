/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Settings, Download, RefreshCcw, Film, Scissors, Type, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useIsMobile } from '../../hooks/useIsMobile';

const FRAME_RATES = [10, 15, 20, 24, 30];
const WIDTHS = [320, 480, 640, 800];

interface VideoToGifProps {
  outputFormat?: 'gif' | 'apng' | 'webp';
}

export const VideoToGif: React.FC<VideoToGifProps> = ({ outputFormat = 'gif' }) => {
  const isMobile = useIsMobile();
  const [file, setFile] = useState<FileData | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'export'>('settings');
  const [fps, setFps] = useState(15);
  const [width, setWidth] = useState(480);
  const [quality, setQuality] = useState<'high' | 'standard'>('high');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Trimming State
  const [duration, setDuration] = useState(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 10]);

  // Text Overlay State
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const [textY, setTextY] = useState(10); // % from bottom

  // Logger state
  const [logs, setLogs] = useState<string[]>([]);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let ffInstance: FFmpeg | null = null;
    const logCallback = ({ message }: { message: string }) => {
      console.log(message);
      setLogs(prev => [...prev.slice(-5), message]);
    };

    const load = async () => {
      try {
        const ff = await getFFmpeg();
        ffInstance = ff;
        ff.on('log', logCallback);
        ffmpegRef.current = ff;
        setEngineStatus('ready');
      } catch (e) {
        console.error("Failed to load FFmpeg", e);
        setErrorMessage(e instanceof Error ? e.message : 'Unknown error occurred');
        setEngineStatus('error');
      }
    };
    load();

    return () => {
      if (ffInstance) {
        ffInstance.off('log', logCallback);
      }
    };
  }, []);

  const handleMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setTrimRange([0, Math.min(dur, 10)]);
    }
  };

  const loadFont = async (ffmpeg: FFmpeg) => {
    try {
      // Load a basic font for text overlay
      // Use a reliable URL for Roboto-Bold
      const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Bold.ttf';
      const fontBlob = await fetch(fontUrl).then(r => {
        if (!r.ok) throw new Error(`Font fetch failed: ${r.statusText}`);
        return r.blob();
      });
      const fontData = await fontBlob.arrayBuffer();
      await ffmpeg.writeFile('font.ttf', new Uint8Array(fontData));
      return true;
    } catch (e) {
      console.error("Failed to load font", e);
      // Don't fail the whole process, just return false so text isn't added
      return false;
    }
  };

  const handleConvert = async () => {
    if (!file || !ffmpegRef.current) return;
    setIsProcessing(true);
    setLogs([]);
    const ffmpeg = ffmpegRef.current;
    const inputName = 'input.mp4';
    const outputName = `output.${outputFormat}`;
    const paletteName = 'palette.png';

    try {
      await writeFileToFFmpeg(ffmpeg, inputName, file.file);

      let filters = [];

      // Trimming
      filters.push(`trim=start=${trimRange[0]}:end=${trimRange[1]}`);
      filters.push('setpts=PTS-STARTPTS');

      // Scaling
      filters.push(`fps=${fps},scale=${width}:-1:flags=lanczos`);

      // Text Overlay
      if (text) {
        const fontLoaded = await loadFont(ffmpeg);
        if (fontLoaded) {
          const sanitizedText = text.replace(/:/g, '\\:').replace(/'/g, '');
          const yPos = `h-h*${textY}/100`;
          filters.push(`drawtext=fontfile=font.ttf:text='${sanitizedText}':fontcolor=${textColor}:fontsize=${textSize}:x=(w-text_w)/2:y=${yPos}`);
        }
      }

      // Split for Palette (High Quality)
      const args = [
        '-y',
        '-i', inputName
      ];

      // Optimize for speed
      const threads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? Math.min(navigator.hardwareConcurrency, 4).toString()
        : '2';
      args.push('-threads', threads);

      if (outputFormat === 'gif') {
        // PaletteGen for GIF
        let filterGraph = '';
        if (quality === 'high') {
          const filterChain = filters.join(',');
          filterGraph = `[0:v]${filterChain},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
        } else {
          filterGraph = filters.join(',');
        }
        args.push('-vf', filterGraph);
        args.push('-f', 'gif');
      } else if (outputFormat === 'apng') {
        // APNG
        args.push('-vf', filters.join(','));
        args.push('-f', 'apng');
        args.push('-plays', '0');
      } else {
        // WebP
        args.push('-vf', filters.join(','));
        args.push('-c:v', 'libwebp');
        args.push('-lossless', '0');
        args.push('-loop', '0');
        args.push('-preset', 'default');
      }

      args.push(outputName);

      await ffmpeg.exec(args);

      const mimeType = outputFormat === 'gif' ? 'image/gif' : (outputFormat === 'apng' ? 'image/apng' : 'image/webp');
      const url = await readFileFromFFmpeg(ffmpeg, outputName, mimeType);
      setGifUrl(url);
      setIsDone(true);

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
      try { await ffmpeg.deleteFile('font.ttf'); } catch (e) { }

    } catch (e) {
      console.error(e);
      alert("Failed to create GIF. Check console for FFmpeg logs.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!gifUrl) return;
    const a = document.createElement('a');
    a.href = gifUrl;
    const nameWithoutExt = file?.file.name.substring(0, file.file.name.lastIndexOf('.')) || 'video';
    a.download = `${nameWithoutExt}.gif`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 10);
    return `${min}:${sec.toString().padStart(2, '0')}.${ms}`;
  };

  if (engineStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
        <div className="bg-red-500/10 p-4 rounded-full text-red-500">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-white">Engine Failed</h3>
        <p className="text-zinc-400 max-w-md">The video engine could not load.</p>
        {errorMessage && (
          <p className="text-red-400 text-sm font-mono bg-black/50 p-2 rounded max-w-lg mx-auto">
            {errorMessage}
          </p>
        )}
        <Button onClick={() => window.location.reload()} variant="secondary">Reload Page</Button>
      </div>
    );
  }

  if (engineStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
        <Loader2 size={32} className="animate-spin text-green-500" />
        <p className="text-zinc-400">Loading {outputFormat.toUpperCase()} Engine...</p>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
            Video to {outputFormat.toUpperCase()}
          </h2>
          <p className="text-zinc-400">Convert videos to high-quality {outputFormat.toUpperCase()}s with trim and text capabilities.</p>
        </div>
        <div className="p-8 bg-surface rounded-3xl shadow-xl border border-zinc-800/50">
          <FileUploader onFileSelect={setFile} accept="video/*" label="Upload Video" description="MP4, MOV, AVI" />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-green-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

      {/* 1. Navigation Rail (Mobile Bottom / Desktop Rail) */}
      <nav className={`${isMobile ? 'order-3 w-full h-16 border-t flex-row justify-around' : 'order-1 w-16 border-r flex-col py-4'} border-zinc-900 bg-zinc-950 flex items-center shrink-0 z-30`}>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'settings' ? 'text-green-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square mb-4'}`}
        >
          <Settings size={isMobile ? 22 : 20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Params</span>
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'export' ? 'text-green-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square'}`}
        >
          <Download size={isMobile ? 22 : 20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Done</span>
        </button>
      </nav>

      {/* 2. Settings Panel */}
      <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
        <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
          <h3 className="flex items-center gap-2 font-bold text-white text-xs uppercase tracking-widest">
            {activeTab === 'settings' ? <><Settings size={14} /> Generator</> : <><Download size={14} /> Export</>}
          </h3>
          <Button variant="ghost" size="sm" onClick={() => { setFile(null); setIsDone(false); }}>
            <RefreshCcw size={14} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Trimming */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
                  <span className="flex items-center gap-2"><Scissors size={14} /> Trim Range</span>
                  <span className="font-mono text-green-400">{formatTime(trimRange[0])} - {formatTime(trimRange[1])}</span>
                </label>
                <div className="px-2 py-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                  <Slider
                    range
                    min={0}
                    max={duration || 10}
                    step={0.1}
                    value={trimRange}
                    onChange={(val) => setTrimRange(val as [number, number])}
                    trackStyle={[{ backgroundColor: '#10b981' }]}
                    handleStyle={[{ borderColor: '#10b981', backgroundColor: '#064e3b' }, { borderColor: '#10b981', backgroundColor: '#064e3b' }]}
                    railStyle={{ backgroundColor: '#27272a' }}
                  />
                </div>
              </div>

              {/* Quality & Size */}
              <div className="space-y-4 pt-4 border-t border-zinc-900">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Quality Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setQuality('standard')} className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${quality === 'standard' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-zinc-800 text-zinc-600 hover:bg-zinc-900'}`}>Standard</button>
                    <button onClick={() => setQuality('high')} className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${quality === 'high' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-transparent border-zinc-800 text-zinc-600 hover:bg-zinc-900'}`}>High Latency</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">FPS</label>
                    <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white text-xs font-mono">
                      {FRAME_RATES.map(f => <option key={f} value={f}>{f} fps</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Width</label>
                    <select value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white text-xs font-mono">
                      {WIDTHS.map(w => <option key={w} value={w}>{w}px</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Text Overlay */}
              <div className="space-y-4 pt-4 border-t border-zinc-900">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Type size={14} /> Caption Overlay</label>
                <input
                  type="text"
                  placeholder="Enter caption..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <Button
                onClick={handleConvert}
                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 border-none shadow-lg shadow-green-900/20 font-bold uppercase text-[10px] tracking-[0.1em]"
                isLoading={isProcessing}
                disabled={isProcessing || isDone}
              >
                {isProcessing ? `Stitching Frames...` : 'Run Conversion'}
              </Button>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {isDone && gifUrl ? (
                <div className="space-y-4">
                  <div className="aspect-square bg-black rounded-2xl border border-zinc-800 overflow-hidden flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
                    <img src={gifUrl} alt={`${outputFormat} Result`} className="max-h-full max-w-full object-contain" />
                  </div>
                  <Button onClick={handleDownload} className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold uppercase text-xs tracking-widest border-none">
                    <Download size={18} className="mr-2" /> Download {outputFormat.toUpperCase()}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 flex flex-col items-center">
                  <Loader2 size={32} className={`text-zinc-800 mb-4 ${isProcessing ? 'animate-spin text-green-500' : ''}`} />
                  <p className="text-sm text-zinc-500">
                    {isProcessing ? 'Rendering sequence...' : 'Convert a clip to export.'}
                  </p>
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

        <div className={`relative shadow-2xl transition-all duration-500 ease-out border border-zinc-800/50 bg-black/40 rounded-2xl overflow-hidden ${isMobile ? 'w-full h-full' : 'w-full max-w-2xl aspect-video'}`}>
          <div className="relative w-full h-full flex items-center justify-center">
            {!isProcessing && !isDone && (
              <video
                ref={videoRef}
                src={file.previewUrl}
                controls
                className="max-h-full max-w-full block"
                onLoadedMetadata={handleMetadata}
              />
            )}
            {(isProcessing || isDone) && (
              <div className="relative w-full h-full flex items-center justify-center bg-black/60 group">
                {gifUrl ? (
                  <img src={gifUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center space-y-4 animate-in fade-in">
                    <div className="w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-green-500/20"></div>
                    <p className="text-[10px] text-green-400 font-bold uppercase tracking-[0.2em] animate-pulse">Encoding Buffer</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {isMobile && (
          <div className="absolute bottom-2 right-4 text-[10px] text-zinc-700 font-bold tracking-widest uppercase">
            {isDone ? 'Render Complete' : 'Live Preview'}
          </div>
        )}
      </main>
    </div>
  );
};
