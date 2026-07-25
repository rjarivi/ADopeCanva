/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Play, Pause, Scissors, Film, Volume2, RotateCcw, Loader2, AlertCircle, Download, Settings, Share2, Trash2, Undo2, Maximize, Clock, ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { SectionLabel, SliderControl } from '../../components/EditorControls';

import { useIsMobile } from '../../hooks/useIsMobile';

export const VideoTrimmer: React.FC = () => {
    const isMobile = useIsMobile();
    const [file, setFile] = useState<FileData | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [range, setRange] = useState({ start: 0, end: 100 });
    const [volume, setVolume] = useState(100);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [trimmedUrl, setTrimmedUrl] = useState<string | null>(null);

    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const ffmpegRef = useRef<FFmpeg | null>(null);

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

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file.file);
            setVideoUrl(url);
            setRange({ start: 0, end: 100 });
            setTrimmedUrl(null);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume / 100;
        }
    }, [volume]);

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
        video.preload = 'auto'; // Ensure metadata loads

        await new Promise((resolve) => {
            video.onloadedmetadata = () => resolve(true);
            video.onerror = () => resolve(false); // Fallback
        });

        if (!video.duration) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const count = 12; // Number of thumbnails
        const newThumbnails: string[] = [];
        const interval = video.duration / count;

        // Aspect ratio 16:9 roughly
        canvas.width = 160;
        canvas.height = 90;

        // Sequentially grab frames
        for (let i = 0; i < count; i++) {
            video.currentTime = i * interval + 0.1; // Offset slightly to avoid black frames
            await new Promise(r => {
                video.onseeked = r;
                // Timeout fallback in case seek hangs
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

        // Progress Handler
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

            await ffmpeg.exec([
                '-y',
                '-ss', startTime.toString(),
                '-i', inputName,
                '-t', durationTime.toString(),
                '-threads', threads,
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-c:a', 'aac',
                outputName
            ]);

            const url = await readFileFromFFmpeg(ffmpeg, outputName, 'video/mp4');
            setTrimmedUrl(url);

            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

        } catch (e) {
            console.error(e);
            alert('Failed to trim video. See console for details.');
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
        a.download = `${nameWithoutExt}_trimmed.mp4`;
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
                <Loader2 size={32} className="animate-spin text-indigo-500" />
                <p className="text-zinc-400">Loading Video Engine...</p>
            </div>
        );
    }

    if (!file || !videoUrl) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <Scissors size={32} /> Precision Video Trimmer
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Cut out the boring parts using FFmpeg Engine.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={setFile}
                        accept="video/*"
                        label="Upload Video"
                        description="MP4, MOV, AVI up to 500MB"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Scissors, label: 'Precise Cut', desc: 'Frame-perfect trimming' },
                        { icon: Clock, label: 'Fast Process', desc: 'No re-encoding needed' },
                        { icon: Settings, label: 'Adjustments', desc: 'Fine-tune selection' },
                        { icon: Film, label: 'Preview', desc: 'Instant playback' }
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

            {/* Navigation removed as per simplified workflow */}

            {/* 2. Settings Panel */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-l'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <Scissors size={20} /> Video Editor
                    </h2>
                    <button onClick={() => setFile(null)} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Precision Controls & Metadata */}
                        <section className="space-y-4">
                            <SectionLabel>Precision Adjust</SectionLabel>
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex gap-4 items-center">
                                <div className="space-y-1.5 flex-1">
                                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest pl-1">Start Time</p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={((range.start / 100) * duration).toFixed(2)}
                                            onChange={(e) => {
                                                const val = Math.max(0, Math.min(Number(e.target.value), (range.end / 100) * duration - 0.1));
                                                setRange(prev => ({ ...prev, start: (val / duration) * 100 }));
                                                setTrimmedUrl(null);
                                            }}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 text-white text-xs font-mono outline-none focus:border-indigo-500/50"
                                        />
                                        <button
                                            onClick={() => {
                                                if (videoRef.current) {
                                                    const currentPercent = (videoRef.current.currentTime / duration) * 100;
                                                    setRange(prev => ({ ...prev, start: Math.min(currentPercent, prev.end - 1) }));
                                                    setTrimmedUrl(null);
                                                }
                                            }}
                                            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                            title="Set Start to Current Time"
                                        >
                                            <ArrowLeftToLine size={12} />
                                        </button>
                                    </div>
                                </div>
                                <div className="w-px h-10 bg-zinc-800" />
                                <div className="space-y-1.5 flex-1">
                                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest text-right pr-1">End Time</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                if (videoRef.current) {
                                                    const currentPercent = (videoRef.current.currentTime / duration) * 100;
                                                    setRange(prev => ({ ...prev, end: Math.max(currentPercent, prev.start + 1) }));
                                                    setTrimmedUrl(null);
                                                }
                                            }}
                                            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                            title="Set End to Current Time"
                                        >
                                            <ArrowRightToLine size={12} />
                                        </button>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={((range.end / 100) * duration).toFixed(2)}
                                            onChange={(e) => {
                                                const val = Math.min(duration, Math.max(Number(e.target.value), (range.start / 100) * duration + 0.1));
                                                setRange(prev => ({ ...prev, end: (val / duration) * 100 }));
                                                setTrimmedUrl(null);
                                            }}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 text-white text-xs font-mono text-right outline-none focus:border-indigo-500/50"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-zinc-900/40 p-4 rounded-xl space-y-3 border border-zinc-800/50">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-500 font-bold uppercase tracking-widest">Source Duration</span>
                                <span className="text-zinc-300 font-mono">{duration.toFixed(2)}s</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-500 font-bold uppercase tracking-widest">Format</span>
                                <span className="text-zinc-300 font-mono uppercase">MP4 (H.264)</span>
                            </div>
                        </section>

                        {/* Action Buttons (Restored to Sidebar) */}
                        <div className="pt-4 space-y-3 border-t border-zinc-900">
                            {!trimmedUrl ? (
                                <Button className="w-full h-12 shadow-lg shadow-indigo-500/20 border-none" onClick={handleExport} isLoading={isProcessing} disabled={isProcessing} >
                                    {isProcessing ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 size={16} className="animate-spin" />
                                            Processing {progress}%
                                        </span>
                                    ) : (
                                        <><Scissors size={18} className="mr-2" /> Start Trimming</>
                                    )}
                                </Button>
                            ) : (
                                <div className="space-y-3 animate-slide-up">
                                    <Button className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg" onClick={downloadTrimmed} >
                                        <Download size={18} className="mr-2" /> Download Clip
                                    </Button>
                                    <Button variant="secondary" className="w-full h-12 border-zinc-800 font-bold uppercase text-[10px] tracking-widest" onClick={() => {
                                            setTrimmedUrl(null);
                                            setProgress(0);
                                        }}
                                    >
                                        <Undo2 size={16} className="mr-2" /> Adjust Selection
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* 3. Preview & Timeline Area */}
            <main className={`order-1 ${isMobile ? 'h-[55vh]' : 'flex-1'} relative bg-[#09090b] flex flex-col overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner`}>

                {/* Upper Area: Player */}
                <div className="flex-1 relative flex items-center justify-center p-4 md:p-8 overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                    <div className="relative w-full h-full max-h-full aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl group flex items-center justify-center">
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className="w-full h-full object-contain"
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

                        {isProcessing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/40 backdrop-blur-[2px]">
                                <div className="text-center space-y-4 animate-in fade-in">
                                    <div className="relative w-16 h-16 flex items-center justify-center mx-auto">
                                        <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full"></div>
                                        <div
                                            className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                            style={{ animationDuration: '0.8s' }}
                                        ></div>
                                        <span className="text-[10px] font-bold text-white font-mono">{progress}%</span>
                                    </div>
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] animate-pulse">
                                        {progress < 100 ? 'Encoding Buffer' : 'Finalizing'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {!isPlaying && !isProcessing && (
                            <div
                                className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity cursor-pointer group-hover:bg-black/20"
                                onClick={togglePlay}
                            >
                                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition-all border border-white/5 shadow-2xl text-white">
                                    <Play fill="currentColor" className="ml-1" size={32} />
                                </div>
                            </div>
                        )}

                        {/* Playhead Overlay */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] pointer-events-none">
                            <div className="w-full h-1 bg-zinc-800/50 rounded-full overflow-hidden backdrop-blur-sm">
                                <div className="h-full bg-indigo-500 transition-all duration-75" style={{ width: `${(videoRef.current?.currentTime || 0) / (duration || 1) * 100}%` }} />
                            </div>
                        </div>

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
