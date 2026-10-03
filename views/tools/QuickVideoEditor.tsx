import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import {
    Play, Pause, Scissors, Download, AlertCircle, Loader2,
    Film, Plus, Trash2, Copy, VolumeX, Volume2, Layers,
    Monitor, Smartphone, Square, Maximize2, Video,
    Check, ArrowLeft, RotateCw, FlipHorizontal2, FlipVertical2,
    ZoomIn, Gauge, Camera, Speaker, Crop as CropIcon, ChevronUp,
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
    const ms = Math.round((s - Math.floor(s)) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
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

/** Build a chain of atempo filters so the effective speed stays within each filter's 0.5–2 range (0.25x–4x synced) */
const atempoChain = (speed: number): string[] => {
    const parts: string[] = [];
    let s = speed;
    while (s > 2) { parts.push('2'); s /= 2; }
    while (s < 0.5) { parts.push('0.5'); s *= 2; }
    if (parts.length === 0 && s >= 0.5 && s <= 2 && Math.abs(s - 1) > 0.001) parts.push(s.toFixed(4));
    else if (parts.length > 0 && s !== 1) parts.push(s.toFixed(4));
    return parts.map(p => `atempo=${p}`);
};

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

    // Canvas (aspect ratio)
    const [aspectRatio, setAspectRatio] = useState('original');

    // Layout
    const [scaleMode, setScaleMode] = useState<'fit' | 'cover'>('fit');
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);

    // Playback speed
    const [speed, setSpeed] = useState(1);

    // Audio
    const [volume, setVolume] = useState(100);
    const [globalMuted, setGlobalMuted] = useState(false);

    // Crop (inset percentages — real `crop=w:h:x:y` in export, overlay in preview)
    const [cropEnabled, setCropEnabled] = useState(false);
    const [cropInset, setCropInset] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
    // Committed crop (percent of the ORIGINAL frame). New crop edits compose on top of this.
    const [appliedCrop, setAppliedCrop] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
    const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });
    const cropDragRef = useRef<{ type: string; startX: number; startY: number; boxW: number; boxH: number; insets: { left: number; right: number; top: number; bottom: number } } | null>(null);
    const MIN_CROP_PCT = 15; // keep at least 15% of each axis on screen when windowing
    const MAX_CROP_SUM = 100 - MIN_CROP_PCT; // left+right (or top+bottom) may not exceed this

    const clampIns = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));

    const handleCropPointerDown = (type: string) => (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const overlay = (e.currentTarget as HTMLElement).closest('[data-crop-overlay]');
        const box = overlay ? overlay.getBoundingClientRect() : null;
        cropDragRef.current = { type, startX: e.clientX, startY: e.clientY, boxW: box?.width ?? 1, boxH: box?.height ?? 1, insets: { ...cropInset } };
        // Capture the pointer on the overlay so the drag keeps tracking even when
        // the cursor slips past the handles or off the preview entirely.
        if (overlay) {
            (overlay as HTMLElement).dataset.cropActive = '1';
            (overlay as HTMLElement).setPointerCapture(e.pointerId);
        }
        setExportUrl(null);
    };

    const handleCropPointerMove = (e: React.PointerEvent) => {
        const d = cropDragRef.current;
        if (!d) return;
        e.stopPropagation();
        const dx = ((e.clientX - d.startX) / d.boxW) * 100;
        const dy = ((e.clientY - d.startY) / d.boxH) * 100;
        const i = d.insets;
        let next = { ...i };
        switch (d.type) {
            case 'w': case 'nw': case 'sw':
                next.left = clampIns(i.left + dx, MAX_CROP_SUM - i.right);
                break;
            case 'e': case 'ne': case 'se':
                next.right = clampIns(i.right - dx, MAX_CROP_SUM - i.left);
                break;
        }
        switch (d.type) {
            case 'n': case 'nw': case 'ne':
                next.top = clampIns(i.top + dy, MAX_CROP_SUM - i.bottom);
                break;
            case 's': case 'sw': case 'se':
                next.bottom = clampIns(i.bottom - dy, MAX_CROP_SUM - i.top);
                break;
            case 'move': {
                // Translate the whole window without changing its size:
                // dx is bounded by the room available on either side
                // (right edge has `i.right` slack, left edge has `i.left`).
                const translatedDx = Math.max(-i.left, Math.min(dx, i.right));
                const translatedDy = Math.max(-i.top, Math.min(dy, i.bottom));
                next.left = clampIns(i.left + translatedDx, MAX_CROP_SUM - i.right);
                next.right = clampIns(i.right - translatedDx, MAX_CROP_SUM - next.left);
                next.top = clampIns(i.top + translatedDy, MAX_CROP_SUM - i.bottom);
                next.bottom = clampIns(i.bottom - translatedDy, MAX_CROP_SUM - next.top);
                break;
            }
        }
        setCropInset(next);
    };

    const handleCropPointerUp = (e: React.PointerEvent) => {
        e.stopPropagation();
        cropDragRef.current = null;
    };

    // ── Crop compose/apply ──
    // `appliedCrop` is a percent-of-full-frame window. `cropInset` (the live overlay)
    // is a percent of the VISIBLE (already-cropped) area. Combined on export/apply.
    const rowFrac = Math.max(0.05, 1 - appliedCrop.left / 100 - appliedCrop.right / 100);
    const colFrac = Math.max(0.05, 1 - appliedCrop.top / 100 - appliedCrop.bottom / 100);
    const appliedActive = (appliedCrop.left + appliedCrop.right + appliedCrop.top + appliedCrop.bottom) > 0.5;

    const combineCrop = (a: typeof appliedCrop, o: typeof cropInset) => {
        const rF = Math.max(0.05, 1 - a.left / 100 - a.right / 100);
        const cF = Math.max(0.05, 1 - a.top / 100 - a.bottom / 100);
        return {
            left: a.left + (o.left / 100) * rF * 100,
            right: a.right + (o.right / 100) * rF * 100,
            top: a.top + (o.top / 100) * cF * 100,
            bottom: a.bottom + (o.bottom / 100) * cF * 100,
        };
    };

    const applyCropNow = () => {
        setAppliedCrop(combineCrop(appliedCrop, cropInset));
        setCropInset({ left: 0, right: 0, top: 0, bottom: 0 });
        setCropEnabled(false);
        setExportUrl(null);
    };

    const cancelCrop = () => {
        setCropInset({ left: 0, right: 0, top: 0, bottom: 0 });
        setCropEnabled(false);
        setExportUrl(null);
    };

    const combinedCrop = combineCrop(appliedCrop, cropEnabled ? cropInset : { left: 0, right: 0, top: 0, bottom: 0 });
    const combinedActive = (combinedCrop.left + combinedCrop.right + combinedCrop.top + combinedCrop.bottom) > 0.5;

    // Export options
    const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');
    const [fps, setFps] = useState(30);
    const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');
    const [exportMenuOpen, setExportMenuOpen] = useState(false);

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
        videoRef.current.playbackRate = speed;
        videoRef.current.volume = volume / 100;
        setIsPlaying(false);
        setCurrentTime(clip.trimStart);
    }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Sync mute ──
    useEffect(() => {
        if (videoRef.current && selectedClip) {
            videoRef.current.muted = selectedClip.muted || globalMuted;
        }
    }, [globalMuted, selectedClip]);

    // ── Sync speed & volume to video element ──
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
        }
    }, [speed]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = Math.max(0, Math.min(1, volume / 100));
        }
    }, [volume]);

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
            generateThumbs(file).then(thumbs =>
                setClips(prev => prev.map(c => c.id === id ? { ...c, thumbnails: thumbs } : c))
            );
        }
        setClips(prev => [...prev, ...newClips]);
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

    // ── Build FFmpeg filters ──
    const crfForQuality = quality === 'high' ? '18' : quality === 'low' ? '30' : '23';

    /** Video codec args. `final=false` = fast intermediate for per-clip concat passes. */
    const getVideoCodecArgs = (final: boolean): string[] => {
        if (!final) return ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'aac', '-ar', '44100', '-ac', '2'];
        if (exportFormat === 'webm') {
            return ['-c:v', 'libvpx', '-quality', 'realtime', '-cpu-used', '5', '-b:v', '1M', '-r', String(fps), '-c:a', 'libvorbis'];
        }
        return ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', crfForQuality, '-r', String(fps), '-c:a', 'aac', '-ar', '44100', '-ac', '2'];
    };

    const buildFilters = (clip?: ClipData) => {
        const vf: string[] = [];
        const af: string[] = [];

        if (rotation === 90) vf.push('transpose=1');
        else if (rotation === 180) { vf.push('transpose=1'); vf.push('transpose=1'); }
        else if (rotation === 270) vf.push('transpose=2');
        if (flipH) vf.push('hflip');
        if (flipV) vf.push('vflip');

        // Real crop: baked applied crop + live overlay, composed on the full-frame
        if (combinedActive) {
            const w = Math.max(0.1, 1 - combinedCrop.left / 100 - combinedCrop.right / 100);
            const h = Math.max(0.1, 1 - combinedCrop.top / 100 - combinedCrop.bottom / 100);
            vf.push(`crop=iw*${w.toFixed(4)}:ih*${h.toFixed(4)}:iw*${(combinedCrop.left / 100).toFixed(4)}:ih*${(combinedCrop.top / 100).toFixed(4)}`);
        }

        if (speed !== 1) vf.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);

        // Apply canvas aspect ratio / scale
        if (aspectRatio !== 'original') {
            const canvasDims: Record<string, [number, number]> = {
                '16:9': [1920, 1080],
                '9:16': [1080, 1920],
                '1:1': [1080, 1080],
            };
            const [tw, th] = canvasDims[aspectRatio] ?? [1920, 1080];
            if (scaleMode === 'fit') {
                vf.push(`scale=${tw}:${th}:force_original_aspect_ratio=decrease`);
                vf.push(`pad=${tw}:${th}:(ow-iw)/2:(oh-ih)/2,setsar=1`);
            } else {
                vf.push(`scale=${tw}:${th}:force_original_aspect_ratio=increase`);
                vf.push(`crop=${tw}:${th},setsar=1`);
            }
            // Apply zoom: scale up then crop back to canvas dimensions
            if (zoom !== 1) {
                vf.push(`scale=iw*${zoom.toFixed(4)}:ih*${zoom.toFixed(4)}`);
                vf.push(`crop=${tw}:${th}`);
            }
        } else if (zoom !== 1) {
            // No aspect ratio change — scale up and crop center back to original dimensions
            vf.push(`scale=iw*${zoom.toFixed(4)}:ih*${zoom.toFixed(4)}`);
            vf.push(`crop=iw/${zoom.toFixed(4)}:ih/${zoom.toFixed(4)}`);
        } else {
            // Crop without a fixed canvas — set SAR so square pixels are preserved
            if (combinedActive) vf.push('setsar=1');
        }

        if (speed !== 1) af.push(...atempoChain(speed));
        if (volume !== 100) af.push(`volume=${(volume / 100).toFixed(2)}`);

        return { vf, af };
    };

    /** Per-clip args: dynamic filters + mute handling. `intermediate` encodes are always h264/aac for concat safety. */
    const buildClipArgs = (inName: string, outName: string, trimStart: number, trimEnd: number, muted: boolean, intermediate: boolean): string[] => {
        const { vf, af } = buildFilters();
        let audioFilters = [...af];
        if (muted) {
            // Intermediate concat passes keep a silent stream so all segments match; single-clip export drops audio entirely.
            audioFilters = intermediate ? ['volume=0', ...audioFilters] : [];
        }
        const args = ['-y', '-ss', String(trimStart), '-to', String(trimEnd), '-i', inName];
        if (vf.length) args.push('-vf', vf.join(','));
        if (!muted && audioFilters.length) args.push('-af', audioFilters.join(','));
        args.push('-threads', threadsArg());
        if (muted && !intermediate) args.push('-an');
        args.push(...getVideoCodecArgs(!intermediate), outName);
        return args;
    };

    const threadsArg = (): string =>
        typeof navigator !== 'undefined' && navigator.hardwareConcurrency
            ? Math.min(navigator.hardwareConcurrency, 4).toString()
            : '2';

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
                await ffmpeg.exec(buildClipArgs('inp.mp4', 'out.mp4', clip.trimStart, clip.trimEnd, clip.muted || globalMuted, false));
                await ffmpeg.deleteFile('inp.mp4');
            } else {
                // Intermediate h264/aac pass per clip (muted clips get a volume=0 silent track so streams match),
                // then one final concat encode with the chosen format + fps.
                const trimmed: string[] = [];
                for (let i = 0; i < clips.length; i++) {
                    const clip = clips[i];
                    const inName = `inp_${i}.mp4`;
                    const outName = `tri_${i}.mp4`;
                    await writeFileToFFmpeg(ffmpeg, inName, clip.file);
                    await ffmpeg.exec(buildClipArgs(inName, outName, clip.trimStart, clip.trimEnd, clip.muted || globalMuted, true));
                    await ffmpeg.deleteFile(inName);
                    trimmed.push(outName);
                }
                const list = trimmed.map(n => `file '${n}'`).join('\n');
                await ffmpeg.writeFile('list.txt', new TextEncoder().encode(list));
                await ffmpeg.exec([
                    '-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt',
                    '-threads', threadsArg(),
                    ...getVideoCodecArgs(true),
                    'out.mp4',
                ]);
                for (const n of trimmed) await ffmpeg.deleteFile(n);
                await ffmpeg.deleteFile('list.txt');
            }

            const url = await readFileFromFFmpeg(ffmpeg, 'out.mp4', `video/${exportFormat}`);
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
        a.download = `edited_${clips[0]?.file.name ?? 'video'}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // ── Export separate clips (no concat) ──
    const handleExportSeparate = async () => {
        if (!ffmpegRef.current || clips.length === 0) return;
        setIsProcessing(true);
        setProgress(0);
        const ffmpeg = ffmpegRef.current;
        const onProg = ({ progress: p }: { progress: number }) => {
            if (p >= 0 && p <= 1) setProgress(Math.round(p * 100));
        };
        ffmpeg.on('progress', onProg);

        try {
            for (let i = 0; i < clips.length; i++) {
                const clip = clips[i];
                const inName = `sep_in_${i}.mp4`;
                const outName = `sep_out_${i}.${exportFormat}`;
                await writeFileToFFmpeg(ffmpeg, inName, clip.file);
                await ffmpeg.exec(buildClipArgs(inName, outName, clip.trimStart, clip.trimEnd, clip.muted || globalMuted, false));
                await ffmpeg.deleteFile(inName);
                const url = await readFileFromFFmpeg(ffmpeg, outName, `video/${exportFormat}`);
                await ffmpeg.deleteFile(outName);
                const baseName = clip.file.name.replace(/\.[^.]+$/, '');
                const a = document.createElement('a');
                a.href = url;
                a.download = `clip_${i + 1}_${baseName}.${exportFormat}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setProgress(Math.round(((i + 1) / clips.length) * 100));
            }
        } catch (err) {
            console.error('Separate export failed:', err);
            alert('Export failed. See console for details.');
        } finally {
            ffmpeg.off('progress', onProg);
            setIsProcessing(false);
        }
    };

    // ── Extract audio as MP3 (selected clip) ──
    const handleExtractAudio = async () => {
        if (!ffmpegRef.current || !selectedClip) return;
        setIsProcessing(true);
        setProgress(0);
        const ffmpeg = ffmpegRef.current;
        const onProg = ({ progress: p }: { progress: number }) => {
            if (p >= 0 && p <= 1) setProgress(Math.round(p * 100));
        };
        ffmpeg.on('progress', onProg);
        const inName = 'ext_in.mp4';
        const outName = 'ext_out.mp3';
        try {
            await writeFileToFFmpeg(ffmpeg, inName, selectedClip.file);
            await ffmpeg.exec([
                '-y', '-ss', String(selectedClip.trimStart), '-to', String(selectedClip.trimEnd), '-i', inName,
                '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', outName,
            ]);
            await ffmpeg.deleteFile(inName);
            const url = await readFileFromFFmpeg(ffmpeg, outName, 'audio/mpeg');
            await ffmpeg.deleteFile(outName);
            const baseName = selectedClip.file.name.replace(/\.[^.]+$/, '');
            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseName}_audio.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            console.error('Audio extraction failed:', err);
            alert('Audio extraction failed. The clip may have no audio track.');
        } finally {
            ffmpeg.off('progress', onProg);
            setIsProcessing(false);
        }
    };

    // ── Screenshot current frame ──
    const handleScreenshot = () => {
        const v = videoRef.current;
        if (!v || !v.videoWidth) return;
        // Honor the effective crop (applied + live) so the PNG matches the export framing
        const c = combinedCrop;
        const sx = (c.left / 100) * v.videoWidth;
        const sy = (c.top / 100) * v.videoHeight;
        const sw = v.videoWidth * Math.max(0.1, 1 - c.left / 100 - c.right / 100);
        const sh = v.videoHeight * Math.max(0.1, 1 - c.top / 100 - c.bottom / 100);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(sw) || v.videoWidth;
        canvas.height = Math.round(sh) || v.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Undo the CSS preview transform mirrors so the PNG matches export orientation
        ctx.save();
        if (flipH || flipV) ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        const t = Math.max(0, currentTime).toFixed(2).replace('.', '_');
        a.download = `frame_${t}s.png`;
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
    // After an applied crop, the "original" canvas becomes the cropped frame's own aspect
    const canvasStyle = appliedActive && aspectRatio === 'original' && videoDims.w > 0
        ? { ...arStyle, aspectRatio: `${((videoDims.w / videoDims.h) * (rowFrac / colFrac)).toFixed(4)}` }
        : arStyle;

    // ── Video transform style ──
    // With an applied crop, the video is magnified so the crop region fills the
    // canvas exactly (WYSIWYG with the ffmpeg crop), and pre-translated so the
    // crop region is centered before flips/rotation/zoom pivot about its center.
    const cropStageStyle = appliedActive
        ? {
            position: 'absolute' as const,
            width: `${(1 / rowFrac) * 100}%`,
            height: `${(1 / colFrac) * 100}%`,
            left: `${-(appliedCrop.left / 100) * (1 / rowFrac) * 100}%`,
            top: `${-(appliedCrop.top / 100) * (1 / colFrac) * 100}%`,
        }
        : {};
    const pivotShiftX = appliedActive ? (0.5 * rowFrac - 0.5 + appliedCrop.left / 100) * 100 : 0;
    const pivotShiftY = appliedActive ? (0.5 * colFrac - 0.5 + appliedCrop.top / 100) * 100 : 0;
    const videoTransformStyle = {
        ...cropStageStyle,
        transform: `translate(${pivotShiftX.toFixed(2)}%, ${pivotShiftY.toFixed(2)}%) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1}) rotate(${rotation}deg) scale(${zoom})`,
        objectFit: scaleMode === 'cover' ? 'cover' as const : 'contain' as const,
    };

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
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <Video size={32} /> Quick Video Editor
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Trim & merge multiple clips — runs entirely in your browser.
                    </p>
                </div>

                {/* Two-level upload box: outer solid card + inner dashed drop zone */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 relative overflow-hidden group hover:border-indigo-500/30 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div
                        className="relative w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all flex flex-col items-center justify-center cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}
                    >
                        <div className="p-4 rounded-full bg-zinc-800 mb-4 group-hover:bg-zinc-700 transition-colors">
                            <Film size={36} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <p className="text-lg font-bold text-white">Add Video</p>
                        <p className="text-sm text-zinc-500 mt-1">MP4, MOV, WebM, AVI — add one or more clips</p>
                        <input ref={fileInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleFileChange} />
                    </div>
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
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-7xl mx-auto rounded-3xl border border-zinc-800 h-full shadow-2xl'}`}>

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

                        <div className="flex-1 p-4 space-y-5 overflow-y-auto">

                            {/* ── CANVAS ── */}
                            <div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <Monitor size={10} /> Canvas
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'original', label: 'Original', icon: Maximize2 },
                                        { id: '16:9', label: '16:9', icon: Monitor },
                                        { id: '9:16', label: '9:16', icon: Smartphone },
                                        { id: '1:1', label: '1:1', icon: Square },
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

                            <div className="h-px bg-zinc-800/60" />

                            {/* ── LAYOUT ── */}
                            <div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <ZoomIn size={10} /> Layout
                                </p>

                                {/* Fit / Cover */}
                                <div className="flex bg-zinc-900 rounded-xl border border-zinc-800 p-1 mb-3">
                                    {(['fit', 'cover'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setScaleMode(mode)}
                                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${scaleMode === mode ? 'bg-indigo-500/10 border border-indigo-500 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>

                                {/* Zoom */}
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[11px] text-zinc-400">Zoom</span>
                                    <span className="text-[11px] font-bold text-indigo-400">{zoom.toFixed(1)}x</span>
                                </div>
                                <input
                                    type="range" min="0.5" max="3" step="0.1"
                                    value={zoom}
                                    onChange={e => setZoom(parseFloat(e.target.value))}
                                    className="w-full h-1.5 rounded-full appearance-none bg-zinc-800 accent-indigo-500 cursor-pointer mb-3"
                                />

                                {/* Transform buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRotation(r => (r + 90) % 360)}
                                        title="Rotate 90°"
                                        className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all text-[9px] font-bold"
                                    >
                                        <RotateCw size={14} />
                                        <span>Rotate</span>
                                    </button>
                                    <button
                                        onClick={() => setFlipH(h => !h)}
                                        title="Flip Horizontal"
                                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all text-[9px] font-bold ${flipH ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                                    >
                                        <FlipHorizontal2 size={14} />
                                        <span>Flip H</span>
                                    </button>
                                    <button
                                        onClick={() => setFlipV(v => !v)}
                                        title="Flip Vertical"
                                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all text-[9px] font-bold ${flipV ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                                    >
                                        <FlipVertical2 size={14} />
                                        <span>Flip V</span>
                                    </button>
                                </div>
                            </div>

                            <div className="h-px bg-zinc-800/60" />

                            {/* ── PLAYBACK SPEED ── */}
                            <div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <Gauge size={10} /> Playback Speed
                                </p>
                                <div className="flex gap-1.5">
                                    {[0.5, 1, 1.5, 2].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setSpeed(s)}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${speed === s ? 'bg-indigo-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                                        >
                                            {s}x
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-zinc-800/60" />

                            {/* Clip count info */}
                            {clips.length > 1 && (
                                <p className="text-center text-[11px] text-zinc-500">
                                    {clips.length} clips · {fmtDuration(totalDuration)} total
                                </p>
                            )}
                        </div>

                        {/* Export / Download */}
                        <div className="p-4 border-t border-zinc-800 shrink-0">
                            {exportUrl ? (
                                <div className="space-y-2.5">
                                    <Button
                                        className="w-full h-11 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl font-bold border-none shadow-lg shadow-indigo-500/20"
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
                                </div>
                            ) : (
                                <div className="relative flex gap-1.5">
                                    {/* Settings dropup */}
                                    {exportMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                                            <div className="absolute bottom-[calc(100%+6px)] left-0 right-0 z-50 bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-3 shadow-2xl shadow-black/60 origin-bottom">
                                                {/* Format */}
                                                <div>
                                                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                                                        <span>Export Format</span>
                                                        <span className="text-zinc-700 normal-case tracking-normal">video</span>
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {(['mp4', 'webm'] as const).map(f => (
                                                            <button
                                                                key={f}
                                                                onClick={() => { setExportFormat(f); setExportUrl(null); }}
                                                                className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${exportFormat === f ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'}`}
                                                            >
                                                                {f}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Frame rate + Quality */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Frame Rate</p>
                                                        <div className="grid grid-cols-3 gap-1">
                                                            {[24, 30, 60].map(f => (
                                                                <button
                                                                    key={f}
                                                                    onClick={() => { setFps(f); setExportUrl(null); }}
                                                                    className={`py-1.5 rounded-lg text-[10px] font-bold font-mono border transition-all ${fps === f ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                                                >
                                                                    {f}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Quality</p>
                                                        <div className="grid grid-cols-3 gap-1">
                                                            {(['high', 'medium', 'low'] as const).map(q => (
                                                                <button
                                                                    key={q}
                                                                    onClick={() => { setQuality(q); setExportUrl(null); }}
                                                                    className={`py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${quality === q ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                                                >
                                                                    {q}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Secondary captures */}
                                                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                                    <button
                                                        onClick={() => { handleScreenshot(); setExportMenuOpen(false); }}
                                                        className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-indigo-300 hover:border-indigo-500/40 transition-all"
                                                        title="Save the current preview frame as a PNG image"
                                                    >
                                                        <Camera size={11} /> PNG Frame
                                                    </button>
                                                    <button
                                                        onClick={handleExtractAudio}
                                                        disabled={isProcessing || !selectedClip}
                                                        className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-indigo-300 hover:border-indigo-500/40 transition-all disabled:opacity-30"
                                                        title="Extract the selected clip's audio as an MP3 file"
                                                    >
                                                        <Speaker size={11} /> MP3 Audio
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <Button
                                        className="flex-1 h-11 shadow-lg shadow-indigo-500/20 rounded-xl font-bold border-none"
                                        onClick={handleExport}
                                        isLoading={isProcessing}
                                        disabled={isProcessing}
                                    >
                                        {clips.length > 1
                                            ? <><Film size={15} className="mr-2" /> Merge & Export</>
                                            : <><Scissors size={15} className="mr-2" /> Export Video</>}
                                    </Button>
                                    {!isProcessing && (
                                        <button
                                            onClick={() => setExportMenuOpen(o => !o)}
                                            className={`shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${exportMenuOpen ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                                            title="Export settings"
                                        >
                                            <ChevronUp size={15} className={`transition-transform duration-200 ${exportMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                    )}
                                    {clips.length > 1 && (
                                        <button
                                            onClick={handleExportSeparate}
                                            disabled={isProcessing}
                                            className="absolute -top-5 left-0 w-full flex items-center justify-center gap-1.5 py-0.5 text-[9px] text-zinc-700 hover:text-zinc-400 transition-colors disabled:opacity-30"
                                            title="Process and download each clip as a separate file"
                                        >
                                            <Layers size={10} />
                                            export clips separately
                                        </button>
                                    )}
                                </div>
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
                        style={canvasStyle}
                    >
                        <video
                            ref={videoRef}
                            className="w-full h-full"
                            style={videoTransformStyle}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={() => {
                                if (videoRef.current && selectedClip) {
                                    videoRef.current.currentTime = selectedClip.trimStart;
                                    videoRef.current.playbackRate = speed;
                                    videoRef.current.volume = volume / 100;
                                    setVideoDims({ w: videoRef.current.videoWidth, h: videoRef.current.videoHeight });
                                    setCurrentTime(selectedClip.trimStart);
                                }
                            }}
                        />

                        {/* Crop reset (on-canvas) — clears live edits while cropping, or reverts the applied crop otherwise */}
                        {selectedClip && !isProcessing && !isPlaying && ((cropEnabled && (cropInset.left > 0 || cropInset.right > 0 || cropInset.top > 0 || cropInset.bottom > 0)) || (!cropEnabled && appliedActive)) && (
                            <div className="absolute top-3 left-3 z-30">
                                <button
                                    onClick={() => {
                                        if (cropEnabled) setCropInset({ left: 0, right: 0, top: 0, bottom: 0 });
                                        else { setAppliedCrop({ left: 0, right: 0, top: 0, bottom: 0 }); setExportUrl(null); }
                                    }}
                                    className="px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 border border-white/10 text-zinc-300 hover:text-white hover:bg-black/80 backdrop-blur-md transition-all"
                                    title={cropEnabled ? 'Clear this crop adjustment' : 'Remove the applied crop'}
                                >
                                    Reset
                                </button>
                            </div>
                        )}

                        {/* Interactive crop overlay — lives inside the already-applied crop region */}
                        {cropEnabled && !isProcessing && (
                            <div
                                data-crop-overlay
                                className="absolute z-20"
                                style={{
                                    left: `${appliedCrop.left}%`, top: `${appliedCrop.top}%`,
                                    right: `${appliedCrop.right}%`, bottom: `${appliedCrop.bottom}%`,
                                }}
                                onPointerMove={handleCropPointerMove}
                                onPointerUp={handleCropPointerUp}
                                onPointerLeave={handleCropPointerUp}
                            >
                                {/* Dimmed surroundings */}
                                <div className="absolute inset-0 pointer-events-none" style={{
                                    background: `linear-gradient(to right, rgba(0,0,0,0.55) ${cropInset.left}%, transparent ${cropInset.left}%, transparent ${100 - cropInset.right}%, rgba(0,0,0,0.55) ${100 - cropInset.right}%)`,
                                }} />
                                <div className="absolute inset-0 pointer-events-none" style={{
                                    background: `linear-gradient(to bottom, transparent ${cropInset.top}%, rgba(0,0,0,0.55) ${cropInset.top}%, rgba(0,0,0,0.55) ${100 - cropInset.bottom}%, transparent ${100 - cropInset.bottom}%)`,
                                }} />
                                {/* Crop window */}
                                <div
                                    className="absolute border-2 border-indigo-400/90 bg-indigo-500/5"
                                    style={{
                                        left: `${cropInset.left}%`, top: `${cropInset.top}%`,
                                        right: `${cropInset.right}%`, bottom: `${cropInset.bottom}%`,
                                        cursor: 'move',
                                    }}
                                    onPointerDown={handleCropPointerDown('move')}
                                >
                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                                        {Array.from({ length: 9 }).map((_, i) => (
                                            <div key={i} className={i === 4 ? '' : 'border border-dashed border-indigo-300/60 ' + (i % 3 === 0 ? 'border-l-0 ' : '') + (i % 3 === 2 ? 'border-r-0 ' : '') + (i < 3 ? 'border-t-0 ' : '') + (i >= 6 ? 'border-b-0 ' : '')} />
                                        ))}
                                    </div>
                                </div>
                                {/* 8 drag handles: 4 corners + 4 edges — large invisible hit zones, visible dot centered */}
                                {([
                                    { type: 'nw', style: { left: `${cropInset.left}%`, top: `${cropInset.top}%` }, dot: 'nw' },
                                    { type: 'n', style: { left: `${(cropInset.left + (100 - cropInset.right)) / 2}%`, top: `${cropInset.top}%` }, dot: 'n' },
                                    { type: 'ne', style: { left: `${100 - cropInset.right}%`, top: `${cropInset.top}%` }, dot: 'ne' },
                                    { type: 'w', style: { left: `${cropInset.left}%`, top: `${(cropInset.top + (100 - cropInset.bottom)) / 2}%` }, dot: 'w' },
                                    { type: 'e', style: { left: `${100 - cropInset.right}%`, top: `${(cropInset.top + (100 - cropInset.bottom)) / 2}%` }, dot: 'e' },
                                    { type: 'sw', style: { left: `${cropInset.left}%`, top: `${100 - cropInset.bottom}%` }, dot: 'sw' },
                                    { type: 's', style: { left: `${(cropInset.left + (100 - cropInset.right)) / 2}%`, top: `${100 - cropInset.bottom}%` }, dot: 's' },
                                    { type: 'se', style: { left: `${100 - cropInset.right}%`, top: `${100 - cropInset.bottom}%` }, dot: 'se' },
                                ] as const).map(h => {
                                    const cursors: Record<string, string> = { n: 'ns-resize', s: 'ns-resize', w: 'ew-resize', e: 'ew-resize', nw: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', se: 'nwse-resize' };
                                    return (
                                        <div
                                            key={h.type}
                                            onPointerDown={handleCropPointerDown(h.type)}
                                            className="absolute w-7 h-7 flex items-center justify-center rounded-md touch-none"
                                            style={{ left: h.style.left, top: h.style.top, marginLeft: '-14px', marginTop: '-14px', cursor: cursors[h.dot] }}
                                        >
                                            <div className="w-3 h-3 rounded-full bg-indigo-400 border-2 border-zinc-950 shadow-md group-hover:scale-110 transition-transform" />
                                        </div>
                                    );
                                })}
                                {/* Apply / Cancel */}
                                <div className="absolute top-3 right-3 z-40 flex gap-1.5" onPointerDown={e => e.stopPropagation()}>
                                    <button
                                        onClick={cancelCrop}
                                        className="px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-black/70 border border-white/10 text-zinc-300 hover:text-white hover:bg-black/90 backdrop-blur-md transition-all"
                                        title="Discard this crop adjustment"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={applyCropNow}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md transition-all ${(cropInset.left || cropInset.right || cropInset.top || cropInset.bottom)
                                            ? 'bg-indigo-600/90 border-indigo-400/60 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500'
                                            : 'bg-black/70 border-white/10 text-zinc-400'}`}
                                        title="Commit the crop — the preview shows the final cropped video from now on"
                                    >
                                        <Check size={11} /> Apply Crop
                                    </button>
                                </div>
                            </div>
                        )}

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

                        {/* In-player audio control */}
                        {selectedClip && !isProcessing && (
                            <div
                                className="absolute bottom-3 left-3 z-30 flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md"
                                onPointerDown={e => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => setGlobalMuted(m => !m)}
                                    className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border transition-all ${globalMuted ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-white/5 border-transparent text-white hover:bg-white/10'}`}
                                    title={globalMuted ? 'Unmute preview' : 'Mute preview'}
                                >
                                    {globalMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                                </button>
                                <input
                                    type="range" min="0" max="100" step="1"
                                    value={globalMuted ? 0 : volume}
                                    onChange={e => { setVolume(parseInt(e.target.value)); setGlobalMuted(false); }}
                                    className="w-20 h-1.5 rounded-full appearance-none bg-white/20 accent-indigo-500 cursor-pointer"
                                    title={`Preview volume ${globalMuted ? '(muted)' : volume + '%'}`}
                                />
                                <span className="text-[9px] font-bold text-zinc-400 w-7 tabular-nums">{globalMuted ? 'Mute' : `${volume}%`}</span>
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
                                                type="range" min="0" max={selectedClip.duration || 3600} step="0.02"
                                                value={parseTimecode(pendingStart)}
                                                onChange={e => setPendingStart(fmtTimecode(parseFloat(e.target.value)))}
                                                className="absolute inset-0 w-full h-full opacity-0 z-30 appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-16 [&::-webkit-slider-thumb]:cursor-col-resize [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-16 [&::-moz-range-thumb]:cursor-col-resize"
                                            />
                                            <input
                                                type="range" min="0" max={selectedClip.duration || 3600} step="0.02"
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
                                            { icon: CropIcon, label: cropEnabled ? 'Cropping' : 'Crop', action: () => { if (!cropEnabled) setCropInset({ left: 0, right: 0, top: 0, bottom: 0 }); setCropEnabled(c => !c); setExportUrl(null); }, danger: false, active: cropEnabled },
                                            { icon: selectedClip.muted ? VolumeX : Volume2, label: selectedClip.muted ? 'Unmute' : 'Mute', action: () => updateClip(selectedClip.id, { muted: !selectedClip.muted }), danger: false },
                                            { icon: Copy, label: 'Duplicate', action: () => duplicateClip(selectedClip.id), danger: false },
                                            { icon: Trash2, label: 'Delete', action: () => deleteClip(selectedClip.id), danger: true },
                                        ].map(a => (
                                            <button
                                                key={a.label}
                                                onClick={a.action}
                                                title={a.label === 'Crop' ? 'Toggle crop — drag the frame corners and edges on the video' : undefined}
                                                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all text-[10px] font-bold ${a.danger ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10' : (a as any).active ? 'text-indigo-300 bg-indigo-500/15' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
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
