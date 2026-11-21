/// <reference lib="dom" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { ToolShell } from '../../components/ToolShell';
import { useToolFile } from '../../hooks/useToolFile';
import {
    Play, Pause, Scissors, Film, Volume2, VolumeX, RotateCcw, Loader2,
    AlertCircle, Download, Settings, Trash2, Undo2, Maximize, Clock,
    ArrowLeftToLine, ArrowRightToLine, FastForward, Repeat, Keyboard,
    Check, Sparkles, Sliders, ChevronLeft, ChevronRight, Camera
} from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useObjectUrlState } from '../../hooks/useObjectUrl';

type VideoExportFormat = 'mp4' | 'webm' | 'gif' | 'mp3';

interface TrimPreset {
    label: string;
    description: string;
    apply: (duration: number) => { start: number; end: number };
}

const PRESETS: TrimPreset[] = [
    {
        label: 'First 15s',
        description: 'Instagram Story / Snap',
        apply: (d) => ({ start: 0, end: Math.min(15, d) })
    },
    {
        label: 'First 30s',
        description: 'Shorts / TikTok Clip',
        apply: (d) => ({ start: 0, end: Math.min(30, d) })
    },
    {
        label: 'First 60s',
        description: 'Standard 1-Min Highlight',
        apply: (d) => ({ start: 0, end: Math.min(60, d) })
    },
    {
        label: 'Last 30s',
        description: 'Outro / Credits Clip',
        apply: (d) => ({ start: Math.max(0, d - 30), end: d })
    },
    {
        label: 'Full Video',
        description: 'Reset Selection',
        apply: (d) => ({ start: 0, end: d })
    }
];

function formatTimecode(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00.00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export const VideoTrimmer: React.FC = () => {
    const isMobile = useIsMobile();

    /** Build a chain of atempo filters so effective speed stays within each filter's 0.5–2 range (0.25x–4x in sync) */
    const atempoChain = (speed: number): string[] => {
        const parts: string[] = [];
        let s = speed;
        while (s > 2) { parts.push('2'); s /= 2; }
        while (s < 0.5) { parts.push('0.5'); s *= 2; }
        if (parts.length === 0 && s >= 0.5 && s <= 2 && Math.abs(s - 1) > 0.001) parts.push(s.toFixed(4));
        else if (parts.length > 0 && s !== 1) parts.push(s.toFixed(4));
        return parts.map(p => `atempo=${p}`);
    };

    // Source File & Video State
    const { file, select, clear } = useToolFile();
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSelectionOnly, setPlaySelectionOnly] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);

    // Range in SECONDS
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);

    // Middle-cut segments ("Split at Playhead" → delete middle segment → two+ keeps)
    const [segments, setSegments] = useState<{ id: string; start: number; end: number }[]>([]);
    const genSegId = () => Math.random().toString(36).slice(2, 9);

    // Export loop count (1 = play once, up to 5 replays baked via -stream_loop)
    const [loopCount, setLoopCount] = useState(1);

    // Timeline Thumbnails
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [isGeneratingThumbs, setIsGeneratingThumbs] = useState(false);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Export Options
    const [exportFormat, setExportFormat] = useState<VideoExportFormat>('mp4');
    const [removeAudio, setRemoveAudio] = useState(false);
    const [qualityPreset, setQualityPreset] = useState<'fast' | 'high' | 'lossless'>('high');

    // Engine & Processing
    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [trimmedUrl, setTrimmedUrl] = useObjectUrlState();
    const [trimmedSize, setTrimmedSize] = useState<string | null>(null);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const ffmpegRef = useRef<FFmpeg | null>(null);

    // Dragging Timeline State
    const [dragType, setDragType] = useState<'start' | 'end' | 'body' | 'seek' | null>(null);
    const dragStartPosRef = useRef<{ clientX: number; initialStart: number; initialEnd: number }>({ clientX: 0, initialStart: 0, initialEnd: 0 });

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

    // Generate Visual Filmstrip Thumbnails
    const generateThumbnails = useCallback(async (videoFile: File, videoDuration: number) => {
        if (!videoFile || videoDuration <= 0) return;
        setIsGeneratingThumbs(true);
        const tempVideo = document.createElement('video');
        tempVideo.src = URL.createObjectURL(videoFile);
        tempVideo.muted = true;
        tempVideo.preload = 'auto';

        await new Promise(r => {
            tempVideo.onloadedmetadata = () => r(true);
            tempVideo.onerror = () => r(false);
        });

        const count = 16;
        const generated: string[] = [];
        const interval = videoDuration / count;
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            for (let i = 0; i < count; i++) {
                tempVideo.currentTime = Math.min(videoDuration - 0.05, i * interval + 0.05);
                await new Promise(res => {
                    tempVideo.onseeked = res;
                    setTimeout(res, 200);
                });
                ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                generated.push(canvas.toDataURL('image/jpeg', 0.5));
            }
        }

        setThumbnails(generated);
        URL.revokeObjectURL(tempVideo.src);
        tempVideo.remove();
        setIsGeneratingThumbs(false);
    }, []);

    // Load Video File
    useEffect(() => {
        if (file) {
            setThumbnails([]);
            const url = URL.createObjectURL(file.file);
            setVideoUrl(url);
            setTrimmedUrl(null);
            setTrimmedSize(null);
            setCurrentTime(0);
            setIsPlaying(false);

            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    const handleLoadedMetadata = () => {
        if (videoRef.current && videoRef.current.duration) {
            const dur = videoRef.current.duration;
            setDuration(dur);
            setStartTime(0);
            setEndTime(dur);
            setSegments([{ id: genSegId(), start: 0, end: dur }]);
            if (file) {
                generateThumbnails(file.file, dur);
            }
        }
    };

    // ── Middle-cut helpers ──
    const splitAtPlayhead = useCallback(() => {
        if (!duration || currentTime <= 0 || currentTime >= duration) return;
        setSegments(prev => {
            const next: { id: string; start: number; end: number }[] = [];
            let didSplit = false;
            for (const seg of prev) {
                if (!didSplit && currentTime > seg.start + 0.1 && currentTime < seg.end - 0.1) {
                    next.push({ id: genSegId(), start: seg.start, end: currentTime });
                    next.push({ id: genSegId(), start: currentTime, end: seg.end });
                    didSplit = true;
                } else {
                    next.push(seg);
                }
            }
            return didSplit ? next : prev;
        });
        setTrimmedUrl(null);
    }, [duration, currentTime]);

    const deleteSegment = (id: string) => {
        setSegments(prev => prev.filter(s => s.id !== id));
        setTrimmedUrl(null);
    };

    const resetSegments = () => {
        setSegments([{ id: genSegId(), start: 0, end: duration }]);
        setTrimmedUrl(null);
    };

    // ── Screenshot current playhead frame (PNG) ──
    const handleScreenshot = () => {
        const v = videoRef.current;
        if (!v || !v.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        const t = currentTime.toFixed(2).replace('.', '_');
        a.download = `frame_${t}s.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Update Volume and Playback Rate
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = isMuted ? 0 : Math.min(1, volume / 100);
            videoRef.current.playbackRate = playbackRate;
        }
    }, [volume, isMuted, playbackRate]);

    // Handle Time Update & Loop Boundary Enforcement
    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const current = videoRef.current.currentTime;
        setCurrentTime(current);

        if (playSelectionOnly || isLooping) {
            if (current >= endTime || current < startTime - 0.05) {
                if (isLooping) {
                    videoRef.current.currentTime = startTime;
                    setCurrentTime(startTime);
                } else {
                    videoRef.current.pause();
                    videoRef.current.currentTime = startTime;
                    setCurrentTime(startTime);
                    setIsPlaying(false);
                }
            }
        }
    };

    // Playback Toggle
    const togglePlay = useCallback((mode: 'all' | 'selection' = 'selection') => {
        if (!videoRef.current || !duration) return;

        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            if (mode === 'selection') {
                setPlaySelectionOnly(true);
                if (currentTime < startTime || currentTime >= endTime) {
                    videoRef.current.currentTime = startTime;
                    setCurrentTime(startTime);
                }
            } else {
                setPlaySelectionOnly(false);
            }
            videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        }
    }, [isPlaying, duration, currentTime, startTime, endTime]);

    const nudgeTime = useCallback((delta: number) => {
        if (!videoRef.current || !duration) return;
        const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }, [duration]);

    const markInPoint = useCallback(() => {
        const newStart = Math.min(currentTime, endTime - 0.1);
        setStartTime(newStart);
        setTrimmedUrl(null);
    }, [currentTime, endTime]);

    const markOutPoint = useCallback(() => {
        const newEnd = Math.max(currentTime, startTime + 0.1);
        setEndTime(newEnd);
        setTrimmedUrl(null);
    }, [currentTime, startTime]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay('selection');
            } else if (e.key === '[' || e.code === 'BracketLeft') {
                e.preventDefault();
                markInPoint();
            } else if (e.key === ']' || e.code === 'BracketRight') {
                e.preventDefault();
                markOutPoint();
            } else if (e.key === 'l' || e.key === 'L') {
                e.preventDefault();
                setIsLooping(prev => !prev);
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                nudgeTime(e.shiftKey ? -0.1 : -1.0);
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                nudgeTime(e.shiftKey ? 0.1 : 1.0);
            } else if (e.code === 'Home') {
                e.preventDefault();
                if (videoRef.current) {
                    videoRef.current.currentTime = startTime;
                    setCurrentTime(startTime);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, markInPoint, markOutPoint, nudgeTime, startTime]);

    // Timeline Pointer Handlers
    const handleTimelinePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const timeline = timelineRef.current;
        if (!timeline || !duration) return;

        timeline.setPointerCapture(e.pointerId);
        const rect = timeline.getBoundingClientRect();
        const clientX = e.clientX;
        const x = clientX - rect.left;
        const dur = duration;
        const startX = (startTime / dur) * rect.width;
        const endX = (endTime / dur) * rect.width;

        const handleWidth = 28;

        const startDist = Math.abs(x - startX);
        const endDist = Math.abs(x - endX);
        if (startDist <= endDist && (startDist <= 28 || (x >= startX - 14 && x <= startX + handleWidth + 14))) {
            setDragType('start');
        } else if (endDist <= 28 || (x >= endX - handleWidth - 14 && x <= endX + 14)) {
            setDragType('end');
        } else if (x > startX && x < endX) {
            if (e.clientY - rect.top <= 16) {
                setDragType('body');
                dragStartPosRef.current = {
                    clientX,
                    initialStart: startTime,
                    initialEnd: endTime
                };
            } else {
                setDragType('seek');
                const clicked = Math.max(0, Math.min(dur, (x / rect.width) * dur));
                if (videoRef.current) videoRef.current.currentTime = clicked;
                setCurrentTime(clicked);
            }
        } else {
            setDragType('seek');
            const clicked = Math.max(0, Math.min(dur, (x / rect.width) * dur));
            if (videoRef.current) videoRef.current.currentTime = clicked;
            setCurrentTime(clicked);
        }
    };

    const handleTimelinePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const timeline = timelineRef.current;
        if (!timeline || !duration) return;

        const rect = timeline.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const hoveredSec = (x / rect.width) * duration;
        setHoverTime(hoveredSec);

        if (!dragType) return;

        const dur = duration;

        if (dragType === 'start') {
            const newStart = Math.max(0, Math.min(hoveredSec, endTime - 0.1));
            setStartTime(newStart);
            setTrimmedUrl(null);
            if (videoRef.current) videoRef.current.currentTime = newStart;
        } else if (dragType === 'end') {
            const newEnd = Math.min(dur, Math.max(hoveredSec, startTime + 0.1));
            setEndTime(newEnd);
            setTrimmedUrl(null);
            if (videoRef.current) videoRef.current.currentTime = newEnd;
        } else if (dragType === 'body') {
            const deltaX = e.clientX - dragStartPosRef.current.clientX;
            const deltaSec = (deltaX / rect.width) * dur;
            const length = dragStartPosRef.current.initialEnd - dragStartPosRef.current.initialStart;

            let newStart = dragStartPosRef.current.initialStart + deltaSec;
            let newEnd = dragStartPosRef.current.initialEnd + deltaSec;

            if (newStart < 0) {
                newStart = 0;
                newEnd = length;
            }
            if (newEnd > dur) {
                newEnd = dur;
                newStart = dur - length;
            }

            setStartTime(newStart);
            setEndTime(newEnd);
            setTrimmedUrl(null);
        } else if (dragType === 'seek') {
            if (videoRef.current) videoRef.current.currentTime = hoveredSec;
            setCurrentTime(hoveredSec);
        }
    };

    const handleTimelinePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        const timeline = timelineRef.current;
        if (timeline) {
            try {
                timeline.releasePointerCapture(e.pointerId);
            } catch {
                // Ignore capture release error
            }
        }
        setDragType(null);
    };

    const applyPreset = (preset: TrimPreset) => {
        if (!duration) return;
        const res = preset.apply(duration);
        setStartTime(res.start);
        setEndTime(res.end);
        setTrimmedUrl(null);
        if (videoRef.current) videoRef.current.currentTime = res.start;
    };

    // Export Video Segment using FFmpeg
    const handleExport = async () => {
        if (!file || !ffmpegRef.current || !duration) return;

        setIsProcessing(true);
        setProgress(0);
        const ffmpeg = ffmpegRef.current;

        const originalExt = file.file.name.substring(file.file.name.lastIndexOf('.')) || '.mp4';
        const inputName = `input_${Date.now()}${originalExt}`;
        const outputExt = exportFormat;

        const onProgress = ({ progress }: { progress: number }) => {
            if (progress >= 0 && progress <= 1) {
                setProgress(Math.round(progress * 100));
            }
        };
        ffmpeg.on('progress', onProgress);

        const threads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
            ? Math.min(navigator.hardwareConcurrency, 4).toString()
            : '2';

        // Baked preview settings: playback rate, volume, and optional loop replays
        const keepVideoAudio = !removeAudio; // webm/mp4 can carry audio
        const bake = (): { vfParts: string[]; afParts: string[]; loopArgs: string[] } => {
            const vfParts: string[] = [];
            const afParts: string[] = [];
            if (playbackRate !== 1) {
                vfParts.push(`setpts=PTS/${playbackRate.toFixed(4)}`);
                if (keepVideoAudio) afParts.push(...atempoChain(playbackRate));
            }
            if (keepVideoAudio && volume !== 100) afParts.push(`volume=${(volume / 100).toFixed(2)}`);
            const loopArgs = loopCount > 1 ? ['-stream_loop', String(loopCount - 1)] : [];
            return { vfParts, afParts, loopArgs };
        };

        /** Per-segment args for this target format (speed/volume baked). */
        const buildSegmentArgs = (inName: string, start: number, dur: number, outName: string): string[] => {
            const { vfParts, afParts, loopArgs } = bake();
            const args: string[] = ['-y', ...loopArgs, '-ss', start.toFixed(3), '-i', inName, '-t', dur.toFixed(3), '-threads', threads];

            if (exportFormat === 'gif') {
                args.push('-vf', [...vfParts, 'fps=15', 'scale=480:-1:flags=lanczos'].join(',') + ',split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse');
            } else if (exportFormat === 'mp3') {
                args.push('-vn', '-c:a', 'libmp3lame', '-b:a', '256k');
            } else {
                // Video export (webm uses real VP8 args, mp4 keeps x264)
                if (removeAudio) {
                    args.push('-an');
                } else if (afParts.length) {
                    args.push('-af', afParts.join(','), '-c:a', exportFormat === 'webm' ? 'libvorbis' : 'aac', '-b:a', '192k');
                } else {
                    args.push('-c:a', exportFormat === 'webm' ? 'libvorbis' : 'aac', '-b:a', '192k');
                }

                if (exportFormat === 'webm') {
                    const bitrates: Record<typeof qualityPreset, string> = { fast: '500k', high: '1M', lossless: '3M' };
                    if (vfParts.length) args.push('-vf', vfParts.join(','));
                    args.push('-c:v', 'libvpx', '-quality', 'realtime', '-cpu-used', '5', '-b:v', bitrates[qualityPreset], '-b:a', '128k');
                } else if (qualityPreset === 'fast') {
                    if (vfParts.length) args.push('-vf', vfParts.join(','));
                    args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-crf', '26');
                } else {
                    if (vfParts.length) args.push('-vf', vfParts.join(','));
                    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-crf', '20');
                }
            }
            args.push(outName);
            return args;
        };

        try {
            const multiSegment = segments.length > 1;
            let outputName: string;
            let inputCleanupName: string | null = null;

            if (multiSegment) {
                // Middle-cut mode: encode each kept segment as an intermediate h264/aac pass
                // (speed/volume baked), then one final concat encode in the chosen format.
                outputName = `concat_${Date.now()}.${outputExt}`;
                const trimmed: string[] = [];
                for (let i = 0; i < segments.length; i++) {
                    const seg = segments[i];
                    const inName = `cut_in_${i}${originalExt}`;
                    const midName = `cut_mid_${i}.mp4`;
                    await writeFileToFFmpeg(ffmpeg, inName, file.file);
                    const { vfParts, afParts, loopArgs } = bake();
                    const segArgs: string[] = ['-y', ...loopArgs, '-ss', seg.start.toFixed(3), '-i', inName, '-t', Math.max(0.1, seg.end - seg.start).toFixed(3), '-threads', threads];
                    if (!removeAudio && afParts.length) segArgs.push('-af', afParts.join(','), '-c:a', 'aac', '-b:a', '192k');
                    else if (!removeAudio) segArgs.push('-c:a', 'aac', '-b:a', '192k');
                    else segArgs.push('-an');
                    if (vfParts.length) segArgs.push('-vf', vfParts.join(','));
                    segArgs.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '20', midName);
                    const ret = await ffmpeg.exec(segArgs);
                    if (ret !== 0) throw new Error(`FFmpeg returned code ${ret}`);
                    await ffmpeg.deleteFile(inName);
                    trimmed.push(midName);
                }
                const list = trimmed.map(n => `file '${n}'`).join('\n');
                await ffmpeg.writeFile('cut_list.txt', new TextEncoder().encode(list));
                const finalArgs: string[] = ['-y', '-f', 'concat', '-safe', '0', '-i', 'cut_list.txt', '-threads', threads];

                if (exportFormat === 'gif') {
                    finalArgs.push('-vf', 'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse');
                } else if (exportFormat === 'mp3') {
                    finalArgs.push('-vn', '-c:a', 'libmp3lame', '-b:a', '256k');
                } else if (exportFormat === 'webm') {
                    const bitrates: Record<typeof qualityPreset, string> = { fast: '500k', high: '1M', lossless: '3M' };
                    if (removeAudio) finalArgs.push('-an');
                    else finalArgs.push('-c:a', 'libvorbis', '-b:a', '192k');
                    finalArgs.push('-c:v', 'libvpx', '-quality', 'realtime', '-cpu-used', '5', '-b:v', bitrates[qualityPreset]);
                } else {
                    if (removeAudio) finalArgs.push('-an');
                    else finalArgs.push('-c:a', 'aac', '-b:a', '192k');
                    if (qualityPreset === 'fast') finalArgs.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26');
                    else finalArgs.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20');
                }

                finalArgs.push(outputName);
                const ret = await ffmpeg.exec(finalArgs);
                if (ret !== 0) throw new Error(`FFmpeg returned code ${ret}`);
                for (const n of trimmed) await ffmpeg.deleteFile(n);
                await ffmpeg.deleteFile('cut_list.txt');
            } else {
                // Single selection export
                outputName = `output_${Date.now()}.${outputExt}`;
                const clipDuration = Math.max(0.1, endTime - startTime);
                await writeFileToFFmpeg(ffmpeg, inputName, file.file);
                inputCleanupName = inputName;
                const args = buildSegmentArgs(inputName, startTime, clipDuration, outputName);
                const ret = await ffmpeg.exec(args);
                if (ret !== 0) {
                    throw new Error(`FFmpeg returned code ${ret}`);
                }
            }

            const mimeTypes: Record<VideoExportFormat, string> = {
                mp4: 'video/mp4',
                webm: 'video/webm',
                gif: 'image/gif',
                mp3: 'audio/mpeg'
            };

            const url = await readFileFromFFmpeg(ffmpeg, outputName, mimeTypes[exportFormat]);
            setTrimmedUrl(url);

            try {
                const resp = await fetch(url);
                const blob = await resp.blob();
                const kb = blob.size / 1024;
                setTrimmedSize(kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(0)} KB`);
            } catch {
                setTrimmedSize(null);
            }

            if (inputCleanupName) {
                try { await ffmpeg.deleteFile(inputCleanupName); } catch { }
            }
            try { await ffmpeg.deleteFile(outputName); } catch { }
        } catch (e) {
            console.error('Video Trim error:', e);
            alert('Failed to trim video. Please check settings and retry.');
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
        const baseName = file?.file.name.substring(0, file.file.name.lastIndexOf('.')) || 'video';
        a.download = `${baseName}_trimmed.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (engineStatus === 'error') {
        return (
            <div className="flex flex-col items-center justify-center h-80 text-center space-y-4 animate-fade-in p-6">
                <div className="bg-red-500/10 p-5 rounded-3xl text-red-500 border border-red-500/20 shadow-2xl">
                    <AlertCircle size={36} />
                </div>
                <h3 className="text-2xl font-black text-white font-unbounded">Video Processing Core Unavailable</h3>
                <p className="text-zinc-400 text-sm max-w-md">Failed to initialize WebAssembly video core.</p>
                <Button onClick={() => window.location.reload()} variant="secondary">Reload Engine</Button>
            </div>
        );
    }

    if (engineStatus === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center h-80 text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <p className="text-zinc-300 font-bold text-sm tracking-wide">Initializing Studio Video Core...</p>
            </div>
        );
    }

    // Clean Golden-Standard Upload Landing Page
    const handleFileSelect = (f: FileData | FileData[]) => {
        const selected = Array.isArray(f) ? f[0] : f;
        if (!selected) return;
        select(selected);
    };

    if (!file || !videoUrl) {
        return (
            <ToolShell
                icon={Scissors}
                title="Video Trimmer"
                description="Trim, cut, and export high-quality video clips with frame precision."
                features={[
                    { icon: Film, label: 'Filmstrip Scrubber', desc: 'Visual timeline navigation' },
                    { icon: Scissors, label: 'Frame Precision', desc: 'Millisecond cuts' },
                    { icon: Clock, label: 'Smart Presets', desc: '15s Stories / 30s TikTok' },
                    { icon: Download, label: 'Multi-Format', desc: 'MP4, WebM, GIF, MP3' },
                ]}
                file={file}
                accept="video/*"
                uploadLabel="Add Video Clip"
                uploadDescription="MP4, MOV, WEBM, MKV up to 500MB"
                onFileSelect={handleFileSelect}
                error={errorMessage || null}
            >
                <></>
            </ToolShell>
        );
    }

    const clipDuration = Math.max(0, endTime - startTime);
    const dur = duration || 1;
    const startPerc = (startTime / dur) * 100;
    const endPerc = (endTime / dur) * 100;
    const currentPerc = (currentTime / dur) * 100;

    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col lg:flex-row overflow-hidden font-sans select-none ${isMobile ? 'min-h-screen' : 'max-w-7xl mx-auto rounded-3xl border border-zinc-800/80 shadow-2xl lg:h-[calc(100vh-140px)] lg:min-h-[640px]'}`}>

            {/* Main Stage: Player + Timeline */}
            <main className="order-1 flex-1 relative bg-[#09090b] flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar min-h-[520px]">
                
                {/* Top Status Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-900 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                            <Film size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white truncate max-w-xs md:max-w-md">{file.file.name}</h3>
                            <p className="text-xs text-zinc-500 font-mono">
                                Total Duration: <span className="text-zinc-300">{formatTimecode(duration)}</span> ({duration.toFixed(2)}s)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowShortcuts(prev => !prev)}
                            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${showShortcuts ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                            title="Keyboard Shortcuts"
                        >
                            <Keyboard size={15} />
                            <span className="hidden sm:inline">Shortcuts</span>
                        </button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => clear()}
                            className="text-xs bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-indigo-500/50 rounded-xl px-3 py-1.5 flex items-center gap-1.5"
                            title="Add New Video"
                        >
                            <RotateCcw size={14} className="text-indigo-400" />
                            <span>Change Video</span>
                        </Button>
                    </div>
                </div>

                {/* Shortcuts Modal */}
                {showShortcuts && (
                    <div className="mt-3 p-3.5 bg-zinc-900/90 border border-indigo-500/30 rounded-2xl backdrop-blur-md grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-300 animate-fadeIn">
                        <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">Space</kbd> <span>Play Selection</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">[</kbd> <span>Set In Point</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">]</kbd> <span>Set Out Point</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">L</kbd> <span>Toggle Loop</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">← / →</kbd> <span>Seek ±1s</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">Shift+←/→</kbd> <span>Nudge ±0.1s</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">Home</kbd> <span>Jump to Start</span></div>
                        <div className="flex items-center gap-2 text-indigo-300 font-medium"><span>Drag timeline to trim</span></div>
                    </div>
                )}

                {/* Video Stage Viewport */}
                <div className="relative flex-1 bg-black rounded-2xl border border-zinc-800/90 shadow-2xl flex items-center justify-center my-3 overflow-hidden group min-h-[260px]">
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className="max-h-full max-w-full object-contain"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                    />

                    {/* Play/Pause Center Overlay */}
                    {!isPlaying && !isProcessing && (
                        <div
                            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-all cursor-pointer z-10"
                            onClick={() => togglePlay('selection')}
                        >
                            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition-all border border-white/10 shadow-2xl text-white">
                                <Play fill="currentColor" className="ml-1" size={28} />
                            </div>
                        </div>
                    )}

                    {/* Processing Modal Overlay */}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30 animate-fadeIn space-y-3">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                                <Film size={24} className="text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                            </div>
                            <p className="text-sm font-bold text-white uppercase tracking-wider">Rendering Trimmed Video...</p>
                            <span className="text-xs font-mono text-indigo-400">{progress}% Complete</span>
                        </div>
                    )}
                </div>

                {/* Timecode HUD */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Playhead</span>
                        <span className="text-base font-black font-mono text-white">{formatTimecode(currentTime)}</span>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Trim Start [In]</span>
                        <span className="text-base font-black font-mono text-indigo-300">{formatTimecode(startTime)}</span>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Trim End [Out]</span>
                        <span className="text-base font-black font-mono text-indigo-300">{formatTimecode(endTime)}</span>
                    </div>
                    <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-xl p-2.5 flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider flex items-center justify-between">
                            Clip Length <Scissors size={11} />
                        </span>
                        <span className="text-base font-black font-mono text-indigo-200">{clipDuration.toFixed(2)}s</span>
                    </div>
                </div>

                {/* Interactive Filmstrip Timeline */}
                <div
                    ref={timelineRef}
                    className="relative h-20 bg-zinc-950 rounded-xl border border-zinc-800/90 shadow-inner overflow-hidden cursor-crosshair touch-none select-none"
                    onPointerDown={handleTimelinePointerDown}
                    onPointerMove={handleTimelinePointerMove}
                    onPointerUp={handleTimelinePointerUp}
                    onPointerLeave={() => setHoverTime(null)}
                >
                    {/* Background Filmstrip Thumbnails */}
                    <div className="absolute inset-0 flex opacity-70">
                        {thumbnails.map((thumb, idx) => (
                            <img key={idx} src={thumb} className="h-full flex-1 object-cover pointer-events-none" alt="" />
                        ))}
                        {thumbnails.length === 0 && (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs font-mono">
                                {isGeneratingThumbs ? 'Generating Filmstrip...' : 'Video loaded'}
                            </div>
                        )}
                    </div>

                    {/* Shaded Overlays for Trimmed Out Areas */}
                    <div
                        className="absolute top-0 bottom-0 left-0 bg-black/75 backdrop-blur-[1px] pointer-events-none"
                        style={{ width: `${startPerc}%` }}
                    />
                    <div
                        className="absolute top-0 bottom-0 right-0 bg-black/75 backdrop-blur-[1px] pointer-events-none"
                        style={{ width: `${100 - endPerc}%` }}
                    />

                    {/* Active Trim Window Box with Integrated Thick Solid Handles */}
                    <div
                        className="absolute top-0 bottom-0 border-t-2 border-b-2 border-indigo-500 pointer-events-none z-20"
                        style={{ left: `${startPerc}%`, width: `${endPerc - startPerc}%` }}
                    >
                        {/* Left Handle [In] - Prominent, tactile Apple/CapCut-style Grab Handle */}
                        <div
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                setDragType('start');
                                timelineRef.current?.setPointerCapture(e.pointerId);
                            }}
                            className={`absolute top-0 bottom-0 left-0 w-7 sm:w-8 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-400 rounded-l-xl flex items-center justify-center cursor-ew-resize pointer-events-auto shadow-xl shadow-indigo-600/40 select-none touch-none transition-all z-30 ${
                                dragType === 'start' ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-105 bg-indigo-500' : ''
                            }`}
                            title="Drag to trim start (In-point)"
                        >
                            {/* Visual Grip Affordance: Chevron + Dual Grip Ridges */}
                            <div className="flex items-center gap-0.5 pointer-events-none">
                                <ChevronRight size={11} className="text-white/80 -mr-0.5" />
                                <div className="flex items-center gap-0.5">
                                    <div className="w-[3px] h-6 bg-white rounded-full shadow-sm" />
                                    <div className="w-[3px] h-6 bg-white/70 rounded-full shadow-sm" />
                                </div>
                            </div>
                            {/* Extended Invisible Hit Area: 48px wide so grabbing is effortless */}
                            <div className="absolute -inset-x-3 inset-y-0 cursor-ew-resize pointer-events-auto" />
                            {/* Floating Live Time Badge when dragging */}
                            {dragType === 'start' && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-600 border border-white/20 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xl pointer-events-none z-50 whitespace-nowrap">
                                    IN: {startTime.toFixed(2)}s
                                </div>
                            )}
                        </div>

                        {/* Right Handle [Out] - Prominent, tactile Apple/CapCut-style Grab Handle */}
                        <div
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                setDragType('end');
                                timelineRef.current?.setPointerCapture(e.pointerId);
                            }}
                            className={`absolute top-0 bottom-0 right-0 w-7 sm:w-8 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-400 rounded-r-xl flex items-center justify-center cursor-ew-resize pointer-events-auto shadow-xl shadow-indigo-600/40 select-none touch-none transition-all z-30 ${
                                dragType === 'end' ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-105 bg-indigo-500' : ''
                            }`}
                            title="Drag to trim end (Out-point)"
                        >
                            {/* Visual Grip Affordance: Dual Grip Ridges + Chevron */}
                            <div className="flex items-center gap-0.5 pointer-events-none">
                                <div className="flex items-center gap-0.5">
                                    <div className="w-[3px] h-6 bg-white/70 rounded-full shadow-sm" />
                                    <div className="w-[3px] h-6 bg-white rounded-full shadow-sm" />
                                </div>
                                <ChevronLeft size={11} className="text-white/80 -ml-0.5" />
                            </div>
                            {/* Extended Invisible Hit Area: 48px wide so grabbing is effortless */}
                            <div className="absolute -inset-x-3 inset-y-0 cursor-ew-resize pointer-events-auto" />
                            {/* Floating Live Time Badge when dragging */}
                            {dragType === 'end' && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-600 border border-white/20 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xl pointer-events-none z-50 whitespace-nowrap">
                                    OUT: {endTime.toFixed(2)}s
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Playhead Red Cursor */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
                        style={{ left: `${currentPerc}%` }}
                    >
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full -translate-x-[4px] -translate-y-1 shadow" />
                    </div>

                    {/* Hover Time Tooltip */}
                    {hoverTime !== null && dragType === null && (
                        <div
                            className="absolute top-1 pointer-events-none -translate-x-1/2 bg-black/90 border border-zinc-700 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-xl z-30"
                            style={{ left: `${(hoverTime / dur) * 100}%` }}
                        >
                            {formatTimecode(hoverTime)}
                        </div>
                    )}
                </div>

                {/* Sub-Timeline Status Strip */}
                <div className="flex items-center justify-between px-1 text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-widest mt-2 mb-1">
                    <span>START: <span className="text-zinc-300">{startTime.toFixed(1)}S</span></span>
                    <span>DURATION: <span className="text-indigo-400">{clipDuration.toFixed(1)}S</span></span>
                    <span>END: <span className="text-zinc-300">{endTime.toFixed(1)}S</span></span>
                </div>

                {/* Transport Toolbar */}
                <div className="mt-2 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => nudgeTime(-5)}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                            title="Jump -5s"
                        >
                            -5s
                        </button>
                        <button
                            onClick={() => nudgeTime(-1)}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                            title="Jump -1s"
                        >
                            -1s
                        </button>
                        <button
                            onClick={() => nudgeTime(-0.1)}
                            className="px-2.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-indigo-400 text-xs font-mono font-bold transition-all"
                            title="Nudge -0.1s"
                        >
                            -0.1s
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => togglePlay('selection')}
                            className="h-11 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-600/30 text-xs active:scale-95 transition-all"
                        >
                            {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                            <span>{isPlaying ? 'Pause' : 'Play Selection'}</span>
                        </button>

                        <button
                            onClick={() => togglePlay('all')}
                            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all"
                            title="Play Entire Video"
                        >
                            {isPlaying && !playSelectionOnly ? <Pause size={16} /> : <Play size={16} />}
                        </button>

                        <button
                            onClick={() => setIsLooping(prev => !prev)}
                            className={`p-2.5 rounded-xl border transition-all ${isLooping ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-zinc-800 border-zinc-700/60 text-zinc-400 hover:text-white'}`}
                            title="Loop Selected Region (L)"
                        >
                            <Repeat size={16} />
                        </button>

                        <button
                            onClick={handleScreenshot}
                            className="p-2.5 rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-indigo-300 hover:border-indigo-500/50 transition-all"
                            title="Capture current frame as PNG"
                        >
                            <Camera size={16} />
                        </button>

                        <button
                            onClick={() => {
                                if (videoRef.current) {
                                    videoRef.current.currentTime = startTime;
                                    setCurrentTime(startTime);
                                }
                            }}
                            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
                            title="Jump to Start of Clip"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => nudgeTime(0.1)}
                            className="px-2.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-indigo-400 text-xs font-mono font-bold transition-all"
                            title="Nudge +0.1s"
                        >
                            +0.1s
                        </button>
                        <button
                            onClick={() => nudgeTime(1)}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                            title="Jump +1s"
                        >
                            +1s
                        </button>
                        <button
                            onClick={() => nudgeTime(5)}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                            title="Jump +5s"
                        >
                            +5s
                        </button>
                    </div>
                </div>

                {/* Primary Rendered Output Preview Card in Main Stage */}
                {trimmedUrl && (
                    <div className="mt-4 p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-slide-up shadow-2xl shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                <Check size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    Trimmed Video Master Ready
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 uppercase">
                                        {exportFormat} {trimmedSize ? `• ${trimmedSize}` : ''}
                                    </span>
                                </h4>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Clip Duration: <span className="text-zinc-200 font-mono font-bold">{clipDuration.toFixed(2)}s</span> ({formatTimecode(startTime)} → {formatTimecode(endTime)})
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <Button
                                onClick={downloadTrimmed}
                                className="h-11 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 text-xs border-none"
                            >
                                <Download size={16} />
                                <span>Download Master Video</span>
                            </Button>

                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setTrimmedUrl(null);
                                    setProgress(0);
                                }}
                                className="h-11 px-3.5 border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold"
                            >
                                <Undo2 size={14} className="mr-1.5" /> Adjust
                            </Button>
                        </div>
                    </div>
                )}

            </main>

            {/* Sidebar Controls */}
            <aside className={`order-2 ${isMobile ? 'w-full' : 'w-96 border-l'} border-zinc-800/80 bg-zinc-950 flex flex-col shrink-0`}>
                
                <div className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between shrink-0">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <Sliders size={18} /> Video Settings
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase">
                        {exportFormat}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">

                    {/* Side-by-Side Precision Boundaries with Integrated Presets */}
                    <section className="space-y-1.5">
                        <SectionLabel>Precision Boundaries (Seconds)</SectionLabel>
                        
                        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3 space-y-2.5">
                            
                            <div className="grid grid-cols-2 gap-2">
                                
                                {/* Start Time Box */}
                                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Start [In]</span>
                                        <span className="text-[9px] text-zinc-500 font-mono">{formatTimecode(startTime)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="0"
                                            max={Math.max(0, endTime - 0.05)}
                                            value={startTime.toFixed(2)}
                                            onChange={(e) => {
                                                const val = Math.max(0, Math.min(Number(e.target.value), endTime - 0.05));
                                                setStartTime(val);
                                                setTrimmedUrl(null);
                                            }}
                                            className="w-full bg-zinc-900 border border-zinc-700/70 rounded-lg px-1.5 py-1 text-right text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={markInPoint}
                                            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white text-[10px] font-bold transition-all shrink-0"
                                            title="Set Start to Playhead"
                                        >
                                            [In
                                        </button>
                                    </div>
                                </div>

                                {/* End Time Box */}
                                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">End [Out]</span>
                                        <span className="text-[9px] text-zinc-500 font-mono">{formatTimecode(endTime)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            step="0.05"
                                            min={startTime + 0.05}
                                            max={duration || 100}
                                            value={endTime.toFixed(2)}
                                            onChange={(e) => {
                                                const val = Math.min(duration, Math.max(Number(e.target.value), startTime + 0.05));
                                                setEndTime(val);
                                                setTrimmedUrl(null);
                                            }}
                                            className="w-full bg-zinc-900 border border-zinc-700/70 rounded-lg px-1.5 py-1 text-right text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={markOutPoint}
                                            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white text-[10px] font-bold transition-all shrink-0"
                                            title="Set End to Playhead"
                                        >
                                            Out]
                                        </button>
                                    </div>
                                </div>

                            </div>

                            {/* Compact Integrated Preset Chips */}
                            <div className="pt-1 flex flex-wrap items-center gap-1 border-t border-zinc-800/40">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mr-1">Presets:</span>
                                {PRESETS.map((p, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => applyPreset(p)}
                                        className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-indigo-500/60 hover:text-indigo-300 text-[10px] font-bold text-zinc-400 transition-all"
                                        title={p.description}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                        </div>
                    </section>

                    {/* Playback Controls */}
                    <section className="space-y-2">
                        <SectionLabel>Playback Controls</SectionLabel>

                        <div className="space-y-1">
                            <span className="text-[11px] text-zinc-400 block">Playback Speed</span>
                            <div className="grid grid-cols-6 gap-1">
                                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                                    <button
                                        key={rate}
                                        onClick={() => setPlaybackRate(rate)}
                                        className={`py-1 text-[10px] font-bold rounded-lg border transition-all ${playbackRate === rate ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                                    >
                                        {rate}x
                                    </button>
                                ))}
                            </div>
                        </div>

                        <SliderControl
                            label="Video Volume"
                            value={volume}
                            min={0}
                            max={100}
                            step={5}
                            onChange={setVolume}
                            unit="%"
                        />
                        <p className="text-[9px] text-zinc-600 italic px-1">
                            Speed, volume and loop replays are baked into the exported file.
                        </p>
                    </section>

                    {/* Middle-Cut Segments */}
                    <section className="space-y-2">
                        <SectionLabel>Cut List (Middle Cut)</SectionLabel>
                        <div className="flex gap-1.5">
                            <button
                                onClick={splitAtPlayhead}
                                disabled={isProcessing}
                                className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-indigo-500/50 transition-all disabled:opacity-40"
                                title="Split the segment at the playhead; delete a segment to cut it out"
                            >
                                Split at Playhead
                            </button>
                            <button
                                onClick={resetSegments}
                                disabled={isProcessing || segments.length <= 1}
                                className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white transition-all disabled:opacity-40"
                            >
                                Reset
                            </button>
                        </div>
                        {segments.length > 1 && (
                            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                {segments.map((seg, i) => (
                                    <div
                                        key={seg.id}
                                        className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800 rounded-lg px-2.5 py-1.5"
                                    >
                                        <span className="text-[10px] font-mono text-zinc-300">
                                            <span className="text-indigo-400 font-bold mr-1.5">#{i + 1}</span>
                                            {formatTimecode(seg.start)} → {formatTimecode(seg.end)}
                                        </span>
                                        <button
                                            onClick={() => deleteSegment(seg.id)}
                                            className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors"
                                            title="Delete segment (cut it out)"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Loop & Screenshot (Export-baked) */}
                    <section className="space-y-2">
                        <SectionLabel>Loop Replays</SectionLabel>
                        <div className="grid grid-cols-5 gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button
                                    key={n}
                                    onClick={() => { setLoopCount(n); setTrimmedUrl(null); }}
                                    className={`py-1 text-[10px] font-bold rounded-lg border transition-all ${loopCount === n ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                                    title={n === 1 ? 'Play once (no loop)' : `Repeat ${n - 1} extra time in export`}
                                >
                                    ×{n}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Export Format */}
                    <section className="space-y-2">
                        <SectionLabel>Export Target</SectionLabel>
                        <div className="grid grid-cols-4 gap-1">
                            {(['mp4', 'webm', 'gif', 'mp3'] as VideoExportFormat[]).map((fmt) => (
                                <button
                                    key={fmt}
                                    onClick={() => {
                                        setExportFormat(fmt);
                                        setTrimmedUrl(null);
                                    }}
                                    className={`py-1.5 text-xs font-mono font-bold rounded-xl uppercase border transition-all ${exportFormat === fmt ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                                >
                                    {fmt}
                                </button>
                            ))}
                        </div>

                        {exportFormat === 'mp4' && (
                            <div className="pt-1 flex items-center justify-between p-2.5 bg-zinc-900/40 rounded-xl border border-zinc-800">
                                <span className="text-xs text-zinc-300">Mute Audio Track</span>
                                <input
                                    type="checkbox"
                                    checked={removeAudio}
                                    onChange={(e) => setRemoveAudio(e.target.checked)}
                                    className="accent-indigo-500 h-4 w-4 rounded cursor-pointer"
                                />
                            </div>
                        )}
                    </section>

                </div>

                {/* Sticky Dedicated Action Footer */}
                <div className="p-4 border-t border-zinc-900 bg-zinc-950 shrink-0">
                    {!trimmedUrl ? (
                        <Button
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/25 border-none text-sm transition-all"
                            onClick={handleExport}
                            isLoading={isProcessing}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    Rendering Video ({progress}%)...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Scissors size={16} />
                                    <span>Export Trimmed {exportFormat.toUpperCase()}</span>
                                </span>
                            )}
                        </Button>
                    ) : (
                        <div className="space-y-2 animate-slide-up">
                            <div className="p-2 bg-indigo-950/40 border border-indigo-500/40 rounded-xl flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
                                    <Check size={14} className="text-emerald-400" />
                                    <span>Export Complete</span>
                                </div>
                                {trimmedSize && (
                                    <span className="font-mono text-zinc-400 text-[11px]">{trimmedSize}</span>
                                )}
                            </div>

                            <Button
                                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-xl shadow-emerald-600/25 text-sm transition-all border-none"
                                onClick={downloadTrimmed}
                            >
                                <Download size={16} className="mr-2" /> Download Master Video
                            </Button>

                            <Button
                                variant="secondary"
                                className="w-full h-9 border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold"
                                onClick={() => {
                                    setTrimmedUrl(null);
                                    setProgress(0);
                                }}
                            >
                                <Undo2 size={14} className="mr-1.5" /> Adjust Selection
                            </Button>
                        </div>
                    )}
                </div>

            </aside>

        </div>
    );
};
