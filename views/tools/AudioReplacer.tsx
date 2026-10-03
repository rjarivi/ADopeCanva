/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Music, Video, Volume2, Download, CheckCircle, RefreshCcw, Trash2, ArrowRight, AlertCircle, Loader2, Settings } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';

export const AudioReplacer: React.FC = () => {
    const [videoFile, setVideoFile] = useState<FileData | null>(null);
    const [audioFile, setAudioFile] = useState<FileData | null>(null);
    const [outputFormat, setOutputFormat] = useState('MP4');
    const [offsetMs, setOffsetMs] = useState(0);
    const [gainDb, setGainDb] = useState(0);
    const [keepVideoLength, setKeepVideoLength] = useState(true);
    const [mixOriginal, setMixOriginal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [progress, setProgress] = useState(0);
    const [processingError, setProcessingError] = useState<string>('');
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [sourceVideoUrl, setSourceVideoUrl] = useState<string | null>(null);
    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const ffmpegRef = useRef<FFmpeg | null>(null);

    // Object URL for source video preview
    useEffect(() => {
        if (!videoFile) { setSourceVideoUrl(null); return; }
        const url = URL.createObjectURL(videoFile.file);
        setSourceVideoUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [videoFile]);

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

    const handleProcess = async () => {
        if (!videoFile || !audioFile || !ffmpegRef.current) return;

        setIsProcessing(true);
        setIsDone(false);
        setResultUrl(null);
        setProcessingError('');
        setProgress(0);
        const ffmpeg = ffmpegRef.current;

        // Extensions
        const vExt = videoFile.file.name.split('.').pop() || 'mp4';
        const aExt = audioFile.file.name.split('.').pop() || 'mp3';

        const vName = `input_v.${vExt}`;
        const aName = `input_a.${aExt}`;
        const outName = `output.${outputFormat.toLowerCase()}`;

        const onProgress = ({ progress }: { progress: number }) => {
            if (progress >= 0 && progress <= 1) {
                setProgress(Math.round(progress * 100));
            }
        };
        ffmpeg.on('progress', onProgress);

        try {
            await writeFileToFFmpeg(ffmpeg, vName, videoFile.file);
            await writeFileToFFmpeg(ffmpeg, aName, audioFile.file);

            // Filters applied to the NEW audio track
            const aFilters: string[] = [];
            if (gainDb !== 0) aFilters.push(`volume=${gainDb.toFixed(1)}dB`);
            if (offsetMs > 0) aFilters.push(`adelay=${Math.round(offsetMs)}:all=1`);

            const args: string[] = ['-y', '-i', vName, '-i', aName];

            if (mixOriginal) {
                // Blend original + new; duration follows the ORIGINAL audio (≈ video length)
                const filterComplex = `[1:a]${aFilters.length > 0 ? aFilters.join(',') + ',' : ''}anull[nw];[0:a][nw]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`;
                args.push('-filter_complex', filterComplex, '-map', '0:v:0', '-map', '[aout]');
            } else {
                // Padded replacement keeps the video length: apad makes audio endless, -shortest caps at video
                if (keepVideoLength) aFilters.push('apad');
                if (aFilters.length > 0) args.push('-af', aFilters.join(','));
                args.push('-map', '0:v:0', '-map', '1:a:0');
            }

            args.push(
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-shortest',
                outName
            );

            const ret = await ffmpeg.exec(args);
            if (ret !== 0) {
                throw new Error(`FFmpeg returned code ${ret}. Check file formats and retry.`);
            }

            const url = await readFileFromFFmpeg(ffmpeg, outName, `video/${outputFormat.toLowerCase()}`);
            setResultUrl(url);
            setIsDone(true);

            await ffmpeg.deleteFile(vName);
            await ffmpeg.deleteFile(aName);
            await ffmpeg.deleteFile(outName);

        } catch (e) {
            console.error(e);
            setProcessingError((e as Error).message || 'Processing failed. Check formats and retry.');
        } finally {
            ffmpeg.off('progress', onProgress);
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!resultUrl) return;
        const a = document.createElement('a');
        a.href = resultUrl;
        const nameWithoutExt = videoFile?.file.name.substring(0, videoFile.file.name.lastIndexOf('.')) || 'video';
        a.download = `${nameWithoutExt}_newaudio.${outputFormat.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const resetAll = () => {
        setVideoFile(null);
        setAudioFile(null);
        setIsDone(false);
        setResultUrl(null);
        setProgress(0);
        setProcessingError('');
        setKeepVideoLength(true);
        setMixOriginal(false);
        setOffsetMs(0);
        setGainDb(0);
    };

    if (engineStatus === 'error') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
                <div className="bg-red-500/10 p-4 rounded-full text-red-500">
                    <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-white">Engine Failed</h3>
                <p className="text-zinc-400 max-w-md">The audio/video engine could not load.</p>
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
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
                <p className="text-zinc-400">Loading Engine...</p>
            </div>
        );
    }

    // Step 1: Upload Video
    if (!videoFile) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3 font-unbounded">
                        <div className="text-indigo-400"><RefreshCcw size={32} /></div>
                        <span className="text-white">                            Audio Replacer
                        </span>
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Swap audio tracks in any video instantly.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={setVideoFile}
                        accept="video/*"
                        label="Add Source Video"
                        description="Select the video you want to edit (MP4, MOV, AVI)"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Video, label: 'Video Source', desc: 'Any video format' },
                        { icon: Music, label: 'New Audio', desc: 'Replace track' },
                        { icon: Volume2, label: 'Clear Sound', desc: 'High fidelity output' },
                        { icon: RefreshCcw, label: 'Fast Merge', desc: 'Instant swap' }
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

    // Step 2: Upload Audio
    if (!audioFile) {
        return (
            <div className="max-w-3xl mx-auto space-y-8 animate-slide-up">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 font-unbounded">
                        <Music size={24} className="text-indigo-400" /> Select Audio
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => setVideoFile(null)}>
                        Back to Video
                    </Button>
                </div>

                {/* Video Summary Card */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400">
                        <Video size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Selected Video</p>
                        <h3 className="text-white font-medium">{videoFile.file.name}</h3>
                    </div>
                    <button onClick={() => setVideoFile(null)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-red-400 transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>

                <div className="p-8 bg-surface rounded-3xl shadow-xl border border-zinc-800/50">
                    <FileUploader
                        onFileSelect={setAudioFile}
                        accept="audio/*"
                        label="Add New Audio Track"
                        description="Select the audio to insert (MP3, WAV, AAC)"
                    />
                </div>
            </div>
        );
    }

    // Step 3: Configure & Process
    return (
        <div className="max-w-5xl mx-auto animate-slide-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Configuration Panel */}
                <div className="space-y-6">
                    <div className="bg-surface rounded-3xl border border-zinc-800 p-6 space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-black text-white flex items-center gap-2 font-unbounded">
                                <Settings size={18} className="text-indigo-400" /> Configuration
                            </h3>
                            <Button variant="ghost" size="sm" onClick={resetAll} disabled={isProcessing}>
                                <RefreshCcw size={16} className="mr-2" /> Reset
                            </Button>
                        </div>

                        {/* File List */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                <Video className="text-indigo-400" size={20} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-zinc-500">Video Source</p>
                                    <p className="text-sm text-zinc-300 truncate">{videoFile.file.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                <Music className="text-indigo-400" size={20} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-zinc-500">New Audio Track</p>
                                    <p className="text-sm text-zinc-300 truncate">{audioFile.file.name}</p>
                                </div>
                                <button onClick={() => setAudioFile(null)} disabled={isProcessing} className="text-zinc-500 hover:text-white disabled:opacity-50">
                                    <RefreshCcw size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-zinc-800 my-4"></div>

                        {/* Controls */}
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-zinc-400">Output Format</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['MP4', 'MOV', 'AVI', 'MKV'].map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => setOutputFormat(fmt)}
                                            disabled={isProcessing || isDone}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${outputFormat === fmt
                                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                                : 'bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                                                }`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-zinc-800"></div>

                            {/* New Audio Processing */}
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                    <Volume2 size={16} className="text-indigo-400" /> New Audio
                                </label>

                                <div>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-zinc-400">Start Offset</span>
                                        <span className="text-zinc-300 font-mono">{(offsetMs / 1000).toFixed(1)}s</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={10000}
                                        step={100}
                                        value={offsetMs}
                                        onChange={(e) => setOffsetMs(Number(e.target.value))}
                                        disabled={isProcessing}
                                        className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded cursor-pointer"
                                    />
                                    <p className="text-[10px] text-zinc-600 mt-0.5">Delays the new audio track relative to the video start.</p>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-zinc-400">Volume Gain</span>
                                        <span className={`font-mono ${gainDb > 0 ? 'text-emerald-400' : gainDb < 0 ? 'text-pink-400' : 'text-zinc-300'}`}>
                                            {gainDb > 0 ? '+' : ''}{gainDb.toFixed(1)} dB
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={-24}
                                        max={24}
                                        step={0.5}
                                        value={gainDb}
                                        onChange={(e) => setGainDb(Number(e.target.value))}
                                        disabled={isProcessing}
                                        className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded cursor-pointer"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <button
                                        onClick={() => setKeepVideoLength(prev => !prev)}
                                        disabled={isProcessing}
                                        className={`w-full py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${keepVideoLength ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300' : 'bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:text-zinc-300'}`}
                                    >
                                        <Video size={14} />
                                        Keep Video Length {keepVideoLength ? 'On' : 'Off'}
                                    </button>
                                    <p className="text-[10px] text-zinc-600">
                                        {keepVideoLength
                                            ? 'Audio is padded, output always matches the video\u2019s full duration.'
                                            : 'Output ends when either stream is shorter (audio may truncate the video).'}
                                    </p>

                                    <button
                                        onClick={() => setMixOriginal(prev => !prev)}
                                        disabled={isProcessing}
                                        className={`w-full py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${mixOriginal ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300' : 'bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:text-zinc-300'}`}
                                    >
                                        <Music size={14} />
                                        Mix With Original {mixOriginal ? 'On' : 'Off'}
                                    </button>
                                    {mixOriginal && (
                                        <p className="text-[10px] text-zinc-600">
                                            Requires the source video to contain an audio stream.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {processingError && (
                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl text-xs text-red-400 flex items-start gap-2 animate-fade-in">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span className="break-all">{processingError}</span>
                            </div>
                        )}

                        <Button className="w-full h-12 text-lg shadow-lg shadow-indigo-500/20" onClick={handleProcess} isLoading={isProcessing} disabled={isDone} >
                            {isDone ? 'Completed' : 'Replace Audio'}
                        </Button>
                    </div>
                </div>

                {/* Preview/Result Panel */}
                <div className="relative bg-black rounded-3xl border border-zinc-800 overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
                    {/* Background effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-black pointer-events-none"></div>

                    {isProcessing ? (
                        <div className="text-center space-y-4 z-10 animate-fade-in p-8 w-full max-w-xs">
                            <div className="relative w-20 h-20 mx-auto">
                                <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-zinc-300 font-medium">Merging tracks...</p>
                            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-xs text-zinc-500 font-mono">{Math.max(progress, 1)}%</p>
                        </div>
                    ) : isDone ? (
                        <div className="text-center space-y-5 z-10 animate-slide-up p-6 w-full">
                            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                                <CheckCircle size={32} />
                            </div>
                            {/* Result preview before download */}
                            <video
                                src={resultUrl ?? undefined}
                                controls
                                className="w-full rounded-2xl border border-zinc-800 bg-black max-h-[320px]"
                            />
                            <div className="flex gap-3 justify-center">
                                <Button variant="secondary" onClick={resetAll}>Edit Another</Button>
                                <Button className=" text-white shadow-lg shadow-indigo-500/20 border-none" onClick={handleDownload}>
                                    <Download size={18} className="mr-2" /> Download
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center z-10 space-y-4 p-8 w-full max-w-xs">
                            {/* Source video preview */}
                            {sourceVideoUrl && (
                                <video
                                    src={sourceVideoUrl}
                                    controls
                                    className="w-full rounded-2xl border border-zinc-800 bg-black"
                                />
                            )}
                            <div className={`flex items-center justify-center gap-4 text-zinc-600 ${sourceVideoUrl ? 'opacity-60' : ''}`}>
                                <Video size={40} />
                                <ArrowRight size={20} />
                                <Music size={40} />
                            </div>
                            <p className="text-zinc-500 max-w-xs mx-auto">
                                Ready to merge. Review your settings and click "Replace Audio" to start.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
