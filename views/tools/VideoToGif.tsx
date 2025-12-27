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

const FRAME_RATES = [10, 15, 20, 24, 30];
const WIDTHS = [320, 480, 640, 800];

interface VideoToGifProps {
  outputFormat?: 'gif' | 'apng' | 'webp';
}

export const VideoToGif: React.FC<VideoToGifProps> = ({ outputFormat = 'gif' }) => {
  const [file, setFile] = useState<FileData | null>(null);
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
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
      {/* Settings Panel */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-surface rounded-3xl border border-zinc-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-white"><Settings size={18} /> Settings</h3>
            <Button variant="ghost" size="sm" onClick={() => { setFile(null); setIsDone(false); }}>
              <RefreshCcw size={16} /> Reset
            </Button>
          </div>

          {/* Trimming */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-400 flex items-center justify-between">
              <span className="flex items-center gap-2"><Scissors size={14} /> Trim Video</span>
              <span className="font-mono text-green-400">{formatTime(trimRange[0])} - {formatTime(trimRange[1])}</span>
            </label>
            <div className="px-2">
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
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Quality Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setQuality('standard')} className={`p-2 rounded-lg text-sm border transition-all ${quality === 'standard' ? 'bg-zinc-700 border-zinc-600 text-white' : 'border-transparent text-zinc-500 hover:bg-zinc-800'}`}>Standard (Fast)</button>
                <button onClick={() => setQuality('high')} className={`p-2 rounded-lg text-sm border transition-all ${quality === 'high' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-transparent text-zinc-500 hover:bg-zinc-800'}`}>High Quality</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">FPS</label>
                <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-sm">
                  {FRAME_RATES.map(f => <option key={f} value={f}>{f} fps</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Width</label>
                <select value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-sm">
                  {WIDTHS.map(w => <option key={w} value={w}>{w}px</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Text Overlay */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <label className="text-sm font-medium text-zinc-400 flex items-center gap-2"><Type size={14} /> Add Text Overlay</label>
            <input
              type="text"
              placeholder="Enter caption..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white"
            />
            {text && (
              <div className="grid grid-cols-2 gap-4">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-8 bg-transparent cursor-pointer" />
                <input
                  type="range" min="10" max="72" value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500 mt-3"
                />
              </div>
            )}
          </div>

          <Button
            onClick={handleConvert}
            className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 border-none shadow-lg shadow-green-500/20"
            isLoading={isProcessing}
            disabled={isProcessing || isDone}
          >
            {isProcessing ? `Rendering ${outputFormat.toUpperCase()}...` : 'Convert Video'}
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="lg:col-span-2">
        <div className="bg-black/50 rounded-3xl border border-zinc-800 h-[600px] flex flex-col relative overflow-hidden">
          {isDone && gifUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 animate-fade-in">
              <img src={gifUrl} alt={`${outputFormat} Result`} className="max-h-[400px] max-w-full object-contain rounded-lg shadow-2xl" />
              <Button onClick={handleDownload} className="bg-white text-black hover:bg-zinc-200 min-w-[200px]">
                <Download size={18} className="mr-2" /> Download {outputFormat.toUpperCase()}
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              {!isProcessing && (
                <video
                  ref={videoRef}
                  src={file.previewUrl}
                  controls
                  className="max-h-full max-w-full rounded-lg shadow-lg"
                  onLoadedMetadata={handleMetadata}
                />
              )}
              {isProcessing && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Generating High Quality {outputFormat.toUpperCase()}</h3>
                    <p className="text-zinc-400 text-sm mt-2">Analyzing colors and generating palette...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
