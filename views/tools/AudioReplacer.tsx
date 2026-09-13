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
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
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

    const handleProcess = async () => {
        if (!videoFile || !audioFile || !ffmpegRef.current) return;

        setIsProcessing(true);
        const ffmpeg = ffmpegRef.current;

        // Extensions
        const vExt = videoFile.file.name.split('.').pop() || 'mp4';
        const aExt = audioFile.file.name.split('.').pop() || 'mp3';

        const vName = `input_v.${vExt}`;
        const aName = `input_a.${aExt}`;
        const outName = `output.${outputFormat.toLowerCase()}`;

        try {
            await writeFileToFFmpeg(ffmpeg, vName, videoFile.file);
            await writeFileToFFmpeg(ffmpeg, aName, audioFile.file);

            const audioCodec = outputFormat.toUpperCase() === 'AVI' ? 'libmp3lame' : 'aac';

            const exitCode = await ffmpeg.exec([
                '-y',
                '-i', vName,
                '-i', aName,
                '-c:v', 'copy',
                '-c:a', audioCodec,
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-shortest',
                outName
            ]);
            if (exitCode !== 0) throw new Error(`Audio replacement failed with FFmpeg code ${exitCode}`);

            const url = await readFileFromFFmpeg(ffmpeg, outName, `video/${outputFormat.toLowerCase()}`);
            setResultUrl(url);
            setIsDone(true);

        } catch (e) {
            console.error(e);
            alert('Processing failed. ' + (e as Error).message);
        } finally {
            try {
                await ffmpeg.deleteFile(vName);
                await ffmpeg.deleteFile(aName);
                await ffmpeg.deleteFile(outName);
            } catch (err) {
                // Ignore cleanup errors
            }
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
                        label="Upload Source Video"
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
                        label="Upload New Audio Track"
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
                        </div>

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
                        <div className="text-center space-y-4 z-10 animate-fade-in">
                            <div className="relative w-20 h-20 mx-auto">
                                <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-zinc-300 font-medium">Merging tracks...</p>
                            <p className="text-xs text-zinc-500">FFmpeg is processing your streams</p>
                        </div>
                    ) : isDone ? (
                        <div className="text-center space-y-6 z-10 animate-slide-up p-8">
                            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                                <CheckCircle size={40} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">Success!</h3>
                                <p className="text-zinc-400 mt-2">Your video has been updated with the new audio.</p>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={resetAll}>Edit Another</Button>
                                <Button className=" text-white shadow-lg shadow-indigo-500/20 border-none" onClick={handleDownload}>
                                    <Download size={18} className="mr-2" /> Download
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center z-10 opacity-50 space-y-4 p-8">
                            <div className="flex items-center justify-center gap-4 text-zinc-600">
                                <Video size={48} />
                                <ArrowRight size={24} />
                                <Music size={48} />
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
