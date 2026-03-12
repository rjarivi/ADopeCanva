import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import {
    Play, Pause, Scissors, Download, AlertCircle, Loader2,
    Film, Plus, Trash2, Copy, VolumeX, Volume2,
    Monitor, Smartphone, Square, Maximize2, Video,
    Check, ArrowLeft,
} from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { useIsMobile } from '../../hooks/useIsMobile';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClipData {
    id: string;
    file: File;
    url: string;
    duration: number;
    thumbnails: string[];
    trimStart: number;
    trimEnd: number;
    muted: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 9);

/** Format seconds → HH:MM:SS (for trim inputs) */
const fmtTimecode = (s: number): string => {
    if (!isFinite(s) || s < 0) s = 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

/** Format seconds → M:SS (for progress display) */
const fmtDuration = (s: number): string => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
};

const parseTimecode = (t: string): number => {
    const parts = t.split(':').map(p => parseFloat(p) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
};

const getVideoDuration = (file: File): Promise<number> =>
    new Promise(resolve => {
        const v = document.createElement('video');
        const url = URL.createObjectURL(file);
        v.src = url;
        v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration); };
        v.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    });

const generateThumbs = async (file: File, count = 8): Promise<string[]> =>
    new Promise(resolve => {
        const v = document.createElement('video');
        const url = URL.createObjectURL(file);
        v.src = url;
        v.muted = true;
        v.preload = 'metadata';
        v.onloadedmetadata = async () => {
            if (!v.duration) { URL.revokeObjectURL(url); resolve([]); return; }
            const canvas = document.createElement('canvas');
            canvas.width = 160; canvas.height = 90;
            const ctx = canvas.getContext('2d')!;
            const thumbs: string[] = [];
            for (let i = 0; i < count; i++) {
                v.currentTime = (v.duration / count) * i + 0.1;
                await new Promise(r => { v.onseeked = r; setTimeout(r, 300); });
                ctx.drawImage(v, 0, 0, 160, 90);
                thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
            }
            URL.revokeObjectURL(url);
            resolve(thumbs);
        };
        v.onerror = () => { URL.revokeObjectURL(url); resolve([]); };
    });

// ─── Component ────────────────────────────────────────────────────────────────

export const QuickVideoEditor: React.FC = () => {
    const isMobile = useIsMobile();

    // Engine
    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [engineError, setEngineError] = useState('');
    const ffmpegRef = useRef<FFmpeg | null>(null);

    // Clips
    const [clips, setClips] = useState<ClipData[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Playback
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    // Trim mode
    const [trimMode, setTrimMode] = useState(false);
    const [pendingStart, setPendingStart] = useState('00:00:00');
    const [pendingEnd, setPendingEnd] = useState('00:00:00');

    // Global controls
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [globalMuted, setGlobalMuted] = useState(false);

    // Export
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [exportUrl, setExportUrl] = useState<string | null>(null);

    // Hidden file input
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Derived
    const selectedClip = clips.find(c => c.id === selectedId) ?? null;
    const totalDuration = clips.reduce((sum, c) => sum + (c.trimEnd - c.trimStart), 0);

    // ── Engine init ──
    useEffect(() => {
        getFFmpeg()
            .then(ff => { ffmpegRef.current = ff; setEngineStatus('ready'); })
            .catch(e => { setEngineError(e instanceof Error ? e.message : 'Unknown error'); setEngineStatus('error'); });
    }, []);

    // ── Sync video element when selected clip changes ──
    useEffect(() => {
        const clip = clips.find(c => c.id === selectedId);
        if (!clip || !videoRef.current) return;
        videoRef.current.pause();
        videoRef.current.src = clip.url;
        videoRef.current.currentTime = clip.trimStart;
        videoRef.current.muted = clip.muted || globalMuted;
        setIsPlaying(false);
        setCurrentTime(clip.trimStart);
    }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Sync mute ──
    useEffect(() => {
        if (videoRef.current && selectedClip) {
            videoRef.current.muted = selectedClip.muted || globalMuted;
        }
    }, [globalMuted, selectedClip]);

    // ── Add clips ──
    const addFiles = useCallback(async (files: File[]) => {
        const videoFiles = files.filter(f => f.type.startsWith('video/'));
        if (!videoFiles.length) return;
        const newClips: ClipData[] = [];
        for (const file of videoFiles) {
            const duration = await getVideoDuration(file);
            const id = genId();
            const url = URL.createObjectURL(file);
            newClips.push({ id, file, url, duration, thumbnails: [], trimStart: 0, trimEnd: duration, muted: false });
            // Async thumbnail generation
            generateThumbs(file).then(thumbs =>
                setClips(prev => prev.map(c => c.id === id ? { ...c, thumbnails: thumbs } : c))
            );
        }
        setClips(prev => {
            const updated = [...prev, ...newClips];
            return updated;
        });
        setSelectedId(prev => prev ?? newClips[0].id);
        setExportUrl(null);
    }, []);

    const updateClip = useCallback((id: string, patch: Partial<ClipData>) => {
        setClips(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
        setExportUrl(null);
    }, []);

    const deleteClip = (id: string) => {
        setClips(prev => {
            const next = prev.filter(c => c.id !== id);
            if (selectedId === id) setSelectedId(next.length ? next[0].id : null);
            return next;
        });
        setExportUrl(null);
    };

    const duplicateClip = (id: string) => {
        const clip = clips.find(c => c.id === id);
        if (!clip) return;
        const newId = genId();
        const newClip: ClipData = { ...clip, id: newId, url: URL.createObjectURL(clip.file) };
        setClips(prev => {
            const idx = prev.findIndex(c => c.id === id);
            const next = [...prev];
            next.splice(idx + 1, 0, newClip);
            return next;
        });
        setExportUrl(null);
    };

    // ── Trim mode ──
    const enterTrimMode = () => {
        if (!selectedClip) return;
        setPendingStart(fmtTimecode(selectedClip.trimStart));
        setPendingEnd(fmtTimecode(selectedClip.trimEnd));
        setTrimMode(true);
    };

    const commitTrim = () => {
        if (!selectedClip) return;
        const s = Math.max(0, Math.min(parseTimecode(pendingStart), selectedClip.duration - 0.1));
        const e = Math.max(s + 0.1, Math.min(parseTimecode(pendingEnd), selectedClip.duration));
        updateClip(selectedClip.id, { trimStart: s, trimEnd: e });
        if (videoRef.current) videoRef.current.currentTime = s;
        setCurrentTime(s);
        setTrimMode(false);
    };

    // ── Playback ──
    const togglePlay = () => {
        if (!videoRef.current || !selectedClip) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            if (videoRef.current.currentTime >= selectedClip.trimEnd ||
                videoRef.current.currentTime < selectedClip.trimStart) {
                videoRef.current.currentTime = selectedClip.trimStart;
            }
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const t = e.currentTarget.currentTime;
        setCurrentTime(t);
        if (selectedClip && t >= selectedClip.trimEnd) {
            e.currentTarget.pause();
            e.currentTarget.currentTime = selectedClip.trimStart;
            setCurrentTime(selectedClip.trimStart);
            setIsPlaying(false);
        }
    };

    // ── Export ──
    const handleExport = async () => {
        if (!ffmpegRef.current || clips.length === 0) return;
        setIsProcessing(true);
        setProgress(0);
        const ffmpeg = ffmpegRef.current;
        const onProg = ({ progress: p }: { progress: number }) => {
            if (p >= 0 && p <= 1) setProgress(Math.round(p * 100));
        };
        ffmpeg.on('progress', onProg);
        try {
            if (clips.length === 1) {
                const clip = clips[0];
                await writeFileToFFmpeg(ffmpeg, 'inp.mp4', clip.file);
                await ffmpeg.exec([
                    '-y', '-ss', String(clip.trimStart), '-to', String(clip.trimEnd),
                    '-i', 'inp.mp4',
                    '-c:v', 'libx264', '-preset', 'ultrafast',
                    '-c:a', 'aac', '-ar', '44100',
                    'out.mp4',
                ]);
                await ffmpeg.deleteFile('inp.mp4');
            } else {
                // Trim each clip individually
                const trimmed: string[] = [];
                for (let i = 0; i < clips.length; i++) {
                    const clip = clips[i];
                    const inName = `inp_${i}.mp4`;
                    const outName = `tri_${i}.mp4`;
                    await writeFileToFFmpeg(ffmpeg, inName, clip.file);
                    await ffmpeg.exec([
                        '-y', '-ss', String(clip.trimStart), '-to', String(clip.trimEnd),
                        '-i', inName,
                        '-c:v', 'libx264', '-preset', 'ultrafast',
                        '-c:a', 'aac', '-ar', '44100', '-ac', '2',
                        outName,
                    ]);
                    await ffmpeg.deleteFile(inName);
                    trimmed.push(outName);
                }
                // Write concat list
                const list = trimmed.map(n => `file '${n}'`).join('\n');
                await ffmpeg.writeFile('list.txt', new TextEncoder().encode(list));
                // Concat with re-encode
                await ffmpeg.exec([
                    '-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt',
                    '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac',
                    'out.mp4',
                ]);
                for (const n of trimmed) await ffmpeg.deleteFile(n);
                await ffmpeg.deleteFile('list.txt');
            }
            const url = await readFileFromFFmpeg(ffmpeg, 'out.mp4', 'video/mp4');
            setExportUrl(url);
            await ffmpeg.deleteFile('out.mp4');
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed. See console for details.');
        } finally {
            ffmpeg.off('progress', onProg);
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!exportUrl) return;
        const a = document.createElement('a');
        a.href = exportUrl;
        a.download = `edited_${clips[0]?.file.name ?? 'video'}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // ── Progress bar helpers ──
    const playheadPercent = (() => {
        if (!selectedClip || totalDuration === 0) return 0;
        const before = clips
            .slice(0, clips.findIndex(c => c.id === selectedId))
            .reduce((sum, c) => sum + (c.trimEnd - c.trimStart), 0);
        const inClip = Math.max(0, currentTime - selectedClip.trimStart);
        return Math.min(100, ((before + inClip) / totalDuration) * 100);
    })();

    // ── File input handler ──
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ''; }
    };

    // ── Aspect ratio style ──
    const arStyle = aspectRatio === '16:9' ? { aspectRatio: '16/9' }
        : aspectRatio === '9:16' ? { aspectRatio: '9/16' }
        : aspectRatio === '1:1' ? { aspectRatio: '1/1' }
        : {};

    // ═══════════════════════════════════════════════════════
    //  RENDER STATES
    // ═══════════════════════════════════════════════════════

    if (engineStatus === 'error') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
                <div className="bg-red-500/10 p-4 rounded-full text-red-500"><AlertCircle size={32} /></div>
                <div>
                    <h3 className="text-xl font-bold text-white">Engine Failed</h3>
                    <p className="text-zinc-400 mt-2">The video engine could not load.</p>
                    {engineError && <p className="text-red-400 text-sm font-mono bg-black/50 p-2 rounded mt-2 max-w-lg">{engineError}</p>}
                </div>
                <Button onClick={() => window.location.reload()} variant="secondary">Reload Page</Button>
            </div>
        );
    }

    if (engineStatus === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
                <Loader2 size={48} className="animate-spin text-indigo-500" />
                <p className="text-zinc-400 font-medium">Initializing video engine...</p>
            </div>
        );
    }

    // ── Upload screen ──
    if (clips.length === 0) {
        return (
            <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center gap-3 font-unbounded">
                        <Video size={32} /> Quick Video Editor
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Trim & merge multiple clips — runs entirely in your browser.
                    </p>
                </div>

                <div
                    className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border-2 border-dashed border-zinc-700 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/60 hover:bg-zinc-900/70 transition-all group"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}
                >
                    <div className="p-5 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors mb-4">
                        <Film size={40} className="text-indigo-400" />
                    </div>
                    <p className="text-lg font-bold text-zinc-300">Drop videos here or click to browse</p>
                    <p className="text-sm text-zinc-500 mt-1">MP4, MOV, WebM, AVI — add one or more clips</p>
                    <input ref={fileInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleFileChange} />
                </div>

                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Scissors, label: 'Trim Clips', desc: 'Precise start & end points' },
                        { icon: Film, label: 'Merge Videos', desc: 'Combine multiple clips' },
                        { icon: Monitor, label: 'Aspect Ratio', desc: 'Resize for any platform' },
                        { icon: Volume2, label: 'Audio Control', desc: 'Per-clip mute support' },
                    ].map((f, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30">
                            <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-400"><f.icon size={20} /></div>
                            <div>
                                <h3 className="text-sm font-bold text-zinc-200">{f.label}</h3>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mt-1">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════
    //  MAIN EDITOR
    // ══════════════════════════════════════════════════════
    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-7xl mx-auto rounded-3xl border border-zinc-800 h-[85vh] shadow-2xl'}`}>

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleFileChange} />

            {/* ── Right Panel ── */}
            <aside className={`${isMobile ? 'order-2' : 'order-2 w-64 border-l'} border-zinc-800 bg-zinc-950 flex flex-col shrink-0`}>
                {trimMode ? (
                    /* TRIM PANEL */
                    <div className="flex flex-col h-full">
                        <div className="h-14 px-4 border-b border-zinc-800 flex items-center gap-3 shrink-0">
                            <button
                                onClick={() => setTrimMode(false)}
                                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft size={15} />
                            </button>
                            <h2 className="font-bold text-sm text-white">Trim video</h2>
                        </div>

                        <div className="flex-1 p-5 space-y-5">
                            <div className="h-px bg-zinc-800" />
                            <div>
                                <p className="text-xs text-zinc-500 mb-2">Start Time</p>
                                <input
                                    type="text"
                                    value={pendingStart}
                                    onChange={e => setPendingStart(e.target.value)}
                                    onBlur={() => {
                                        if (videoRef.current) videoRef.current.currentTime = parseTimecode(pendingStart);
                                    }}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="00:00:00"
                                />
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500 mb-2">End Time</p>
                                <input
                                    type="text"
                                    value={pendingEnd}
                                    onChange={e => setPendingEnd(e.target.value)}
                                    onBlur={() => {
                                        if (videoRef.current) videoRef.current.currentTime = parseTimecode(pendingEnd);
                                    }}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="00:00:00"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-zinc-800 flex gap-2 shrink-0">
                            <Button onClick={commitTrim} className="flex-1 h-10">
                                <Check size={14} className="mr-1.5" /> Done
                            </Button>
                            <Button onClick={() => setTrimMode(false)} variant="secondary" className="flex-1 h-10">
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* NORMAL PANEL */
                    <div className="flex flex-col h-full">
                        <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                            <h2 className="font-black text-xs text-zinc-100 uppercase tracking-widest font-unbounded">
                                {clips.length > 1 ? 'Merge videos' : 'Quick Editor'}
                            </h2>
                            <button
                                onClick={() => { setClips([]); setSelectedId(null); setExportUrl(null); }}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors"
                                title="Clear all clips"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                            {/* Layout */}
                            <div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Layout</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: '16:9', label: '16:9', icon: Monitor },
                                        { id: '9:16', label: '9:16', icon: Smartphone },
                                        { id: '1:1', label: '1:1', icon: Square },
                                        { id: 'auto', label: 'Auto', icon: Maximize2 },
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setAspectRatio(opt.id)}
                                            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${aspectRatio === opt.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/30' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                                        >
                                            <opt.icon size={15} />
                                            <span className="text-[10px] font-bold">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mute all */}
                            <button
                                onClick={() => setGlobalMuted(m => !m)}
                                className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${globalMuted ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
                            >
                                {globalMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                                {globalMuted ? 'Unmute All' : 'Mute'}
                            </button>

                            {/* Clip count info */}
                            {clips.length > 1 && (
                                <p className="text-center text-[11px] text-zinc-500">
                                    {clips.length} clips · {fmtDuration(totalDuration)} total
                                </p>
                            )}
                        </div>

                        {/* Export / Download */}
                        <div className="p-4 border-t border-zinc-800 space-y-2 shrink-0">
                            {exportUrl ? (
                                <>
                                    <Button
                                        className="w-full h-11 bg-white text-black hover:bg-zinc-100 rounded-xl font-bold border-none"
                                        onClick={handleDownload}
                                    >
                                        <Download size={15} className="mr-2" /> Download
                                    </Button>
                                    <button
                                        onClick={() => setExportUrl(null)}
                                        className="w-full py-1.5 text-[11px] font-bold text-zinc-500 hover:text-white uppercase tracking-wider transition-colors"
                                    >
                                        Re-export
                                    </button>
                                </>
                            ) : (
                                <Button
                                    className="w-full h-11 shadow-lg shadow-indigo-500/20 rounded-xl font-bold border-none"
                                    onClick={handleExport}
                                    isLoading={isProcessing}
                                    disabled={isProcessing}
                                >
                                    {clips.length > 1
                                        ? <><Film size={15} className="mr-2" /> Merge & Export</>
                                        : <><Scissors size={15} className="mr-2" /> Export Video</>}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </aside>

            {/* ── Main Area ── */}
            <main className="order-1 flex-1 flex flex-col overflow-hidden bg-zinc-950 min-w-0">

                {/* Video Preview */}
                <div className="flex-1 min-h-0 relative flex items-center justify-center p-4 bg-[#09090b]">
                    <div
                        className="absolute inset-0 opacity-[0.04]"
                        style={{
                            backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                        }}
                    />
                    <div
                        className="relative h-full max-h-full bg-black rounded-xl overflow-hidden border border-zinc-800/80 shadow-2xl group"
                        style={arStyle}
                    >
                        <video
                            ref={videoRef}
                            className="w-full h-full object-contain"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={() => {
                                if (videoRef.current && selectedClip) {
                                    videoRef.current.currentTime = selectedClip.trimStart;
                                    setCurrentTime(selectedClip.trimStart);
                                }
                            }}
                        />

                        {/* Processing overlay */}
                        {isProcessing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/75 backdrop-blur-sm">
                                <div className="relative w-16 h-16 mb-4">
                                    <Loader2 size={64} className="animate-spin text-indigo-500 absolute inset-0" strokeWidth={1.5} />
                                    <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-white">{progress}%</div>
                                </div>
                                <p className="text-white font-bold text-sm">
                                    {clips.length > 1 ? 'Merging clips...' : 'Exporting...'}
                                </p>
                            </div>
                        )}

                        {/* Play button */}
                        {!isPlaying && !isProcessing && selectedClip && (
                            <div
                                className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-all cursor-pointer"
                                onClick={togglePlay}
                            >
                                <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-500/40 hover:bg-indigo-400 hover:scale-110 transition-all">
                                    <Play fill="white" className="text-white ml-1" size={22} />
                                </div>
                            </div>
                        )}

                        {/* Pause button (hover while playing) */}
                        {isPlaying && (
                            <div
                                className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                                onClick={togglePlay}
                            >
                                <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                    <Pause size={14} fill="white" className="text-white" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Bottom Bar ── */}
                <div className="bg-zinc-950 border-t border-zinc-900 shrink-0">
                    {trimMode ? (
                        /* ── Trim Timeline ── */
                        <div className="p-4 space-y-2">
                            <div className="relative h-16 w-full bg-zinc-900 rounded-lg border border-zinc-800 select-none overflow-visible">
                                {/* Thumbnails */}
                                <div className="absolute inset-0 flex rounded-lg overflow-hidden opacity-60">
                                    {selectedClip?.thumbnails.map((t, i) => (
                                        <img key={i} src={t} className="h-full flex-1 object-cover pointer-events-none" alt="" />
                                    ))}
                                    {!selectedClip?.thumbnails.length && (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px] font-bold uppercase tracking-widest">
                                            Loading frames...
                                        </div>
                                    )}
                                </div>

                                {/* Overlay: dim + active window + handles */}
                                {selectedClip && (() => {
                                    const sp = (parseTimecode(pendingStart) / selectedClip.duration) * 100;
                                    const ep = (parseTimecode(pendingEnd) / selectedClip.duration) * 100;
                                    return (
                                        <>
                                            <div className="absolute inset-y-0 left-0 bg-black/70 rounded-l-lg pointer-events-none" style={{ width: `${sp}%` }} />
                                            <div className="absolute inset-y-0 right-0 bg-black/70 rounded-r-lg pointer-events-none" style={{ width: `${100 - ep}%` }} />
                                            <div className="absolute inset-y-0 border-y-2 border-indigo-500 pointer-events-none" style={{ left: `${sp}%`, width: `${ep - sp}%` }} />

                                            {/* Start handle */}
                                            <div className="absolute inset-y-0 w-3 bg-indigo-500 rounded-l-md z-10 flex items-center justify-center pointer-events-none" style={{ left: `${sp}%` }}>
                                                <div className="w-px h-6 bg-white/60 rounded-full" />
                                            </div>
                                            {/* End handle */}
                                            <div className="absolute inset-y-0 w-3 bg-indigo-500 rounded-r-md z-10 flex items-center justify-center pointer-events-none" style={{ left: `${ep}%`, transform: 'translateX(-100%)' }}>
                                                <div className="w-px h-6 bg-white/60 rounded-full" />
                                            </div>

                                            {/* Draggable range inputs */}
                                            <input
                                                type="range" min="0" max={selectedClip.duration} step="0.1"
                                                value={parseTimecode(pendingStart)}
                                                onChange={e => setPendingStart(fmtTimecode(parseFloat(e.target.value)))}
                                                className="absolute inset-0 w-full h-full opacity-0 z-30 appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-16 [&::-webkit-slider-thumb]:cursor-col-resize [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-16 [&::-moz-range-thumb]:cursor-col-resize"
                                            />
                                            <input
                                                type="range" min="0" max={selectedClip.duration} step="0.1"
                                                value={parseTimecode(pendingEnd)}
                                                onChange={e => setPendingEnd(fmtTimecode(parseFloat(e.target.value)))}
                                                className="absolute inset-0 w-full h-full opacity-0 z-30 appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-16 [&::-webkit-slider-thumb]:cursor-col-resize [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-16 [&::-moz-range-thumb]:cursor-col-resize"
                                            />
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="flex justify-between text-[10px] font-mono text-zinc-600 px-0.5">
                                <span>{pendingStart}</span>
                                <span className="text-indigo-400">{fmtDuration(Math.max(0, parseTimecode(pendingEnd) - parseTimecode(pendingStart)))} selected</span>
                                <span>{pendingEnd}</span>
                            </div>
                        </div>
                    ) : (
                        /* ── Normal Bottom ── */
                        <>
                            {/* Progress bar */}
                            <div className="px-4 pt-3 pb-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-mono text-zinc-500 shrink-0 tabular-nums">
                                        {fmtDuration(Math.max(0, currentTime - (selectedClip?.trimStart ?? 0)))} / {fmtDuration(totalDuration)}
                                    </span>
                                    <div className="flex-1 relative h-1.5 bg-zinc-800 rounded-full overflow-visible">
                                        {/* Clip segments */}
                                        <div className="absolute inset-0 flex rounded-full overflow-hidden">
                                            {clips.map((clip, i) => (
                                                <div
                                                    key={clip.id}
                                                    className={`h-full transition-colors ${clip.id === selectedId ? 'bg-indigo-500' : 'bg-zinc-600/60'}`}
                                                    style={{
                                                        width: `${totalDuration > 0 ? ((clip.trimEnd - clip.trimStart) / totalDuration) * 100 : 0}%`,
                                                        borderRight: i < clips.length - 1 ? '1.5px solid #09090b' : undefined,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        {/* Playhead dot */}
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md pointer-events-none z-10"
                                            style={{ left: `${playheadPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Clip strip */}
                            <div className="px-4 pb-2 flex gap-2.5 overflow-x-auto">
                                {clips.map(clip => (
                                    <button
                                        key={clip.id}
                                        onClick={() => { setSelectedId(clip.id); setIsPlaying(false); }}
                                        className={`relative flex-shrink-0 w-[88px] h-[58px] rounded-lg overflow-hidden border-2 transition-all ${selectedId === clip.id ? 'border-indigo-500 shadow-md shadow-indigo-500/20' : 'border-zinc-700 hover:border-zinc-500'}`}
                                    >
                                        {clip.thumbnails.length > 0
                                            ? <img src={clip.thumbnails[Math.floor(clip.thumbnails.length / 2)]} className="w-full h-full object-cover" alt="" />
                                            : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Film size={16} className="text-zinc-600" /></div>
                                        }
                                        {/* Duration badge */}
                                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-px rounded-full whitespace-nowrap">
                                            {(clip.trimEnd - clip.trimStart).toFixed(1)}s
                                        </div>
                                        {/* Muted icon */}
                                        {clip.muted && (
                                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center">
                                                <VolumeX size={9} className="text-zinc-300" />
                                            </div>
                                        )}
                                    </button>
                                ))}

                                {/* + Add Media */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-shrink-0 w-[88px] h-[58px] rounded-lg border-2 border-dashed border-zinc-700 hover:border-indigo-500/60 hover:bg-zinc-900/60 flex flex-col items-center justify-center gap-1 transition-all text-zinc-500 hover:text-indigo-400"
                                >
                                    <Plus size={15} />
                                    <span className="text-[9px] font-bold uppercase tracking-wide">Add Media</span>
                                </button>
                            </div>

                            {/* Per-clip action bar */}
                            {selectedClip && (
                                <div className="px-4 pb-3 flex justify-center">
                                    <div className="inline-flex gap-0.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                                        {[
                                            { icon: Scissors, label: 'Trim', action: enterTrimMode, danger: false },
                                            { icon: selectedClip.muted ? VolumeX : Volume2, label: selectedClip.muted ? 'Unmute' : 'Mute', action: () => updateClip(selectedClip.id, { muted: !selectedClip.muted }), danger: false },
                                            { icon: Copy, label: 'Duplicate', action: () => duplicateClip(selectedClip.id), danger: false },
                                            { icon: Trash2, label: 'Delete', action: () => deleteClip(selectedClip.id), danger: true },
                                        ].map(a => (
                                            <button
                                                key={a.label}
                                                onClick={a.action}
                                                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all text-[10px] font-bold ${a.danger ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                            >
                                                <a.icon size={13} />
                                                {a.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};
