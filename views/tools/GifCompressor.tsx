/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Minimize2, Download, RefreshCcw, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useIsMobile } from '../../hooks/useIsMobile';

export const GifCompressor: React.FC = () => {
    const isMobile = useIsMobile();
    const [file, setFile] = useState<FileData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultSize, setResultSize] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Compression Settings
    const [level, setLevel] = useState(50); // 0 (None) to 100 (Max)

    const ffmpegRef = useRef<FFmpeg | null>(null);

    // Persistence State
    const [isSourceReady, setIsSourceReady] = useState(false);
    const [sourceFileName, setSourceFileName] = useState<string | null>(null);

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
            const preload = async () => {
                const ff = ffmpegRef.current;
                if (!ff) return;
                const name = 'compress_source.gif';
                try {
                    await writeFileToFFmpeg(ff, name, file.file);
                    setSourceFileName(name);
                    setIsSourceReady(true);
                } catch (e) {
                    console.error("Failed to preload gif", e);
                }
            };
            preload();
        } else if (!file) {
            setIsSourceReady(false);
            setSourceFileName(null);
        }
    }, [file, engineStatus]);

    const handleCompress = async () => {
        if (!file || !ffmpegRef.current) return;
        setIsProcessing(true);
        setProgress(0);
        const ffmpeg = ffmpegRef.current;
        const inputName = 'compress_input.gif';
        const outputName = 'compress_output.gif';
        setResultUrl(null);

        // Progress Handler
        const onProgress = ({ progress }: { progress: number }) => {
            if (progress >= 0 && progress <= 1) {
                setProgress(Math.round(progress * 100));
            }
        };
        ffmpeg.on('progress', onProgress);

        try {
            let inputName = sourceFileName;

            if (!isSourceReady || !inputName) {
                inputName = 'compress_source.gif';
                await writeFileToFFmpeg(ffmpeg, inputName, file.file);
                setSourceFileName(inputName);
                setIsSourceReady(true);
            }

            // Final check
            try {
                await ffmpeg.readFile(inputName);
            } catch (e) {
                await writeFileToFFmpeg(ffmpeg, inputName, file.file);
            }

            // Level 0: 256 colors, 1.0 scale
            // Level 100: 16 colors, 0.3 scale
            const maxColors = Math.max(8, Math.round(256 - (level / 100) * 240));
            const scaleFactor = Math.max(0.3, 1 - (level / 100) * 0.7);

            // Aggressive Filter: stats_mode=full for better quality with fewer colors,
            // dither=bayer:bayer_scale=1 for significantly better compression than floyd_steinberg.
            const filter = `scale=iw*${scaleFactor}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${maxColors}:stats_mode=full[p];[s1][p]paletteuse=dither=bayer:bayer_scale=1`;

            await ffmpeg.exec([
                '-y',
                '-i', inputName,
                '-vf', filter,
                outputName
            ]);

            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([data as any], { type: 'image/gif' });

            // Final check: if the output is somehow larger (rare with these settings), 
            // the user at least sees the comparison.

            const url = URL.createObjectURL(blob);
            setResultUrl(url);
            setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');

            // await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

        } catch (e) {
            console.error(e);
            alert("Compression failed");
        } finally {
            ffmpeg.off('progress', onProgress);
            setIsProcessing(false);
            setProgress(0);
        }
    };

    if (engineStatus === 'error') {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-fade-in text-center">
                <AlertCircle size={32} className="text-red-500" />
                <h3 className="text-xl font-bold text-white">Engine Failed</h3>
                <p className="text-zinc-400">Failed to load GIF engine.</p>
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
                <p className="text-zinc-400">Loading GIF Engine...</p>
            </div>
        );
    }

    if (!file) {
        return (
            <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <Minimize2 size={32} /> GIF Compressor
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Reduce GIF file size efficiently without losing quality.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={setFile}
                        label="Upload GIF"
                        accept="image/gif"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Minimize2, label: 'Smart Shrink', desc: 'Optimize palette' },
                        { icon: Zap, label: 'Fast Engine', desc: 'Local processing' },
                        { icon: Download, label: 'Quick Save', desc: 'Instant download' },
                        { icon: RefreshCcw, label: 'Adjustable', desc: 'Custom compression' }
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

            {/* 1. Settings Panel */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-1 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <Zap size={20} /> Optimize
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => { setFile(null); setResultUrl(null); }}>
                        <RefreshCcw size={14} />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <section className="space-y-4">
                            <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                <span>Compression Level</span>
                                <span className="text-indigo-400">{level}%</span>
                            </div>
                            <div className="px-2 py-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                <Slider
                                    min={0} max={90}
                                    value={level}
                                    onChange={(v) => {
                                        setLevel(v as number);
                                        setResultUrl(null); // Clear result if settings change
                                    }}
                                    trackStyle={{ backgroundColor: '#6366f1' }}
                                    handleStyle={{ borderColor: '#6366f1', backgroundColor: '#4338ca' }}
                                    railStyle={{ backgroundColor: '#27272a' }}
                                />
                            </div>
                            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-tight italic opacity-60">
                                Higher levels reduce file size but may impact quality.
                            </p>
                        </section>

                        <section className="bg-zinc-900/50 p-4 rounded-xl space-y-3 border border-zinc-800/50">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-500">Source</span>
                                <span className="text-zinc-300 font-mono">{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                            {resultSize && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-zinc-500">Output</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-indigo-400 font-bold font-mono">{resultSize}</span>
                                        <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-bold">
                                            -{Math.round((1 - parseFloat(resultSize) / (file.file.size / 1024 / 1024)) * 100)}%
                                        </span>
                                    </div>
                                </div>
                            )}
                        </section>

                        {!resultUrl ? (
                            <Button onClick={handleCompress} isLoading={isProcessing} disabled={isProcessing} className="w-full h-12 border-none font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-900/20" >
                                {isProcessing ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        Processing {progress}%
                                    </span>
                                ) : (
                                    <><Zap size={18} className="mr-2" /> Start Compression</>
                                )}
                            </Button>
                        ) : (
                            <div className="space-y-3 animate-slide-up">
                                <Button onClick={() => {
                                        const a = document.createElement('a');
                                        a.href = resultUrl!;
                                        a.download = 'compressed.gif';
                                        a.click();
                                    }}
                                    className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-500 font-bold uppercase text-[10px] tracking-widest border-none shadow-lg"
                                >
                                    <Download size={18} className="mr-2" /> Download GIF
                                </Button>
                                <Button variant="secondary" onClick={() => {
                                        setFile(null);
                                        setResultUrl(null);
                                        setResultSize(null);
                                    }}
                                    className="w-full h-12 border-zinc-800 font-bold uppercase text-[10px] tracking-widest"
                                >
                                    <RefreshCcw size={16} className="mr-2" /> Compress Another
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* 3. Preview Area */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className={`relative shadow-2xl transition-all duration-500 ease-out border border-zinc-800/50 bg-black/40 rounded-2xl overflow-hidden ${isMobile ? 'w-full h-full' : 'w-full max-w-2xl aspect-square'}`}>
                    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] flex items-center justify-center">
                        <img src={resultUrl || file.previewUrl} className={`max-w-full max-h-full object-contain transition-opacity duration-500 ${isProcessing ? 'opacity-30' : 'opacity-100'}`} alt="Preview" />

                        {isProcessing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/40 backdrop-blur-[2px]">
                                <div className="relative w-16 h-16 flex items-center justify-center mb-4">
                                    <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full"></div>
                                    <div
                                        className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                        style={{ animationDuration: '0.8s' }}
                                    ></div>
                                    <span className="text-[10px] font-bold text-white font-mono">{progress}%</span>
                                </div>
                                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] animate-pulse">
                                    {progress < 100 ? 'Compressing' : 'Finalizing'}
                                </p>
                            </div>
                        )}
                        <div className="absolute top-4 left-4 flex gap-2">
                            <span className="bg-indigo-500/90 text-[10px] text-white px-2 py-1 rounded font-bold uppercase tracking-widest backdrop-blur-md">{resultUrl ? 'Compressed' : 'Original'}</span>
                            <span className="bg-black/60 text-[10px] text-zinc-300 px-2 py-1 rounded font-bold uppercase tracking-widest backdrop-blur-md border border-white/5">Preview</span>
                        </div>
                    </div>
                </div>
                {isMobile && <div className="absolute bottom-2 right-4 text-[10px] text-zinc-800 font-bold tracking-widest uppercase">Stage View</div>}
            </main>
        </div>
    );
};

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);
