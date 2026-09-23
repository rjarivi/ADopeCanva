/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Minimize2, Download, RefreshCcw, Zap, AlertCircle, Loader2, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { ToolShell } from '../../components/ToolShell';
import { useToolFile } from '../../hooks/useToolFile';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useIsMobile } from '../../hooks/useIsMobile';

export const VideoCompressor: React.FC = () => {
    const isMobile = useIsMobile();
    const { file, select, clear } = useToolFile();
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultSize, setResultSize] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Compression Settings
    const [crf, setCrf] = useState(28); // 18 (Best) to 51 (Worst), Default 23/28
    const [preset, setPreset] = useState('ultrafast');
    const [resizeScale, setResizeScale] = useState(100); // Percentage

    const ffmpegRef = useRef<FFmpeg | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

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

    const handleCompress = async () => {
        if (!file || !ffmpegRef.current) return;
        setIsProcessing(true);
        setProgress(0);
        const ffmpeg = ffmpegRef.current;
        const inputExt = file.file.name.split('.').pop() || 'mp4';
        const inputName = `input.${inputExt}`;
        const outputName = 'compressed.mp4';
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        setResultUrl(null);

        // Progress Handler
        const onProgress = ({ progress }: { progress: number }) => {
            if (progress >= 0 && progress <= 1) {
                setProgress(Math.round(progress * 100));
            }
        };
        ffmpeg.on('progress', onProgress);

        try {
            await writeFileToFFmpeg(ffmpeg, inputName, file.file);

            const threads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
                ? Math.min(navigator.hardwareConcurrency, 4).toString()
                : '2';

            const args = [
                '-y',
                '-i', inputName,
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-crf', crf.toString(),
                '-preset', preset,
                '-threads', threads,
                '-c:a', 'aac',
                '-b:a', '128k'
            ];

            if (resizeScale < 100) {
                args.push('-vf', `scale=trunc(iw*${resizeScale / 100}/2)*2:-2`);
            }

            args.push(outputName);

            await ffmpeg.exec(args);

            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([data as any], { type: 'video/mp4' });

            if (resultUrl) URL.revokeObjectURL(resultUrl);
            const url = URL.createObjectURL(blob);
            setResultUrl(url);
            setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');

            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

        } catch (e) {
            console.error(e);
            alert("Compression failed. Try a different preset or format.");
        } finally {
            ffmpeg.off('progress', onProgress);
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    if (engineStatus === 'error') {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-fade-in text-center">
                <AlertCircle size={32} className="text-red-500" />
                <h3 className="text-xl font-bold text-white">Engine Failed</h3>
                <p className="text-zinc-400">Failed to load Video engine.</p>
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
                <p className="text-zinc-400 font-medium">Booting Video Engine (WASM)...</p>
            </div>
        );
    }

    const handleFileSelect = (f: FileData | FileData[]) => {
        const selected = Array.isArray(f) ? f[0] : f;
        if (!selected) return;
        select(selected);
    };

    if (!file) {
        return (
            <ToolShell
                icon={Minimize2}
                title="Video Compressor"
                description="Reduce video file size without significant quality loss. All processing happens in your browser."
                features={[
                    { icon: Minimize2, label: 'High Compression', desc: 'CRF Optimization' },
                    { icon: Zap, label: 'Fast Export', desc: 'Ultrafast encoding' },
                    { icon: RefreshCcw, label: 'Local Only', desc: '100% Privacy' },
                    { icon: Download, label: 'Universal', desc: 'MP4 (H.264) Output' },
                ]}
                file={file}
                accept="video/*"
                uploadLabel="Upload Video"
                onFileSelect={handleFileSelect}
                error={errorMessage || null}
            >
                <></>
            </ToolShell>
        );
    }

    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800 shadow-2xl'}`}>

            {/* 1. Settings Panel */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-1 w-85 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-[10px] text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 font-unbounded">
                        <Zap size={18} /> Configuration
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => { clear(); if (resultUrl) URL.revokeObjectURL(resultUrl); setResultUrl(null); }} className="hover:bg-zinc-900 text-zinc-500">
                        <RefreshCcw size={14} />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                    {/* Compression Intensity */}
                    <section className="space-y-4">
                        <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            <span>Compression Level</span>
                            <span className="text-indigo-400 font-mono">{crf === 23 ? 'Standard' : crf > 30 ? 'High' : 'Low'} (CRF: {crf})</span>
                        </div>
                        <div className="px-3 py-5 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                            <Slider
                                min={18} max={51}
                                value={crf}
                                onChange={(v) => {
                                    setCrf(v as number);
                                    setResultUrl(null);
                                }}
                                trackStyle={{ backgroundColor: '#6366f1' }}
                                handleStyle={{ borderColor: '#6366f1', backgroundColor: '#312e81', opacity: 1, borderWidth: 2 }}
                                railStyle={{ backgroundColor: '#27272a' }}
                            />
                        </div>
                        <div className="flex justify-between px-1">
                            <span className="text-[9px] text-zinc-600 font-bold uppercase">Best Quality</span>
                            <span className="text-[9px] text-zinc-600 font-bold uppercase">Smallest Size</span>
                        </div>
                    </section>

                    {/* Resolution Scaling */}
                    <section className="space-y-4">
                        <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            <span>Resolution Scale</span>
                            <span className="text-indigo-400 font-mono">{resizeScale}%</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {[25, 50, 75, 100].map(s => (
                                <button
                                    key={s}
                                    onClick={() => {
                                        setResizeScale(s);
                                        setResultUrl(null);
                                    }}
                                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${resizeScale === s ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    {s === 100 ? 'Original' : s + '%'}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Preset Quality */}
                    <section className="space-y-4">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Encoding Speed</div>
                        <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                            {['ultrafast', 'medium', 'veryslow'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => {
                                        setPreset(p);
                                        setResultUrl(null);
                                    }}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${preset === p ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                                >
                                    {p.replace('fast', '').replace('slow', '').replace('medium', 'Normal') || 'Fastest'}
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] text-zinc-700 italic px-1 leading-relaxed">
                            Faster encoding results in slightly larger files. Medium is recommended for better efficiency.
                        </p>
                    </section>

                    {/* Stats Display */}
                    <section className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800/50 space-y-4 shadow-inner">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-zinc-500 uppercase tracking-widest">Source Size</span>
                            <span className="text-zinc-300 font-mono">{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        {resultSize && (
                            <div className="flex justify-between items-center text-[10px] font-bold pt-4 border-t border-zinc-800/50 animate-fade-in">
                                <span className="text-zinc-500 uppercase tracking-widest">Compressed</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-indigo-400 font-mono text-xs">{resultSize}</span>
                                    <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full text-[9px] font-black">
                                        -{Math.round((1 - parseFloat(resultSize) / (file.file.size / 1024 / 1024)) * 100)}%
                                    </span>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                <div className="p-6 border-t border-zinc-900 bg-zinc-950/50">
                    {!resultUrl ? (
                        <Button
                            onClick={handleCompress}
                            isLoading={isProcessing}
                            disabled={isProcessing}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white border-none font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-indigo-900/30 relative overflow-hidden group"
                        >
                            {isProcessing ? (
                                <span className="flex items-center gap-3 relative z-10">
                                    <Loader2 size={18} className="animate-spin" />
                                    Compressing {progress}%
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 relative z-10">
                                    <Zap size={18} /> Run Compression
                                </span>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        </Button>
                    ) : (
                        <div className="space-y-3 animate-slide-up">
                            <Button
                                onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = resultUrl!;
                                    a.download = `compressed_${file.file.name.replace(/\.[^/.]+$/, '')}.mp4`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                }}
                                className="w-full h-14 bg-indigo-600 text-white hover:bg-indigo-500 border-none font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-indigo-900/30"
                            >
                                <Download size={20} className="mr-2" /> Download MP4
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    clear();
                                    if (resultUrl) URL.revokeObjectURL(resultUrl);
                                    setResultUrl(null);
                                    setResultSize(null);
                                }}
                                className="w-full h-12 border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold uppercase text-[10px] tracking-widest"
                            >
                                <RefreshCcw size={16} className="mr-2" /> Compress Another
                            </Button>
                        </div>
                    )}
                </div>
            </aside>

            {/* 3. Preview Area */}
            <main className={`order-1 ${isMobile ? 'h-[40vh]' : 'flex-1'} relative bg-[#050507] flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden shrink-0 shadow-inner`}>
                {/* Background Decor */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

                <div className={`relative group transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isMobile ? 'w-full h-full' : 'w-full max-w-3xl aspect-video'} rounded-3xl overflow-hidden bg-black ring-1 ring-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)]`}>
                    <video
                        ref={videoRef}
                        src={resultUrl || file.previewUrl}
                        className={`w-full h-full object-contain transition-all duration-700 ${isProcessing ? 'scale-95 opacity-20 blur-sm' : 'scale-100 opacity-100 blur-0'}`}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        muted={isMuted}
                        loop
                        playsInline
                    />

                    {/* Progress Overlay */}
                    {isProcessing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                            <div className="relative w-24 h-24 flex items-center justify-center mb-8">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="48" cy="48" r="44" stroke="rgba(99, 102, 241, 0.1)" strokeWidth="4" fill="transparent" />
                                    <circle
                                        cx="48" cy="48" r="44"
                                        stroke="#6366f1" strokeWidth="4" fill="transparent"
                                        strokeDasharray={276}
                                        strokeDashoffset={276 - (276 * progress) / 100}
                                        className="transition-all duration-300 ease-out"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute text-xl font-black text-white font-unbounded">{progress}%</span>
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 animate-pulse">Processing Core</h3>
                            <p className="text-[9px] text-zinc-600 mt-2 font-bold uppercase tracking-widest">WASM Threading Enabled</p>
                        </div>
                    )}

                    {/* Controls Overlay */}
                    {!isProcessing && (
                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all">
                                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                                    </button>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-white uppercase tracking-wider">{resultUrl ? 'Compressed Result' : 'Original Source'}</p>
                                        <p className="text-[9px] text-zinc-400 font-bold uppercase">{file.file.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsMuted(!isMuted)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all">
                                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-6 left-6 flex items-center gap-2 z-20">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border ${resultUrl ? 'bg-indigo-500/80 text-white border-indigo-400' : 'bg-zinc-900/80 text-zinc-400 border-zinc-800'}`}>
                            {resultUrl ? 'Optimized' : 'Raw'}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-black/60 text-[9px] text-zinc-500 font-black uppercase tracking-widest backdrop-blur-md border border-white/5">
                            Viewer
                        </span>
                    </div>
                </div>

                <div className="mt-8 flex items-center gap-8 justify-center invisible md:visible">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">Security</span>
                        <div className="px-4 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800/50 text-[9px] text-zinc-500 font-bold uppercase">End-to-End Local</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">Accelerated</span>
                        <div className="px-4 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800/50 text-[9px] text-zinc-500 font-bold uppercase">Multi-core SIMD</div>
                    </div>
                </div>
            </main>
        </div>
    );
};
