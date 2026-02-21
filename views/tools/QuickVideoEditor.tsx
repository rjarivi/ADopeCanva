
import React, { useState, useRef, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Play, Pause, Scissors, Download, AlertCircle, Loader2, ArrowLeftToLine, ArrowRightToLine, Trash2, Layers, Monitor, Type, Spline, FastForward, Film, RotateCw, ZoomIn, ZoomOut, FlipHorizontal, FlipVertical, Volume2, VolumeX, Smartphone, Square, Maximize2, LayoutTemplate, Timer, Music, Video } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Select } from '../../components/ui/Select';

export const QuickVideoEditor: React.FC = () => {
    const isMobile = useIsMobile();
    const [file, setFile] = useState<FileData | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Editor State
    const [range, setRange] = useState({ start: 0, end: 100 });
    const [speed, setSpeed] = useState(1);
    const [aspectRatio, setAspectRatio] = useState('original');
    const [scaleMode, setScaleMode] = useState<'fit' | 'cover'>('fit');
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [volume, setVolume] = useState(100);
    const [textOverlay, setTextOverlay] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const prevVolumeRef = useRef(100);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [trimmedUrl, setTrimmedUrl] = useState<string | null>(null);

    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const ffmpegRef = useRef<FFmpeg | null>(null);

    // Initial Engine Load
    useEffect(() => {
        getFFmpeg()
            .then(ff => {
                ffmpegRef.current = ff;
                setEngineStatus('ready');
            })
            .catch((e) => {
                console.error(e);
                setErrorMessage(e instanceof Error ? e.message : 'Unknown error occurred');
                setEngineStatus('error');
            });
    }, []);

    // File Handling
    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file.file);
            setVideoUrl(url);
            setRange({ start: 0, end: 100 });
            setTrimmedUrl(null);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    // Volume Sync
    // Volume Sync
    useEffect(() => {
        if (videoRef.current) {
            // HTMLMediaElement volume is 0.0 to 1.0.
            // If we allow amplification (>100%), we can't preview it easily without WebAudio.
            // For now, clamp to 1 to prevent crashes.
            videoRef.current.volume = Math.min(volume / 100, 1);
            videoRef.current.playbackRate = speed;
        }
    }, [volume, speed]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            generateThumbnails();
        }
    };

    const generateThumbnails = async () => {
        if (!file) return;
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file.file);
        video.muted = true;
        video.preload = 'auto';

        await new Promise((resolve) => {
            video.onloadedmetadata = () => resolve(true);
            video.onerror = () => resolve(false);
        });

        if (!video.duration) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const count = 12;
        const newThumbnails: string[] = [];
        const interval = video.duration / count;

        canvas.width = 160;
        canvas.height = 90;

        for (let i = 0; i < count; i++) {
            video.currentTime = i * interval + 0.1;
            await new Promise(r => {
                video.onseeked = r;
                setTimeout(r, 200);
            });
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            newThumbnails.push(canvas.toDataURL('image/jpeg', 0.6));
        }

        setThumbnails(newThumbnails);
        video.remove();
    };

    const handleExport = async () => {
        if (!file || !ffmpegRef.current || !duration) return;

        setIsProcessing(true);
        setProgress(0);
        const ffmpeg = ffmpegRef.current;
        const inputName = 'input.mp4';
        const outputName = 'output.mp4';

        const onProgress = ({ progress }: { progress: number }) => {
            if (progress >= 0 && progress <= 1) {
                setProgress(Math.round(progress * 100));
            }
        };
        ffmpeg.on('progress', onProgress);

        try {
            const startTime = (range.start / 100) * duration;
            const endTime = (range.end / 100) * duration;
            const durationTime = endTime - startTime;

            await writeFileToFFmpeg(ffmpeg, inputName, file.file);

            const threads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
                ? Math.min(navigator.hardwareConcurrency, 4).toString()
                : '2';

            // Build Filters
            const filters: string[] = [];

            // Speed Filter
            if (speed !== 1) {
                filters.push(`setpts=${1 / speed}*PTS`);
            }

            // Aspect Ratio (Simple scaling/padding could be added here, but complex for now)
            // if (aspectRatio !== 'original') ... 

            // Construct complex filter string
            let filterComplex = '';
            if (filters.length > 0) {
                filterComplex = filters.join(',');
            }

            const args = [
                '-y',
                '-ss', startTime.toString(),
                '-i', inputName,
                '-t', durationTime.toString(),
                '-threads', threads,
            ];

            if (filterComplex) {
                args.push('-vf', filterComplex);
                // Audio tempo
                if (speed !== 1) {
                    args.push('-af', `atempo=${speed}`);
                }
            }

            args.push(
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                outputName
            );

            await ffmpeg.exec(args);

            const url = await readFileFromFFmpeg(ffmpeg, outputName, 'video/mp4');
            setTrimmedUrl(url);

            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

        } catch (e) {
            console.error(e);
            alert('Failed to process video. See console for details.');
        } finally {
            ffmpeg.off('progress', onProgress);
            setIsProcessing(false);
            setProgress(100);
        }
    };

    const downloadTrimmed = () => {
        if (!trimmedUrl) return;
        const a = document.createElement('a');
        a.href = trimmedUrl;
        const nameWithoutExt = file?.file.name.substring(0, file.file.name.lastIndexOf('.')) || 'video';
        a.download = `${nameWithoutExt}_edited.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (engineStatus === 'error') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
                <div className="bg-red-500/10 p-4 rounded-full text-red-500">
                    <AlertCircle size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Engine Failed</h3>
                    <p className="text-zinc-400 max-w-md mt-2">
                        The video engine could not load.
                    </p>
                    {errorMessage && (
                        <p className="text-red-400 text-sm font-mono bg-black/50 p-2 rounded max-w-lg mx-auto mt-2">
                            {errorMessage}
                        </p>
                    )}
                </div>
                <Button onClick={() => window.location.reload()} variant="secondary">Reload Page</Button>
            </div>
        );
    }

    if (engineStatus === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
                <div className="relative">
                    <Loader2 size={48} className="animate-spin text-indigo-500" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Film size={20} className="text-indigo-500/50" />
                    </div>
                </div>
                <p className="text-zinc-400 font-medium">Initializing Studio Engine...</p>
            </div>
        );
    }

    if (!file || !videoUrl) {
        return (
            <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center gap-3 font-unbounded">
                        <Video size={32} /> Quick Video Editor
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Professional editing suite in your browser.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={setFile}
                        accept="video/*"
                        label="Upload Video"
                        description="Drag & drop or click to browse"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: FastForward, label: 'Speed Control', desc: 'Adjust playback speed' },
                        { icon: Monitor, label: 'Aspect Ratio', desc: 'Resize for any platform' },
                        { icon: RotateCw, label: 'Transform', desc: 'Rotate, flip, and zoom' },
                        { icon: Scissors, label: 'Trim & Cut', desc: 'Precise timeline editing' }
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
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-7xl mx-auto rounded-3xl border border-zinc-800 h-[85vh] shadow-2xl'}`}>

            {/* Sidebar: Controls */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-l'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <Layers size={20} /> Studio Editor
                    </h2>
                    <button onClick={() => setFile(null)} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">

                    {/* Canvas Card */}
                    <section className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            <Monitor size={12} /> Canvas
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'original', label: 'Original', icon: Maximize2 },
                                { id: '16:9', label: '16:9', icon: Monitor },
                                { id: '9:16', label: '9:16', icon: Smartphone },
                                { id: '1:1', label: '1:1', icon: Square }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setAspectRatio(opt.id)}
                                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${aspectRatio === opt.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                                >
                                    <opt.icon size={16} />
                                    <span className="text-[10px] font-bold">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Layout Card */}
                    <section className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            <LayoutTemplate size={12} /> Layout
                        </div>

                        {/* Mode & Zoom Group */}
                        <div className="space-y-3">
                            {/* Mode Pucks */}
                            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                                {['Fit', 'Cover'].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setScaleMode(mode.toLowerCase() as 'fit' | 'cover')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${scaleMode === mode.toLowerCase() ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>

                            {/* Zoom Slider */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                                    <span>Zoom</span>
                                    <span className="text-indigo-400">{zoom.toFixed(1)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="0.1"
                                    value={zoom}
                                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Transform Actions */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                            <button
                                onClick={() => setRotation(r => (r + 90) % 360)}
                                className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center justify-center"
                                title="Rotate 90°"
                            >
                                <RotateCw size={14} />
                            </button>
                            <button
                                onClick={() => setFlipH(f => !f)}
                                className={`p-2.5 border rounded-lg transition-colors flex items-center justify-center ${flipH ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                                title="Flip H"
                            >
                                <FlipHorizontal size={14} />
                            </button>
                            <button
                                onClick={() => setFlipV(f => !f)}
                                className={`p-2.5 border rounded-lg transition-colors flex items-center justify-center ${flipV ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                                title="Flip V"
                            >
                                <FlipVertical size={14} />
                            </button>
                        </div>
                    </section>

                    {/* Speed Card */}
                    <section className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            <Timer size={12} /> Playback Speed
                        </div>
                        <div className="flex gap-1 mb-2">
                            {[0.5, 1.0, 1.5, 2.0].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSpeed(s)}
                                    className={`flex-1 py-1 text-[10px] font-mono rounded ${speed === s ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                                >
                                    {s}x
                                </button>
                            ))}
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.25"
                            value={speed}
                            onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </section>

                    {/* Audio Card */}
                    <section className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                                <Music size={12} /> Audio
                            </div>
                            <span className="text-zinc-500 font-mono">{volume}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    if (volume > 0) {
                                        prevVolumeRef.current = volume;
                                        setVolume(0);
                                    } else {
                                        setVolume(prevVolumeRef.current || 100);
                                    }
                                }}
                                className={`p-2 rounded-lg transition-colors ${volume === 0 ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                            >
                                {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="200"
                                value={volume}
                                onChange={(e) => setVolume(parseInt(e.target.value))}
                                className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                    </section>
                </div>

                {/* Sticky Action Buttons */}
                <div className="p-4 border-t border-zinc-900 bg-zinc-950 z-20 shrink-0">
                    {!trimmedUrl ? (
                        <Button className="w-full h-12 shadow-lg shadow-indigo-500/20 border-none rounded-xl font-bold tracking-wide" onClick={handleExport} isLoading={isProcessing} disabled={isProcessing} >
                            <Scissors size={18} className="mr-2" /> Export Video
                        </Button>
                    ) : (
                        <div className="space-y-3 animate-slide-up">
                            <Button className="w-full h-12 bg-white text-black hover:bg-zinc-200 shadow-lg rounded-xl font-bold" onClick={downloadTrimmed} >
                                <Download size={18} className="mr-2" /> Download
                            </Button>
                            <button
                                onClick={() => { setTrimmedUrl(null); setProgress(0); }}
                                className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider"
                            >
                                Continue Editing
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Preview Area */}
            <main className={`order-1 ${isMobile ? 'h-[55vh]' : 'flex-1'} relative bg-[#09090b] flex flex-col overflow-hidden shrink-0`}>

                {/* Viewport */}
                <div className="flex-1 min-h-0 relative flex items-center justify-center p-4 lg:p-10">
                    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                    <div
                        className="relative h-full max-h-full max-w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] group flex items-center justify-center ring-1 ring-white/5 transition-all duration-300 ease-in-out"
                        style={{
                            aspectRatio: aspectRatio === 'original' ? 'auto' : aspectRatio.replace(':', '/')
                        }}
                    >
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className={`w-full h-full transition-all duration-300 ${scaleMode === 'cover' ? 'object-cover' : 'object-contain'}`}
                            style={{
                                transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                                transition: 'transform 0.3s ease-out'
                            }}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onLoadedMetadata={handleLoadedMetadata}
                            onTimeUpdate={(e) => {
                                const currentPerc = (e.currentTarget.currentTime / e.currentTarget.duration) * 100;
                                if (currentPerc > range.end) {
                                    e.currentTarget.currentTime = (range.start / 100) * e.currentTarget.duration;
                                    e.currentTarget.pause();
                                    setIsPlaying(false);
                                }
                            }}
                        />

                        {/* Overlays (Text could go here) */}
                        {isProcessing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
                                <div className="space-y-6 text-center">
                                    <div className="relative w-20 h-20 mx-auto">
                                        <Loader2 size={80} className="animate-spin text-indigo-500 opacity-50 absolute inset-0" />
                                        <Loader2 size={80} className="animate-spin text-white absolute inset-0" strokeWidth={1} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                                        <div className="absolute inset-0 flex items-center justify-center font-black text-xl">{progress}%</div>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-white font-bold text-lg">Rendering</h3>
                                        <p className="text-zinc-400 text-sm">Applying filters & effects...</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Play Button Overlay */}
                        {!isPlaying && !isProcessing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all cursor-pointer z-10" onClick={togglePlay}>
                                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform group/btn">
                                    <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover/btn:bg-indigo-400 transition-colors">
                                        <Play fill="currentColor" className="text-white ml-1" size={32} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lower Area: Timeline & Controls */}
                <div className="h-48 bg-zinc-950 border-t border-zinc-900 flex flex-col shrink-0">
                    {/* Toolbar */}
                    {/* Toolbar */}
                    <div className="h-12 px-5 flex items-center justify-between border-b border-zinc-900 bg-zinc-900/20">
                        {/* Start Input */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        if (videoRef.current) {
                                            const currentPercent = (videoRef.current.currentTime / duration) * 100;
                                            setRange(prev => ({ ...prev, start: Math.min(currentPercent, prev.end - 0.1) }));
                                            setTrimmedUrl(null);
                                        }
                                    }}
                                    className="h-6 w-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                    title="Set Start to Current Time"
                                >
                                    <ArrowLeftToLine size={12} />
                                </button>
                                <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Start</span>
                            </div>
                            <div className="relative group">
                                <input
                                    type="number"
                                    className="bg-zinc-950 text-xs font-mono text-indigo-400 font-bold focus:outline-none focus:border-indigo-500/50 rounded px-2 py-1 w-20 border border-zinc-800 transition-all placeholder-zinc-700 shadow-sm"
                                    value={((range.start / 100) * duration).toFixed(2)}
                                    step={0.01}
                                    min={0}
                                    max={((range.end / 100) * duration).toFixed(2)}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                            const clamped = Math.max(0, Math.min(val, (range.end / 100) * duration - 0.1));
                                            setRange(prev => ({ ...prev, start: (clamped / duration) * 100 }));
                                            if (videoRef.current) videoRef.current.currentTime = clamped;
                                        }
                                    }}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 pointer-events-none opacity-50">s</span>
                            </div>
                        </div>

                        {/* Play/Pause Control */}
                        <div className="flex items-center justify-center">
                            <button
                                onClick={() => {
                                    if (videoRef.current) {
                                        if (videoRef.current.paused) {
                                            videoRef.current.play();
                                            setIsPlaying(true);
                                        } else {
                                            videoRef.current.pause();
                                            setIsPlaying(false);
                                        }
                                    }
                                }}
                                className="h-8 w-8 flex items-center justify-center rounded-full bg-indigo-500 hover:bg-indigo-400 text-white transition-all hover:scale-105 shadow-lg shadow-indigo-500/20"
                            >
                                {isPlaying ? (
                                    <Pause size={14} fill="currentColor" />
                                ) : (
                                    <Play size={14} fill="currentColor" className="ml-0.5" />
                                )}
                            </button>
                        </div>

                        {/* End Input */}
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">End</span>
                            <div className="relative group">
                                <input
                                    type="number"
                                    className="bg-zinc-950 text-xs font-mono text-indigo-400 font-bold focus:outline-none focus:border-indigo-500/50 rounded px-2 py-1 w-20 border border-zinc-800 transition-all text-right placeholder-zinc-700 shadow-sm"
                                    value={((range.end / 100) * duration).toFixed(2)}
                                    step={0.01}
                                    min={((range.start / 100) * duration).toFixed(2)}
                                    max={duration.toFixed(2)}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                            const clamped = Math.max((range.start / 100) * duration + 0.1, Math.min(val, duration));
                                            setRange(prev => ({ ...prev, end: (clamped / duration) * 100 }));
                                            if (videoRef.current) videoRef.current.currentTime = clamped;
                                        }
                                    }}
                                />
                                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 pointer-events-none opacity-50">s</span>
                            </div>
                            <button
                                onClick={() => {
                                    if (videoRef.current) {
                                        const currentPercent = (videoRef.current.currentTime / duration) * 100;
                                        setRange(prev => ({ ...prev, end: Math.max(currentPercent, prev.start + 0.1) }));
                                        setTrimmedUrl(null);
                                    }
                                }}
                                className="h-6 w-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                title="Set End to Current Time"
                            >
                                <ArrowRightToLine size={12} />
                            </button>
                        </div>
                    </div>

                    {/* Timeline Strip */}
                    <div className="flex-1 relative p-4 flex flex-col justify-center">
                        {/* Outer Container - No Overflow Hidden to allow handles to overhang */}
                        <div className="relative h-20 w-full bg-zinc-900 rounded-lg border border-zinc-800 select-none">

                            {/* Inner Container for Thumbnails - Overflow Hidden */}
                            <div className="absolute inset-0 rounded-lg overflow-hidden flex opacity-60">
                                {thumbnails.map((thumb, i) => (
                                    <img key={i} src={thumb} className="h-full flex-1 object-cover pointer-events-none" alt="frame" />
                                ))}
                                {thumbnails.length === 0 && (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px] font-bold uppercase tracking-widest">
                                        Generating Preview...
                                    </div>
                                )}
                            </div>

                            {/* Range Selector Overlay */}
                            <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
                                {/* Dimmed Areas */}
                                <div className="absolute top-0 bottom-0 left-0 bg-black/70 backdrop-blur-[1px] border-r border-indigo-500/50" style={{ width: `${range.start}%` }} />
                                <div className="absolute top-0 bottom-0 right-0 bg-black/70 backdrop-blur-[1px] border-l border-indigo-500/50" style={{ width: `${100 - range.end}%` }} />

                                {/* Active Window Border */}
                                <div
                                    className="absolute top-0 bottom-0 border-t-2 border-b-2 border-indigo-500 mix-blend-screen"
                                    style={{ left: `${range.start}%`, width: `${range.end - range.start}%` }}
                                />
                            </div>

                            {/* Input for Start (Left Handle) */}
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="0.1"
                                value={range.start}
                                onChange={(e) => {
                                    const val = Math.min(parseFloat(e.target.value), range.end - 1);
                                    setRange(prev => ({ ...prev, start: val }));
                                    setTrimmedUrl(null);
                                    if (videoRef.current) videoRef.current.currentTime = (val / 100) * duration;
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 z-30 appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-20 [&::-webkit-slider-thumb]:cursor-col-resize [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-20 [&::-moz-range-thumb]:cursor-col-resize"
                                title="Drag Start point"
                            />
                            {/* Input for End (Right Handle) */}
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="0.1"
                                value={range.end}
                                onChange={(e) => {
                                    const val = Math.max(parseFloat(e.target.value), range.start + 1);
                                    setRange(prev => ({ ...prev, end: val }));
                                    setTrimmedUrl(null);
                                    if (videoRef.current) videoRef.current.currentTime = (val / 100) * duration;
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 z-30 appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-20 [&::-webkit-slider-thumb]:cursor-col-resize [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-20 [&::-moz-range-thumb]:cursor-col-resize"
                                title="Drag End point"
                            />

                            {/* Visual Handles (Draggable targets) */}
                            {/* Start Handle: positioned at left edge of selection, extends INWARDS (Right) */}
                            <div className="absolute top-0 bottom-0 w-4 bg-indigo-500 hover:bg-indigo-400 z-20 flex items-center justify-center shadow-xl rounded-l-md pointer-events-none"
                                style={{ left: `${range.start}%` }}>
                                <div className="h-8 w-1 bg-white/50 rounded-full" />
                            </div>
                            {/* End Handle: positioned at right edge, extends INWARDS (Left) */}
                            <div className="absolute top-0 bottom-0 w-4 bg-indigo-500 hover:bg-indigo-400 z-20 flex items-center justify-center shadow-xl rounded-r-md pointer-events-none"
                                style={{ left: `${range.end}%`, transform: 'translateX(-100%)' }}>
                                <div className="h-8 w-1 bg-white/50 rounded-full" />
                            </div>

                        </div>
                        <div className="flex justify-between items-center mt-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">
                            <span>Start: {((range.start / 100) * duration).toFixed(1)}s</span>
                            <span>Duration: {(((range.end - range.start) / 100) * duration).toFixed(1)}s</span>
                            <span>End: {((range.end / 100) * duration).toFixed(1)}s</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
