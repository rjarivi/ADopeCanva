/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Settings, Download, RefreshCcw, Scissors, Crop, RotateCw, Play, FastForward, Rewind, Type, Grid, AlertCircle, Loader2, ArrowLeft, Check, FlipHorizontal, FlipVertical, Film } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import ReactCrop, { Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import 'react-image-crop/dist/ReactCrop.css';

export const GifEditor: React.FC = () => {
    const isMobile = useIsMobile();
    const [file, setFile] = useState<FileData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Tools
    const [activeTool, setActiveTool] = useState<'crop' | 'transform' | 'text' | 'trim' | 'sprite'>('transform');

    // State
    const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [reverse, setReverse] = useState(false);
    const [crop, setCrop] = useState<CropType>();

    // Text State
    const [text, setText] = useState('');
    const [textColor, setTextColor] = useState('#ffffff');
    const [textSize, setTextSize] = useState(24);
    const [textY, setTextY] = useState(10); // % from bottom

    // Sprite State
    const [isSpriteWorker, setIsSpriteWorker] = useState(false);

    // Trim State
    const [duration, setDuration] = useState<number>(0);
    const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]); // [start, end]
    const [isProbing, setIsProbing] = useState(false);

    const ffmpegRef = useRef<FFmpeg | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const sourceImgRef = useRef<HTMLImageElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    // Persistence State
    const [isSourceReady, setIsSourceReady] = useState(false);
    const [sourceFileName, setSourceFileName] = useState<string | null>(null);



    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
        }
    }, [speed]);

    useEffect(() => {
        getFFmpeg()
            .then(ff => {
                ffmpegRef.current = ff;
                setEngineStatus('ready');
            })
            .catch(e => {
                console.error("Failed to load FFmpeg", e);
                setErrorMessage(e instanceof Error ? e.message : 'Unknown error occurred');
                setEngineStatus('error');
            });
    }, []);

    useEffect(() => {
        if (file && engineStatus === 'ready') {
            handleProbeDuration(file.file);
        } else if (!file) {
            setIsSourceReady(false);
            setSourceFileName(null);
        }
    }, [file, engineStatus]);

    const loadFont = async (ffmpeg: FFmpeg) => {
        try {
            const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Bold.ttf';
            const fontBlob = await fetch(fontUrl).then(r => r.blob());
            const fontData = await fontBlob.arrayBuffer();
            await ffmpeg.writeFile('font.ttf', new Uint8Array(fontData));
            return true;
        } catch (e) {
            console.error("Failed to load font", e);
            return false;
        }
    };

    const handleProbeDuration = async (fileToProbe: File) => {
        if (!ffmpegRef.current) return;
        setIsProbing(true);
        setIsSourceReady(false);

        try {
            const ffmpeg = ffmpegRef.current;
            const rawExt = fileToProbe.name.split('.').pop()?.toLowerCase() || 'gif';
            const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
            const name = `input_source.${ext}`;

            // Cleanup previous if exists
            if (sourceFileName && sourceFileName !== name) {
                try { await ffmpeg.deleteFile(sourceFileName); } catch (e) { }
            }

            console.log("[GifEditor] Pre-loading source file to memory...");
            await writeFileToFFmpeg(ffmpeg, name, fileToProbe);
            setSourceFileName(name);
            setIsSourceReady(true);

            // Log callback to catch Duration
            let dur = 0;
            const logCb = ({ message }: { message: string }) => {
                const match = message.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                if (match) {
                    const hrs = parseFloat(match[1]);
                    const mins = parseFloat(match[2]);
                    const secs = parseFloat(match[3]);
                    dur = hrs * 3600 + mins * 60 + secs;
                }
            };

            ffmpeg.on('log', logCb);
            await ffmpeg.exec(['-i', name]);
            ffmpeg.off('log', logCb);

            if (dur > 0) {
                setDuration(dur);
                setTrimRange([0, dur]);
                console.log("Detected Duration:", dur);
            }
        } catch (e) {
            console.error("Probe/Load failed", e);
            setErrorMessage("Failed to read file. Mobile browsers often restrict file access if the page is inactive. Please try uploading again.");
        } finally {
            setIsProbing(false);
        }
    };

    const handleProcess = async (mode: 'gif' | 'sprite' = 'gif', shouldDownload = true) => {
        if (!file || !ffmpegRef.current) return;
        setIsProcessing(true);
        if (mode === 'sprite') setIsSpriteWorker(true);

        const ffmpeg = ffmpegRef.current;

        // Detect extension
        const rawExt = file.file.name.split('.').pop()?.toLowerCase() || 'gif';
        // Normalize common extensions to prevent ffmpeg confusion if mimetype mismatch
        const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;

        const inputName = `edit_input.${ext}`;
        const outputName = mode === 'sprite' ? 'edit_output.png' : 'edit_output.gif';

        console.log(`[GifEditor] Processing ${file.file.name} (${file.file.type}, ${file.file.size} bytes) as ${inputName}`);

        if (file.file.size === 0) {
            setErrorMessage("Input file is empty (0 bytes).");
            setIsProcessing(false);
            return;
        }

        try {
            let inputName = sourceFileName;

            if (!isSourceReady || !inputName) {
                const rawExt = file.file.name.split('.').pop()?.toLowerCase() || 'gif';
                const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
                inputName = `input_source.${ext}`;
                await writeFileToFFmpeg(ffmpeg, inputName, file.file);
                setSourceFileName(inputName);
                setIsSourceReady(true);
            }

            // Validation: Check if file exists in FS
            try {
                await ffmpeg.readFile(inputName);
            } catch (e) {
                // If missing, try one last time to write it
                await writeFileToFFmpeg(ffmpeg, inputName, file.file);
            }

            // Build Filter Chain
            let filters = [];

            // 1. Crop
            // Use sourceImgRef (hidden full res) or imgRef (visible preview) or videoRef for dimensions
            const refImg = sourceImgRef.current || imgRef.current;
            const refVideo = videoRef.current;

            if (crop && crop.width && crop.height && (refImg || refVideo)) {
                // Crop is in %
                const natW = refImg ? refImg.naturalWidth : (refVideo?.videoWidth || 0);
                const natH = refImg ? refImg.naturalHeight : (refVideo?.videoHeight || 0);

                if (natW > 0 && natH > 0) {
                    const scaleX = natW / 100;
                    const scaleY = natH / 100;

                    const realX = Math.round(crop.x * scaleX);
                    const realY = Math.round(crop.y * scaleY);
                    const realW = Math.round(crop.width * scaleX);
                    const realH = Math.round(crop.height * scaleY);

                    filters.push(`crop=${realW}:${realH}:${realX}:${realY}`);
                }
            }

            // 2. Transform (Flip/Rotate)
            if (rotation === 90) filters.push('transpose=1');
            else if (rotation === 180) filters.push('transpose=1,transpose=1');
            else if (rotation === 270) filters.push('transpose=2');

            if (flipH) filters.push('hflip');
            if (flipV) filters.push('vflip');

            // 3. Speed / Reverse
            if (reverse) filters.push('reverse');
            if (speed !== 1) filters.push(`setpts=${1 / speed}*PTS`);

            // 4. Text
            if (text) {
                const fontLoaded = await loadFont(ffmpeg);
                if (fontLoaded) {
                    // Escape colons and single quotes
                    const sanitizedText = text.replace(/:/g, '\\:').replace(/'/g, '');
                    const yPos = `h-h*${textY}/100`;
                    // Simple drawtext without shadow for stability
                    filters.push(`drawtext=fontfile=font.ttf:text='${sanitizedText}':fontcolor=${textColor}:fontsize=${textSize}:x=(w-text_w)/2:y=${yPos}`);
                }
            }

            // 5. Trim (Time-based handled in args construction)

            // 5. Sprite Sheet
            if (mode === 'sprite') {
                setIsProcessing(true); // Ensure loading state

                // PASS 1: Detect Frame Count
                console.log("[GifEditor] Detecting frame count...");
                let detectedFrames = 0;

                const frameDetectLog = ({ message }: { message: string }) => {
                    // Look for "frame=  23" typical output during processing
                    const match = message.match(/frame=\s*(\d+)/);
                    if (match && match[1]) {
                        const val = parseInt(match[1]);
                        if (val > detectedFrames) detectedFrames = val;
                    }
                };

                ffmpeg.on('log', frameDetectLog);

                // Run a fast pass to count frames (scan file)
                await ffmpeg.exec(['-i', inputName, '-f', 'null', '-']);

                ffmpeg.off('log', frameDetectLog);

                // Fallback if detection failed (e.g. short file/cached logs), assume 100 to be safe or 10 if very small
                if (detectedFrames === 0) detectedFrames = 100;

                console.log(`[GifEditor] Detected ${detectedFrames} frames.`);

                // Calculate Grid
                const limit = 100;
                const processingFrames = Math.min(detectedFrames, limit);

                // Columns: Up to 10. If fewer frames than 10, just use N columns (1 row).
                const cols = Math.min(processingFrames, 10);

                // Rows: Calculate based on columns
                const rows = Math.ceil(processingFrames / 10);

                console.log(`[GifEditor] Adaptive Grid: ${cols}x${rows}`);

                // Resize frames to manageable size
                filters.push('scale=240:-1:flags=lanczos');
                // Limit to 100 frames max
                filters.push(`select='lt(n,${limit})'`);
                // Adaptive Tile
                filters.push(`tile=${cols}x${rows}:padding=2:margin=2:color=black`);
            }

            // Join
            const filterGraph = filters.length > 0 ? filters.join(',') : 'null';

            // Logs for debugging
            const logCallback = ({ message }: { message: string }) => console.log(`[FFmpeg-Sprite]: ${message}`);
            ffmpeg.on('log', logCallback);

            // Cleanup previous output if exists (prevent stale file issues)
            try { await ffmpeg.deleteFile(outputName); } catch (e) { }

            // Build Args
            const args = ['-y'];
            if (duration > 0 && (trimRange[0] > 0 || trimRange[1] < duration)) {
                args.push('-ss', trimRange[0].toString());
                args.push('-to', trimRange[1].toString());
            }
            args.push('-i', inputName);

            // CRITICAL FIX: Force single-threading for Sprite Sheet to prevent WASM heap corruption/deadlocks with 'tile' filter
            if (mode === 'sprite') {
                args.push('-threads', '1');
            } else {
                // For normal GIF, limit to 4 to be safe
                args.push('-threads', '4');
            }

            if (filters.length > 0) {
                args.push('-vf', filterGraph);
            }
            // Explicit format for safety
            if (mode === 'gif') {
                args.push('-f', 'gif');
            }
            args.push(outputName);

            console.log("Running FFmpeg:", args.join(' '));
            const ret = await ffmpeg.exec(args);

            ffmpeg.off('log', logCallback); // Cleanup listener

            if (ret !== 0) {
                throw new Error("FFmpeg encounted an error. Code: " + ret);
            }

            // Verify output exists
            try {
                const data = await ffmpeg.readFile(outputName);
                if (data.length === 0) throw new Error("Output file is empty");
            } catch (e) {
                if (mode === 'sprite') {
                    throw new Error("Failed to generate sprite sheet. The video/GIF might be too long (>100 frames) or too large. check console logs.");
                }
                throw e;
            }

            const mime = mode === 'sprite' ? 'image/png' : 'image/gif';
            const url = await readFileFromFFmpeg(ffmpeg, outputName, mime);
            setResultUrl(url);

            // Auto-download for "Realtime" feel
            if (shouldDownload) {
                if (mode === 'gif') {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `edited_${Date.now()}.gif`;
                    a.click();
                } else if (mode === 'sprite') {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `sprite_${Date.now()}.png`;
                    a.click();
                }
            }

            // Do NOT delete inputName (sourceFileName) to allow multi-preview without re-reading from File object
            // await ffmpeg.deleteFile(inputName);
            // await ffmpeg.deleteFile(outputName); // Keep strictly if we want to preview it too, but we auto-downloaded. 
            // Actually let's keep it for the preview URL to work.
            try { await ffmpeg.deleteFile('font.ttf'); } catch (e) { }

        } catch (e) {
            console.error(e);
            setErrorMessage(e instanceof Error ? e.message : "Unknown error occurred during processing");
        } finally {
            setIsProcessing(false);
            setIsSpriteWorker(false);
        }
    };

    if (engineStatus === 'error') {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-fade-in text-center">
                <AlertCircle size={32} className="text-red-500" />
                <h3 className="text-xl font-bold text-white">Engine Failed</h3>
                <p className="text-zinc-400">Failed to load GIF editor engine.</p>
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
            <div className="flex flex-col items-center justify-center p-12 space-y-4 animate-fade-in text-center">
                <Loader2 size={32} className="text-indigo-500 animate-spin" />
                <p className="text-zinc-400">Loading GIF Editor Engine...</p>
            </div>
        );
    }

    if (!file) {
        return (
            <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <Film size={32} /> GIF Editor
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Upload a GIF or Video to start editing.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={setFile}
                        label="Upload GIF/Video"
                        accept="image/gif,video/*"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Crop, label: 'Crop & Resize', desc: 'Custom aspect ratios' },
                        { icon: RotateCw, label: 'Transform', desc: 'Rotate and flip' },
                        { icon: Type, label: 'Text Overlay', desc: 'Add captions' },
                        { icon: Grid, label: 'Sprite Sheet', desc: 'Convert to grid' }
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
        <div className={`flex bg-[#0c0c0e] border border-zinc-800 rounded-[28px] md:rounded-[32px] overflow-hidden animate-slide-up shadow-[0_30px_100px_rgba(0,0,0,0.5)] relative ${isMobile ? 'flex-col h-[calc(100vh-140px)]' : 'h-full min-h-[600px]'}`}>
            {/* Tool Sidebar */}
            <div className={`${isMobile ? 'order-3 w-full border-t flex-row justify-around py-3 px-2 overflow-x-auto' : 'w-16 border-r flex-col items-center py-6'} border-zinc-800 flex gap-4 bg-[#0c0c0e] shrink-0 custom-scrollbar`}>
                <button
                    onClick={() => setActiveTool('crop')}
                    className={`p-3 rounded-xl transition-all duration-200 ${activeTool === 'crop' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Crop"
                >
                    <Crop size={22} />
                </button>
                <button
                    onClick={() => setActiveTool('transform')}
                    className={`p-3 rounded-xl transition-all duration-200 ${activeTool === 'transform' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Adjustments"
                >
                    <RotateCw size={22} />
                </button>
                <button
                    onClick={() => setActiveTool('text')}
                    className={`p-3 rounded-xl transition-all duration-200 ${activeTool === 'text' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Text"
                >
                    <Type size={22} />
                </button>
                <button
                    onClick={() => setActiveTool('trim')}
                    className={`p-3 rounded-xl transition-all duration-200 ${activeTool === 'trim' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Trim"
                >
                    <Scissors size={22} />
                </button>
                <button
                    onClick={() => setActiveTool('sprite')}
                    className={`p-3 rounded-xl transition-all duration-200 ${activeTool === 'sprite' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Sprite Sheet"
                >
                    <Grid size={22} />
                </button>

                {!isMobile && (
                    <div className="mt-auto flex flex-col gap-4 items-center">
                        <button
                            onClick={() => { setFile(null); setResultUrl(null); }}
                            className="p-3 text-zinc-500 hover:text-red-400 transition-colors"
                            title="Reset"
                        >
                            <RefreshCcw size={20} />
                        </button>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mb-2">
                            <Settings size={20} className="animate-pulse-slow" />
                        </div>
                    </div>
                )}
            </div>

            {/* Settings Side Panel */}
            <div className={`${isMobile ? 'order-2 w-full border-b max-h-[400px]' : 'w-80 border-r h-full'} border-zinc-800 p-6 flex flex-col bg-[#0c0c0e] shrink-0 overflow-y-auto custom-scrollbar`}>
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        {activeTool === 'crop' && <Crop size={20} />}
                        {activeTool === 'transform' && <RotateCw size={20} />}
                        {activeTool === 'text' && <Type size={20} />}
                        {activeTool === 'trim' && <Scissors size={20} />}
                        {activeTool === 'sprite' && <Grid size={20} />}
                        {activeTool} Settings
                    </h2>
                </div>

                <div className="flex-1 space-y-6">
                    {activeTool === 'crop' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Presets</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => {
                                        const img = sourceImgRef.current || imgRef.current;
                                        if (!img) return;
                                        const width = img.naturalWidth || img.width;
                                        const height = img.naturalHeight || img.height;
                                        const size = Math.min(width, height) * 0.9;
                                        setCrop({ unit: '%', width: (size / width) * 100, height: (size / height) * 100, x: ((width - size) / 2 / width) * 100, y: ((height - size) / 2 / height) * 100 });
                                    }} className="bg-zinc-900 hover:bg-zinc-800 text-white p-3 rounded-xl text-xs font-medium border border-zinc-800 transition-colors">Square (1:1)</button>
                                    <button onClick={() => {
                                        const img = sourceImgRef.current || imgRef.current;
                                        if (!img) return;
                                        const width = img.naturalWidth || img.width;
                                        const height = img.naturalHeight || img.height;
                                        const targetRatio = 16 / 9;
                                        let w = width * 0.9;
                                        let h = w / targetRatio;
                                        if (h > height) { h = height * 0.9; w = h * targetRatio; }
                                        setCrop({ unit: '%', width: (w / width) * 100, height: (h / height) * 100, x: ((width - w) / 2 / width) * 100, y: ((height - h) / 2 / height) * 100 });
                                    }} className="bg-zinc-900 hover:bg-zinc-800 text-white p-3 rounded-xl text-xs font-medium border border-zinc-800 transition-colors">Cinema (16:9)</button>
                                </div>
                            </div>
                            <button onClick={() => setCrop(undefined)} className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl text-xs font-medium border border-zinc-800 transition-colors">
                                Reset Crop
                            </button>
                        </div>
                    )}

                    {activeTool === 'transform' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Orientation</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setRotation((r) => (r + 90) % 360)} className="bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 border border-zinc-800 transition-all">
                                        <RotateCw size={16} />
                                        <span className="text-[10px] font-bold">Rotate 90°</span>
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setFlipH(!flipH)} className={`py-2.5 rounded-xl border flex items-center justify-center transition-all ${flipH ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800'}`}>
                                            <FlipHorizontal size={16} />
                                        </button>
                                        <button onClick={() => setFlipV(!flipV)} className={`py-2.5 rounded-xl border flex items-center justify-center transition-all ${flipV ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800'}`}>
                                            <FlipVertical size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Playback</label>
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        {[0.5, 1, 2].map(v => (
                                            <button key={v} onClick={() => setSpeed(v)} className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${speed === v ? 'bg-indigo-500 border-none text-white shadow-lg shadow-indigo-500/30' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>
                                                {v}x
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setReverse(!reverse)} className={`w-full py-3 rounded-xl text-xs font-bold border transition-all ${reverse ? 'bg-indigo-500 border-none text-white shadow-lg shadow-indigo-500/30' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>
                                        Reverse Playback
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTool === 'text' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Overlay Text</label>
                                <input
                                    type="text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Add caption..."
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Color</label>
                                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-xl p-1 cursor-pointer" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Size</label>
                                    <input type="number" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-sm" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Position (Y%)</label>
                                <Slider min={0} max={90} value={textY} onChange={(v) => setTextY(v as number)} trackStyle={[{ backgroundColor: '#6366f1' }]} handleStyle={[{ borderColor: '#6366f1', backgroundColor: '#fff' }]} railStyle={{ backgroundColor: '#18181b' }} />
                            </div>
                        </div>
                    )}

                    {activeTool === 'trim' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Duration</span>
                                <span className="text-xs text-white font-mono bg-black px-2 py-1 rounded-md">
                                    {(trimRange[1] - trimRange[0]).toFixed(1)}s
                                </span>
                            </div>

                            {isProbing ? (
                                <div className="flex flex-col items-center py-12 gap-3">
                                    <Loader2 className="animate-spin text-indigo-500" />
                                    <span className="text-xs text-zinc-500">Detecting sequence...</span>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="px-1 pt-4">
                                        <Slider
                                            range min={0} max={duration} step={0.1} value={trimRange}
                                            onChange={(val) => setTrimRange(val as [number, number])}
                                            trackStyle={[{ backgroundColor: '#6366f1' }]}
                                            handleStyle={[{ backgroundColor: '#fff', border: 'none', boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)' }, { backgroundColor: '#fff', border: 'none', boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)' }]}
                                            railStyle={{ backgroundColor: '#18181b', height: 6 }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Start</label>
                                                <button
                                                    onClick={() => {
                                                        if (videoRef.current) {
                                                            setTrimRange([videoRef.current.currentTime, trimRange[1]]);
                                                        }
                                                    }}
                                                    className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase transition-colors"
                                                >
                                                    Set Current
                                                </button>
                                            </div>
                                            <input type="number" step="0.1" value={trimRange[0].toFixed(1)} onChange={(e) => setTrimRange([Number(e.target.value), trimRange[1]])} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-xs" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">End</label>
                                                <button
                                                    onClick={() => {
                                                        if (videoRef.current) {
                                                            setTrimRange([trimRange[0], videoRef.current.currentTime]);
                                                        }
                                                    }}
                                                    className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase transition-colors"
                                                >
                                                    Set Current
                                                </button>
                                            </div>
                                            <input type="number" step="0.1" value={trimRange[1].toFixed(1)} onChange={(e) => setTrimRange([trimRange[0], Number(e.target.value)])} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-xs" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTool === 'sprite' && (
                        <div className="space-y-6 animate-fade-in text-center p-4">
                            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto mb-4 border border-indigo-500/20">
                                <Grid size={32} />
                            </div>
                            <h4 className="text-white font-bold text-sm">Convert to Sprite Sheet</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Stitches up to 100 frames into a single PNG grid. Perfect for game development and web animations.
                            </p>
                            <button
                                onClick={() => handleProcess('sprite', true)}
                                disabled={isProcessing}
                                className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Grid size={18} className="group-hover:rotate-12 transition-transform" />
                                {isProcessing && isSpriteWorker ? 'Generating...' : 'Export Sprite Sheet'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-6 border-t border-zinc-800 space-y-3">
                    {errorMessage && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-mono text-center">
                            {errorMessage}
                        </div>
                    )}
                    <button
                        onClick={() => handleProcess('gif', false)}
                        disabled={isProcessing}
                        className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-sm border border-zinc-800 transition-all flex items-center justify-center gap-2"
                    >
                        <Play size={16} />
                        Preview Changes
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleProcess('gif', true)}
                            disabled={isProcessing}
                            className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-extrabold text-sm shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <Download size={18} />
                            {isProcessing && !isSpriteWorker ? 'Processing...' : 'Download'}
                        </button>
                        {isMobile && (
                            <button
                                onClick={() => { setFile(null); setResultUrl(null); }}
                                className="p-4 bg-zinc-900 text-zinc-400 hover:text-red-400 border border-zinc-800 rounded-2xl transition-all flex items-center justify-center"
                                title="Reset"
                            >
                                <RefreshCcw size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Preview Area */}
            <div className={`${isMobile ? 'order-1 w-full flex-1 min-h-0' : 'flex-1 p-12'} bg-[#09090b] relative overflow-hidden flex items-center justify-center`}>
                {/* Dotted Background for the Workspace Area */}
                <div className="absolute inset-0 opacity-25 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                ></div>

                {!resultUrl ? (
                    <div className="relative z-10 max-w-full max-h-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        {file.type.startsWith('video') ? (
                            <div className="relative group">
                                <video ref={videoRef} src={file.previewUrl} controls className="max-w-full max-h-[600px] rounded-2xl relative z-10" />
                                <div className="absolute inset-0 border-2 border-dashed border-zinc-500/30 rounded-2xl pointer-events-none z-20" />
                            </div>
                        ) : (
                            <div className="relative inline-block border border-zinc-800 rounded-2xl overflow-hidden bg-black group">
                                <div className="absolute inset-0 border-2 border-dashed border-zinc-500/20 pointer-events-none z-30" />
                                {text && (
                                    <div
                                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-20 font-bold drop-shadow-lg"
                                        style={{
                                            bottom: `${textY}%`,
                                            color: textColor,
                                            fontSize: `${textSize}px`,
                                            textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4)',
                                            fontFamily: 'Unbounded, sans-serif'
                                        }}
                                    >
                                        {text}
                                    </div>
                                )}

                                <img ref={sourceImgRef} src={file.previewUrl} className="hidden" />

                                {activeTool === 'crop' ? (
                                    <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)}>
                                        <img ref={imgRef} src={file.previewUrl} className="max-w-full max-h-[600px]" />
                                    </ReactCrop>
                                ) : (
                                    crop && crop.width && crop.height ? (
                                        <div className="overflow-hidden relative max-h-[600px] inline-block">
                                            <div style={{
                                                width: `${100 / crop.width * 100}%`,
                                                height: `${100 / crop.height * 100}%`,
                                                marginLeft: `-${crop.x / crop.width * 100}%`,
                                                marginTop: `-${crop.y / crop.height * 100}%`,
                                                display: 'flex'
                                            }}>
                                                <img
                                                    src={file.previewUrl}
                                                    className="w-full h-full object-contain"
                                                    style={{ transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})` }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <img
                                            src={file.previewUrl}
                                            className="max-w-full max-h-[600px] transition-transform duration-500"
                                            style={{ transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})` }}
                                        />
                                    )
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative z-10 text-center space-y-8 animate-fade-in flex flex-col items-center max-w-4xl">
                        <div className="bg-indigo-500/10 text-indigo-400 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                            Process Complete
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                            <img src={resultUrl} className="relative max-w-full max-h-[550px] rounded-2xl shadow-2xl bg-black border border-zinc-800" />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setResultUrl(null)} className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all border border-zinc-800">
                                <ArrowLeft size={18} />
                                Edit More
                            </button>
                            <button className="px-8 py-4 bg-white text-black rounded-2xl font-extrabold flex items-center gap-2 hover:bg-zinc-200 transition-all shadow-xl shadow-white/5" onClick={() => { const a = document.createElement('a'); a.href = resultUrl; a.download = 'edited.gif'; a.click(); }}>
                                <Download size={18} />
                                Download Final
                            </button>
                        </div>
                    </div>
                )}

                {isProcessing && (
                    <div className="absolute inset-0 bg-[#0c0c0e]/90 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-fade-in">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full"></div>
                            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                        </div>
                        <p className="mt-6 text-white font-bold tracking-widest uppercase text-[10px]">
                            {isSpriteWorker ? 'Generating Grid...' : 'Processing GIF...'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
