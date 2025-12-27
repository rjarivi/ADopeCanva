/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Settings, Download, RefreshCcw, Scissors, Crop, RotateCw, Play, FastForward, Rewind, Type, Grid, AlertCircle, Loader2 } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import ReactCrop, { Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export const GifEditor: React.FC = () => {
    const [file, setFile] = useState<FileData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Tools
    const [activeTool, setActiveTool] = useState<'crop' | 'transform' | 'speed' | 'text'>('transform');

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

    const ffmpegRef = useRef<FFmpeg | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

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

    const handleProcess = async (mode: 'gif' | 'sprite' = 'gif') => {
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
            await writeFileToFFmpeg(ffmpeg, inputName, file.file);

            // Validation: Check if file exists in FS
            try {
                await ffmpeg.readFile(inputName);
            } catch (e) {
                throw new Error("Failed to write input file to memory. System might be out of memory.");
            }

            // Build Filter Chain
            let filters = [];

            // 1. Crop
            if (crop && crop.width && crop.height && imgRef.current) {
                const img = imgRef.current;
                const scaleX = img.naturalWidth / img.width;
                const scaleY = img.naturalHeight / img.height;

                const realX = Math.round(crop.x * scaleX);
                const realY = Math.round(crop.y * scaleY);
                const realW = Math.round(crop.width * scaleX);
                const realH = Math.round(crop.height * scaleY);

                filters.push(`crop=${realW}:${realH}:${realX}:${realY}`);
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
            const args = ['-y', '-i', inputName];

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

            await ffmpeg.deleteFile(inputName);
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
            <div className="flex flex-col items-center justify-center p-8 space-y-6 animate-fade-in">
                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-white">GIF Editor</h3>
                    <p className="text-zinc-400">Upload a GIF or Video to start editing.</p>
                </div>
                <div className="w-full max-w-xl bg-surface rounded-3xl p-8 border border-zinc-800">
                    <FileUploader onFileSelect={setFile} label="Upload GIF/Video" accept="image/gif,video/*" />
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up h-full">
            {/* Toolbar */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-surface rounded-3xl border border-zinc-800 p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white">Edit Tools</h3>
                        <Button variant="ghost" size="sm" onClick={() => { setFile(null); setResultUrl(null); }}>
                            <RefreshCcw size={16} /> Reset
                        </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 bg-zinc-900 p-1.5 rounded-xl">
                        <button onClick={() => setActiveTool('transform')} className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1 ${activeTool === 'transform' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}>
                            <RotateCw size={16} /> Transform
                        </button>
                        <button onClick={() => setActiveTool('crop')} className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1 ${activeTool === 'crop' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}>
                            <Crop size={16} /> Crop
                        </button>
                        <button onClick={() => setActiveTool('speed')} className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1 ${activeTool === 'speed' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}>
                            <FastForward size={16} /> Speed
                        </button>
                        <button onClick={() => setActiveTool('text')} className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1 ${activeTool === 'text' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}>
                            <Type size={16} /> Text
                        </button>
                    </div>

                    {activeTool === 'transform' && (
                        <div className="space-y-4 animate-fade-in">
                            <label className="text-sm font-medium text-zinc-400">Rotation & Flip</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setRotation((r) => (r + 90) % 360)} className="bg-zinc-800 p-3 rounded-xl hover:bg-zinc-700 flex items-center justify-center gap-2 text-zinc-300">
                                    <RotateCw size={18} /> {rotation}°
                                </button>
                                <button onClick={() => setFlipH(!flipH)} className={`bg-zinc-800 p-3 rounded-xl hover:bg-zinc-700 text-zinc-300 ${flipH ? 'border border-pink-500 text-pink-500' : ''}`}>
                                    Flip Horizontal
                                </button>
                            </div>
                        </div>
                    )}



                    {activeTool === 'speed' && (
                        <div className="space-y-4 animate-fade-in">
                            <label className="text-sm font-medium text-zinc-400">Playback Speed</label>
                            <input
                                type="range" min="0.5" max="3" step="0.5"
                                value={speed}
                                onChange={(e) => setSpeed(Number(e.target.value))}
                                className="w-full h-2 bg-zinc-700 rounded-lg accent-pink-500"
                            />
                            <div className="flex justify-between text-xs text-zinc-500 font-mono">
                                <span>0.5x</span>
                                <span className="text-white">{speed}x</span>
                                <span>3.0x</span>
                            </div>

                            {!file.type.startsWith('video') && speed !== 1 && (
                                <div className="text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded border border-yellow-500/20 mt-2">
                                    Note: Speed changes for GIFs are applied on Export, not visually previewed here.
                                </div>
                            )}

                            <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
                                <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} className="rounded border-zinc-700 bg-zinc-800 text-pink-500" />
                                <span className="text-sm text-zinc-300">Reverse Playback {file.type.startsWith('video') ? '(Export Only)' : ''}</span>
                            </div>
                        </div>
                    )}

                    {activeTool === 'text' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="space-y-2">
                                <label className="text-xs text-zinc-500 uppercase font-bold">Caption Text</label>
                                <input
                                    type="text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none"
                                    placeholder="Enter caption..."
                                />
                            </div>
                            <div className="flex gap-4">
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase font-bold block mb-1">Color</label>
                                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-10 w-10 rounded cursor-pointer bg-transparent" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-zinc-500 uppercase font-bold block mb-1">Size ({textSize}px)</label>
                                    <input type="range" min="12" max="72" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg accent-pink-500" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 uppercase font-bold block mb-1">Vertical Position ({textY}%)</label>
                                <input type="range" min="0" max="100" value={textY} onChange={(e) => setTextY(Number(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg accent-pink-500" />
                            </div>
                        </div>
                    )}

                    {activeTool === 'crop' && (
                        <div className="text-center p-8 text-zinc-500 text-sm space-y-4">
                            <p>Drag on the image to crop.</p>
                            <Button size="sm" variant="secondary" onClick={() => setActiveTool('transform')} className="w-full">
                                Done
                            </Button>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center space-y-1 animate-fade-in mb-4">
                            <p className="text-red-400 text-sm font-medium">{errorMessage}</p>
                        </div>
                    )}

                    <div className="space-y-3 mt-4">
                        <Button onClick={() => { setErrorMessage(''); handleProcess('gif'); }} isLoading={isProcessing && !isSpriteWorker} className="w-full bg-pink-600 hover:bg-pink-700 border-none h-12">
                            <Download size={18} className="mr-2" /> Download GIF
                        </Button>
                        <Button onClick={() => { setErrorMessage(''); handleProcess('sprite'); }} isLoading={isProcessing && isSpriteWorker} variant="secondary" className="w-full h-10 text-sm">
                            <Grid size={16} className="mr-2" /> Export as Sprite Sheet
                        </Button>
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="lg:col-span-2 bg-black/50 rounded-3xl border border-zinc-800 relative flex items-center justify-center p-8 overflow-hidden">
                {!resultUrl ? (
                    <div className="relative max-w-full max-h-full">
                        {file.type.startsWith('video') ? (
                            <video ref={videoRef} src={file.previewUrl} controls className="max-w-full max-h-[500px] rounded-lg shadow-2xl" />
                        ) : (
                            <div className="relative inline-block">
                                {/* Text Overlay */}
                                {text && (
                                    <div
                                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-20 font-bold"
                                        style={{
                                            bottom: `${textY}%`,
                                            color: textColor,
                                            fontSize: `${textSize}px`,
                                            textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                                            fontFamily: 'Arial, sans-serif'
                                        }}
                                    >
                                        {text}
                                    </div>
                                )}

                                {activeTool === 'crop' ? (
                                    <ReactCrop crop={crop} onChange={c => setCrop(c)}>
                                        <img ref={imgRef} src={file.previewUrl} className="max-w-full max-h-[500px] rounded-lg shadow-2xl" />
                                    </ReactCrop>
                                ) : (
                                    <img
                                        src={file.previewUrl}
                                        className="max-w-full max-h-[500px] rounded-lg shadow-2xl transition-transform duration-300"
                                        style={{
                                            transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center space-y-4 animate-fade-in">
                        <img src={resultUrl} className="max-w-full max-h-[500px] rounded-lg shadow-2xl border-4 border-green-500/20" />
                        <Button className="bg-white text-black" onClick={() => { const a = document.createElement('a'); a.href = resultUrl; a.download = 'edited.gif'; a.click(); }}>
                            <Download size={18} className="mr-2" /> Download
                        </Button>
                    </div>
                )}

                {isProcessing && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-pink-400 font-bold">{isSpriteWorker ? 'Generating Sprites...' : 'Applying Magic...'}</p>
                    </div>
                )}
            </div>
        </div >
    );
};
