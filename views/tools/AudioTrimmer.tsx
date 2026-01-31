
import React, { useState, useRef, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Play, Pause, Scissors, Volume2, RotateCcw, Loader2, AlertCircle, Download, Trash2, Undo2, Music, Mic2 } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { useIsMobile } from '../../hooks/useIsMobile';

export const AudioTrimmer: React.FC = () => {
    const isMobile = useIsMobile();
    const [file, setFile] = useState<FileData | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [range, setRange] = useState({ start: 0, end: 100 });
    const [volume, setVolume] = useState(100);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [trimmedUrl, setTrimmedUrl] = useState<string | null>(null);

    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);

    // Audio Visualizer Canvas
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

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
            setAudioUrl(url);
            setRange({ start: 0, end: 100 });
            setTrimmedUrl(null);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume / 100;
        }
    }, [volume]);

    // Simple visualizer effect
    useEffect(() => {
        if (!isPlaying || !canvasRef.current) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            if (!canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const bars = 50;
            const barWidth = canvas.width / bars;

            ctx.fillStyle = '#6366f1'; // Indigo-500

            for (let i = 0; i < bars; i++) {
                const height = Math.random() * canvas.height * 0.8;
                const x = i * barWidth;
                const y = (canvas.height - height) / 2;
                ctx.fillRect(x, y, barWidth - 2, height);
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying]);

    // Handle Global Dragging
    useEffect(() => {
        if (!draggingHandle) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!sliderRef.current) return;
            const rect = sliderRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const percentage = (x / rect.width) * 100;

            if (draggingHandle === 'start') {
                const newStart = Math.min(percentage, range.end - 1);
                setRange(prev => ({ ...prev, start: newStart }));
            } else {
                const newEnd = Math.max(percentage, range.start + 1);
                setRange(prev => ({ ...prev, end: newEnd }));
            }
            setTrimmedUrl(null);
        };

        const handleMouseUp = () => {
            setDraggingHandle(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingHandle, range]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
        const current = e.currentTarget.currentTime;
        const dur = e.currentTarget.duration || 1;
        setCurrentTime(current);

        const currentPerc = (current / dur) * 100;
        if (currentPerc > range.end) {
            e.currentTarget.currentTime = (range.start / 100) * dur;
        }
    };

    const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
        setDuration(e.currentTarget.duration);
    };

    const handleExport = async () => {
        if (!file || !ffmpegRef.current || !duration) return;

        setIsProcessing(true);
        setProgress(0);
        const ffmpeg = ffmpegRef.current;
        const inputName = `input${file.file.name.substring(file.file.name.lastIndexOf('.'))}`;
        const outputName = 'output.mp3';

        // Progress Handler
        const onProgress = ({ progress }: { progress: number }) => {
            if (progress >= 0 && progress <= 1) {
                setProgress(Math.round(progress * 100));
            }
        };
        ffmpeg.on('progress', onProgress);

        try {
            const startTime = ((range.start / 100) * duration).toFixed(3);
            const durationTime = (((range.end - range.start) / 100) * duration).toFixed(3);

            await writeFileToFFmpeg(ffmpeg, inputName, file.file);

            await ffmpeg.exec([
                '-y',
                '-ss', startTime,
                '-i', inputName,
                '-t', durationTime,
                '-c:a', 'libmp3lame',
                '-q:a', '2', // High quality VBR
                outputName
            ]);

            const url = await readFileFromFFmpeg(ffmpeg, outputName, 'audio/mp3');
            setTrimmedUrl(url);

            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

        } catch (e) {
            console.error(e);
            alert('Failed to trim audio. See console for details.');
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
        const nameWithoutExt = file?.file.name.substring(0, file.file.name.lastIndexOf('.')) || 'audio';
        a.download = `${nameWithoutExt}_trimmed.mp3`;
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
                        The audio engine could not load.
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
                <p className="text-zinc-400">Loading Audio Engine...</p>
            </div>
        );
    }

    if (!file || !audioUrl) {
        return (
            <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3 font-unbounded">
                        <div className="text-indigo-400"><Scissors size={32} /></div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400">
                            Audio Trimmer Studio
                        </span>
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Trim and cut audio files with precision.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={setFile}
                        accept="audio/*"
                        label="Upload Audio"
                        description="MP3, WAV, AAC, OGG up to 100MB"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Scissors, label: 'Precise Trim', desc: 'Millisecond cuts' },
                        { icon: Mic2, label: 'Visualize', desc: 'Audio waveform view' },
                        { icon: Volume2, label: 'Volume', desc: 'Adjust gain levels' },
                        { icon: Download, label: 'Export MP3', desc: 'High quality output' }
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

            {/* Sidebar Controls */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-l'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <Scissors size={20} /> Audio Editor
                    </h2>
                    <button onClick={() => setFile(null)} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="space-y-8 animate-in fade-in duration-300">

                        <section className="space-y-4">
                            <SectionLabel>Clip Range</SectionLabel>

                            {/* Time Inputs */}
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                                <div className="space-y-2 flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Start</p>
                                        <button
                                            onClick={() => {
                                                const currentPercent = (currentTime / duration) * 100;
                                                setRange(prev => ({ ...prev, start: Math.min(currentPercent, prev.end - 1) }));
                                                setTrimmedUrl(null);
                                            }}
                                            className="text-[8px] text-indigo-400 hover:text-indigo-300 font-bold uppercase transition-colors"
                                        >
                                            Current
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={((range.start / 100) * duration).toFixed(2)}
                                        onChange={(e) => {
                                            const val = Math.max(0, Math.min(Number(e.target.value), (range.end / 100) * duration - 0.1));
                                            setRange(prev => ({ ...prev, start: (val / duration) * 100 }));
                                            setTrimmedUrl(null);
                                        }}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 text-white text-xs font-mono outline-none focus:border-indigo-500/50"
                                    />
                                </div>
                                <div className="w-px h-12 bg-zinc-800 mx-4" />
                                <div className="space-y-2 flex-1">
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => {
                                                const currentPercent = (currentTime / duration) * 100;
                                                setRange(prev => ({ ...prev, end: Math.max(currentPercent, prev.start + 1) }));
                                                setTrimmedUrl(null);
                                            }}
                                            className="text-[8px] text-indigo-400 hover:text-indigo-300 font-bold uppercase transition-colors"
                                        >
                                            Current
                                        </button>
                                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">End</p>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.1"
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

                            {/* Range Slider */}
                            <div
                                className="relative h-12 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center group cursor-pointer"
                                ref={sliderRef}
                                onMouseDown={(e) => {
                                    if (!sliderRef.current) return;
                                    const rect = sliderRef.current.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const percentage = (x / rect.width) * 100;

                                    // Determine closest handle
                                    const distStart = Math.abs(percentage - range.start);
                                    const distEnd = Math.abs(percentage - range.end);

                                    if (distStart < distEnd) {
                                        setRange(prev => ({ ...prev, start: Math.min(percentage, prev.end - 1) }));
                                        setDraggingHandle('start');
                                    } else {
                                        setRange(prev => ({ ...prev, end: Math.max(percentage, prev.start + 1) }));
                                        setDraggingHandle('end');
                                    }
                                }}
                            >
                                <div className="absolute left-4 right-4 h-1.5 bg-zinc-800 rounded-full pointer-events-none">
                                    <div
                                        className="absolute h-full bg-indigo-500/50 rounded-full transition-all duration-75"
                                        style={{ left: `${range.start}%`, width: `${range.end - range.start}%` }}
                                    />
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-indigo-500 shadow-lg -translate-x-1/2 cursor-grab active:cursor-grabbing pointer-events-auto hover:scale-125 transition-transform"
                                        style={{ left: `${range.start}%`, zIndex: 10 }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setDraggingHandle('start');
                                        }}
                                    />
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-indigo-500 shadow-lg -translate-x-1/2 cursor-grab active:cursor-grabbing pointer-events-auto hover:scale-125 transition-transform"
                                        style={{ left: `${range.end}%`, zIndex: 10 }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setDraggingHandle('end');
                                        }}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Controls */}
                        <section className="space-y-3">
                            <SectionLabel>Playback</SectionLabel>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={togglePlay}
                                    className="flex items-center justify-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all font-bold uppercase text-[10px] tracking-widest"
                                >
                                    {isPlaying ? <Pause size={14} /> : <Play size={14} />} {isPlaying ? 'Stop' : 'Play'}
                                </button>
                                <button
                                    onClick={() => {
                                        if (audioRef.current) {
                                            audioRef.current.currentTime = (range.start / 100) * duration;
                                            setCurrentTime(audioRef.current.currentTime);
                                        }
                                    }}
                                    className="flex items-center justify-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all font-bold uppercase text-[10px] tracking-widest"
                                >
                                    <RotateCcw size={14} /> Reset
                                </button>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <SliderControl
                                label="Volume"
                                value={volume}
                                min={0}
                                max={100}
                                onChange={setVolume}
                                unit="%"
                            />
                        </section>

                        {/* Actions */}
                        <div className="pt-4 space-y-3">
                            {!trimmedUrl ? (
                                <Button
                                    className="w-full h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 shadow-lg shadow-indigo-500/20 border-none"
                                    onClick={handleExport}
                                    isLoading={isProcessing}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 size={16} className="animate-spin" />
                                            Trimming...
                                        </span>
                                    ) : (
                                        <><Scissors size={18} className="mr-2" /> Trim Audio</>
                                    )}
                                </Button>
                            ) : (
                                <div className="space-y-3 animate-slide-up">
                                    <Button
                                        className="w-full h-12 bg-white text-black hover:bg-zinc-200 shadow-lg"
                                        onClick={downloadTrimmed}
                                    >
                                        <Download size={18} className="mr-2" /> Download MP3
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

                        <section className="bg-zinc-900/40 p-4 rounded-xl space-y-3 border border-zinc-800/50">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-500 font-bold uppercase tracking-widest">Duration</span>
                                <span className="text-zinc-300 font-mono">{duration.toFixed(2)}s</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-500 font-bold uppercase tracking-widest">Type</span>
                                <span className="text-zinc-300 font-mono uppercase">{file.file.type.split('/')[1]}</span>
                            </div>
                        </section>

                    </div>
                </div>
            </aside>

            {/* Main Stage */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner`}>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="relative w-full h-full bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col items-center justify-center relative group">

                    {/* Visualizer Canvas */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <canvas ref={canvasRef} width={800} height={400} className="w-full h-full opacity-50" />
                    </div>

                    {/* Icon / Status */}
                    <div className="relative z-10 flex flex-col items-center gap-6">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 shadow-2xl transition-all duration-500 ${isPlaying ? 'border-indigo-500 bg-indigo-500/10 scale-110 shadow-indigo-500/20' : 'border-zinc-800 bg-zinc-900 scale-100'}`}>
                            {isPlaying ? (
                                <div className="flex gap-1 items-end h-12">
                                    <div className="w-2 bg-indigo-500 animate-[bounce_1s_infinite]"></div>
                                    <div className="w-2 bg-indigo-500 animate-[bounce_1.2s_infinite]"></div>
                                    <div className="w-2 bg-indigo-500 animate-[bounce_0.8s_infinite]"></div>
                                    <div className="w-2 bg-indigo-500 animate-[bounce_1.1s_infinite]"></div>
                                </div>
                            ) : (
                                <Mic2 size={48} className="text-zinc-700" />
                            )}
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-bold text-white tracking-tight">{file.file.name}</h3>
                            <p className="text-xs text-zinc-500 font-mono">
                                {(currentTime).toFixed(1)}s / {duration.toFixed(1)}s
                            </p>
                        </div>
                    </div>

                    {/* Audio Element Hidden/Invisible but functional */}
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                    />

                    {/* Play Button Overlay */}
                    <div
                        className={`absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20 ${isProcessing ? 'pointer-events-none' : ''}`}
                        onClick={togglePlay}
                    >
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition-all border border-white/5 shadow-2xl">
                            {isPlaying ? <Pause fill="white" className="text-white" size={32} /> : <Play fill="white" className="text-white ml-1" size={32} />}
                        </div>
                    </div>

                    {/* Progress Bar on Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800">
                        <div className="h-full bg-indigo-500 transition-all duration-100 ease-linear" style={{ width: `${(currentTime / duration) * 100}%` }} />
                    </div>

                    {isProcessing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/60 backdrop-blur-sm animate-in fade-in">
                            <Loader2 size={48} className="animate-spin text-indigo-500 mb-4" />
                            <p className="text-sm font-bold text-white uppercase tracking-widest">Processing Audio...</p>
                            <p className="text-xs text-zinc-400 mt-2 font-mono">{progress}% Complete</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
