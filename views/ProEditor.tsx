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
    Undo2, Redo2, SkipBack, SkipForward, Folder, Monitor, Maximize
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

// Filters & Tools Types
type EditorTool = 'trim' | 'adjust' | 'transform' | 'text' | 'speed' | 'audio';
type SidebarTab = 'files' | 'text' | 'canvas' | 'edit';

interface VideoClip {
    id: string;
    type: 'video';
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
}

interface ProjectSettings {
    width: number;
    height: number;
    backgroundColor: string;
    zoom: number; // Timeline zoom (pixels per second)
}

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
    const clipsRef = useRef<VideoClip[]>([]); // Ref for access in event listeners
    const fileInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { clipsRef.current = videoClips; }, [videoClips]);

    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [thumbnails, setThumbnails] = useState<string[]>([]);

    // SEO
    useEffect(() => {
        const originalTitle = document.title;
        const metaDesc = document.querySelector('meta[name="description"]');
        const originalDesc = metaDesc?.getAttribute('content') || '';

        document.title = 'Studio | AdopeCanva - Professional Video Editor';
        if (metaDesc) {
            metaDesc.setAttribute('content', 'Advanced browser-based video editor. Trim, split, adjust, and add text to your videos with professional-grade tools.');
        }

        return () => {
            document.title = originalTitle;
            if (metaDesc) {
                metaDesc.setAttribute('content', originalDesc);
            }
        };
    }, []);

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
    const [timelineHeight, setTimelineHeight] = useState(260);
    const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('left');
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isResizingTimeline, setIsResizingTimeline] = useState(false);

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
    const [draggingHandle, setDraggingHandle] = useState<{ clipId: string, side: 'start' | 'end' } | null>(null);
    const timelineTrackRef = useRef<HTMLDivElement>(null);


    // Drag Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!draggingHandle || !timelineTrackRef.current) return;

            const rect = timelineTrackRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            const newTime = percentage * duration;

            setVideoClips(prev => {
                const newClips = [...prev];
                const index = newClips.findIndex(c => c.id === draggingHandle.clipId);
                if (index === -1) return prev;

                const clip = { ...newClips[index] };
                const minDuration = 0.5; // Minimum clip length

                if (draggingHandle.side === 'start') {
                    const delta = newTime - clip.start;

                    if (clip.duration - delta < minDuration) return prev;
                    if (clip.offset + delta < 0) return prev;

                    clip.start = newTime;
                    clip.duration -= delta;
                    clip.offset += delta;
                } else if (draggingHandle.side === 'end') {
                    const newDur = newTime - clip.start;
                    if (newDur < minDuration) return prev;
                    if (clip.offset + newDur > duration) {
                        if (clip.offset + newDur > duration) return prev;
                    }
                    clip.duration = newDur;
                }
                newClips[index] = clip;
                newClips[index] = clip;
                return newClips;
            });

            // Real-time preview: Seek to the trim point
            setCurrentTime(newTime);
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
    }, [draggingHandle, duration]);










    // Layout Resizing Effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingSidebar) {
                const newWidth = sidebarPosition === 'left' ? e.clientX : window.innerWidth - e.clientX;
                setSidebarWidth(Math.max(200, Math.min(600, newWidth)));
            } else if (isResizingTimeline) {
                const newHeight = window.innerHeight - e.clientY;
                setTimelineHeight(Math.max(150, Math.min(500, newHeight)));
            }
        };

        const handleMouseUp = () => {
            setIsResizingSidebar(false);
            setIsResizingTimeline(false);
            document.body.style.cursor = 'default';
        };

        if (isResizingSidebar || isResizingTimeline) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = isResizingSidebar ? 'col-resize' : 'row-resize';
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

    // Canvas Render Loop
    useEffect(() => {
        let animationFrameId: number;

        const render = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            const video = videoRef.current; // Hidden source

            if (!canvas || !ctx || !video) return;

            // Sync canvas size
            if (canvas.width !== projectSettings.width) canvas.width = projectSettings.width;
            if (canvas.height !== projectSettings.height) canvas.height = projectSettings.height;

            // 1. Clear & Background
            ctx.fillStyle = projectSettings.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Find Active Clip
            const activeClip = clipsRef.current.find(c => currentTime >= c.start && currentTime < c.start + c.duration);

            if (activeClip) {
                // 3. Draw Video Layer
                // Sync video time if needed (simple sync for now, optimizing seeking is complex)
                // We rely on the fact that if playing, video.currentTime is moving. 
                // If paused, we might need to seek. 
                // For now, we assume videoRef is the SOURCE.
                // Issue: Source video element is linear file. Clip is a slice.
                // We must set video.currentTime = activeClip.offset + (currentTime - activeClip.start)

                const targetTime = activeClip.offset + (currentTime - activeClip.start);

                // Only seek if significantly off (to avoid stutter on playback) or if paused/seeking
                if (Math.abs(video.currentTime - targetTime) > 0.3) {
                    video.currentTime = targetTime;
                }

                ctx.save();
                // Center origin
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;

                ctx.translate(cx + activeClip.x, cy + activeClip.y);
                ctx.rotate((activeClip.rotation * Math.PI) / 180);
                ctx.scale(activeClip.scale * (activeClip.flipH ? -1 : 1), activeClip.scale * (activeClip.flipV ? -1 : 1));
                ctx.globalAlpha = activeClip.opacity;

                // Draw Image centered
                // We use videoWidth/Height to keep aspect ratio of source
                const vw = video.videoWidth;
                const vh = video.videoHeight;
                ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh);

                ctx.restore();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [currentTime, projectSettings]); // Dep on currentTime to trigger re-checks, but Loop runs 60fps? 
    // Actually, if we use requestAnimationFrame, we don't strictly need dependency on currentTime, BUT we need it to be fresh. 
    // We used refs for clips, need ref for currentTime or just let React re-bind. 
    // Re-binding on every currentTime change (every seek) is fine. For playback, we need a standard loop.
    // Better: Effect with empty dep [] that uses refs for everything? 
    // For this iteration, simpler to depend on [currentTime] (scrubbing) + pure animation frame for playback (isPlaying).
    // Let's stick to standard loop that reads refs.

    // We need a ref for currentTime to avoid tearing/stutter if we want a stable loop.
    const timeRef = useRef(0);
    useEffect(() => { timeRef.current = currentTime; }, [currentTime]);

    // Redoing the effect to be cleaner and robust:
    useEffect(() => {
        let id: number;
        const render = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            const video = videoRef.current;

            if (canvas && ctx) {
                // Resize check (debounce or just set style width vs attr width)
                // We set attr width/height once or on change.
                if (canvas.width !== projectSettings.width) canvas.width = projectSettings.width;
                if (canvas.height !== projectSettings.height) canvas.height = projectSettings.height;

                // 1. Clear
                ctx.fillStyle = projectSettings.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 2. Active Clip at CURRENT TIME
                // Use timeRef for loop access
                const t = timeRef.current;
                const activeClip = clipsRef.current.find(c => t >= c.start && t < c.start + c.duration);

                if (activeClip && video && video.readyState >= 2) {
                    // Sync source video
                    const targetSourceTime = activeClip.offset + (t - activeClip.start);
                    // If playing, the video element 'should' be playing? 
                    // Actually, dragging the timeline seeks the video. 
                    // If we have one source file, we just seek it.
                    // Precise sync:
                    if (Math.abs(video.currentTime - targetSourceTime) > 0.25) {
                        video.currentTime = targetSourceTime;
                    }

                    ctx.save();
                    ctx.translate((canvas.width / 2) + activeClip.x, (canvas.height / 2) + activeClip.y);
                    ctx.rotate((activeClip.rotation * Math.PI) / 180);
                    ctx.scale(activeClip.scale * (activeClip.flipH ? -1 : 1), activeClip.scale * (activeClip.flipV ? -1 : 1));
                    ctx.globalAlpha = activeClip.opacity;

                    // Draw centered
                    ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);
                    ctx.restore();
                }
            }
            id = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(id);
    }, [projectSettings]); // Only restart if settings change. Time/Clips accessed via Ref.


    // 2. Adjustments
    const [brightness, setBrightness] = useState(0); // -1.0 to 1.0
    const [contrast, setContrast] = useState(1.0); // 0.0 to 2.0
    const [saturation, setSaturation] = useState(1.0); // 0.0 to 3.0
    const [hue, setHue] = useState(0); // -180 to 180 (degrees implied, but eq filter uses different scale, we'll map 0-360 approx or just basic hue shift)

    // 3. Transform
    const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);

    // 4. Speed
    const [speed, setSpeed] = useState(1.0);

    // 5. Audio
    const [volume, setVolume] = useState(100); // Percentage

    // 6. Text
    const [textOverlay, setTextOverlay] = useState<{
        text: string;
        size: number;
        color: string;
        x: number; // 0-100%
        y: number; // 0-100%
        font: string; // 'preset-name' or 'custom'
        start: number; // seconds
        end: number | null; // seconds (null = until end)
    }>({ text: '', size: 60, color: '#ffffff', x: 50, y: 50, font: 'Roboto', start: 0, end: null });

    // Font State
    const [customFontFile, setCustomFontFile] = useState<File | null>(null);

    const FONT_PRESETS = [
        { name: 'Roboto', url: 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Bold.ttf', family: 'sans-serif' },
        { name: 'Oswald', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/Oswald%5Bwght%5D.ttf', family: 'sans-serif' },
        { name: 'Dancing Script', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf', family: 'cursive' },
        { name: 'Permanent Marker', url: 'https://raw.githubusercontent.com/google/fonts/main/apache/permanentmarker/PermanentMarker-Regular.ttf', family: 'cursive' },
        { name: 'Press Start 2P', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/pressstart2p/PressStart2P-Regular.ttf', family: 'monospace' },
    ];

    // Timeline CSS
    const timelineStyle = `
        .thumb-input::-webkit-slider-thumb {
            pointer-events: auto;
            -webkit-appearance: none;
            height: 4rem;
            width: 24px;
            background: transparent;
            cursor: ew-resize;
            z-index: 50;
        }
        .thumb-input::-moz-range-thumb {
            pointer-events: auto;
            height: 4rem;
            width: 24px;
            border: none;
            background: transparent;
            cursor: ew-resize;
            z-index: 50;
        }
        /* Custom styled range slider for standard controls */
        .styled-range {
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
            cursor: pointer;
        }
        .styled-range::-webkit-slider-runnable-track {
            background: rgba(82, 82, 91, 0.5); /* zinc-600/50 */
            border-radius: 9999px;
            height: 0.5rem;
        }
        .styled-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            margin-top: -4px; /* center thumb */
            background-color: white;
            border: 2px solid currentColor; /* Uses text color */
            height: 1rem;
            width: 1rem;
            border-radius: 50%;
            transition: transform 0.1s;
        }
        .styled-range:hover::-webkit-slider-thumb {
            transform: scale(1.2);
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

    const handleFileSelect = (fileData: FileData) => {
        setFile(fileData);
        const url = URL.createObjectURL(fileData.file);
        setVideoUrl(url);

        // Reset all states
        setVideoClips([]);
        setThumbnails([]);
        setSelectedClipId(null);
        setDuration(0);
        setCurrentTime(0);

        setBrightness(0);
        setContrast(1.0);
        setSaturation(1.0);
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setSpeed(1.0);
        setVolume(100);
        setTextOverlay({ text: '', size: 36, color: '#ffffff', x: 50, y: 80, font: 'Roboto', start: 0, end: null });
        setResultUrl(null);
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
                    flipH: false, flipV: false, opacity: 1, zOrder: 1
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
        if (!file || !ffmpegRef.current) return;
        setIsProcessing(true);
        const ffmpeg = ffmpegRef.current;
        const inputName = 'input.mp4';
        const outputName = 'output.mp4';

        try {
            await writeFileToFFmpeg(ffmpeg, inputName, file.file);

            // Construct Filter Complex
            const filters: string[] = [];

            // 1. Trim (if needed) - Actually trim is complex with audio sync. 
            // Better to use -ss and -t as input args or output args for speed? 
            // For complex filter chain, 'trim' filter is safer but needs atrim too.
            // Let's use 'trim' + 'atrim' and 'setpts' / 'asetpts'.

            // Video Chain
            // We need to construct a chain that handles multiple clips
            // Logic:
            // 1. For each clip, trim source [0:v] and [0:a]
            // 2. Concat all segments
            // 3. Apply effects to the concatenated stream

            let vChain = '[vJoined]';
            let aChain = '[aJoined]';

            if (videoClips.length === 0) throw new Error("No clips to export");

            // Build Trim & Concat Chain

            const concatInputs: string[] = [];

            videoClips.forEach((clip, i) => {
                // Video Trim
                filters.push(`[0:v]trim=start=${clip.offset}:duration=${clip.duration},setpts=PTS-STARTPTS[v${i}]`);
                // Audio Trim
                filters.push(`[0:a]atrim=start=${clip.offset}:duration=${clip.duration},asetpts=PTS-STARTPTS[a${i}]`);

                concatInputs.push(`[v${i}][a${i}]`);
            });

            // Concat
            filters.push(`${concatInputs.join('')}concat=n=${videoClips.length}:v=1:a=1[vJoined][aJoined]`);

            // Adjustments (eq)
            // eq=contrast=1.0:brightness=0.0:saturation=1.0
            if (brightness !== 0 || contrast !== 1 || saturation !== 1) {
                filters.push(`${vChain}eq=contrast=${contrast}:brightness=${brightness}:saturation=${saturation}[vAdj]`);
                vChain = `[vAdj]`;
            }


            // Transform
            if (rotation !== 0 || flipH || flipV) {
                let transFilters: string[] = [];
                if (rotation === 90) transFilters.push('transpose=1');
                else if (rotation === 180) transFilters.push('transpose=1,transpose=1');
                else if (rotation === 270) transFilters.push('transpose=2');

                if (flipH) transFilters.push('hflip');
                if (flipV) transFilters.push('vflip');

                filters.push(`${vChain}${transFilters.join(',')}[vTrans]`);
                vChain = `[vTrans]`;
            }

            // Speed - Video: setpts, Audio: atempo
            // setpts=(1/speed)*PTS
            if (speed !== 1.0) {
                filters.push(`${vChain}setpts=${1 / speed}*PTS[vSpeed]`);
                // atempo limit is 0.5 to 2.0. Chain for more.
                // Simple logic for < 0.5 or > 2.0 omitted for brevity, asserting range 0.5-2.0 or slightly more.
                filters.push(`${aChain}atempo=${speed}[aSpeed]`);
                vChain = `[vSpeed]`;
                aChain = `[aSpeed]`;
            }

            // Text
            if (textOverlay.text) {
                const fontReady = await loadFont(ffmpeg);
                if (fontReady) {
                    const sanitizedText = textOverlay.text.replace(/:/g, '\\:').replace(/'/g, '');
                    const xPos = `(w-text_w)*${textOverlay.x}/100`;
                    const yPos = `(h-text_h)*${textOverlay.y}/100`;

                    // Timing
                    let enableExpr = '';
                    if (textOverlay.start > 0 || (textOverlay.end !== null && textOverlay.end < duration)) {
                        const endT = textOverlay.end !== null ? textOverlay.end : duration;
                        enableExpr = `:enable='between(t,${textOverlay.start},${endT})'`;
                    }

                    filters.push(`${vChain}drawtext=fontfile=font.ttf:text='${sanitizedText}':fontcolor=${textOverlay.color}:fontsize=${textOverlay.size}:x=${xPos}:y=${yPos}${enableExpr}[vText]`);
                    vChain = `[vText]`;
                }
            }

            // Audio Volume
            if (volume !== 100) {
                filters.push(`${aChain}volume=${volume / 100}[aVol]`);
                aChain = `[aVol]`;
            }

            // Final Mapping
            // If we didn't add filters beyond Trim, we have simple chains. 
            // We need to verify if filters array is empty.
            // But complex filter syntax requires mapped labels if we used them.

            // Let's refine the filter construction:
            // We will build a SINGLE chain string for video and audio separately if possible, or mapping.
            // Actually, chaining straightforwardly with commas `filter1,filter2` is easier if we don't branch.
            // BUT trim breaks this because it creates new streams needing [label].

            // Revised approach: Use -vf and -af unless trim is involved.
            // Trim is essential. 

            // Let's build a unified complex filter string.
            // We already pushed lines to `filters` array like `[in]filter[out]`.
            // We just need to join them with semicolon `;`.
            // And use `-map "[vFinal]"` `-map "[aFinal]"`

            // Rename final outputs to generic 'vOut' and 'aOut' for cleaner mapping
            const lastV = vChain !== `[0:v]` ? vChain : `[0:v]`; // Use input if untouched? No, map needs label or index.
            const lastA = aChain !== `[0:a]` ? aChain : `[0:a]`;

            // Wait, if NO processing happened on audio, we can't map a non-existent label [a1] etc.
            // We need to ensure labels exist or fallback to 0:a.

            const cmdArgs = ['-y', '-i', inputName];

            if (filters.length > 0) {
                cmdArgs.push('-filter_complex', filters.join(';'));
                // map the last defined labels
                // We need to know what the last label IS.
                // vChain holds the name of the *input* for next stage, which means it IS the output of previous.
                // e.g. [vText]

                // Case: Unmodified streams
                // If vChain is [0:v], we map 0:v.
                cmdArgs.push('-map', vChain.replace('[', '').replace(']', ''));
                cmdArgs.push('-map', aChain.replace('[', '').replace(']', ''));
            }

            // libx264 for compatibility
            cmdArgs.push('-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', outputName);

            await ffmpeg.exec(cmdArgs);

            const url = await readFileFromFFmpeg(ffmpeg, outputName, 'video/mp4');
            setResultUrl(url);

            // Cleanup
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

        } catch (e) {
            console.error(e);
            alert("Export failed. Check console.");
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
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white border-none h-10 px-6 text-sm font-semibold rounded-sm shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95"
                            onClick={handleExport}
                            isLoading={isProcessing}
                            disabled={!file}
                        >
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
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold text-zinc-600 px-1">Font Settings</label>
                                            <RangeControl label="Size" value={textOverlay.size} min={12} max={120} step={1} onChange={(v) => setTextOverlay(p => ({ ...p, size: v }))} unit="px" />
                                            {/* Future: Font Family Selector, Color Picker */}
                                        </div>
                                    </div>
                                )}

                                {/* CANVAS TAB */}
                                {activeTab === 'canvas' && (
                                    <div className="space-y-5">
                                        <div className="space-y-3">
                                            <label className="text-[10px] uppercase font-bold text-zinc-600 px-1">Dimensions</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-black/20 border border-zinc-800 rounded px-3 py-2">
                                                    <span className="text-[10px] text-zinc-500 block">Width</span>
                                                    <span className="text-xs font-mono text-zinc-300">{projectSettings.width}px</span>
                                                </div>
                                                <div className="bg-black/20 border border-zinc-800 rounded px-3 py-2">
                                                    <span className="text-[10px] text-zinc-500 block">Height</span>
                                                    <span className="text-xs font-mono text-zinc-300">{projectSettings.height}px</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] uppercase font-bold text-zinc-600 px-1">Background</label>
                                            <input
                                                type="color"
                                                value={projectSettings.backgroundColor}
                                                onChange={(e) => setProjectSettings(p => ({ ...p, backgroundColor: e.target.value }))}
                                                className="w-full h-8 rounded bg-transparent cursor-pointer"
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
                                {/* Text Overlay Render */}
                                {textOverlay.text && (
                                    (textOverlay.start === 0 && textOverlay.end === null) ||
                                    (currentTime >= textOverlay.start && (textOverlay.end === null || currentTime <= textOverlay.end))
                                ) && (
                                        <div className="absolute font-bold text-center select-none pointer-events-none drop-shadow-lg"
                                            style={{ left: `${textOverlay.x}%`, top: `${textOverlay.y}%`, transform: 'translate(-50%, -50%)', color: textOverlay.color, fontSize: `${textOverlay.size}px`, fontFamily: textOverlay.font === 'custom' ? 'inherit' : (FONT_PRESETS.find(f => f.name === textOverlay.font)?.family || 'sans-serif') }}>
                                            {textOverlay.text}
                                        </div>
                                    )}
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
                className="shrink-0 bg-zinc-900 border-t border-zinc-800/50 flex flex-col z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.4)]"
            >
                {/* 1. Timeline Toolbar (Refactored) */}
                <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900 shrink-0 relative">
                    {/* Left Actions */}
                    <div className="flex items-center gap-2 w-1/3">
                        <button onClick={handleSplit} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors text-xs font-medium" title="Split">
                            <Scissors size={14} /> <span className="hidden sm:inline">Split</span>
                        </button>
                        <button onClick={handleDeleteClip} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                            <Trash2 size={14} />
                        </button>
                    </div>

                    {/* Center Playback */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-6">
                        <button
                            className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800/50 rounded-full"
                            onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 5; }}
                        >
                            <SkipBack size={18} fill="currentColor" className="opacity-70" />
                        </button>
                        <button
                            onClick={togglePlay}
                            className="flex items-center justify-center w-10 h-10 bg-zinc-100 text-black rounded-full hover:scale-105 transition-all shadow-lg shadow-white/5"
                        >
                            {isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" className="ml-0.5" />}
                        </button>
                        <button
                            className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800/50 rounded-full"
                            onClick={() => { if (videoRef.current) videoRef.current.currentTime += 5; }}
                        >
                            <SkipForward size={18} fill="currentColor" className="opacity-70" />
                        </button>
                    </div>

                    {/* Right Zoom */}
                    <div className="flex items-center justify-end gap-2 w-1/3">
                        <button
                            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                            onClick={handleZoomToFit}
                            title="Zoom to Fit"
                        >
                            <Maximize size={14} />
                        </button>
                        <span className="text-[10px] uppercase font-bold text-zinc-600">Zoom</span>
                        <input
                            type="range"
                            min="10"
                            max="200"
                            step="10"
                            value={projectSettings.zoom}
                            onChange={(e) => setProjectSettings(prev => ({ ...prev, zoom: parseInt(e.target.value) }))}
                            className="w-24 accent-indigo-500 h-1 bg-zinc-700/50 rounded-lg appearance-none cursor-pointer hover:bg-zinc-700 transition-colors"
                        />
                    </div>
                </div>

                {/* 2. Tracks Area */}
                <div id="timeline-tracks-container" className="flex-1 relative p-4 overflow-x-auto overflow-y-hidden select-none bg-zinc-950/50 custom-scrollbar" >
                    <style>{timelineStyle}</style>

                    {/* Container for scrollable tracks - simplistic for now */}
                    <div
                        className="relative h-full"
                        style={{
                            width: `${Math.max(100, duration * projectSettings.zoom)}px`,
                            minWidth: '100%'
                        }}
                    >
                        {/* Ruler & Tracks - Only show if file exists */}
                        {file && (
                            <>
                                {/* Ruler */}
                                <div className="absolute top-0 left-0 right-0 h-4 border-b border-zinc-800 flex text-[9px] text-zinc-600 font-mono select-none pointer-events-none">
                                    {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => {
                                        if (i % 5 !== 0 && projectSettings.zoom < 20) return null;
                                        return (
                                            <div key={i} className="absolute bottom-0 border-l border-zinc-800 pl-1 pb-0.5 flex items-end" style={{ left: `${(i / duration) * 100}%` }}>
                                                {i % 5 === 0 && <span>{formatTime(i)}</span>}
                                                {i % 5 !== 0 && <div className="h-1 w-px bg-zinc-800" />}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Track 1: Video (Main) */}
                                <div
                                    ref={timelineTrackRef}
                                    className="absolute top-6 left-0 right-0 h-10 bg-zinc-900 rounded border border-zinc-700/50 overflow-hidden group/track"
                                    style={{
                                        backgroundImage: `repeating-linear-gradient(45deg, #18181b 25%, transparent 25%, transparent 50%, #18181b 50%, #18181b 75%, transparent 75%, transparent)`,
                                        backgroundSize: '10px 10px'
                                    }}
                                >
                                    <div className="absolute inset-x-0 bottom-0 h-full flex">
                                        <div className="flex w-full h-full opacity-30 pointer-events-none">
                                            {thumbnails.map((src, i) => (
                                                <img key={i} src={src} className="h-full object-cover flex-1" alt="" />
                                            ))}
                                        </div>
                                    </div>

                                    {videoClips.map((clip) => (
                                        <div
                                            key={clip.id}
                                            className={`absolute top-1 bottom-1 border-r border-transparent overflow-hidden cursor-pointer group/clip rounded-sm transition-all
                                                          ${selectedClipId === clip.id ? 'ring-2 ring-indigo-500 z-30 shadow-lg' : 'hover:ring-1 hover:ring-indigo-400/50 z-20'}
                                                      `}
                                            style={{
                                                left: `${(clip.start / duration) * 100}%`,
                                                width: `${(clip.duration / duration) * 100}%`,
                                                backgroundColor: selectedClipId === clip.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(63, 63, 70, 0.6)'
                                            }}
                                            onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id); }}
                                        >
                                            <div className="absolute top-1 left-2 text-[10px] text-white/90 font-bold uppercase truncate max-w-[90%] drop-shadow-md">Video</div>

                                            {selectedClipId === clip.id && (
                                                <>
                                                    <div
                                                        className="absolute left-0 top-0 bottom-0 w-4 -ml-2 cursor-w-resize hover:bg-indigo-500/20 z-40 flex items-center justify-center group/handle transition-colors"
                                                        onMouseDown={(e) => { e.stopPropagation(); setIsPlaying(false); setDraggingHandle({ clipId: clip.id, side: 'start' }); }}
                                                    >
                                                        <div className="w-1.5 h-8 bg-white/90 rounded-full shadow-sm group-hover/handle:scale-110 transition-transform"></div>
                                                    </div>
                                                    <div
                                                        className="absolute right-0 top-0 bottom-0 w-4 -mr-2 cursor-e-resize hover:bg-indigo-500/20 z-40 flex items-center justify-center group/handle transition-colors"
                                                        onMouseDown={(e) => { e.stopPropagation(); setIsPlaying(false); setDraggingHandle({ clipId: clip.id, side: 'end' }); }}
                                                    >
                                                        <div className="w-1.5 h-8 bg-white/90 rounded-full shadow-sm group-hover/handle:scale-110 transition-transform"></div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Track 2: Text */}
                                {textOverlay.text && (
                                    <div className="absolute top-20 left-0 right-0 h-8 mt-1 z-20 pointer-events-none">
                                        <div
                                            className="absolute h-full bg-green-500/20 border border-green-500/50 rounded flex items-center px-2 text-[10px] text-green-300 cursor-move hover:bg-green-500/30 transition-colors pointer-events-auto"
                                            style={{
                                                left: `${(textOverlay.start / duration) * 100}%`,
                                                width: `${((textOverlay.end !== null ? textOverlay.end : duration) - textOverlay.start) / duration * 100}%`
                                            }}
                                        >
                                            <Type size={10} className="mr-1" /> {textOverlay.text}
                                        </div>
                                    </div>
                                )}

                                {/* Playhead */}
                                <div
                                    className="absolute top-0 bottom-0 w-px bg-red-500 z-50 pointer-events-none"
                                    style={{ left: `${(currentTime / duration) * 100}%` }}
                                >
                                    <div className="absolute top-0 -translate-x-1/2 bg-red-500 w-3 h-3 text-[8px] flex items-center justify-center text-white rounded-b-sm">▼</div>
                                </div>
                            </>
                        )}

                        {/* Invisible Click-to-Seek Layer */}
                        <div className="absolute inset-0 z-10 cursor-pointer" onClick={(e) => {
                            // Seek logic
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const p = x / rect.width;
                            if (videoRef.current) videoRef.current.currentTime = p * duration;
                        }}></div>

                        {/* Empty State Overlay */}
                        {!file && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="pointer-events-auto flex flex-col items-center gap-3 text-zinc-500 hover:text-white transition-all group scale-90 hover:scale-100"
                                >
                                    <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900/80 flex items-center justify-center group-hover:border-indigo-500 group-hover:bg-indigo-500/10 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all">
                                        <Plus size={20} className="group-hover:text-indigo-400" />
                                    </div>
                                    <span className="text-[10px] font-medium uppercase tracking-wider bg-zinc-950/50 px-2 py-1 rounded-full border border-zinc-800 backdrop-blur-sm group-hover:border-indigo-500/30">Add Media</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Result Modal Overlay */}
            {
                resultUrl && (
                    <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
                        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                            <div className="relative aspect-video bg-black rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden group">
                                <video src={resultUrl} controls className="w-full h-full object-contain" />
                            </div>

                            <div className="flex flex-col space-y-8">
                                <div>
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 mb-6 border border-indigo-500/20">
                                        <CheckCircle size={24} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-white mb-2">Export Complete</h2>
                                    <p className="text-zinc-400 text-sm leading-relaxed">Your professional edit is ready for download.</p>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-lg shadow-indigo-500/20"
                                        onClick={() => {
                                            const a = document.createElement('a');
                                            a.href = resultUrl;
                                            a.download = `studio_export_${Date.now()}.mp4`;
                                            a.click();
                                        }}
                                    >
                                        <Download size={18} className="mr-2" /> Download Video
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full h-12 text-zinc-400 hover:text-white hover:bg-white/5"
                                        onClick={() => setResultUrl(null)}
                                    >
                                        Continue Editing
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="video/*"
                onChange={handleHiddenInputChange}
            />
        </div>
    );
};
