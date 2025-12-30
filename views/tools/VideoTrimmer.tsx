/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Play, Pause, Scissors, Film, Volume2, RotateCcw, Loader2, AlertCircle, Download, Settings, Share2, Trash2, Undo2, Maximize, Clock } from 'lucide-react';
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
        }
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
                <Loader2 size={32} className="animate-spin text-pink-500" />
                <p className="text-zinc-400">Loading Video Engine...</p>
            </div>
        );
    }

    if (!file || !videoUrl) {
        return (
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-400">
                        Precision Video Trimmer
                    </h2>
                    <p className="text-zinc-400">Cut out the boring parts using FFmpeg Engine.</p>
                </div>
                <div className="p-8 bg-surface rounded-3xl shadow-xl border border-zinc-800/50">
                    <FileUploader
                        onFileSelect={setFile}
                        accept="video/*"
                        label="Upload Video"
                        description="MP4, MOV, AVI up to 500MB"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-pink-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

            {/* Navigation removed as per simplified workflow */}

            {/* 2. Settings Panel */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-semibold text-[10px] text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Scissors size={14} className="text-pink-500" /> Video Editor
                    </h2>
                    <button onClick={() => setFile(null)} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Trim Controls */}
                        <section className="space-y-4">
                            <SectionLabel>Time Range</SectionLabel>
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Start</p>
                                    <p className="text-lg font-mono text-white tracking-tighter">{((range.start / 100) * duration).toFixed(2)}s</p>
                                </div>
                                <div className="w-px h-8 bg-zinc-800" />
                                <div className="space-y-1 text-right">
                                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">End</p>
                                    <p className="text-lg font-mono text-white tracking-tighter">{((range.end / 100) * duration).toFixed(2)}s</p>
                                </div>
                            </div>

                            <div className="relative h-12 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center group">
                                <div className="absolute left-4 right-4 h-1.5 bg-zinc-800 rounded-full">
                                    <div
                                        className="absolute h-full bg-pink-500/50 rounded-full transition-all duration-100"
                                        style={{ left: `${range.start}%`, width: `${range.end - range.start}%` }}
                                    />
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-pink-500 shadow-lg -translate-x-1/2 pointer-events-none transition-all duration-100"
                                        style={{ left: `${range.start}%` }}
                                    />
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-pink-500 shadow-lg -translate-x-1/2 pointer-events-none transition-all duration-100"
                                        style={{ left: `${range.end}%` }}
                                    />
                                </div>
                                <input type="range" min="0" max="100" value={range.start} onChange={(e) => { setRange(prev => ({ ...prev, start: Math.min(parseInt(e.target.value), prev.end - 1) })); setTrimmedUrl(null); }} className="absolute left-4 right-4 h-full opacity-0 cursor-pointer z-10" />
                                <input type="range" min="0" max="100" value={range.end} onChange={(e) => { setRange(prev => ({ ...prev, end: Math.max(parseInt(e.target.value), prev.start + 1) })); setTrimmedUrl(null); }} className="absolute left-4 right-4 h-full opacity-0 cursor-pointer z-10" />
                            </div>
                            <p className="text-[10px] text-zinc-600 text-center uppercase font-bold tracking-widest italic opacity-50">Drag handles to adjust clip</p>
                        </section>

                        {/* Player Controls */}
                        <section className="space-y-3">
                            <SectionLabel>Preview</SectionLabel>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={togglePlay}
                                    className="flex items-center justify-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all uppercase font-bold text-[10px]"
                                >
                                    {isPlaying ? <Pause size={14} /> : <Play size={14} />} {isPlaying ? 'Stop' : 'Play'}
                                </button>
                                <button
                                    onClick={() => { if (videoRef.current) videoRef.current.currentTime = (range.start / 100) * duration }}
                                    className="flex items-center justify-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all uppercase font-bold text-[10px]"
                                >
                                    <RotateCcw size={14} /> Rewind
                                </button>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <SliderControl
                                label="Monitor Volume"
                                value={volume}
                                min={0}
                                max={100}
                                onChange={setVolume}
                                unit="%"
                            />
                        </section>

                        {/* Action Buttons */}
                        <div className="pt-4 space-y-3">
                            {!trimmedUrl ? (
                                <Button
                                    className="w-full h-12 bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-500/20 uppercase font-black text-[10px] tracking-widest"
                                    onClick={handleExport}
                                    isLoading={isProcessing}
                                    disabled={isProcessing}
                                >
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
                                    <Button
                                        className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-black uppercase text-[10px] tracking-widest shadow-lg"
                                        onClick={downloadTrimmed}
                                    >
                                        <Download size={18} className="mr-2" /> Download Clip
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="w-full h-12 border-zinc-800 font-bold uppercase text-[10px] tracking-widest"
                                        onClick={() => {
                                            setTrimmedUrl(null);
                                            setProgress(0);
                                        }}
                                    >
                                        <Undo2 size={16} className="mr-2" /> Adjust Selection
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Metadata Info */}
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
                    </div>
                </div>
            </aside>

            {/* 3. Preview Area */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                <div className="relative w-full h-full bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl group flex items-center justify-center">
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
                            }
                        }}
                    />

                    {isProcessing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/40 backdrop-blur-[2px]">
                            <div className="relative w-16 h-16 flex items-center justify-center mb-4">
                                <div className="absolute inset-0 border-2 border-pink-500/20 rounded-full"></div>
                                <div
                                    className="absolute inset-0 border-2 border-pink-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                                    style={{ animationDuration: '0.8s' }}
                                ></div>
                                <span className="text-[10px] font-bold text-white font-mono">{progress}%</span>
                            </div>
                            <p className="text-[10px] text-pink-400 font-bold uppercase tracking-[0.2em] animate-pulse">
                                {progress < 100 ? 'Trimming Video' : 'Finalizing'}
                            </p>
                        </div>
                    )}

                    <div
                        className={`absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${isProcessing ? 'pointer-events-none' : ''}`}
                        onClick={togglePlay}
                    >
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition-all border border-white/5 shadow-2xl">
                            {isPlaying ? <Pause fill="white" className="text-white" size={32} /> : <Play fill="white" className="text-white ml-1" size={32} />}
                        </div>
                    </div>

                    <div className="absolute top-4 left-4 flex gap-2">
                        <span className="bg-pink-500/90 text-[10px] text-white px-2 py-1 rounded font-bold uppercase tracking-widest backdrop-blur-md">Stage View</span>
                        <span className="bg-black/60 text-[10px] text-zinc-300 px-2 py-1 rounded font-bold uppercase tracking-widest backdrop-blur-md border border-white/5">H.264 HD</span>
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-1 bg-zinc-800 rounded-full overflow-hidden opacity-50">
                        <div className="h-full bg-pink-500 transition-all duration-100" style={{ width: `${(videoRef.current?.currentTime || 0) / (duration || 1) * 100}%` }} />
                    </div>
                </div>
            </main>
        </div>
    );
};
