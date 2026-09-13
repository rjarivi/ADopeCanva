/// <reference lib="dom" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import {
    Play, Pause, Scissors, Volume2, RotateCcw, Loader2, AlertCircle,
    Download, Trash2, Undo2, Music, Mic2, Sparkles, Sliders, Keyboard, Check,
    ArrowLeftToLine, ArrowRightToLine, Repeat, Disc, RefreshCcw, FolderOpen
} from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { SectionLabel, SliderControl } from '../../components/EditorControls';
import { useIsMobile } from '../../hooks/useIsMobile';

type ExportFormat = 'mp3' | 'wav' | 'aac' | 'm4a' | 'ogg' | 'flac';
type BitrateOption = '128k' | '192k' | '256k' | '320k';

interface TrimPreset {
    label: string;
    apply: (duration: number) => { start: number; end: number };
}

const PRESET_CHIPS: TrimPreset[] = [
    { label: '15s', apply: (d) => ({ start: 0, end: Math.min(15, d) }) },
    { label: '30s', apply: (d) => ({ start: 0, end: Math.min(30, d) }) },
    { label: '60s', apply: (d) => ({ start: 0, end: Math.min(60, d) }) },
    {
        label: 'Ringtone 30s',
        apply: (d) => {
            const s = Math.max(0, (d - 30) / 2);
            return { start: s, end: Math.min(d, s + 30) };
        }
    },
    { label: 'Full Track', apply: (d) => ({ start: 0, end: d }) }
];

function formatTimecode(seconds: number, showMs = true): string {
    if (!seconds || isNaN(seconds) || seconds < 0) {
        return showMs ? '00:00.00' : '00:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    const mm = mins.toString().padStart(2, '0');
    const ss = secs.toString().padStart(2, '0');
    const mss = ms.toString().padStart(2, '0');

    return showMs ? `${mm}:${ss}.${mss}` : `${mm}:${ss}`;
}

export const AudioTrimmer: React.FC = () => {
    const isMobile = useIsMobile();

    // File & Core Audio
    const [file, setFile] = useState<FileData | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const currentTimeRef = useRef(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSelectionOnly, setPlaySelectionOnly] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [volume, setVolume] = useState(100);

    // Trimming Range in SECONDS
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);

    // Audio Effects & Export Options
    const [fadeIn, setFadeIn] = useState(0);
    const [fadeOut, setFadeOut] = useState(0);
    const [exportFormat, setExportFormat] = useState<ExportFormat>('mp3');
    const [exportBitrate, setExportBitrate] = useState<BitrateOption>('256k');
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Audio Peaks & Waveform
    const [peaks, setPeaks] = useState<Float32Array | null>(null);
    const [isDecodingAudio, setIsDecodingAudio] = useState(false);

    // Engine & Export State
    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [trimmedUrl, setTrimmedUrl] = useState<string | null>(null);
    const [trimmedSize, setTrimmedSize] = useState<string | null>(null);

    // Refs
    const audioRef = useRef<HTMLAudioElement>(null);
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const replaceInputRef = useRef<HTMLInputElement>(null);

    // Dragging state
    const [dragType, setDragType] = useState<'start' | 'end' | 'body' | 'seek' | null>(null);
    const dragStartPosRef = useRef<{ clientX: number; initialStart: number; initialEnd: number }>({ clientX: 0, initialStart: 0, initialEnd: 0 });
    const [hoverTime, setHoverTime] = useState<number | null>(null);

    // Initialize FFmpeg
    useEffect(() => {
        getFFmpeg()
            .then(ff => {
                ffmpegRef.current = ff;
                setEngineStatus('ready');
            })
            .catch((e) => {
                console.error('Failed to load FFmpeg engine:', e);
                setErrorMessage(e instanceof Error ? e.message : 'Audio engine initialization error');
                setEngineStatus('error');
            });
    }, []);

    // Decode Audio Buffer for Real Waveform Peaks
    const decodeAudioPeaks = useCallback(async (fileBlob: File) => {
        setIsDecodingAudio(true);
        let ctx: AudioContext | null = null;
        try {
            ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuffer = await fileBlob.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

            const channelData = audioBuffer.getChannelData(0);
            const totalSamples = 1200;
            const blockSize = Math.max(1, Math.floor(channelData.length / totalSamples));
            const calculatedPeaks = new Float32Array(totalSamples);

            let maxVal = 0.001;
            for (let i = 0; i < totalSamples; i++) {
                const start = i * blockSize;
                let sum = 0;
                let peak = 0;
                const end = Math.min(start + blockSize, channelData.length);
                for (let j = start; j < end; j++) {
                    const abs = Math.abs(channelData[j]);
                    if (abs > peak) peak = abs;
                    sum += abs * abs;
                }
                const rms = Math.sqrt(sum / (end - start || 1));
                const blended = peak * 0.75 + rms * 0.25;
                calculatedPeaks[i] = blended;
                if (blended > maxVal) maxVal = blended;
            }

            for (let i = 0; i < totalSamples; i++) {
                calculatedPeaks[i] = calculatedPeaks[i] / maxVal;
            }

            setPeaks(calculatedPeaks);
            setDuration(audioBuffer.duration);
            setStartTime(0);
            setEndTime(audioBuffer.duration);
        } catch (err) {
            console.error('Error decoding audio buffer:', err);
        } finally {
            if (ctx && ctx.state !== 'closed') {
                await ctx.close();
            }
            setIsDecodingAudio(false);
        }
    }, []);

    // Handle File Selection
    useEffect(() => {
        if (file) {
            setPeaks(null);
            const url = URL.createObjectURL(file.file);
            setAudioUrl(url);
            setTrimmedUrl(null);
            setTrimmedSize(null);
            setCurrentTime(0);
            setIsPlaying(false);
            decodeAudioPeaks(file.file);

            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [file, decodeAudioPeaks]);

    // Handle Volume and Speed Updates
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = Math.min(1, Math.max(0, volume / 100));
            audioRef.current.playbackRate = playbackRate;
        }
    }, [volume, playbackRate]);

    // Draw Dynamic Waveform Canvas
    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width;
        const height = rect.height;

        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const dur = duration || 1;
        const startX = (startTime / dur) * width;
        const endX = (endTime / dur) * width;
        const currentX = (currentTime / dur) * width;

        // 1. Subtle Background Grid & Center Line
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1;
        const gridStep = width / 12;
        for (let x = 0; x < width; x += gridStep) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        ctx.strokeStyle = '#27272a';
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // 2. Draw Waveform Bars
        if (peaks && peaks.length > 0) {
            const barSpacing = 3;
            const barCount = Math.floor(width / barSpacing);
            const step = peaks.length / barCount;
            const barWidth = 2;
            const centerY = height / 2;
            const maxAmp = (height / 2) * 0.82;

            for (let i = 0; i < barCount; i++) {
                const peakIndex = Math.floor(i * step);
                const amp = (peaks[peakIndex] || 0) * maxAmp;
                const x = i * barSpacing;

                const isInsideTrim = x >= startX && x <= endX;
                const isPlayed = x <= currentX;

                if (isInsideTrim) {
                    if (isPlayed) {
                        ctx.fillStyle = '#818cf8';
                    } else {
                        ctx.fillStyle = '#6366f1';
                    }
                } else {
                    ctx.fillStyle = '#3f3f46';
                }

                const barHeight = Math.max(3, amp * 2);
                const y = centerY - barHeight / 2;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, 1);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = '#71717a';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(isDecodingAudio ? 'Decoding audio waveform...' : 'Audio loaded', width / 2, height / 2);
        }

        // 3. Shaded Dim Overlays for Trimmed-Out Regions
        ctx.fillStyle = 'rgba(9, 9, 11, 0.75)';
        if (startX > 0) {
            ctx.fillRect(0, 0, startX, height);
        }
        if (endX < width) {
            ctx.fillRect(endX, 0, width - endX, height);
        }

        // 4. Fade In / Fade Out Envelope Curves
        if (fadeIn > 0 && startX < endX) {
            const fadeWidth = Math.min((fadeIn / dur) * width, endX - startX);
            const gradIn = ctx.createLinearGradient(startX, 0, startX + fadeWidth, 0);
            gradIn.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
            gradIn.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
            ctx.fillStyle = gradIn;
            ctx.beginPath();
            ctx.moveTo(startX, height);
            ctx.lineTo(startX, 0);
            ctx.lineTo(startX + fadeWidth, 0);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#a5b4fc';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(startX, height);
            ctx.lineTo(startX + fadeWidth, 0);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (fadeOut > 0 && startX < endX) {
            const fadeWidth = Math.min((fadeOut / dur) * width, endX - startX);
            const fadeStartX = endX - fadeWidth;
            const gradOut = ctx.createLinearGradient(fadeStartX, 0, endX, 0);
            gradOut.addColorStop(0, 'rgba(236, 72, 153, 0.0)');
            gradOut.addColorStop(1, 'rgba(236, 72, 153, 0.35)');
            ctx.fillStyle = gradOut;
            ctx.beginPath();
            ctx.moveTo(fadeStartX, 0);
            ctx.lineTo(endX, 0);
            ctx.lineTo(endX, height);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#f472b6';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(fadeStartX, 0);
            ctx.lineTo(endX, height);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 5. Active Region Border Box & Top/Bottom Accent Bars
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, 0, endX - startX, height);

        // Top and bottom solid connection bars
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(startX, 0, endX - startX, 3);
        ctx.fillRect(startX, height - 3, endX - startX, 3);

        const handleWidth = 14;

        // 6. In-Point Handle (Left) - Bold Solid Purple Block with White Grip Pill
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.roundRect(startX, 0, handleWidth, height, [6, 0, 0, 6]);
        ctx.fill();

        // In-handle white vertical grip pill
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(startX + 5, (height / 2) - 12, 3, 24, 1.5);
        ctx.fill();

        // 7. Out-Point Handle (Right) - Bold Solid Purple Block with White Grip Pill
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.roundRect(endX - handleWidth, 0, handleWidth, height, [0, 6, 6, 0]);
        ctx.fill();

        // Out-handle white vertical grip pill
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(endX - 8, (height / 2) - 12, 3, 24, 1.5);
        ctx.fill();

        // 8. Playhead Indicator (Current Time)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentX, 0);
        ctx.lineTo(currentX, height);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(currentX - 5, 0);
        ctx.lineTo(currentX + 5, 0);
        ctx.lineTo(currentX, 7);
        ctx.closePath();
        ctx.fill();

        // 9. Hover Time Cursor
        if (hoverTime !== null && dragType === null) {
            const hoverX = (hoverTime / dur) * width;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(hoverX, 0);
            ctx.lineTo(hoverX, height);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }, [peaks, duration, startTime, endTime, currentTime, fadeIn, fadeOut, isDecodingAudio, hoverTime, dragType]);

    useEffect(() => {
        drawWaveform();
    }, [drawWaveform]);

    useEffect(() => {
        const handleResize = () => drawWaveform();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [drawWaveform]);

    // Time Update & Loop / Selection Logic
    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const current = audioRef.current.currentTime;
        setCurrentTime(current);
        currentTimeRef.current = current;

        if (playSelectionOnly || isLooping) {
            if (current >= endTime || current < startTime - 0.05) {
                if (isLooping) {
                    audioRef.current.currentTime = startTime;
                    setCurrentTime(startTime);
                    currentTimeRef.current = startTime;
                } else {
                    audioRef.current.pause();
                    audioRef.current.currentTime = startTime;
                    setCurrentTime(startTime);
                    currentTimeRef.current = startTime;
                    setIsPlaying(false);
                }
            }
        }
    };

    // Toggle Play / Pause
    const togglePlay = useCallback((mode: 'all' | 'selection' = 'selection') => {
        if (!audioRef.current || !duration) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            if (mode === 'selection') {
                setPlaySelectionOnly(true);
                if (currentTimeRef.current < startTime || currentTimeRef.current >= endTime) {
                    audioRef.current.currentTime = startTime;
                    setCurrentTime(startTime);
                    currentTimeRef.current = startTime;
                }
            } else {
                setPlaySelectionOnly(false);
            }
            audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        }
    }, [isPlaying, duration, startTime, endTime]);

    const nudgeCurrentTime = useCallback((delta: number) => {
        if (!audioRef.current || !duration) return;
        const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        currentTimeRef.current = newTime;
    }, [duration]);

    const markInPoint = useCallback(() => {
        const newStart = Math.min(currentTimeRef.current, endTime - 0.1);
        setStartTime(newStart);
        setTrimmedUrl(null);
    }, [endTime]);

    const markOutPoint = useCallback(() => {
        const newEnd = Math.max(currentTimeRef.current, startTime + 0.1);
        setEndTime(newEnd);
        setTrimmedUrl(null);
    }, [startTime]);

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
                nudgeCurrentTime(e.shiftKey ? -0.1 : -1.0);
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                nudgeCurrentTime(e.shiftKey ? 0.1 : 1.0);
            } else if (e.code === 'Home') {
                e.preventDefault();
                if (audioRef.current) {
                    audioRef.current.currentTime = startTime;
                    setCurrentTime(startTime);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, markInPoint, markOutPoint, nudgeCurrentTime, startTime]);

    // Mouse & Touch Handling on Waveform Canvas
    const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !duration) return;

        canvas.setPointerCapture(e.pointerId);
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX;
        const x = clientX - rect.left;
        const y = e.clientY - rect.top;
        const dur = duration;
        const startX = (startTime / dur) * rect.width;
        const endX = (endTime / dur) * rect.width;

        const handleWidth = 16;

        // 1. Grab Start Handle
        if (x >= startX - 6 && x <= startX + handleWidth + 6) {
            setDragType('start');
            return;
        }

        // 2. Grab End Handle
        if (x >= endX - handleWidth - 6 && x <= endX + 6) {
            setDragType('end');
            return;
        }

        // 3. Grab Top Region Bar (Top 16px) to Slide Selection
        if (y <= 16 && x >= startX && x <= endX) {
            setDragType('body');
            dragStartPosRef.current = {
                clientX,
                initialStart: startTime,
                initialEnd: endTime
            };
            return;
        }

        // 4. CLICK ANYWHERE ON TRACK -> Seek & Play from clicked point
        setDragType('seek');
        const clickedTime = Math.max(0, Math.min(dur, (x / rect.width) * dur));

        if (audioRef.current) {
            audioRef.current.currentTime = clickedTime;
            if (isPlaying) {
                audioRef.current.play().catch(console.error);
            }
        }
        setCurrentTime(clickedTime);
    };

    const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !duration) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const hoveredSec = (x / rect.width) * duration;
        setHoverTime(hoveredSec);

        if (!dragType) return;

        const dur = duration;

        if (dragType === 'start') {
            const newStart = Math.max(0, Math.min(hoveredSec, endTime - 0.05));
            setStartTime(newStart);
            setTrimmedUrl(null);
            if (audioRef.current) audioRef.current.currentTime = newStart;
            setCurrentTime(newStart);
        } else if (dragType === 'end') {
            const newEnd = Math.min(dur, Math.max(hoveredSec, startTime + 0.05));
            setEndTime(newEnd);
            setTrimmedUrl(null);
            if (audioRef.current) audioRef.current.currentTime = newEnd;
            setCurrentTime(newEnd);
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
            if (audioRef.current) {
                audioRef.current.currentTime = hoveredSec;
            }
            setCurrentTime(hoveredSec);
        }
    };

    const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            try {
                canvas.releasePointerCapture(e.pointerId);
            } catch {
                // Ignore capture release error
            }
        }
        setDragType(null);
    };

    const getCanvasCursor = () => {
        if (!duration || !canvasRef.current) return 'default';
        if (dragType === 'start' || dragType === 'end') return 'col-resize';
        if (dragType === 'body') return 'grabbing';
        if (hoverTime === null) return 'crosshair';

        const rect = canvasRef.current.getBoundingClientRect();
        const startX = (startTime / duration) * rect.width;
        const endX = (endTime / duration) * rect.width;
        const hoverX = (hoverTime / duration) * rect.width;

        if (Math.abs(hoverX - startX) <= 12 || Math.abs(hoverX - endX) <= 12 || (startX <= 4 && hoverX <= 14) || (endX >= rect.width - 4 && hoverX >= rect.width - 14)) {
            return 'col-resize';
        }
        return 'pointer';
    };

    // Apply Presets
    const applyPreset = (preset: TrimPreset) => {
        if (!duration) return;
        const res = preset.apply(duration);
        setStartTime(res.start);
        setEndTime(res.end);
        setTrimmedUrl(null);
        if (audioRef.current) {
            audioRef.current.currentTime = res.start;
            setCurrentTime(res.start);
        }
    };

    // Export Trimmed Audio with FFmpeg
    const handleExport = async () => {
        if (!file || !ffmpegRef.current || !duration) return;

        setIsProcessing(true);
        setProgress(0);
        const ffmpeg = ffmpegRef.current;

        const originalExt = file.file.name.substring(file.file.name.lastIndexOf('.'));
        const inputName = `input_${Date.now()}${originalExt}`;
        const outputExt = exportFormat;
        const outputName = `output_${Date.now()}.${outputExt}`;

        const onProgress = ({ progress }: { progress: number }) => {
            if (progress >= 0 && progress <= 1) {
                setProgress(Math.round(progress * 100));
            }
        };
        ffmpeg.on('progress', onProgress);

        try {
            const clipDuration = Math.max(0.05, endTime - startTime);
            await writeFileToFFmpeg(ffmpeg, inputName, file.file);

            const threads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
                ? Math.min(navigator.hardwareConcurrency, 4).toString()
                : '2';

            const filters: string[] = [];

            if (volume !== 100) {
                filters.push(`volume=${(volume / 100).toFixed(2)}`);
            }

            if (fadeIn > 0) {
                const actualFadeIn = Math.min(fadeIn, clipDuration);
                filters.push(`afade=t=in:st=0:d=${actualFadeIn.toFixed(2)}`);
            }

            if (fadeOut > 0) {
                const actualFadeOut = Math.min(fadeOut, clipDuration);
                const fadeStartTime = Math.max(0, clipDuration - actualFadeOut);
                filters.push(`afade=t=out:st=${fadeStartTime.toFixed(2)}:d=${actualFadeOut.toFixed(2)}`);
            }

            const args: string[] = [
                '-y',
                '-ss', startTime.toFixed(3),
                '-i', inputName,
                '-t', clipDuration.toFixed(3),
                '-threads', threads,
            ];

            if (filters.length > 0) {
                args.push('-af', filters.join(','));
            }

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
                case 'flac':
                    args.push('-c:a', 'flac');
                    break;
            }

            args.push('-vn');
            args.push(outputName);

            const ret = await ffmpeg.exec(args);
            if (ret !== 0) {
                throw new Error(`FFmpeg execution returned code ${ret}`);
            }

            const mimeTypes: Record<ExportFormat, string> = {
                mp3: 'audio/mpeg',
                wav: 'audio/wav',
                aac: 'audio/aac',
                m4a: 'audio/mp4',
                ogg: 'audio/ogg',
                flac: 'audio/flac'
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

            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);
        } catch (e) {
            console.error('Audio Trimming error:', e);
            alert('Failed to trim audio. Please check format settings and retry.');
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
        const baseName = file?.file.name.substring(0, file.file.name.lastIndexOf('.')) || 'audio';
        a.download = `${baseName}_trimmed.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile({
                file: selected,
                previewUrl: URL.createObjectURL(selected),
                size: (selected.size / (1024 * 1024)).toFixed(2) + ' MB',
                type: selected.type
            });
        }
    };

    if (engineStatus === 'error') {
        return (
            <div className="flex flex-col items-center justify-center h-80 text-center space-y-4 animate-fade-in p-6">
                <div className="bg-red-500/10 p-5 rounded-3xl text-red-500 border border-red-500/20 shadow-2xl">
                    <AlertCircle size={36} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-white font-unbounded">Audio Engine Unavailable</h3>
                    <p className="text-zinc-400 max-w-md mt-2 text-sm leading-relaxed">
                        Failed to initialize the local audio processing core.
                    </p>
                    {errorMessage && (
                        <p className="text-red-400 text-xs font-mono bg-black/60 p-3 rounded-xl max-w-lg mx-auto mt-3 border border-red-500/30">
                            {errorMessage}
                        </p>
                    )}
                </div>
                <Button onClick={() => window.location.reload()} variant="secondary" className="mt-2">
                    <RotateCcw size={16} className="mr-2" /> Reload Engine
                </Button>
            </div>
        );
    }

    if (engineStatus === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center h-80 text-center space-y-4 animate-fade-in">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <Disc size={24} className="text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <p className="text-zinc-300 font-bold text-sm tracking-wide">Initializing Studio Audio Core...</p>
            </div>
        );
    }

    // Clean Golden-Standard Upload Landing Page
    if (!file || !audioUrl) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3 font-unbounded">
                        <div className="text-indigo-500"><Scissors size={32} /></div>
                        <span className="text-white">Audio Trimmer</span>
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Trim, cut, and polish audio tracks with waveform precision.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={setFile}
                        accept="audio/*"
                        label="Upload Audio Track"
                        description="MP3, WAV, AAC, FLAC, M4A, OGG up to 250MB"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Scissors, label: 'Precise Trim', desc: 'Millisecond cuts' },
                        { icon: Mic2, label: 'Live Waveform', desc: 'Click & scrub playback' },
                        { icon: Volume2, label: 'Fades & Gain', desc: 'Fade curves & volume' },
                        { icon: Download, label: 'Multi-Format', desc: 'WAV, MP3, AAC, OGG' }
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

    const clipDuration = Math.max(0, endTime - startTime);

    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col lg:flex-row overflow-hidden font-sans select-none ${isMobile ? 'min-h-screen' : 'max-w-7xl mx-auto rounded-3xl border border-zinc-800/80 shadow-2xl lg:h-[calc(100vh-140px)] lg:min-h-[640px]'}`}>

            {/* Hidden Input for Quick File Replacement */}
            <input
                ref={replaceInputRef}
                type="file"
                accept="audio/*"
                onChange={handleReplaceFile}
                className="hidden"
            />

            {/* Hidden Native Audio Element */}
            <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => {
                    if (audioRef.current && audioRef.current.duration) {
                        setDuration(audioRef.current.duration);
                        if (!endTime) setEndTime(audioRef.current.duration);
                    }
                }}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            {/* Main Stage: Sleek Waveform Timeline */}
            <main className="order-1 flex-1 relative bg-[#09090b] flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar">

                {/* Top Status Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-900 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                            <Music size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white truncate max-w-xs md:max-w-md">{file.file.name}</h3>
                            <p className="text-[11px] text-zinc-500 font-mono">
                                Total: <span className="text-zinc-300">{formatTimecode(duration)}</span> ({duration.toFixed(2)}s)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowShortcuts(prev => !prev)}
                            className={`p-2 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${showShortcuts ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                            title="Keyboard Shortcuts"
                        >
                            <Keyboard size={14} />
                            <span className="hidden sm:inline">Shortcuts</span>
                        </button>

                        {/* Obvious, Clear Change Audio Button */}
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => replaceInputRef.current?.click()}
                            className="text-xs bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-indigo-500/50 rounded-xl px-3 py-1.5 flex items-center gap-1.5"
                            title="Upload New Audio"
                        >
                            <RefreshCcw size={14} className="text-indigo-400" />
                            <span>Change Audio</span>
                        </Button>
                    </div>
                </div>

                {/* Shortcuts Modal */}
                {showShortcuts && (
                    <div className="mt-2.5 p-3 bg-zinc-900/95 border border-indigo-500/30 rounded-xl backdrop-blur-md grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-300 animate-fadeIn shrink-0">
                        <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">Space</kbd> <span>Play / Pause</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">[</kbd> <span>Set In Point</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">]</kbd> <span>Set Out Point</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">L</kbd> <span>Toggle Loop</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">← / →</kbd> <span>Seek ±1s</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">Shift+←/→</kbd> <span>Nudge ±0.1s</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-indigo-400 border border-zinc-700">Click Track</kbd> <span>Seek & Play</span></div>
                        <div className="flex items-center gap-2 text-indigo-300 font-medium"><span>Drag handles to trim</span></div>
                    </div>
                )}

                {/* Compact HUD Stats Strip */}
                <div className="my-3 grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Playhead</span>
                        <span className="text-base font-black font-mono text-white mt-0.5">{formatTimecode(currentTime)}</span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Start [In]</span>
                        <span className="text-base font-black font-mono text-indigo-300 mt-0.5">{formatTimecode(startTime)}</span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">End [Out]</span>
                        <span className="text-base font-black font-mono text-indigo-300 mt-0.5">{formatTimecode(endTime)}</span>
                    </div>

                    <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-xl p-2.5 flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider flex items-center justify-between">
                            Clip Length <Scissors size={11} />
                        </span>
                        <span className="text-base font-black font-mono text-indigo-200 mt-0.5">{clipDuration.toFixed(2)}s</span>
                    </div>
                </div>

                {/* Compact Sleek Waveform Canvas */}
                <div className="relative bg-zinc-950 rounded-2xl border border-zinc-800/90 shadow-inner overflow-hidden flex flex-col shrink-0">
                    {/* Time Ruler Top Strip */}
                    <div className="h-5 w-full bg-zinc-900/70 border-b border-zinc-800/80 flex items-center justify-between px-3 text-[9px] font-mono text-zinc-500 shrink-0">
                        <span>0:00</span>
                        <span>{formatTimecode(duration * 0.25, false)}</span>
                        <span>{formatTimecode(duration * 0.5, false)}</span>
                        <span>{formatTimecode(duration * 0.75, false)}</span>
                        <span>{formatTimecode(duration, false)}</span>
                    </div>

                    {/* Canvas Stage Viewport (160px sleek height) */}
                    <div className="relative w-full h-40 md:h-44">
                        <canvas
                            ref={canvasRef}
                            className="w-full h-full touch-none"
                            style={{ cursor: getCanvasCursor() }}
                            onPointerDown={handleCanvasPointerDown}
                            onPointerMove={handleCanvasPointerMove}
                            onPointerUp={handleCanvasPointerUp}
                            onPointerLeave={() => setHoverTime(null)}
                        />

                        {/* Hover Tooltip */}
                        {hoverTime !== null && dragType === null && (
                            <div
                                className="absolute top-1 pointer-events-none -translate-x-1/2 bg-black/90 backdrop-blur-sm border border-zinc-700 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-xl z-20"
                                style={{ left: `${(hoverTime / (duration || 1)) * 100}%` }}
                            >
                                {formatTimecode(hoverTime)}
                            </div>
                        )}
                    </div>

                    {/* Sub-Timeline Status Strip */}
                    <div className="h-6 w-full bg-zinc-900/40 border-t border-zinc-900/80 flex items-center justify-between px-3 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest shrink-0">
                        <span>START: <span className="text-zinc-300">{startTime.toFixed(1)}S</span></span>
                        <span>DURATION: <span className="text-indigo-400">{clipDuration.toFixed(1)}S</span></span>
                        <span>END: <span className="text-zinc-300">{endTime.toFixed(1)}S</span></span>
                    </div>
                </div>

                {/* Transport Controls Bar */}
                <div className="mt-2 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    
                    {/* Left: Nudge Controls */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => nudgeCurrentTime(-5)}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                            title="Jump -5s"
                        >
                            -5s
                        </button>
                        <button
                            onClick={() => nudgeCurrentTime(-1)}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                            title="Jump -1s"
                        >
                            -1s
                        </button>
                        <button
                            onClick={() => nudgeCurrentTime(-0.1)}
                            className="px-2.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-indigo-400 text-xs font-mono font-bold transition-all"
                            title="Nudge -0.1s"
                        >
                            -0.1s
                        </button>
                    </div>

                    {/* Center: Play / Pause */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => togglePlay('selection')}
                            className="h-11 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-600/30 active:scale-95 transition-all text-xs"
                        >
                            {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                            <span>{isPlaying ? 'Pause' : 'Play Selection'}</span>
                        </button>

                        <button
                            onClick={() => togglePlay('all')}
                            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all"
                            title="Play Entire Track"
                        >
                            {isPlaying && !playSelectionOnly ? <Pause size={16} /> : <Play size={16} />}
                        </button>

                        <button
                            onClick={() => setIsLooping(prev => !prev)}
                            className={`p-2.5 rounded-xl border transition-all ${isLooping ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-zinc-800 border-zinc-700/60 text-zinc-400 hover:text-white'}`}
                            title="Loop Selection (L)"
                        >
                            <Repeat size={16} />
                        </button>

                        <button
                            onClick={() => {
                                if (audioRef.current) {
                                    audioRef.current.currentTime = startTime;
                                    setCurrentTime(startTime);
                                }
                            }}
                            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
                            title="Jump to Start"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>

                    {/* Right: Positive Nudge */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => nudgeCurrentTime(0.1)}
                            className="px-2.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-indigo-400 text-xs font-mono font-bold transition-all"
                            title="Nudge +0.1s"
                        >
                            +0.1s
                        </button>
                        <button
                            onClick={() => nudgeCurrentTime(1)}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                            title="Jump +1s"
                        >
                            +1s
                        </button>
                        <button
                            onClick={() => nudgeCurrentTime(5)}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                            title="Jump +5s"
                        >
                            +5s
                        </button>
                    </div>

                </div>

                {/* Primary Rendered Output Preview Card in Main Stage (Always Prominently Visible!) */}
                {trimmedUrl && (
                    <div className="mt-4 p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-slide-up shadow-2xl shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                <Check size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    Trimmed Audio Master Ready
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
                                <span>Download Master File</span>
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

            {/* Studio Sidebar Controls with Sticky Bottom Actions */}
            <aside className={`order-2 ${isMobile ? 'w-full' : 'w-96 border-l'} border-zinc-800/80 bg-zinc-950 flex flex-col shrink-0`}>
                
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <Sliders size={16} /> Studio Settings
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase">
                        {exportFormat}
                    </span>
                </div>

                {/* Scrollable Settings Panel */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">

                    {/* Side-by-Side Precision Boundaries */}
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
                                {PRESET_CHIPS.map((p, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => applyPreset(p)}
                                        className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-indigo-500/60 hover:text-indigo-300 text-[10px] font-bold text-zinc-400 transition-all"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                        </div>
                    </section>

                    {/* Side-by-Side Audio Fades */}
                    <section className="space-y-1.5">
                        <SectionLabel>Audio Fades</SectionLabel>
                        <div className="grid grid-cols-2 gap-2.5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-2.5">
                            <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                    <span className="text-zinc-400 text-xs">Fade In</span>
                                    <span className="text-zinc-300 font-mono text-[10px]">{fadeIn.toFixed(1)}s</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={5.0}
                                    step={0.1}
                                    value={fadeIn}
                                    onChange={(e) => setFadeIn(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded cursor-pointer"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                    <span className="text-zinc-400 text-xs">Fade Out</span>
                                    <span className="text-zinc-300 font-mono text-[10px]">{fadeOut.toFixed(1)}s</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={5.0}
                                    step={0.1}
                                    value={fadeOut}
                                    onChange={(e) => setFadeOut(parseFloat(e.target.value))}
                                    className="w-full accent-pink-500 h-1 bg-zinc-800 rounded cursor-pointer"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Playback Speed & Volume */}
                    <section className="space-y-2">
                        <SectionLabel>Playback & Level</SectionLabel>

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
                            label="Master Volume"
                            value={volume}
                            min={0}
                            max={200}
                            step={5}
                            onChange={setVolume}
                            unit="%"
                        />
                    </section>

                    {/* Export Format Matrix */}
                    <section className="space-y-2">
                        <SectionLabel>Export Configuration</SectionLabel>
                        
                        <div className="space-y-1">
                            <span className="text-[11px] text-zinc-400 block">Audio Format</span>
                            <div className="grid grid-cols-3 gap-1">
                                {(['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'] as ExportFormat[]).map((fmt) => (
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
                        </div>

                        {exportFormat !== 'wav' && exportFormat !== 'flac' && (
                            <div className="space-y-1 pt-0.5">
                                <span className="text-[11px] text-zinc-400 block">Audio Bitrate</span>
                                <div className="grid grid-cols-4 gap-1">
                                    {(['128k', '192k', '256k', '320k'] as BitrateOption[]).map((b) => (
                                        <button
                                            key={b}
                                            onClick={() => {
                                                setExportBitrate(b);
                                                setTrimmedUrl(null);
                                            }}
                                            className={`py-1 text-[11px] font-mono font-bold rounded-lg border transition-all ${exportBitrate === b ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                                        >
                                            {b}
                                        </button>
                                    ))}
                                </div>
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
                                    Rendering Audio ({progress}%)...
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
                                    <span>Render Complete</span>
                                </div>
                                {trimmedSize && (
                                    <span className="font-mono text-zinc-400 text-[11px]">{trimmedSize}</span>
                                )}
                            </div>

                            <Button
                                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-xl shadow-emerald-600/25 text-sm transition-all border-none"
                                onClick={downloadTrimmed}
                            >
                                <Download size={16} className="mr-2" /> Download Master File
                            </Button>

                            <Button
                                variant="secondary"
                                className="w-full h-9 border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold"
                                onClick={() => {
                                    setTrimmedUrl(null);
                                    setProgress(0);
                                }}
                            >
                                <Undo2 size={13} className="mr-1.5" /> Adjust Selection
                            </Button>
                        </div>
                    )}
                </div>

            </aside>

        </div>
    );
};
