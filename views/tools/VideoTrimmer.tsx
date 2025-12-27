/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Play, Pause, Scissors, Film, Volume2, RotateCcw, Loader2, AlertCircle, Download } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';

export const VideoTrimmer: React.FC = () => {
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
        const ffmpeg = ffmpegRef.current;
        const inputName = 'input.mp4';
        const outputName = 'output.mp4';

        try {
            // Convert percentage range to seconds
            const startTime = (range.start / 100) * duration;
            const endTime = (range.end / 100) * duration;
            const durationTime = endTime - startTime;

            // Write file
            await writeFileToFFmpeg(ffmpeg, inputName, file.file);

            // Cap threads at 4
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
            setIsProcessing(false);
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
        <div className="max-w-5xl mx-auto space-y-6 animate-slide-up">
            {/* Video Player Header */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                    <Film className="text-pink-500" />
                    {file.file.name}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                    <RotateCcw size={16} className="mr-2" /> Start Over
                </Button>
            </div>

            {/* Main Player Area */}
            <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl group">
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

                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={togglePlay}
                >
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                        {isPlaying ? <Pause fill="white" className="text-white" size={32} /> : <Play fill="white" className="text-white ml-1" size={32} />}
                    </div>
                </div>
            </div>

            {/* Timeline Editor */}
            <div className="bg-surface p-6 rounded-2xl border border-zinc-800 space-y-6">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-center text-sm text-zinc-400">
                            <span>Range Start: <span className="text-white font-mono">{((range.start / 100) * duration).toFixed(1)}s</span></span>
                            <span>Range End: <span className="text-white font-mono">{((range.end / 100) * duration).toFixed(1)}s</span></span>
                        </div>

                        {/* Timeline Visual */}
                        <div className="relative h-20 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 flex items-center select-none">
                            <style>{`
                      .thumb-input::-webkit-slider-thumb {
                        pointer-events: auto;
                        -webkit-appearance: none;
                        height: 5rem;
                        width: 30px;
                        background: transparent;
                        cursor: ew-resize;
                      }
                      .thumb-input::-moz-range-thumb {
                        pointer-events: auto;
                        height: 5rem;
                        width: 30px;
                        border: none;
                        background: transparent;
                        cursor: ew-resize;
                      }
                    `}</style>

                            <div className="absolute inset-0 flex opacity-30 pointer-events-none px-2">
                                {Array.from({ length: 40 }).map((_, i) => (
                                    <div key={i} className="flex-1 bg-zinc-700 border-r border-zinc-800 odd:bg-zinc-600"></div>
                                ))}
                            </div>

                            <div className="relative w-full h-full">
                                <input
                                    type="range"
                                    min="0" max="100"
                                    value={range.start}
                                    onChange={(e) => {
                                        const val = parseInt((e.target as HTMLInputElement).value);
                                        if (val < range.end - 1) {
                                            setRange(prev => ({ ...prev, start: val }));
                                            if (videoRef.current) videoRef.current.currentTime = (val / 100) * duration;
                                        }
                                    }}
                                    className="thumb-input absolute top-0 left-0 w-full h-full opacity-0 z-30 pointer-events-none appearance-none bg-transparent"
                                />
                                <input
                                    type="range"
                                    min="0" max="100"
                                    value={range.end}
                                    onChange={(e) => {
                                        const val = parseInt((e.target as HTMLInputElement).value);
                                        if (val > range.start + 1) {
                                            setRange(prev => ({ ...prev, end: val }));
                                            if (videoRef.current) videoRef.current.currentTime = (val / 100) * duration;
                                        }
                                    }}
                                    className="thumb-input absolute top-0 left-0 w-full h-full opacity-0 z-30 pointer-events-none appearance-none bg-transparent"
                                />

                                <div
                                    className="absolute top-0 bottom-0 bg-pink-500/10 backdrop-blur-[1px] pointer-events-none z-10"
                                    style={{ left: `${range.start}%`, right: `${100 - range.end}%` }}
                                >
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500">
                                        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 bg-white h-10 w-4 rounded-md shadow-lg flex items-center justify-center cursor-ew-resize">
                                            <div className="w-0.5 h-4 bg-zinc-300"></div>
                                        </div>
                                    </div>

                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-pink-500">
                                        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 bg-white h-10 w-4 rounded-md shadow-lg flex items-center justify-center cursor-ew-resize">
                                            <div className="w-0.5 h-4 bg-zinc-300"></div>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none z-0"
                                    style={{ width: `${range.start}%` }}
                                />
                                <div
                                    className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none z-0"
                                    style={{ width: `${100 - range.end}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-48 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-400 flex items-center gap-2"><Volume2 size={16} /> Playback</span>
                            <span className="text-white font-mono">{volume}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={(e) => setVolume(parseInt((e.target as HTMLInputElement).value))}
                            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        />
                    </div>
                </div>

                <div className="h-px bg-zinc-800"></div>

                <div className="flex justify-end gap-4 items-center">
                    {trimmedUrl ? (
                        <Button className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg shadow-pink-500/20 border-none" onClick={downloadTrimmed}>
                            <Download size={18} className="mr-2" /> Download Trimmed Clip
                        </Button>
                    ) : (
                        <Button
                            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 border-none"
                            onClick={handleExport}
                            isLoading={isProcessing}
                            disabled={isProcessing}
                        >
                            {isProcessing ? `Processing ${progress}%` : 'Trim Video'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
