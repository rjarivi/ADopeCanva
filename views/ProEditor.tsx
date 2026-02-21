/// <reference lib="dom" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileUploader } from '../components/FileUploader';
import { Button } from '../components/ui/Button';
import { FileData } from '../types';
import {
    Wand2, Scissors, Sliders, Type, RotateCw, Volume2,
    Download, RefreshCcw, Play, Pause, MonitorPlay,
    Layers, FastForward, Film, Search, X, Loader2,
    Settings2, Crop, CheckCircle, AlertCircle, Trash2, Plus,
    Undo2, Redo2, SkipBack, SkipForward, Folder, Monitor, Maximize, Diamond
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';

const ToolButton: React.FC<{ icon: React.ElementType, label: string, active: boolean, onClick: () => void }> = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 w-10 h-10 rounded-lg transition-all
        ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}
        title={label}
    >
        <Icon size={18} strokeWidth={active ? 2.5 : 2} />
    </button>
);

const RangeControl: React.FC<{ label: string, value: number, min: number, max: number, step: number, unit?: string, onChange: (v: number) => void }> = ({ label, value, min, max, step, unit = '', onChange }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight">{label}</label>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
                {value}{unit}
            </span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
        />
    </div>
);

const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

// Filters & Tools Types
type EditorTool = 'trim' | 'adjust' | 'transform' | 'text' | 'speed' | 'audio' | 'track';
type SidebarTab = 'files' | 'text' | 'canvas' | 'edit';

interface VideoClip {
    id: string;
    type: 'video' | 'audio' | 'adjustment';
    file: File;
    url: string; // Blob URL
    start: number; // Timeline start time (seconds)
    duration: number; // Duration of this clip on timeline (seconds)
    offset: number; // Start time within the source file (seconds)

    // Transform
    x: number;       // Position X (relative to canvas center, 0 = center)
    y: number;       // Position Y (0 = center)
    scale: number;   // Scale factor (1.0 = 100%)
    rotation: number;// Degrees
    flipH: boolean;
    flipV: boolean;
    opacity: number;
    zOrder: number;
    trackId: string;
    keyframes?: Keyframe[];
}

interface Keyframe {
    id: string;
    time: number; // relative to clip start (seconds)
    value: number;
    property: 'opacity' | 'scale' | 'x' | 'y' | 'rotation';
    easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

interface TimelineTrack {
    id: string;
    name: string;
    type: 'video' | 'audio' | 'adjustment';
    isVisible: boolean;
    isMuted: boolean;
    isLocked: boolean;
    height: number;
}

interface ProjectSettings {
    width: number;
    height: number;
    backgroundColor: string;
    zoom: number; // Timeline zoom (pixels per second)
}

const FONT_PRESETS = [
    { name: 'Roboto', url: 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Bold.ttf', family: 'sans-serif' },
    { name: 'Oswald', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/Oswald%5Bwght%5D.ttf', family: 'sans-serif' },
    { name: 'Dancing Script', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf', family: 'cursive' },
    { name: 'Permanent Marker', url: 'https://raw.githubusercontent.com/google/fonts/main/apache/permanentmarker/PermanentMarker-Regular.ttf', family: 'cursive' },
    { name: 'Press Start 2P', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/pressstart2p/PressStart2P-Regular.ttf', family: 'monospace' },
];

export const ProEditor: React.FC = () => {
    // Core State
    const [file, setFile] = useState<FileData | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTool, setActiveTool] = useState<EditorTool>('adjust');
    const [activeTab, setActiveTab] = useState<SidebarTab>('files');
    const [resultUrl, setResultUrl] = useState<string | null>(null);

    // Engine State
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
        width: 1920,
        height: 1080,
        backgroundColor: '#000000',
        zoom: 100
    });

    // Edit Parameters
    const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [thumbnails, setThumbnails] = useState<string[]>([]);

    const [showSafeZones, setShowSafeZones] = useState(false);
    const safeZonesRef = useRef(false);

    useEffect(() => { safeZonesRef.current = showSafeZones; }, [showSafeZones]);

    const [waveforms, setWaveforms] = useState<Record<string, number[]>>({});
    const waveformsRef = useRef<Record<string, number[]>>({});
    useEffect(() => { waveformsRef.current = waveforms; }, [waveforms]);

    const getInterpolatedValue = (clip: VideoClip, property: Keyframe['property'], currentTime: number) => {
        const defaultValue = property === 'opacity' || property === 'scale' ? 1 : 0;
        if (!clip.keyframes || clip.keyframes.length === 0) return (clip as any)[property] ?? defaultValue;

        const propKeyframes = clip.keyframes
            .filter(k => k.property === property)
            .sort((a, b) => a.time - b.time);

        if (propKeyframes.length === 0) return (clip as any)[property] ?? defaultValue;

        const relativeTime = currentTime - clip.start;

        // Find surrounding keyframes
        const nextIdx = propKeyframes.findIndex(k => k.time > relativeTime);
        if (nextIdx === -1) return propKeyframes[propKeyframes.length - 1].value;
        if (nextIdx === 0) return propKeyframes[0].value;

        const k1 = propKeyframes[nextIdx - 1];
        const k2 = propKeyframes[nextIdx];

        const t = (relativeTime - k1.time) / (k2.time - k1.time);
        // Basic linear interpolation
        return k1.value + (k2.value - k1.value) * t;
    };

    // Timeline Tracks State
    const [tracks, setTracks] = useState<TimelineTrack[]>([
        { id: 'track-v1', name: 'Video 1', type: 'video', isVisible: true, isMuted: false, isLocked: false, height: 56 },
        { id: 'track-v2', name: 'Adjustment Layer', type: 'adjustment', isVisible: true, isMuted: false, isLocked: false, height: 56 },
        { id: 'track-a1', name: 'Audio 1', type: 'audio', isVisible: true, isMuted: false, isLocked: false, height: 56 }
    ]);

    // Editing States (Moved up to avoid TDZ issues)
    const [brightness, setBrightness] = useState(0);
    const [contrast, setContrast] = useState(1.0);
    const [saturation, setSaturation] = useState(1.0);
    const [hue, setHue] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [speed, setSpeed] = useState(1.0);
    const [volume, setVolume] = useState(100);
    const [textOverlay, setTextOverlay] = useState<{
        text: string;
        size: number;
        color: string;
        x: number;
        y: number;
        font: string;
        start: number;
        end: number | null;
    }>({ text: '', size: 60, color: '#ffffff', x: 50, y: 50, font: 'Roboto', start: 0, end: null });

    // Performance Refs for Render Loop
    const filtersRef = useRef({ brightness, contrast, saturation, hue });
    const textRef = useRef(textOverlay);

    useEffect(() => {
        filtersRef.current = { brightness, contrast, saturation, hue };
    }, [brightness, contrast, saturation, hue]);
    useEffect(() => { textRef.current = textOverlay; }, [textOverlay]);

    const addTrack = (type: 'video' | 'audio' | 'adjustment') => {
        if (tracks.length >= 8) return; // Browser limit
        const newTrack: TimelineTrack = {
            id: `track-${type}-${Date.now()}`,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${tracks.filter(t => t.type === type).length + 1}`,
            type,
            isVisible: true,
            isMuted: false,
            isLocked: false,
            height: 56
        };
        setTracks(prev => [...prev, newTrack]);
    };

    const toggleKeyframe = (property: Keyframe['property'], value: number) => {
        if (!selectedClipId) return;
        const clip = videoClips.find(c => c.id === selectedClipId);
        if (!clip) return;

        const relativeTime = currentTime - clip.start;
        const existingIdx = clip.keyframes?.findIndex(k => k.property === property && Math.abs(k.time - relativeTime) < 0.1) ?? -1;

        setVideoClips(prev => prev.map(c => {
            if (c.id !== selectedClipId) return c;
            const newKeyframes = [...(c.keyframes || [])];
            if (existingIdx !== -1) {
                newKeyframes.splice(existingIdx, 1);
            } else {
                newKeyframes.push({
                    id: `k-${Date.now()}`,
                    time: relativeTime,
                    property,
                    value
                });
            }
            return { ...c, keyframes: newKeyframes };
        }));
    };

    // Auto-switch to Edit tab when clip is selected
    useEffect(() => {
        if (selectedClipId) {
            setActiveTab('edit');
        }
    }, [selectedClipId]);

    const handleZoomToFit = useCallback(() => {
        if (!duration || duration <= 0) return;
        // Use the ID we are about to add, or fallback
        const timelineWidth = document.getElementById('timeline-tracks-container')?.clientWidth || 1000;
        // Calculate needed zoom: width / duration
        const fitZoom = (timelineWidth - 40) / duration;
        setProjectSettings(prev => ({ ...prev, zoom: Math.max(1, fitZoom) }));
    }, [duration]);

    // Studio V3 Layout State
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [timelineHeight, setTimelineHeight] = useState(360);
    const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('left');
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isResizingTimeline, setIsResizingTimeline] = useState(false);
    const [resizingTrackId, setResizingTrackId] = useState<string | null>(null);
    const trackResizeStartRef = useRef({ y: 0, h: 0 });

    // History (Undo/Redo)
    const [history, setHistory] = useState<VideoClip[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const saveHistory = useCallback((clips: VideoClip[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            return [...newHistory, clips];
        });
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevClips = history[historyIndex - 1];
            setVideoClips(prevClips);
            setHistoryIndex(prev => prev - 1);
        }
    }, [history, historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextClips = history[historyIndex + 1];
            setVideoClips(nextClips);
            setHistoryIndex(prev => prev + 1);
        }
    }, [history, historyIndex]);

    // Timeline Interaction State
    const [draggingHandle, setDraggingHandle] = useState<{ clipId: string, side: 'start' | 'end' | 'playhead' } | null>(null);
    const timelineTrackRef = useRef<HTMLDivElement>(null);
    const trackLabelRef = useRef<HTMLDivElement>(null);


    // Drag Logic (Clips & Playhead)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!draggingHandle || !timelineTrackRef.current) return;
            const container = timelineTrackRef.current;
            const rect = container.getBoundingClientRect();
            const scrollLeft = container.scrollLeft;
            const zoom = projectSettings.zoom;

            // Calculate absolute x position in the timeline grid
            const x = (e.clientX - rect.left) + scrollLeft;
            const newTime = Math.max(0, x / zoom);

            if (draggingHandle.side === 'playhead') {
                setCurrentTime(newTime);
                if (videoRef.current) videoRef.current.currentTime = newTime;
                return;
            }

            setVideoClips(prev => {
                const clipIndex = prev.findIndex(c => c.id === draggingHandle.clipId);
                if (clipIndex === -1) return prev;

                const clip = { ...prev[clipIndex] };
                const minDuration = 0.1;

                if (draggingHandle.side === 'start') {
                    const delta = newTime - clip.start;
                    const possibleDuration = clip.duration - delta;
                    if (possibleDuration < minDuration) return prev;
                    if (clip.offset + delta < 0) return prev;

                    clip.start = newTime;
                    clip.duration = possibleDuration;
                    clip.offset += delta;
                } else if (draggingHandle.side === 'end') {
                    const newDur = newTime - clip.start;
                    if (newDur < minDuration) return prev;
                    clip.duration = newDur;
                }

                const newClips = [...prev];
                newClips[clipIndex] = clip;
                return newClips;
            });
        };

        const handleMouseUp = () => {
            setDraggingHandle(null);
        };

        if (draggingHandle) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingHandle, duration, projectSettings.zoom]);










    const audioPoolRef = useRef<Record<string, HTMLAudioElement>>({});

    // Multi-Track Audio Synchronization
    useEffect(() => {
        const clips = clipsRef.current;
        const tracksGrid = tracksRef.current;
        const mainIsPlaying = isPlaying;
        const mainTime = currentTime;

        // Cleanup stale audio elements
        Object.keys(audioPoolRef.current).forEach(clipId => {
            if (!clips.find(c => c.id === clipId)) {
                audioPoolRef.current[clipId].pause();
                delete audioPoolRef.current[clipId];
            }
        });

        clips.forEach(clip => {
            if (clip.type === 'audio') {
                let audio = audioPoolRef.current[clip.id];
                if (!audio) {
                    audio = new Audio(clip.url);
                    audioPoolRef.current[clip.id] = audio;
                }

                // Sync Volume
                audio.volume = volume / 100;

                const isWithinRange = mainTime >= clip.start && mainTime < clip.start + clip.duration;
                if (isWithinRange) {
                    const targetTime = (mainTime - clip.start) + clip.offset;
                    // Sync Seek
                    if (Math.abs(audio.currentTime - targetTime) > 0.1) {
                        audio.currentTime = targetTime;
                    }
                    // Sync Playback State
                    if (mainIsPlaying && audio.paused) {
                        audio.play().catch(() => { }); // Handle auto-play restrictions
                    } else if (!mainIsPlaying && !audio.paused) {
                        audio.pause();
                    }
                } else {
                    if (!audio.paused) audio.pause();
                }
            }
        });
    }, [isPlaying, currentTime, videoClips, volume]);

    // Layout Resizing Effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingSidebar) {
                const newWidth = sidebarPosition === 'left' ? e.clientX : window.innerWidth - e.clientX;
                setSidebarWidth(Math.max(200, Math.min(600, newWidth)));
            } else if (isResizingTimeline) {
                const newHeight = window.innerHeight - e.clientY;
                setTimelineHeight(Math.max(150, Math.min(600, newHeight)));
            } else if (resizingTrackId) {
                const deltaY = e.clientY - trackResizeStartRef.current.y;
                setTracks(prev => prev.map(t => t.id === resizingTrackId ? { ...t, height: Math.max(32, trackResizeStartRef.current.h + deltaY) } : t));
            }
        };

        const handleMouseUp = () => {
            setIsResizingSidebar(false);
            setIsResizingTimeline(false);
            setResizingTrackId(null);
            document.body.style.cursor = 'default';
        };

        if (isResizingSidebar || isResizingTimeline || resizingTrackId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            if (isResizingSidebar) document.body.style.cursor = 'col-resize';
            else if (isResizingTimeline || resizingTrackId) document.body.style.cursor = 'row-resize';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingSidebar, isResizingTimeline, sidebarPosition]);

    // History Initialization on load
    useEffect(() => {
        if (videoClips.length > 0 && history.length === 0) {
            setHistory([videoClips]);
            setHistoryIndex(0);
        }
    }, [videoClips, history.length]);

    // Playhead Ref
    const timeRef = useRef(0);
    const settingsRef = useRef(projectSettings);
    const clipsRef = useRef<VideoClip[]>([]);
    const tracksRef = useRef<TimelineTrack[]>([]);

    useEffect(() => { timeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { settingsRef.current = projectSettings; }, [projectSettings]);
    useEffect(() => { clipsRef.current = videoClips; }, [videoClips]);
    useEffect(() => { tracksRef.current = tracks; }, [tracks]);

    // Sync vertical scroll between track labels and timeline
    useEffect(() => {
        const labels = trackLabelRef.current;
        const tracksGrid = timelineTrackRef.current;
        if (!labels || !tracksGrid) return;

        const handleTracksScroll = () => {
            if (labels.scrollTop !== tracksGrid.scrollTop) {
                labels.scrollTop = tracksGrid.scrollTop;
            }
        };

        tracksGrid.addEventListener('scroll', handleTracksScroll);
        return () => tracksGrid.removeEventListener('scroll', handleTracksScroll);
    }, []);

    // Unified Canvas Render Loop
    useEffect(() => {
        let id: number;
        const render = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            const video = videoRef.current;

            if (canvas && ctx) {
                const settings = settingsRef.current;
                const filters = filtersRef.current;
                const text = textRef.current;
                const t = timeRef.current;
                const clips = clipsRef.current;

                // Sync canvas size
                if (canvas.width !== settings.width) canvas.width = settings.width;
                if (canvas.height !== settings.height) canvas.height = settings.height;

                // 1. Clear & Background
                ctx.fillStyle = settings.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 2. Draw Tracks in Reverse Order (Bottom to Top)
                const visibleTracks = [...tracksRef.current].reverse().filter(t => t.isVisible);

                visibleTracks.forEach(track => {
                    const activeClip = clips.find(c => c.trackId === track.id && t >= c.start && t < c.start + c.duration);

                    if (activeClip) {
                        // For simplicity, we only use the primary video element for the FIRST video track found
                        // Future: Multiple video elements for concurrent playback
                        const isPrimaryVideo = track.type === 'video' && video && video.getAttribute('src') === activeClip.url;

                        if (isPrimaryVideo && video.readyState >= 2) {
                            const targetSourceTime = activeClip.offset + (t - activeClip.start);
                            if (Math.abs(video.currentTime - targetSourceTime) > 0.3) {
                                video.currentTime = targetSourceTime;
                            }

                            const opacity = getInterpolatedValue(activeClip, 'opacity', t);
                            const scale = getInterpolatedValue(activeClip, 'scale', t);
                            const rotation = getInterpolatedValue(activeClip, 'rotation', t);
                            const x = getInterpolatedValue(activeClip, 'x', t);
                            const y = getInterpolatedValue(activeClip, 'y', t);

                            ctx.save();
                            ctx.filter = `brightness(${1 + filters.brightness}) contrast(${filters.contrast}) saturate(${filters.saturation}) hue-rotate(${filters.hue}deg)`;
                            ctx.translate((canvas.width / 2) + x, (canvas.height / 2) + y);
                            ctx.rotate((rotation * Math.PI) / 180);
                            ctx.scale(scale * (activeClip.flipH ? -1 : 1), scale * (activeClip.flipV ? -1 : 1));
                            ctx.globalAlpha = opacity;
                            ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);
                            ctx.restore();
                        } else if (track.type !== 'audio') {
                            // Placeholder for non-video visual clips (Stickers, GIFs, etc.)
                            // Or video clips on secondary tracks that aren't the primary sync source
                            ctx.save();
                            ctx.fillStyle = track.type === 'adjustment' ? 'rgba(255,165,0,0.1)' : 'rgba(50,50,50,0.5)';
                            ctx.translate((canvas.width / 2) + activeClip.x, (canvas.height / 2) + activeClip.y);
                            ctx.fillRect(-100, -100, 200, 200); // Visual placeholder
                            ctx.restore();
                        }
                    }
                });

                // 3. Draw Text Overlay (Directly on Canvas)
                if (text.text && ((text.start === 0 && text.end === null) || (t >= text.start && (text.end === null || t <= text.end)))) {
                    ctx.save();
                    const fontPreset = FONT_PRESETS.find(f => f.name === text.font);
                    ctx.font = `bold ${text.size}px ${fontPreset?.family || 'sans-serif'}`;
                    ctx.fillStyle = text.color;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // Shadow for readability
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;

                    const tx = (canvas.width * text.x) / 100;
                    const ty = (canvas.height * text.y) / 100;

                    ctx.fillText(text.text, tx, ty);
                    ctx.restore();
                }
                // 4. Draw Safe Zone Overlays (If enabled)
                if (safeZonesRef.current) {
                    const ctx = canvas.getContext('2d')!;
                    ctx.save();

                    // Main Margin Safe Zone (10% inward)
                    const margin = canvas.width * 0.1;
                    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)'; // indigo-500 equivalent
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);

                    // Center Guides
                    ctx.beginPath();
                    ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height);
                    ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.setLineDash([]);
                    ctx.stroke();

                    // Label
                    ctx.fillStyle = 'rgba(99, 102, 241, 0.6)';
                    ctx.font = 'bold 12px Inter';
                    ctx.fillText('SAFE ZONE', margin + 10, margin + 20);

                    ctx.restore();
                }
            }
            id = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(id);
    }, []); // Run once, values accessed via Ref



    // Font State
    const [customFontFile, setCustomFontFile] = useState<File | null>(null);


    // Timeline CSS
    const timelineStyle = `
        .timeline-scroll::-webkit-scrollbar {
            height: 6px;
        }
        .timeline-scroll::-webkit-scrollbar-track {
            background: transparent;
        }
        .timeline-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.1);
            border-radius: 99px;
        }
        .timeline-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.2);
        }
        
        /* Advanced Playhead Styles */
        .playhead-glow {
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
        }
        
        /* Clip Edge Interaction */
        .clip-handle-active {
            background: #6366f1 !important;
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
        }
    `;


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
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, []);

    const handleHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            const fileData: FileData = {
                file: f,
                size: f.size.toString(),
                type: f.type
            };
            handleFileSelect(fileData);
        }
    };

    const handleFileSelect = async (fileData: FileData) => {
        const url = URL.createObjectURL(fileData.file);
        const isAudio = fileData.type.startsWith('audio/');

        let fileDuration = 0;
        if (isAudio) {
            const tempAudio = new Audio(url);
            await new Promise((resolve) => {
                tempAudio.onloadedmetadata = () => resolve(true);
            });
            fileDuration = tempAudio.duration;
        } else {
            const tempVideo = document.createElement('video');
            tempVideo.src = url;
            await new Promise((resolve) => {
                tempVideo.onloadedmetadata = () => resolve(true);
            });
            fileDuration = tempVideo.duration;
        }

        const lastClipEnd = videoClips.length > 0
            ? Math.max(...videoClips.map(c => c.start + c.duration))
            : 0;

        const newClip: VideoClip = {
            id: `${isAudio ? 'a' : 'v'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: isAudio ? 'audio' as any : 'video',
            file: fileData.file,
            url,
            start: lastClipEnd,
            duration: fileDuration,
            offset: 0,
            x: 0,
            y: 0,
            scale: 1.0,
            rotation: 0,
            flipH: false,
            flipV: false,
            opacity: 1.0,
            zOrder: videoClips.length,
            trackId: isAudio
                ? (tracks.find(t => t.type === 'audio')?.id || 'track-a1')
                : (tracks.find(t => t.type === 'video')?.id || 'track-v1')
        };

        if (!isAudio) {
            setFile(fileData);
            setVideoUrl(url);
            if (videoClips.length === 0) {
                generateThumbnails(url, fileDuration);
            }
        }

        const newClips = [...videoClips, newClip];
        setVideoClips(newClips);
        setSelectedClipId(newClip.id);
        setDuration(prev => Math.max(prev, lastClipEnd + fileDuration));

        if (isAudio) {
            generateAudioWaveform(fileData.file, newClip.id);
        }
    };

    const generateAudioWaveform = async (file: File, clipId: string) => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const decodeData = await audioCtx.decodeAudioData(arrayBuffer);
        const rawData = decodeData.getChannelData(0); // Use first channel
        const samples = 200; // Number of bars
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = [];
        for (let i = 0; i < samples; i++) {
            let blockStart = blockSize * i;
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum = sum + Math.abs(rawData[blockStart + j]);
            }
            filteredData.push(sum / blockSize);
        }
        // Normalize
        const maxVal = Math.max(...filteredData);
        const multiplier = maxVal > 0 ? Math.pow(maxVal, -1) : 0; // Avoid division by zero
        setWaveforms(prev => ({ ...prev, [clipId]: filteredData.map(n => n * multiplier) }));
    };

    const generateThumbnails = async (url: string, dur: number) => {
        const video = document.createElement('video');
        video.src = url;
        video.crossOrigin = 'anonymous';
        video.muted = true;
        await new Promise((resolve) => { video.onloadedmetadata = () => resolve(true); });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const count = 20;
        const interval = dur / count;
        canvas.width = 80;
        canvas.height = 45;
        const thumbs: string[] = [];

        for (let i = 0; i < count; i++) {
            video.currentTime = i * interval;
            await new Promise(r => video.onseeked = r);
            ctx.drawImage(video, 0, 0, 80, 45);
            thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
        }
        setThumbnails(thumbs);
    };

    const handleSplit = () => {
        // Find clip under playhead
        const clipToSplit = videoClips.find(c => currentTime >= c.start && currentTime < c.start + c.duration);
        if (!clipToSplit) return;

        const relativeTime = currentTime - clipToSplit.start;
        // Don't split if too close to edge (< 0.5s)
        if (relativeTime < 0.5 || (clipToSplit.duration - relativeTime) < 0.5) return;

        const firstPart: VideoClip = {
            ...clipToSplit,
            duration: relativeTime,
            id: crypto.randomUUID()
        };

        const secondPart: VideoClip = {
            ...clipToSplit,
            start: currentTime,
            duration: clipToSplit.duration - relativeTime,
            offset: clipToSplit.offset + relativeTime,
            id: crypto.randomUUID()
        }; const index = videoClips.indexOf(clipToSplit);
        const newClips = [...videoClips];
        newClips.splice(index, 1, firstPart, secondPart);
        setVideoClips(newClips);
        setSelectedClipId(secondPart.id);
    };

    const handleDeleteClip = () => {
        if (!selectedClipId) return;
        setVideoClips(prev => prev.filter(c => c.id !== selectedClipId));
        setSelectedClipId(null);
        // Note: Gap remains. Feature for later: Ripple delete.
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) videoRef.current.pause();
        else videoRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const dur = videoRef.current.duration;
            setDuration(dur);
            if (videoClips.length === 0 && file) {
                const initialClip: VideoClip = {
                    id: crypto.randomUUID(),
                    type: 'video',
                    file: file.file,
                    url: videoUrl!,
                    start: 0,
                    duration: dur,
                    offset: 0,
                    x: 0, y: 0, scale: 1, rotation: 0,
                    flipH: false, flipV: false, opacity: 1, zOrder: 1,
                    trackId: tracks.find(t => t.type === 'video')?.id || 'track-v1'
                };
                setVideoClips([initialClip]);
                setSelectedClipId(initialClip.id);
                generateThumbnails(videoUrl!, dur);
            }
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const loadFont = async (ffmpeg: FFmpeg) => {
        const fontName = 'font.ttf';

        try {
            // 1. Custom Font
            if (textOverlay.font === 'custom' && customFontFile) {
                const data = await customFontFile.arrayBuffer();
                await ffmpeg.writeFile(fontName, new Uint8Array(data));
                return true;
            }

            // 2. Preset Font
            const preset = FONT_PRESETS.find(f => f.name === textOverlay.font) || FONT_PRESETS[0];
            const fontBlob = await fetch(preset.url).then(r => r.blob());
            const fontData = await fontBlob.arrayBuffer();
            await ffmpeg.writeFile(fontName, new Uint8Array(fontData));
            return true;

        } catch (e) {
            console.error("Font load error", e);
            // Fallback to default
            try {
                const fallbackUrl = FONT_PRESETS[0].url;
                const fbBlob = await fetch(fallbackUrl).then(r => r.blob());
                const fbData = await fbBlob.arrayBuffer();
                await ffmpeg.writeFile(fontName, new Uint8Array(fbData));
                return true;
            } catch (err) {
                console.error("Critical font failure", err);
                return false;
            }
        }
    };

    const handleExport = async () => {
        if (videoClips.length === 0 || !ffmpegRef.current) return;
        setIsProcessing(true);
        const ffmpeg = ffmpegRef.current;
        const outputName = `export_${Date.now()}.mp4`;

        try {
            // 1. Map Unique Files to Indices
            const uniqueFiles = Array.from(new Set(videoClips.map(c => c.file)));
            const fileToIndex = new Map(uniqueFiles.map((file, i) => [file, i]));

            // 2. Upload all unique files to FFmpeg
            for (let i = 0; i < uniqueFiles.length; i++) {
                await writeFileToFFmpeg(ffmpeg, `input_${i}.mp4`, uniqueFiles[i]);
            }

            // 3. Construct Filter Complex
            const filters: string[] = [];
            const concatInputs: string[] = [];

            videoClips.forEach((clip, i) => {
                const inputIdx = fileToIndex.get(clip.file);
                // Video Trim & Transform for this clip
                // Logic: input -> trim -> [vClip_i]
                let vSegment = `[v_segment_${i}]`;

                // Base Trim
                filters.push(`[${inputIdx}:v]trim=start=${clip.offset}:duration=${clip.duration},setpts=PTS-STARTPTS${vSegment}`);

                // Add to concat list
                filters.push(`[${inputIdx}:a]atrim=start=${clip.offset}:duration=${clip.duration},asetpts=PTS-STARTPTS[a_segment_${i}]`);
                concatInputs.push(`${vSegment}[a_segment_${i}]`);
            });

            // Concat all segments
            filters.push(`${concatInputs.join('')}concat=n=${videoClips.length}:v=1:a=1[vJoined][aJoined]`);

            let vChain = '[vJoined]';
            let aChain = '[aJoined]';

            // 4. Global Adjustments (Applied after join for consistency)
            if (brightness !== 0 || contrast !== 1 || saturation !== 1 || hue !== 0) {
                filters.push(`${vChain}eq=contrast=${contrast}:brightness=${brightness}:saturation=${saturation}:hue=${hue}[vAdj]`);
                vChain = `[vAdj]`;
            }

            // 5. Global Text Overlays
            if (textOverlay.text) {
                const fontReady = await loadFont(ffmpeg);
                if (fontReady) {
                    const sanitizedText = textOverlay.text.replace(/:/g, '\\:').replace(/'/g, '');
                    const xPos = `(w-text_w)*${textOverlay.x}/100`;
                    const yPos = `(h-text_h)*${textOverlay.y}/100`;

                    let enableExpr = '';
                    if (textOverlay.start > 0 || textOverlay.end !== null) {
                        const endT = textOverlay.end !== null ? textOverlay.end : duration;
                        enableExpr = `:enable='between(t,${textOverlay.start},${endT})'`;
                    }

                    filters.push(`${vChain}drawtext=fontfile=font.ttf:text='${sanitizedText}':fontcolor=${textOverlay.color}:fontsize=${textOverlay.size}:x=${xPos}:y=${yPos}${enableExpr}[vText]`);
                    vChain = `[vText]`;
                }
            }

            // 6. Global Audio
            if (volume !== 100) {
                filters.push(`${aChain}volume=${volume / 100}[aVol]`);
                aChain = `[aVol]`;
            }

            // 7. Execute FFmpeg
            const cmdArgs = ['-y'];
            uniqueFiles.forEach((_, i) => {
                cmdArgs.push('-i', `input_${i}.mp4`);
            });

            cmdArgs.push('-filter_complex', filters.join(';'));
            cmdArgs.push('-map', vChain.replace('[', '').replace(']', ''), '-map', aChain.replace('[', '').replace(']', ''));
            cmdArgs.push('-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-b:a', '128k', outputName);

            await ffmpeg.exec(cmdArgs);

            const url = await readFileFromFFmpeg(ffmpeg, outputName, 'video/mp4');
            setResultUrl(url);

            // Cleanup
            for (let i = 0; i < uniqueFiles.length; i++) {
                await ffmpeg.deleteFile(`input_${i}.mp4`);
            }
            await ffmpeg.deleteFile(outputName);

        } catch (e) {
            console.error("Export Error:", e);
            alert("Export failed. Check console for details.");
        } finally {
            setIsProcessing(false);
        }
    };

    // UI Helpers
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (engineStatus === 'error') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
                <div className="bg-red-500/10 p-4 rounded-full text-red-500">
                    <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-white">Engine Failed</h3>
                <p className="text-zinc-400 max-w-md">The pro editor engine could not load.</p>
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
                <p className="text-zinc-400">Loading Pro Editor Engine...</p>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden text-zinc-300 font-sans selection:bg-indigo-500/30">
            {/* 1. Navbar Portal */}
            {document.getElementById('studio-header-target') && createPortal(
                <div className="flex items-center justify-between w-full h-full animate-fade-in pl-4">
                    {/* Left: History & Info */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1 border border-zinc-700/50">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white" onClick={undo} disabled={historyIndex <= 0}>
                                <Undo2 size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white" onClick={redo} disabled={historyIndex >= history.length - 1}>
                                <Redo2 size={16} />
                            </Button>
                        </div>
                        {file && (
                            <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
                                <span className="text-xs text-zinc-500 font-mono truncate max-w-[200px]">{file.file.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Time & Export */}
                    <div className="flex items-center gap-4">
                        {file && (
                            <div className="text-xs text-zinc-500 font-mono bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800/50">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                        )}
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white border-none h-10 px-6 text-sm font-semibold rounded-sm shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95" onClick={handleExport} isLoading={isProcessing} disabled={!file} >
                            <Download size={14} className="mr-2" />
                            {isProcessing ? 'Rendering...' : 'Export'}
                        </Button>
                    </div>
                </div>,
                document.getElementById('studio-header-target')!
            )}

            {/* 2. Main Studio Area (Resizable) */}
            <div className={`flex-1 flex overflow-hidden ${sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'} bg-zinc-950`}>

                {/* A. Tool Sidebar (Resizable) */}
                <div
                    style={{ width: sidebarWidth }}
                    className="shrink-0 flex flex-col bg-zinc-900 border-zinc-800/50 relative z-30 shadow-xl"
                >
                    <div className="flex flex-1 overflow-hidden">
                        {/* Slim Icon Rail - Categories */}
                        <div className="w-14 shrink-0 bg-black/20 border-r border-zinc-800/30 flex flex-col items-center py-4 gap-4">
                            <ToolButton icon={Folder} label="My Files" active={activeTab === 'files'} onClick={() => setActiveTab('files')} />
                            <ToolButton icon={Type} label="Text" active={activeTab === 'text'} onClick={() => setActiveTab('text')} />
                            <ToolButton icon={Monitor} label="Canvas" active={activeTab === 'canvas'} onClick={() => setActiveTab('canvas')} />

                            {/* Conditional Edit Tab */}
                            <div className={`transition-all duration-300 ${selectedClipId ? 'opacity-100 translate-x-0' : 'opacity-30 pointer-events-none grayscale'}`}>
                                <ToolButton icon={Sliders} label="Edit" active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} />
                            </div>

                            <div className="mt-auto pb-4 w-full flex justify-center">
                                <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white h-10 w-10 hover:bg-white/5 rounded-xl transition-colors" onClick={() => setSidebarPosition(p => p === 'left' ? 'right' : 'left')} title="Switch Sidebar Side">
                                    <Layers size={20} />
                                </Button>
                            </div>
                        </div>

                        {/* Settings Panel */}
                        <div className="flex-1 flex flex-col min-w-0 bg-zinc-900/50 overflow-hidden">
                            <div className="h-10 flex items-center px-4 border-b border-zinc-800/50 bg-black/20">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.1em] flex items-center gap-2">
                                    {activeTab} Settings
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {/* FILES TAB */}
                                {activeTab === 'files' && (
                                    <div className="space-y-6">
                                        <div className="p-4 rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/50 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer flex flex-col items-center gap-3 group" onClick={() => fileInputRef.current?.click()}>
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Plus size={20} className="text-zinc-400 group-hover:text-indigo-400" />
                                            </div>
                                            <span className="text-xs font-medium text-zinc-400 group-hover:text-indigo-300">Import Media</span>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-bold text-zinc-600 uppercase px-1">Project Media</h4>
                                            <div className="space-y-2">
                                                {videoClips.map(clip => (
                                                    <div key={clip.id} className="flex items-center gap-3 p-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700">
                                                        <div className="w-8 h-8 rounded bg-black flex items-center justify-center overflow-hidden">
                                                            <Film size={14} className="text-zinc-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs text-zinc-300 truncate">{clip.file.name}</div>
                                                            <div className="text-[10px] text-zinc-600">{clip.duration.toFixed(1)}s</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {videoClips.length === 0 && (
                                                    <p className="text-[10px] text-zinc-600 italic px-1">No media added yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TEXT TAB */}
                                {activeTab === 'text' && (
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold text-zinc-600 px-1">Overlay Content</label>
                                            <textarea
                                                value={textOverlay.text}
                                                onChange={(e) => setTextOverlay(prev => ({ ...prev, text: e.target.value }))}
                                                placeholder="Type something..."
                                                className="w-full h-24 bg-black/40 border border-zinc-800 rounded-lg p-3 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none placeholder:text-zinc-600"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] uppercase font-bold text-zinc-600 px-1">Typography & Style</label>
                                            <RangeControl label="Size" value={textOverlay.size} min={12} max={300} step={1} onChange={(v) => setTextOverlay(p => ({ ...p, size: v }))} unit="px" />

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[10px] font-bold text-zinc-600 uppercase">Font Color</label>
                                                    <div className="w-5 h-5 rounded border border-zinc-700" style={{ backgroundColor: textOverlay.color }} />
                                                </div>
                                                <input
                                                    type="color"
                                                    value={textOverlay.color}
                                                    onChange={(e) => setTextOverlay(p => ({ ...p, color: e.target.value }))}
                                                    className="w-full h-8 rounded bg-transparent cursor-pointer"
                                                />
                                            </div>

                                            <div className="space-y-3 pt-2 border-t border-zinc-800/50">
                                                <label className="text-[10px] uppercase font-bold text-zinc-600 px-1">Positioning (%)</label>
                                                <RangeControl label="Horizontal" value={textOverlay.x} min={0} max={100} step={1} onChange={(v) => setTextOverlay(p => ({ ...p, x: v }))} unit="%" />
                                                <RangeControl label="Vertical" value={textOverlay.y} min={0} max={100} step={1} onChange={(v) => setTextOverlay(p => ({ ...p, y: v }))} unit="%" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CANVAS TAB */}
                                {activeTab === 'canvas' && (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <label className="text-[10px] uppercase font-bold text-zinc-600 px-1">Canvas Presets</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { label: 'YouTube (16:9)', w: 1920, h: 1080 },
                                                    { label: 'TikTok (9:16)', w: 1080, h: 1920 },
                                                    { label: 'Instagram (1:1)', w: 1080, h: 1080 },
                                                    { label: 'Portrait (4:5)', w: 1080, h: 1350 },
                                                ].map(preset => (
                                                    <button
                                                        key={preset.label}
                                                        onClick={() => setProjectSettings(p => ({ ...p, width: preset.w, height: preset.h }))}
                                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2
                                                            ${projectSettings.width === preset.w && projectSettings.height === preset.h
                                                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                                                : 'bg-black/20 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                                                            }`}
                                                    >
                                                        <div
                                                            className="border-2 border-current rounded-sm opacity-50"
                                                            style={{
                                                                width: preset.w > preset.h ? '24px' : (24 * preset.w / preset.h) + 'px',
                                                                height: preset.h > preset.w ? '24px' : (24 * preset.h / preset.w) + 'px'
                                                            }}
                                                        />
                                                        <span className="text-[10px] font-medium whitespace-nowrap">{preset.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                                            <div className="flex items-center justify-between px-1">
                                                <label className="text-[10px] uppercase font-bold text-zinc-600">Safe Zone Overlays</label>
                                                <button
                                                    onClick={() => setShowSafeZones(!showSafeZones)}
                                                    className={`w-10 h-5 rounded-full relative transition-all duration-300 ${showSafeZones ? 'bg-indigo-500' : 'bg-zinc-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${showSafeZones ? 'left-6' : 'left-1'}`} />
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 leading-relaxed px-1">Enable guides for title-safe and action-safe framing on social media.</p>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                                            <label className="text-[10px] uppercase font-bold text-zinc-600 px-1">Custom Dimensions</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-black/20 border border-zinc-800 rounded px-3 py-2 flex flex-col">
                                                    <span className="text-[10px] text-zinc-500">Width</span>
                                                    <input
                                                        type="number"
                                                        value={projectSettings.width}
                                                        onChange={(e) => setProjectSettings(p => ({ ...p, width: parseInt(e.target.value) }))}
                                                        className="bg-transparent border-none outline-none text-xs font-mono text-white p-0"
                                                    />
                                                </div>
                                                <div className="bg-black/20 border border-zinc-800 rounded px-3 py-2 flex flex-col">
                                                    <span className="text-[10px] text-zinc-500">Height</span>
                                                    <input
                                                        type="number"
                                                        value={projectSettings.height}
                                                        onChange={(e) => setProjectSettings(p => ({ ...p, height: parseInt(e.target.value) }))}
                                                        className="bg-transparent border-none outline-none text-xs font-mono text-white p-0"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-4 border-t border-zinc-800/50">
                                            <label className="text-[10px] uppercase font-bold text-zinc-600 px-1">Background Color</label>
                                            <input
                                                type="color"
                                                value={projectSettings.backgroundColor}
                                                onChange={(e) => setProjectSettings(p => ({ ...p, backgroundColor: e.target.value }))}
                                                className="w-full h-10 rounded-lg bg-black/40 border border-zinc-800 cursor-pointer p-1"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* EDIT TAB */}
                                {activeTab === 'edit' && (
                                    <div className="space-y-6">
                                        {/* Sub-Tools Grid */}
                                        <div className="grid grid-cols-4 gap-2 pb-6 border-b border-zinc-800/50">
                                            <ToolButton icon={Scissors} label="Trim" active={activeTool === 'trim'} onClick={() => setActiveTool('trim')} />
                                            <ToolButton icon={Sliders} label="Adjust" active={activeTool === 'adjust'} onClick={() => setActiveTool('adjust')} />
                                            <ToolButton icon={RotateCw} label="Crop" active={activeTool === 'transform'} onClick={() => setActiveTool('transform')} />
                                            <ToolButton icon={Layers} label="Track" active={activeTool === 'track'} onClick={() => setActiveTool('track')} />
                                            <ToolButton icon={FastForward} label="Speed" active={activeTool === 'speed'} onClick={() => setActiveTool('speed')} />
                                            <ToolButton icon={Volume2} label="Audio" active={activeTool === 'audio'} onClick={() => setActiveTool('audio')} />
                                        </div>

                                        {/* Tool Specific Settings */}
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            {activeTool === 'trim' && (
                                                <div className="space-y-4">
                                                    <p className="text-[11px] text-zinc-500 leading-relaxed italic">Select a clip to trim.</p>
                                                    {selectedClipId && videoClips.find(c => c.id === selectedClipId) && (
                                                        <div className="p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                                                            <span className="text-[10px] text-indigo-300 font-medium">
                                                                Duration: {videoClips.find(c => c.id === selectedClipId)?.duration.toFixed(2)}s
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {activeTool === 'adjust' && (
                                                <div className="space-y-5">
                                                    <RangeControl label="Brightness" value={brightness} min={-1} max={1} step={0.1} onChange={setBrightness} unit="%" />
                                                    <RangeControl label="Contrast" value={contrast} min={0} max={2} step={0.1} onChange={setContrast} unit="%" />
                                                    <RangeControl label="Saturation" value={saturation} min={0} max={2} step={0.1} onChange={setSaturation} unit="%" />
                                                    <RangeControl label="Hue" value={hue} min={-180} max={180} step={1} onChange={setHue} unit="°" />
                                                    <Button variant="ghost" className="w-full text-[10px] mt-4 h-8 bg-black/20 hover:bg-black/40" onClick={() => { setBrightness(0); setContrast(1); setSaturation(1); setHue(0); }}>Reset Tones</Button>
                                                </div>
                                            )}

                                            {activeTool === 'transform' && (
                                                <div className="space-y-6">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button onClick={() => setRotation(r => (r - 90) % 360)} className="py-2 bg-black/20 rounded border border-zinc-800 hover:bg-black/40 transition-colors flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-white"><RotateCw size={14} className="-scale-x-100" /> -90°</button>
                                                        <button onClick={() => setRotation(r => (r + 90) % 360)} className="py-2 bg-black/20 rounded border border-zinc-800 hover:bg-black/40 transition-colors flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-white"><RotateCw size={14} /> +90°</button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button onClick={() => setFlipH(!flipH)} className={`py-2 rounded border text-xs transition-all ${flipH ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-black/20 border-zinc-800 text-zinc-400'}`}>Flip H</button>
                                                        <button onClick={() => setFlipV(!flipV)} className={`py-2 rounded border text-xs transition-all ${flipV ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-black/20 border-zinc-800 text-zinc-400'}`}>Flip V</button>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTool === 'track' && (
                                                <div className="space-y-4">
                                                    <label className="text-[10px] uppercase font-bold text-zinc-600 px-1">Move to Track</label>
                                                    <div className="space-y-2">
                                                        {tracks.map(t => (
                                                            <button
                                                                key={t.id}
                                                                onClick={() => {
                                                                    if (!selectedClipId) return;
                                                                    setVideoClips(prev => prev.map(c => c.id === selectedClipId ? { ...c, trackId: t.id } : c));
                                                                }}
                                                                className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all
                                                                    ${videoClips.find(c => c.id === selectedClipId)?.trackId === t.id
                                                                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                                                        : 'bg-black/20 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                                                            >
                                                                <span className="text-xs font-medium">{t.name}</span>
                                                                {t.type === 'video' ? <Film size={12} /> : t.type === 'audio' ? <Volume2 size={12} /> : <Wand2 size={12} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeTool === 'speed' && (
                                                <div className="space-y-5">
                                                    <RangeControl label="Playback Speed" value={speed} min={0.25} max={4} step={0.25} onChange={setSpeed} unit="x" />
                                                </div>
                                            )}

                                            {activeTool === 'audio' && (
                                                <div className="space-y-5">
                                                    <RangeControl label="Master Volume" value={volume} min={0} max={200} step={1} onChange={setVolume} unit="%" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>


                {/* Sidebar Divider Handle */}
                <div
                    className="w-1 cursor-col-resize hover:bg-indigo-500 transition-colors z-50 group relative"
                    onMouseDown={() => setIsResizingSidebar(true)}
                >
                    <div className="absolute top-1/2 left-0 w-full h-8 -translate-y-1/2 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* B. Preview & Main Stage (Flex-1) */}
                <div className="flex-1 flex flex-col min-w-0 bg-zinc-950/20 overflow-hidden relative group">
                    <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
                        {!file ? (
                            <FileUploader
                                onFileSelect={handleFileSelect}
                                label="Ready to create?"
                                description="Drag and drop your footage or click to browse"
                                accept="video/*"
                                icon={Film}
                                className="w-full max-w-xl aspect-video bg-zinc-950/50 hover:bg-zinc-900/50 border-zinc-800/50 hover:border-indigo-500/50"
                            />
                        ) : (
                            <div
                                className="relative shadow-2xl shadow-black rounded-lg overflow-hidden max-h-full max-w-full w-auto h-auto mx-auto ring-1 ring-zinc-800/50"
                                style={{
                                    aspectRatio: `${projectSettings.width}/${projectSettings.height}`
                                }}
                            >
                                <video
                                    ref={videoRef}
                                    src={videoUrl || undefined}
                                    className="hidden"
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    onPause={() => setIsPlaying(false)}
                                    onPlay={() => setIsPlaying(true)}
                                    muted={false}
                                    playsInline
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="w-full h-full object-contain shadow-2xl cursor-move block"
                                    onMouseDown={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        const y = e.clientY - rect.top;
                                        const scaleX = projectSettings.width / rect.width;
                                        const scaleY = projectSettings.height / rect.height;
                                        const cx = x * scaleX;
                                        const cy = y * scaleY;

                                        const activeClip = videoClips.find(c => currentTime >= c.start && currentTime < c.start + c.duration);
                                        if (activeClip) {
                                            const v = videoRef.current;
                                            if (v) {
                                                const w = v.videoWidth * activeClip.scale;
                                                const h = v.videoHeight * activeClip.scale;
                                                const halfW = w / 2;
                                                const halfH = h / 2;
                                                const centerX = (projectSettings.width / 2) + activeClip.x;
                                                const centerY = (projectSettings.height / 2) + activeClip.y;

                                                if (cx >= centerX - halfW && cx <= centerX + halfW && cy >= centerY - halfH && cy <= centerY + halfH) {
                                                    setDraggingHandle({ clipId: activeClip.id, side: 'canvas-drag' as any });
                                                }
                                            }
                                        }
                                    }}
                                    onMouseMove={(e) => {
                                        if (draggingHandle && (draggingHandle.side as any) === 'canvas-drag') {
                                            const clipIndex = videoClips.findIndex(c => c.id === draggingHandle.clipId);
                                            if (clipIndex === -1) return;
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const scaleX = projectSettings.width / rect.width;
                                            const scaleY = projectSettings.height / rect.height;
                                            const dx = e.movementX * scaleX;
                                            const dy = e.movementY * scaleY;

                                            setVideoClips(prev => {
                                                const newClips = [...prev];
                                                newClips[clipIndex] = {
                                                    ...newClips[clipIndex],
                                                    x: newClips[clipIndex].x + dx,
                                                    y: newClips[clipIndex].y + dy
                                                };
                                                return newClips;
                                            });
                                        }
                                    }}
                                    onMouseUp={() => setDraggingHandle(null)}
                                    onMouseLeave={() => setDraggingHandle(null)}
                                    onWheel={(e) => {
                                        const activeClip = videoClips.find(c => currentTime >= c.start && currentTime < c.start + c.duration);
                                        if (activeClip) {
                                            e.preventDefault();
                                            const delta = e.deltaY * -0.001;
                                            setVideoClips(prev => prev.map(c =>
                                                c.id === activeClip.id ? { ...c, scale: Math.max(0.1, c.scale + delta) } : c
                                            ));
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Timeline Resizer Handle */}
            <div
                className="h-1 cursor-row-resize hover:bg-indigo-500 transition-colors z-40 bg-zinc-800/30 group relative"
                onMouseDown={() => setIsResizingTimeline(true)}
            >
                <div className="absolute left-1/2 w-8 h-full -translate-x-1/2 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* 4. Timeline Section (Resizable) */}
            <div
                style={{ height: timelineHeight }}
                className="shrink-0 bg-zinc-900 border-t border-white/5 flex flex-col z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.4)]"
            >
                {/* 1. Timeline Toolbar */}
                <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900 shrink-0 relative">
                    {/* Left Actions */}
                    <div className="flex items-center gap-3 w-1/3">
                        <button onClick={handleSplit} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all text-[10px] uppercase font-bold tracking-wider" title="Split (S)">
                            <Scissors size={14} /> <span>Split</span>
                        </button>
                        <button onClick={handleDeleteClip} className="p-2 bg-zinc-800/50 hover:bg-red-500/20 rounded-lg text-zinc-400 hover:text-red-400 transition-all" title="Delete (Del)">
                            <Trash2 size={14} />
                        </button>
                    </div>

                    {/* Center Playback */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8">
                        <button
                            className="text-zinc-500 hover:text-white transition-all p-2 hover:bg-zinc-800/50 rounded-full"
                            onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 5; }}
                        >
                            <SkipBack size={20} fill="currentColor" className="opacity-50 hover:opacity-100" />
                        </button>
                        <button
                            onClick={togglePlay}
                            className={`flex items-center justify-center w-11 h-11 rounded-full transition-all shadow-xl active:scale-95 
                                ${isPlaying ? 'bg-zinc-800 text-white' : 'bg-white text-black hover:scale-105'}`}
                        >
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                        </button>
                        <button
                            className="text-zinc-500 hover:text-white transition-all p-2 hover:bg-zinc-800/50 rounded-full"
                            onClick={() => { if (videoRef.current) videoRef.current.currentTime += 5; }}
                        >
                            <SkipForward size={20} fill="currentColor" className="opacity-50 hover:opacity-100" />
                        </button>
                    </div>

                    {/* Right Zoom */}
                    <div className="flex items-center justify-end gap-3 w-1/3">
                        <div className="flex items-center gap-2 bg-black/20 px-2 py-1.5 rounded-lg border border-zinc-800/50">
                            <Maximize size={12} className="text-zinc-600" />
                            <input
                                type="range"
                                min="10"
                                max="500"
                                step="10"
                                value={projectSettings.zoom}
                                onChange={(e) => setProjectSettings(prev => ({ ...prev, zoom: parseInt(e.target.value) }))}
                                className="w-24 accent-indigo-500 h-1 bg-zinc-700/30 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Tracks Area */}
                <div className="flex-1 flex overflow-hidden select-none bg-zinc-950/20">
                    {/* Track Labels Sidebar */}
                    <div
                        ref={trackLabelRef}
                        className="w-52 shrink-0 border-r border-white/5 bg-zinc-900/50 flex flex-col pt-8 overflow-y-hidden select-none z-40 transition-all custom-scrollbar"
                    >
                        {tracks.map(track => (
                            <div key={track.id}
                                className="border-b border-white/5 px-3 py-2 flex flex-col justify-between bg-zinc-900/30 hover:bg-zinc-800/40 transition-colors shrink-0 relative group/track-label"
                                style={{ height: track.height }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`p-1 rounded bg-zinc-800/80 ${track.type === 'video' ? 'text-indigo-400' : track.type === 'audio' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {track.type === 'video' ? <Film size={10} /> : track.type === 'audio' ? <Volume2 size={10} /> : <Wand2 size={10} />}
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-300 truncate tracking-tight">{track.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/track-label:opacity-100 transition-opacity">
                                        <button className="p-1 hover:text-white text-zinc-600 transition-colors" title="Lock">
                                            {track.isLocked ? <Monitor size={10} className="text-amber-500" /> : <div className="w-2.5 h-2.5" />}
                                        </button>
                                        <button
                                            onClick={() => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, isVisible: !t.isVisible } : t))}
                                            className={`p-1 hover:text-white transition-colors ${track.isVisible ? 'text-zinc-400' : 'text-zinc-700'}`}
                                        >
                                            {track.isVisible ? <Monitor size={10} /> : <div className="w-2.5 h-2.5 border border-current rounded-full" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Track Resize Handle */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize bg-transparent hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-50"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setResizingTrackId(track.id);
                                        trackResizeStartRef.current = { y: e.clientY, h: track.height };
                                    }}
                                />
                            </div>
                        ))}
                        <div className="p-3 mt-auto sticky bottom-0 bg-zinc-900/80 backdrop-blur-md border-t border-white/5">
                            {tracks.length < 8 ? (
                                <button
                                    onClick={() => addTrack('video')}
                                    className="w-full py-2 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-500 hover:text-white bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg border border-white/5 transition-all"
                                >
                                    <Plus size={12} /> Add Track
                                </button>
                            ) : (
                                <div className="text-[8px] text-zinc-600 text-center py-2 uppercase font-bold tracking-widest opacity-50">Track Limit Reached</div>
                            )}
                        </div>
                    </div>

                    {/* Timeline Tracks Grid */}
                    <div
                        id="timeline-tracks-container"
                        className="flex-1 relative overflow-x-auto overflow-y-auto timeline-scroll custom-scrollbar scroll-smooth"
                        ref={timelineTrackRef}
                    >
                        <style>{timelineStyle}</style>

                        <div
                            className="relative"
                            style={{
                                width: `${Math.max(100, duration * projectSettings.zoom)}px`,
                                minWidth: '100%',
                                minHeight: '100%'
                            }}
                        >
                            {/* Ruler (Sticky) */}
                            <div className="h-8 border-b border-white/5 bg-zinc-900/80 sticky top-0 z-30 overflow-hidden backdrop-blur-sm">
                                <div
                                    className="absolute inset-0 z-10 cursor-pointer"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = (e.clientX - rect.left) + e.currentTarget.parentElement!.parentElement!.scrollLeft;
                                        const p = x / (duration * projectSettings.zoom);
                                        const newTime = Math.max(0, Math.min(duration, p * duration));
                                        setCurrentTime(newTime);
                                        if (videoRef.current) videoRef.current.currentTime = newTime;
                                    }}
                                />
                                {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute bottom-0 flex flex-col items-center"
                                        style={{ left: `${i * projectSettings.zoom}px` }}
                                    >
                                        <span className="text-[9px] text-zinc-600 font-mono mb-1 select-none">
                                            {i % 5 === 0 ? formatTime(i).split('.')[0] : ''}
                                        </span>
                                        <div className={`w-px ${i % 5 === 0 ? 'h-3 bg-zinc-700' : 'h-1.5 bg-zinc-800'}`} />
                                    </div>
                                ))}
                            </div>

                            {/* Multi-Track System */}
                            <div className="flex flex-col relative">
                                {tracks.map(track => (
                                    <div key={track.id}
                                        className="relative border-b border-white/5 group/track overflow-hidden"
                                        style={{ height: track.height }}
                                    >
                                        <div className="absolute inset-0 bg-zinc-900/5 group-hover/track:bg-white/[0.02] transition-colors pointer-events-none" />

                                        {/* Tracks Overlay Grid Lines */}
                                        <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none opacity-[0.03]"
                                            style={{ backgroundImage: `linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: `${projectSettings.zoom}px 100%` }}
                                        />

                                        {videoClips.filter(c => c.trackId === track.id).map((clip) => {
                                            const isSelected = selectedClipId === clip.id;
                                            return (
                                                <div
                                                    key={clip.id}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id); }}
                                                    className={`absolute top-1/2 -translate-y-1/2 h-[calc(100%-12px)] cursor-pointer rounded-xl transition-all group border-2
                                                        ${isSelected ? 'z-30 border-indigo-500 shadow-2xl shadow-indigo-500/20 ring-2 ring-indigo-500/10' : 'z-20 border-zinc-700 hover:border-zinc-500 bg-zinc-800/80'}
                                                    `}
                                                    style={{
                                                        left: `${clip.start * projectSettings.zoom}px`,
                                                        width: `${clip.duration * projectSettings.zoom}px`,
                                                        height: Math.min(track.height - 12, 44),
                                                        background: isSelected
                                                            ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(55, 48, 163, 0.3) 100%)'
                                                            : undefined
                                                    }}
                                                >
                                                    <div className="absolute inset-0 flex items-center px-4 gap-3 overflow-hidden pointer-events-none">
                                                        {track.type === 'audio' && waveforms[clip.id] ? (
                                                            <div className="flex items-center gap-0.5 h-full py-4 opacity-50">
                                                                {waveforms[clip.id].map((v, i) => (
                                                                    <div key={i} className="w-1 bg-emerald-400 rounded-full" style={{ height: `${v * 100}%` }} />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-900 text-zinc-500'}`}>
                                                                    {track.type === 'video' ? <Film size={12} /> : track.type === 'audio' ? <Volume2 size={12} /> : <Wand2 size={12} />}
                                                                </div>
                                                                <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                                                                    {clip.file.name}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {isSelected && (
                                                        <>
                                                            <div
                                                                className="absolute left-0 inset-y-0 w-3 bg-indigo-500 hover:bg-white cursor-ew-resize flex items-center justify-center transition-all rounded-l-lg"
                                                                onMouseDown={(e) => { e.stopPropagation(); setDraggingHandle({ clipId: clip.id, side: 'start' }); }}
                                                            >
                                                                <div className="w-0.5 h-6 bg-indigo-900/40 rounded-full" />
                                                            </div>
                                                            <div
                                                                className="absolute right-0 inset-y-0 w-3 bg-indigo-500 hover:bg-white cursor-ew-resize flex items-center justify-center transition-all rounded-r-lg"
                                                                onMouseDown={(e) => { e.stopPropagation(); setDraggingHandle({ clipId: clip.id, side: 'end' }); }}
                                                            >
                                                                <div className="w-0.5 h-6 bg-indigo-900/40 rounded-full" />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            {/* PLAYHEAD (Sticky Container for full height) */}
                            {file && (
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 cursor-ew-resize group/playhead playhead-glow"
                                    style={{ left: `${currentTime * projectSettings.zoom}px` }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setIsPlaying(false);
                                        setDraggingHandle({ clipId: 'playhead', side: 'playhead' });
                                    }}
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-6 h-7 bg-red-500 rounded-b-lg border-x border-b border-white/20 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-125 z-[60]">
                                        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                                    </div>
                                    <div className="absolute inset-y-0 -left-2 -right-2 group-hover:bg-red-500/5 transition-colors" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Overlay for Processing/Results */}
            {isProcessing && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
                        <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <MonitorPlay size={32} className="text-indigo-400" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">Rendering Magic</h3>
                        <p className="text-zinc-400 text-sm max-w-md">Applying your professional grades and effects. This won't take long...</p>
                    </div>
                </div>
            )}

            {resultUrl && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
                    <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="relative aspect-video bg-black rounded-[2rem] border border-zinc-800 shadow-2xl overflow-hidden group p-1 ring-1 ring-white/5">
                            <video src={resultUrl} controls className="w-full h-full object-contain rounded-[1.8rem]" />
                        </div>

                        <div className="flex flex-col space-y-8">
                            <div>
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 mb-6 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                                    <CheckCircle size={28} />
                                </div>
                                <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">Master Ready!</h2>
                                <p className="text-zinc-400 text-sm leading-relaxed">Your professional edit is waiting. Download it now to share with the world.</p>
                            </div>

                            <div className="space-y-4">
                                <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-2xl shadow-indigo-500/40 text-lg font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => {
                                        const a = document.createElement('a');
                                        a.href = resultUrl;
                                        a.download = `omniedit_pro_${Date.now()}.mp4`;
                                        a.click();
                                    }}
                                >
                                    <Download size={20} className="mr-3" /> Download Video
                                </Button>
                                <Button variant="ghost" className="w-full h-14 text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl text-sm font-medium" onClick={() => setResultUrl(null)}
                                >
                                    Continue Editing
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="video/*,audio/*"
                onChange={handleHiddenInputChange}
            />
        </div>
    );
};
