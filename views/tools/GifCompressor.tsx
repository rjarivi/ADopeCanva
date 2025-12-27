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

export const GifCompressor: React.FC = () => {
    const [file, setFile] = useState<FileData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultSize, setResultSize] = useState<string | null>(null);
    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Compression Settings
    const [level, setLevel] = useState(50); // 0 (None) to 100 (Max)

    const ffmpegRef = useRef<FFmpeg | null>(null);

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
        const ffmpeg = ffmpegRef.current;
        const inputName = 'compress_input.gif';
        const outputName = 'compress_output.gif'; // temporary output to check size
        setResultUrl(null);

        try {
            await writeFileToFFmpeg(ffmpeg, inputName, file.file);

            // Calculate params based on level
            // Level 0: 256 colors, 1.0 scale
            // Level 100: 32 colors, 0.5 scale

            // Linear interpolation or steps
            const maxColors = Math.max(2, Math.round(256 - (level / 100) * 224)); // 256 -> 32
            const scale = Math.max(0.5, 1 - (level / 100) * 0.5); // 1.0 -> 0.5

            // Filter Graph: Scale -> Split -> PaletteGen(colors) -> PaletteUse
            const filter = `scale=iw*${scale}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${maxColors}[p];[s1][p]paletteuse`;

            await ffmpeg.exec([
                '-y',
                '-i', inputName,
                '-vf', filter,
                outputName
            ]);

            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([data as any], { type: 'image/gif' });
            const url = URL.createObjectURL(blob);
            setResultUrl(url);
            setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');

            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

        } catch (e) {
            console.error(e);
            alert("Compression failed");
        } finally {
            setIsProcessing(false);
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
            <div className="flex flex-col items-center justify-center p-8 space-y-6 animate-fade-in">
                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-white">GIF Compressor</h3>
                    <p className="text-zinc-400">Reduce GIF file size efficiently.</p>
                </div>
                <div className="w-full max-w-xl bg-surface rounded-3xl p-8 border border-zinc-800">
                    <FileUploader onFileSelect={setFile} label="Upload GIF" accept="image/gif" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up">
            <div className="bg-surface rounded-3xl border border-zinc-800 p-6 space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2"><SettingsIcon /> Compression Settings</h3>
                    <Button variant="ghost" size="sm" onClick={() => { setFile(null); setResultUrl(null); }}>
                        <RefreshCcw size={16} /> Reset
                    </Button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Compression Level</span>
                            <span className="text-indigo-400 font-bold">{level}%</span>
                        </div>
                        <Slider
                            min={0} max={90}
                            value={level}
                            onChange={(v) => setLevel(v as number)}
                            trackStyle={{ backgroundColor: '#6366f1' }}
                            handleStyle={{ borderColor: '#6366f1', backgroundColor: '#4338ca' }}
                        />
                        <p className="text-xs text-zinc-500">
                            Higher levels reduce file size but may impact quality (colors & resolution).
                        </p>
                    </div>

                    <div className="bg-zinc-900/50 p-4 rounded-xl space-y-2 border border-zinc-800">
                        <p className="text-sm text-zinc-400">Original Size: <span className="text-white">{(file.file.size / 1024 / 1024).toFixed(2)} MB</span></p>
                        {resultSize && (
                            <p className="text-sm text-zinc-400">New Size: <span className="text-green-400 font-bold">{resultSize}</span>
                                <span className="ml-2 text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">
                                    -{Math.round((1 - parseFloat(resultSize) / (file.file.size / 1024 / 1024)) * 100)}%
                                </span>
                            </p>
                        )}
                    </div>

                    <Button
                        onClick={handleCompress}
                        isLoading={isProcessing}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 border-none h-12"
                    >
                        <Zap size={18} className="mr-2" /> Compress GIF
                    </Button>
                </div>
            </div>

            <div className="bg-black/50 rounded-3xl border border-zinc-800 flex items-center justify-center p-8 relative overflow-hidden min-h-[400px]">
                {!resultUrl ? (
                    <img src={file.previewUrl} className="max-w-full max-h-[350px] rounded-lg shadow-xl opacity-50" />
                ) : (
                    <div className="text-center space-y-4 animate-fade-in z-10">
                        <img src={resultUrl} className="max-w-full max-h-[350px] rounded-lg shadow-xl" />
                        <Button className="bg-white text-black" onClick={() => { const a = document.createElement('a'); a.href = resultUrl!; a.download = 'compressed.gif'; a.click(); }}>
                            <Download size={18} className="mr-2" /> Download
                        </Button>
                    </div>
                )}

                {isProcessing && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-indigo-400 font-bold">Optimizing...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);
