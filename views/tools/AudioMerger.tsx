/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useObjectUrlState } from '../../hooks/useObjectUrl';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { FileData } from '../../types';
import { ToolShell } from '../../components/ToolShell';
import {
    ListMusic, Music, Plus, Trash2, Download, CheckCircle, AlertCircle,
    Play, Pause, ArrowUp, ArrowDown, Volume2, Sparkles, Sliders, RotateCcw,
    Layers, FastForward, Loader2, Check, Clock, Disc, ArrowRight
} from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';

type ExportFormat = 'mp3' | 'wav' | 'aac' | 'm4a' | 'ogg';
type BitrateOption = '128k' | '192k' | '256k' | '320k';

interface TrackItem {
    id: string;
    fileData: FileData;
    audioUrl: string;
    duration: number;
    peaks: Float32Array | null;
    volume: number;
    trimStart: number;
    trimEnd: number;
}

function formatDuration(sec: number): string {
    if (!sec || isNaN(sec) || sec < 0) return '00:00.0';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

export const AudioMerger: React.FC = () => {
    const isMobile = useIsMobile();

    // Tracks List State
    const [tracks, setTracks] = useState<TrackItem[]>([]);
    const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);

    // Merge & Transition Settings
    const [gapDuration, setGapDuration] = useState(0);
    const [crossfade, setCrossfade] = useState(0);
    const [exportFormat, setExportFormat] = useState<ExportFormat>('mp3');
    const [exportBitrate, setExportBitrate] = useState<BitrateOption>('256k');
    const [masterVolume, setMasterVolume] = useState(100);
    const [channelLayout, setChannelLayout] = useState<'stereo' | 'mono'>('stereo');
    const [sampleRate, setSampleRate] = useState<'44100' | '48000' | '22050'>('44100');

    // Drag reorder
    const dragIndexRef = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Processing & Output
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [mergedUrl, setMergedUrl] = useObjectUrlState();
    const [mergedDuration, setMergedDuration] = useState<number>(0);
    const [mergedSize, setMergedSize] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Engine
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    // Master Preview
    const masterAudioRef = useRef<HTMLAudioElement | null>(null);
    const [isMasterPlaying, setIsMasterPlaying] = useState(false);
    const [masterCurrentTime, setMasterCurrentTime] = useState(0);

    useEffect(() => {
        getFFmpeg()
            .then(ff => {
                ffmpegRef.current = ff;
                setEngineStatus('ready');
            })
            .catch((e) => {
                console.error('AudioMerger FFmpeg init error:', e);
                setEngineStatus('error');
            });
    }, []);

    // Decode track peaks
    const decodeTrack = async (fileData: FileData): Promise<TrackItem> => {
        const id = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const url = URL.createObjectURL(fileData.file);
        let duration = 0;
        let peaks: Float32Array | null = null;

        let ctx: AudioContext | null = null;
        try {
            ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const buffer = await fileData.file.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(buffer);
            duration = audioBuffer.duration;

            const channel = audioBuffer.getChannelData(0);
            const sampleCount = 120;
            const blockSize = Math.max(1, Math.floor(channel.length / sampleCount));
            peaks = new Float32Array(sampleCount);

            let max = 0.001;
            for (let i = 0; i < sampleCount; i++) {
                let p = 0;
                const start = i * blockSize;
                const end = Math.min(start + blockSize, channel.length);
                for (let j = start; j < end; j++) {
                    const abs = Math.abs(channel[j]);
                    if (abs > p) p = abs;
                }
                peaks[i] = p;
                if (p > max) max = p;
            }

            for (let i = 0; i < sampleCount; i++) {
                peaks[i] /= max;
            }
        } catch {
            duration = 10;
        } finally {
            if (ctx && ctx.state !== 'closed') await ctx.close();
        }

        return {
            id,
            fileData,
            audioUrl: url,
            duration,
            peaks,
            volume: 100,
            trimStart: 0,
            trimEnd: duration
        };
    };

    const handleFilesSelect = async (newFiles: FileData | FileData[]) => {
        const arr = Array.isArray(newFiles) ? newFiles : [newFiles];
        setError(null);
        setMergedUrl(null);
        const decodedTracks = await Promise.all(arr.map(decodeTrack));
        setTracks(prev => [...prev, ...decodedTracks]);
    };

    const removeTrack = (index: number) => {
        const removed = tracks[index];
        if (removed) {
            URL.revokeObjectURL(removed.audioUrl);
            if (activePreviewId === removed.id && previewAudioRef.current) {
                previewAudioRef.current.pause();
                setActivePreviewId(null);
            }
        }
        setTracks(prev => prev.filter((_, i) => i !== index));
        setMergedUrl(null);
    };

    const moveTrack = (from: number, to: number) => {
        if (to < 0 || to >= tracks.length) return;
        setTracks(prev => {
            const copy = [...prev];
            const [item] = copy.splice(from, 1);
            copy.splice(to, 0, item);
            return copy;
        });
        setMergedUrl(null);
    };

    const updateTrackVolume = (index: number, vol: number) => {
        setTracks(prev => prev.map((t, i) => i === index ? { ...t, volume: vol } : t));
        setMergedUrl(null);
    };

    const updateTrackTrim = (index: number, field: 'trimStart' | 'trimEnd', value: number) => {
        setTracks(prev => prev.map((t, i) => {
            if (i !== index) return t;
            const dur = t.duration || 0;
            let v = value;
            if (field === 'trimStart') {
                v = Math.max(0, Math.min(v, t.trimEnd - 0.1, dur - 0.1));
            } else {
                v = Math.min(dur, Math.max(v, t.trimStart + 0.1));
            }
            return { ...t, [field]: v };
        }));
        setMergedUrl(null);
    };

    const togglePreview = (track: TrackItem) => {
        if (activePreviewId === track.id) {
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
            }
            setActivePreviewId(null);
        } else {
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current.src = track.audioUrl;
                previewAudioRef.current.volume = Math.min(1, Math.max(0, (track.volume / 100) * (masterVolume / 100)));
                previewAudioRef.current.play().then(() => setActivePreviewId(track.id)).catch(console.error);
            }
        }
    };

    const estimatedTotalDuration = crossfade > 0
        ? Math.max(0.05, tracks.reduce((acc, t) => acc + (t.trimEnd - t.trimStart), 0) - (Math.max(0, tracks.length - 1) * crossfade))
        : tracks.reduce((acc, t) => acc + (t.trimEnd - t.trimStart), 0) + Math.max(0, tracks.length - 1) * gapDuration;

    const handleMerge = async () => {
        if (tracks.length < 2) {
            setError('Please add at least 2 audio tracks to merge.');
            return;
        }

        setIsProcessing(true);
        setProgress(0);
        setStatusText('Preparing audio buffers...');
        setError(null);
        setMergedUrl(null);

        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg) {
            setError('Audio processing engine is not ready.');
            setIsProcessing(false);
            return;
        }

        const onProgress = ({ progress }: { progress: number }) => {
            if (progress >= 0 && progress <= 1) {
                setProgress(Math.round(progress * 100));
            }
        };
        ffmpeg.on('progress', onProgress);

        const tempInputFiles: string[] = [];
        const outputName = `merged_${Date.now()}.${exportFormat}`;

        try {
            // Effective trimmed duration of each track (clamped by decode duration fallback)
            const trackDur = (t: TrackItem) => Math.max(0.05, t.trimEnd - t.trimStart);

            for (let i = 0; i < tracks.length; i++) {
                const trk = tracks[i];
                const ext = trk.fileData.file.name.substring(trk.fileData.file.name.lastIndexOf('.')) || '.mp3';
                const inputName = `input_${i}${ext}`;
                await writeFileToFFmpeg(ffmpeg, inputName, trk.fileData.file);
                tempInputFiles.push(inputName);
            }

            setStatusText('Executing multi-track audio join...');

            const threads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
                ? Math.min(navigator.hardwareConcurrency, 4).toString()
                : '2';

            const args: string[] = ['-y'];

            // Per-input trim (-ss/-t), clamped to track duration
            for (let i = 0; i < tracks.length; i++) {
                const trk = tracks[i];
                const ts = Math.max(0, Math.min(trk.trimStart, trk.duration || 0));
                args.push('-ss', ts.toFixed(3), '-t', trackDur(trk).toFixed(3));
                args.push('-i', tempInputFiles[i]);
            }

            let filterText = `sample_rates=${sampleRate}:channel_layouts=${channelLayout}`;
            const filterChains: string[] = [];
            for (let i = 0; i < tracks.length; i++) {
                const vol = (tracks[i].volume / 100) * (masterVolume / 100);
                filterChains.push(`[${i}:a]aformat=${filterText},volume=${vol.toFixed(2)}[a${i}]`);
            }

            if (crossfade > 0) {
                // Chain acrossfade between consecutive track pairs with exact offset math
                let prev = `[a0]`;
                let leftLen = trackDur(tracks[0]);
                for (let i = 1; i < tracks.length; i++) {
                    const rightLen = trackDur(tracks[i]);
                    const d = Math.min(crossfade, leftLen, rightLen, (leftLen + rightLen) / 2);
                    const outLabel = i === tracks.length - 1 ? 'aout' : `xf${i}`;
                    filterChains.push(`${prev}[a${i}]acrossfade=d=${d.toFixed(2)}:c1=tri:c2=tri[${outLabel}]`);
                    prev = `[${outLabel}]`;
                    leftLen = leftLen + rightLen - d;
                }
            } else {
                // Honest gap: real silence padding between segments via apad
                for (let i = 0; i < tracks.length; i++) {
                    if (gapDuration > 0 && i < tracks.length - 1) {
                        filterChains.push(`[a${i}]apad=pad_dur=${gapDuration.toFixed(2)}[p${i}]`);
                    }
                }
                const streamInputs = tracks.map((_, i) => (gapDuration > 0 && i < tracks.length - 1) ? `[p${i}]` : `[a${i}]`).join('');
                filterChains.push(`${streamInputs}concat=n=${tracks.length}:v=0:a=1[aout]`);
            }

            args.push('-filter_complex', filterChains.join(';'));
            args.push('-map', '[aout]');
            args.push('-threads', threads);

            switch (exportFormat) {
                case 'mp3':
                    args.push('-c:a', 'libmp3lame', '-b:a', exportBitrate);
                    break;
                case 'wav':
                    args.push('-c:a', 'pcm_s16le');
                    break;
                case 'aac':
                case 'm4a':
                    args.push('-c:a', 'aac', '-b:a', exportBitrate);
                    break;
                case 'ogg':
                    args.push('-c:a', 'libvorbis', '-b:a', exportBitrate);
                    break;
            }

            args.push(outputName);

            const ret = await ffmpeg.exec(args);
            if (ret !== 0) {
                throw new Error(`FFmpeg returned code ${ret}`);
            }

            const mimeTypes: Record<ExportFormat, string> = {
                mp3: 'audio/mpeg',
                wav: 'audio/wav',
                aac: 'audio/aac',
                m4a: 'audio/mp4',
                ogg: 'audio/ogg'
            };

            const url = await readFileFromFFmpeg(ffmpeg, outputName, mimeTypes[exportFormat]);
            setMergedUrl(url);
            setMergedDuration(Math.max(1, estimatedTotalDuration));

            try {
                const resp = await fetch(url);
                const blob = await resp.blob();
                const kb = blob.size / 1024;
                setMergedSize(kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(0)} KB`);
            } catch {
                setMergedSize(null);
            }

            for (const input of tempInputFiles) {
                await ffmpeg.deleteFile(input);
            }
            await ffmpeg.deleteFile(outputName);

        } catch (err) {
            console.error('Audio merge failed:', err);
            setError('Failed to merge tracks. Please verify file formats and try again.');
        } finally {
            ffmpeg.off('progress', onProgress);
            setIsProcessing(false);
            setProgress(100);
        }
    };

    const downloadMerged = () => {
        if (!mergedUrl) return;
        const a = document.createElement('a');
        a.href = mergedUrl;
        a.download = `merged_audio_${Date.now()}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Clean Golden Standard Landing View (Matches AudioConverter & AudioTrimmer)
    if (tracks.length === 0) {
        return (
            <ToolShell
                icon={ListMusic}
                title="Audio Merger"
                description="Combine multiple audio tracks into a single seamless stereo master."
                features={[
                    { icon: Layers, label: 'True Stereo', desc: 'Retains dual-channel depth' },
                    { icon: ArrowRight, label: 'Track Ordering', desc: 'Drag or move sequence' },
                    { icon: Volume2, label: 'Volume Balance', desc: 'Per-track gain controls' },
                    { icon: Download, label: 'High Bitrate', desc: 'Lossless WAV & 320k MP3' },
                ]}
                file={[]}
                accept="audio/*"
                multiple
                uploadLabel="Drop 2 or more audio files here"
                uploadDescription="Select multiple MP3, WAV, AAC, OGG files to begin"
                onFileSelect={handleFilesSelect}
                error={error || null}
            >
                <></>
            </ToolShell>
        );
    }

    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col font-sans selection:bg-indigo-500/30 ${isMobile ? 'min-h-screen' : 'max-w-7xl mx-auto rounded-3xl border border-zinc-800/80 shadow-2xl overflow-hidden'}`}>

            {/* Hidden Track Preview Player */}
            <audio
                ref={previewAudioRef}
                onEnded={() => setActivePreviewId(null)}
                onPause={() => setActivePreviewId(null)}
            />

            {/* Header / Brand Strip (Visible in Studio Workspace) */}
            <div className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <ListMusic size={20} />
                    </div>
                    <div>
                        <h2 className="font-black text-sm text-white uppercase tracking-widest font-unbounded flex items-center gap-2">
                            Audio Merger Studio
                        </h2>
                        <p className="text-[11px] text-zinc-500">Multi-track stereo sequencing & lossless joining</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs border-zinc-800 text-zinc-400 hover:text-white"
                        onClick={() => {
                            tracks.forEach(t => URL.revokeObjectURL(t.audioUrl));
                            setTracks([]);
                            setMergedUrl(null);
                        }}
                    >
                        Clear All
                    </Button>
                </div>
            </div>

            {/* Studio Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 flex-1">
                
                {/* Left: Tracks Sequencer (8 cols) */}
                <div className="lg:col-span-8 p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-zinc-900">
                    
                    {/* Timeline Strip Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest font-unbounded">
                                Sequenced Tracks ({tracks.length})
                            </span>
                            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                                Est. Total: {formatDuration(estimatedTotalDuration)}
                            </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 hidden sm:inline">Drag rows or use arrows to reorder</span>
                    </div>

                    {/* Interactive Track Cards */}
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                        {tracks.map((track, index) => (
                            <div
                                key={track.id}
                                draggable
                                onDragStart={(e) => {
                                    dragIndexRef.current = index;
                                    e.dataTransfer.effectAllowed = 'move';
                                    try { e.dataTransfer.setData('text/plain', String(index)); } catch { /* IE */ }
                                }}
                                onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null); }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    if (dragOverIndex !== index) setDragOverIndex(index);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const from = dragIndexRef.current;
                                    if (from !== null && from !== index) moveTrack(from, index);
                                    dragIndexRef.current = null;
                                    setDragOverIndex(null);
                                }}
                                className={`p-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${activePreviewId === track.id ? 'bg-indigo-950/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10' : dragOverIndex === index && dragIndexRef.current !== null ? 'border-indigo-500/60 bg-indigo-500/5' : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'}`}
                            >
                                <div className="flex items-center gap-3">
                                    
                                    {/* Reorder Buttons & Index */}
                                    <div className="flex flex-col items-center gap-1 shrink-0">
                                        <button
                                            disabled={index === 0}
                                            onClick={() => moveTrack(index, index - 1)}
                                            className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800/80 text-zinc-300 transition-colors"
                                            title="Move Track Up"
                                        >
                                            <ArrowUp size={12} />
                                        </button>
                                        <span className="text-[10px] font-mono font-bold text-indigo-400 px-1">
                                            {index + 1}
                                        </span>
                                        <button
                                            disabled={index === tracks.length - 1}
                                            onClick={() => moveTrack(index, index + 1)}
                                            className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800/80 text-zinc-300 transition-colors"
                                            title="Move Track Down"
                                        >
                                            <ArrowDown size={12} />
                                        </button>
                                    </div>

                                    {/* Preview Play Button */}
                                    <button
                                        onClick={() => togglePreview(track)}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow transition-all ${activePreviewId === track.id ? 'bg-indigo-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'}`}
                                        title={activePreviewId === track.id ? 'Pause Preview' : 'Play Preview'}
                                    >
                                        {activePreviewId === track.id ? <Pause size={16} fill="white" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                                    </button>

                                    {/* Track Info & Mini Waveform */}
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-bold text-white truncate max-w-xs md:max-w-sm">
                                                {track.fileData.file.name}
                                            </p>
                                            <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                                                {formatDuration(track.duration)}
                                            </span>
                                        </div>

                                        {/* Mini Peak Waveform Visual */}
                                        <div className="h-6 w-full bg-zinc-950/70 rounded-lg flex items-center px-1.5 gap-0.5 overflow-hidden">
                                            {track.peaks ? (
                                                Array.from(track.peaks.slice(0, 48)).map((p, pIdx) => (
                                                    <div
                                                        key={pIdx}
                                                        className="flex-1 bg-indigo-500/60 rounded-full"
                                                        style={{ height: `${Math.max(15, p * 100)}%` }}
                                                    />
                                                ))
                                            ) : (
                                                <div className="w-full h-0.5 bg-zinc-800" />
                                            )}
                                        </div>

                                        {/* Per-track trim (start / end seconds) */}
                                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 pt-0.5">
                                            <span className="uppercase tracking-wider font-bold shrink-0">Trim</span>
                                            <label className="flex items-center gap-1">
                                                <span className="text-indigo-400">IN</span>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max={Math.max(0, track.trimEnd - 0.1)}
                                                    value={track.trimStart.toFixed(1)}
                                                    onChange={(e) => updateTrackTrim(index, 'trimStart', Number(e.target.value))}
                                                    className="w-14 bg-zinc-950 border border-zinc-700/70 rounded px-1 py-0.5 text-right text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                                                    disabled={track.duration <= 0}
                                                />
                                            </label>
                                            <label className="flex items-center gap-1">
                                                <span className="text-indigo-400">OUT</span>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min={track.trimStart + 0.1}
                                                    max={track.duration || 999}
                                                    value={track.trimEnd.toFixed(1)}
                                                    onChange={(e) => updateTrackTrim(index, 'trimEnd', Number(e.target.value))}
                                                    className="w-14 bg-zinc-950 border border-zinc-700/70 rounded px-1 py-0.5 text-right text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                                                    disabled={track.duration <= 0}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    {/* Track Volume */}
                                    <div className="w-28 hidden md:block shrink-0 px-2">
                                        <div className="flex justify-between text-[10px] text-zinc-500 font-mono mb-1">
                                            <span>Vol</span>
                                            <span>{track.volume}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={150}
                                            value={track.volume}
                                            onChange={(e) => updateTrackVolume(index, Number(e.target.value))}
                                            className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                                        />
                                    </div>

                                    {/* Remove Track */}
                                    <button
                                        onClick={() => removeTrack(index)}
                                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
                                        title="Remove Track"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Append Tracks Dropper */}
                    <div className="pt-2">
                        <FileUploader
                            onFilesSelect={handleFilesSelect}
                            label="Append More Tracks"
                            description="Drop files here to add them to the end of the sequence"
                            multiple={true}
                            className="w-full py-4 border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/40 rounded-2xl transition-all"
                        />
                    </div>

                </div>

                {/* Right: Master Output Settings (4 cols) */}
                <div className="lg:col-span-4 p-6 bg-zinc-950/50 space-y-6">
                    
                    <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest font-unbounded flex items-center gap-2">
                        <Sliders size={16} /> Master Output
                    </h3>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl text-xs text-red-400 flex items-start gap-2 animate-fadeIn">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Transitions & Sequencing */}
                    <section className="space-y-4">
                        <SectionLabel>Transitions</SectionLabel>
                        <SliderControl
                            label="Crossfade"
                            value={crossfade}
                            min={0}
                            max={10}
                            step={0.5}
                            onChange={(v) => { setCrossfade(v); setMergedUrl(null); }}
                            unit="s"
                        />
                        {crossfade > 0 ? (
                            <p className="text-[10px] text-zinc-500 border border-zinc-800 bg-zinc-900/40 rounded-xl px-2.5 py-2">
                                Track gap is disabled while crossfade is active (crossfade blends the two tracks instead of separating them).
                            </p>
                        ) : (
                            <SliderControl
                                label="Track Gap"
                                value={gapDuration}
                                min={0}
                                max={5}
                                step={0.25}
                                onChange={(v) => { setGapDuration(v); setMergedUrl(null); }}
                                unit="s"
                            />
                        )}
                    </section>

                    {/* Master Volume */}
                    <section className="space-y-4">
                        <SliderControl
                            label="Master Gain Level"
                            value={masterVolume}
                            min={0}
                            max={200}
                            step={5}
                            onChange={setMasterVolume}
                            unit="%"
                        />
                    </section>

                    {/* Format Selection */}
                    <section className="space-y-3">
                        <SectionLabel>Export Format</SectionLabel>
                        <div className="grid grid-cols-3 gap-1.5">
                            {(['mp3', 'wav', 'aac', 'm4a', 'ogg'] as ExportFormat[]).map((fmt) => (
                                <button
                                    key={fmt}
                                    onClick={() => {
                                        setExportFormat(fmt);
                                        setMergedUrl(null);
                                    }}
                                    className={`py-2 text-xs font-mono font-bold rounded-xl uppercase border transition-all ${exportFormat === fmt ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                                >
                                    {fmt}
                                </button>
                            ))}
                        </div>

                        {(exportFormat !== 'wav') && (
                            <div className="space-y-1.5 pt-2">
                                <span className="text-xs text-zinc-400 block">Bitrate</span>
                                <div className="grid grid-cols-4 gap-1">
                                    {(['128k', '192k', '256k', '320k'] as BitrateOption[]).map((b) => (
                                        <button
                                            key={b}
                                            onClick={() => {
                                                setExportBitrate(b);
                                                setMergedUrl(null);
                                            }}
                                            className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${exportBitrate === b ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                                        >
                                            {b}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="space-y-1">
                                <span className="text-xs text-zinc-400 block">Channels</span>
                                <Select
                                    size="sm"
                                    value={channelLayout}
                                    onChange={(val) => { setChannelLayout(val as typeof channelLayout); setMergedUrl(null); }}
                                    disabled={isProcessing}
                                    options={[
                                        { value: 'stereo', label: 'Stereo (2 ch)' },
                                        { value: 'mono', label: 'Mono (1 ch)' }
                                    ]}
                                />
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-zinc-400 block">Sample Rate</span>
                                <Select
                                    size="sm"
                                    value={sampleRate}
                                    onChange={(val) => { setSampleRate(val as typeof sampleRate); setMergedUrl(null); }}
                                    disabled={isProcessing}
                                    options={[
                                        { value: '44100', label: '44100 Hz' },
                                        { value: '48000', label: '48000 Hz' },
                                        { value: '22050', label: '22050 Hz' }
                                    ]}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Summary Box */}
                    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between text-zinc-400">
                            <span>Total Tracks:</span>
                            <span className="text-white font-mono">{tracks.length} files</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Channels:</span>
                            <span className="text-indigo-300 font-mono">{channelLayout === 'stereo' ? 'Stereo (2 Ch)' : 'Mono (1 Ch)'} • {sampleRate} Hz</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Est. Duration:</span>
                            <span className="text-white font-mono">{formatDuration(estimatedTotalDuration)}</span>
                        </div>
                    </div>

                    {/* Merge Actions */}
                    <div className="pt-2 space-y-3">
                        {!mergedUrl ? (
                            <Button
                                className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/25 border-none text-sm transition-all"
                                onClick={handleMerge}
                                isLoading={isProcessing}
                                disabled={tracks.length < 2 || isProcessing}
                            >
                                {isProcessing ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 size={18} className="animate-spin" />
                                        {statusText || `Merging (${progress}%)...`}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Disc size={18} />
                                        <span>Merge {tracks.length} Tracks</span>
                                    </span>
                                )}
                            </Button>
                        ) : (
                            <div className="space-y-4 animate-slide-up">
                                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                                        <Check size={16} className="text-emerald-400" />
                                        <span>Merge Complete</span>
                                    </div>
                                    {mergedSize && (
                                        <span className="font-mono text-zinc-400">{mergedSize}</span>
                                    )}
                                </div>

                                {/* Merged Audio Preview Player */}
                                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-2">
                                    <div className="flex items-center justify-between text-xs text-zinc-400">
                                        <span>Master Preview</span>
                                        <span className="font-mono text-indigo-300">{formatDuration(masterCurrentTime)}</span>
                                    </div>
                                    <audio
                                        ref={masterAudioRef}
                                        src={mergedUrl}
                                        controls
                                        className="w-full h-8"
                                        onTimeUpdate={(e) => setMasterCurrentTime(e.currentTarget.currentTime)}
                                        onPlay={() => setIsMasterPlaying(true)}
                                        onPause={() => setIsMasterPlaying(false)}
                                    />
                                </div>

                                <Button
                                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-xl shadow-emerald-600/25 text-sm transition-all border-none"
                                    onClick={downloadMerged}
                                >
                                    <Download size={18} className="mr-2" /> Download Merged Audio
                                </Button>

                                <Button
                                    variant="secondary"
                                    className="w-full h-11 border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold"
                                    onClick={() => setMergedUrl(null)}
                                >
                                    <RotateCcw size={16} className="mr-2" /> Re-adjust Tracks
                                </Button>
                            </div>
                        )}
                    </div>

                </div>

            </div>

        </div>
    );
};