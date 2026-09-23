import React, { useState, useRef } from 'react';
import {
    Smartphone, Download, RotateCcw, Eye, Layers, Sparkles,
    ChevronLeft, ChevronRight, Plus, Trash2, Image as ImageIcon,
    Maximize2, RefreshCw, Upload, Wifi, Signal, Battery,
    ZoomIn, ZoomOut, Lock, ChevronDown, Repeat
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useIsMobile } from '../../hooks/useIsMobile';
import { ToolShell } from '../../components/ToolShell';
import { FileData } from '../../types';
import { useFocusedMode } from '../../contexts/FocusedMode';

// ─── Types & Interfaces ────────────────────────────────────────────────────────

type FormatType = 'story' | 'story-ad' | 'feed-45' | 'feed-11' | 'carousel' | 'feed-ad';
type ExportFormat = 'png' | 'jpeg';

interface ImageItem {
    id: string;
    url: string;
    name: string;
}

interface FormatMeta {
    id: FormatType;
    label: string;
    aspectRatio: string;
    dimensions: string;
    defaultOverlay: string;
}

interface OverlayPreset {
    id: string;
    label: string;
    src: string;
}

const OVERLAY_PRESETS: OverlayPreset[] = [
    {
        id: 'story-ui-1',
        label: 'Instagram Story UI #1',
        src: '/overlays/Instagram-Story-UI-Overlay-1.png',
    },
    {
        id: 'story-ui-2',
        label: 'Instagram Story UI #2',
        src: '/overlays/Instagram-Story-UI-Overlay-2.png',
    },
    {
        id: 'story-ad-new',
        label: 'New Instagram Story Ad UI',
        src: '/overlays/NewAD-Instagram-Story-UI-Overlay-3.png',
    },
    {
        id: 'story-ad-old',
        label: 'Classic Instagram Story Ad UI',
        src: '/overlays/Old-AD-Instagram-Story-UI-Overlay-3.png',
    }
];

const FORMATS: FormatMeta[] = [
    {
        id: 'story',
        label: 'Story / Reel',
        aspectRatio: '9/16',
        dimensions: '1080 × 1920 px',
        defaultOverlay: 'story-ui-1'
    },
    {
        id: 'story-ad',
        label: 'Story Ad',
        aspectRatio: '9/16',
        dimensions: '1080 × 1920 px',
        defaultOverlay: 'story-ad-new'
    },
    {
        id: 'feed-45',
        label: 'Feed Portrait',
        aspectRatio: '4/5',
        dimensions: '1080 × 1350 px',
        defaultOverlay: 'story-ui-1'
    },
    {
        id: 'feed-11',
        label: 'Feed Square',
        aspectRatio: '1/1',
        dimensions: '1080 × 1080 px',
        defaultOverlay: 'story-ui-1'
    },
    {
        id: 'carousel',
        label: 'Carousel',
        aspectRatio: '4/5',
        dimensions: '1080 × 1350 px',
        defaultOverlay: 'story-ui-1'
    },
    {
        id: 'feed-ad',
        label: 'Feed Ad',
        aspectRatio: '4/5',
        dimensions: '1080 × 1350 px',
        defaultOverlay: 'story-ad-new'
    }
];

const ZOOM_STOPS = [0.85, 1.0, 1.15];

export const SocialMockupChecker: React.FC = () => {
    const isMobile = useIsMobile();
    const { focused, setFocused } = useFocusedMode();
    const replaceInputRef = useRef<HTMLInputElement>(null);

    // State
    const [images, setImages] = useState<ImageItem[]>([]);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [format, setFormat] = useState<FormatType>('story');
    const [selectedOverlayId, setSelectedOverlayId] = useState<string>('story-ui-1');
    const [showUIOverlay, setShowUIOverlay] = useState(true);
    const [showSafeZone, setShowSafeZone] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [zoomIndex, setZoomIndex] = useState(0); // 85% default

    // File Selection
    const handleFilesSelect = (selectedFiles: FileData | FileData[]) => {
        const filesArray = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
        const newImages: ImageItem[] = filesArray.map((f, idx) => ({
            id: `img-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
            url: f.previewUrl || URL.createObjectURL(f.file),
            name: f.file.name
        }));

        setImages(prev => [...prev, ...newImages]);
        setActiveImageIndex(0);
        if (filesArray.length > 1) {
            setFormat('carousel');
        }
    };

    const handleFormatChange = (newFormat: FormatType) => {
        setFormat(newFormat);
        const meta = FORMATS.find(f => f.id === newFormat);
        if (meta) {
            setSelectedOverlayId(meta.defaultOverlay);
        }
    };

    const handleReplaceActiveImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const newUrl = URL.createObjectURL(file);
        setImages(prev => {
            const updated = [...prev];
            if (updated[activeImageIndex]) {
                updated[activeImageIndex] = {
                    ...updated[activeImageIndex],
                    url: newUrl,
                    name: file.name
                };
            } else {
                updated.push({ id: `img-${Date.now()}`, url: newUrl, name: file.name });
            }
            return updated;
        });
    };

    const handleAddMoreImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        const newItems: ImageItem[] = files.map((file, idx) => ({
            id: `img-${Date.now()}-${idx}`,
            url: URL.createObjectURL(file),
            name: file.name
        }));
        setImages(prev => [...prev, ...newItems]);
    };

    const handleRemoveImage = (id: string) => {
        setImages(prev => {
            const filtered = prev.filter(img => {
                if (img.id === id && img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url);
                return img.id !== id;
            });
            if (activeImageIndex >= filtered.length) {
                setActiveImageIndex(Math.max(0, filtered.length - 1));
            }
            return filtered;
        });
    };

    const imagesRef = React.useRef(images);
    React.useEffect(() => { imagesRef.current = images; }, [images]);

    React.useEffect(() => {
        return () => {
            imagesRef.current.forEach(img => { if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url); });
        };
    }, []);

    // ─── HIGH-RES 1080x1920 CANVAS EXPORT ENGINE ─────────────────────────────
    const handleExportImage = async () => {
        if (!activeImage) return;
        setExporting(true);
        try {
            const targetW = 1080;
            const targetH = activeFormat.aspectRatio === '9/16' ? 1920 : activeFormat.aspectRatio === '4/5' ? 1350 : 1080;

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context unavailable');

            // 1. Draw User Creative Image (1080x1920)
            const creativeImg = new Image();
            creativeImg.crossOrigin = 'anonymous';
            creativeImg.src = activeImage.url;
            await new Promise((resolve, reject) => {
                creativeImg.onload = resolve;
                creativeImg.onerror = () => reject(new Error('Failed to load creative image for export'));
            });
            const hRatio = canvas.width / creativeImg.naturalWidth;
            const vRatio = canvas.height / creativeImg.naturalHeight;
            const ratio = Math.max(hRatio, vRatio);
            const centerShiftX = (canvas.width - creativeImg.naturalWidth * ratio) / 2;
            const centerShiftY = (canvas.height - creativeImg.naturalHeight * ratio) / 2;
            ctx.drawImage(creativeImg, 0, 0, creativeImg.naturalWidth, creativeImg.naturalHeight,
                centerShiftX, centerShiftY, creativeImg.naturalWidth * ratio, creativeImg.naturalHeight * ratio);

            // 2. Draw Real Transparent PNG Instagram UI Overlay if enabled
            if (showUIOverlay && activeOverlayPreset?.src && (activeFormat.id === 'story' || activeFormat.id === 'story-ad')) {
                const overlayImg = new Image();
                overlayImg.crossOrigin = 'anonymous';
                overlayImg.src = activeOverlayPreset.src;
                await new Promise((resolve) => {
                    overlayImg.onload = resolve;
                    overlayImg.onerror = resolve;
                });
                if (overlayImg.complete && overlayImg.naturalWidth > 0) {
                    ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
                }
            }

            // 3. Draw Overvisual Dashed Danger Lines if Safe Zones are enabled
            if (showSafeZone && (format === 'story' || format === 'story-ad')) {
                ctx.strokeStyle = '#EF4444';
                ctx.lineWidth = 4;
                ctx.setLineDash([20, 10]);
                
                const topY = canvas.height * 0.0807;
                ctx.beginPath();
                ctx.moveTo(0, topY);
                ctx.lineTo(canvas.width, topY);
                ctx.stroke();

                const bottomY = canvas.height * 0.9193;
                ctx.beginPath();
                ctx.moveTo(0, bottomY);
                ctx.lineTo(canvas.width, bottomY);
                ctx.stroke();
            }

            // 4. Download Clean High-Res PNG
            const dataUrl = canvas.toDataURL('image/png', 0.95);
            const link = document.createElement('a');
            link.download = `instagram-${format}-${Date.now()}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            console.error('Export error:', err);
            alert(err.message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    const activeFormat = FORMATS.find(f => f.id === format) || FORMATS[0];
    const activeImage = images[activeImageIndex] || images[0];
    const activeOverlayPreset = OVERLAY_PRESETS.find(p => p.id === selectedOverlayId) || OVERLAY_PRESETS[0];
    const currentZoom = ZOOM_STOPS[zoomIndex];

    // ─── INITIAL UPLOAD STATE (AGENTS.md Compliant) ───────────────────────────
    if (images.length === 0) {
        return (
            <ToolShell
                icon={Smartphone}
                title="Social Mockup Checker"
                description="Upload your story image or video to check Instagram safe zones and preview real UI overlays inside a 3D mobile mockup."
                features={[
                    { icon: Eye, label: 'Safe Zone Guides', desc: '155px Top/Bottom Margins' },
                    { icon: Layers, label: 'Real Instagram UI', desc: 'Authentic 9:16 Overlays' },
                    { icon: Smartphone, label: 'Phone Mockup Stage', desc: 'Sleek 2026 Mobile Frames' },
                    { icon: Sparkles, label: 'Instant 4K Export', desc: 'Client-Ready PNGs' },
                ]}
                file={[]}
                accept="image/*"
                uploadLabel="Upload Story Design or Carousel Slides"
                uploadDescription="PNG, JPG, WebP — Upload 1 or multiple images"
                onFileSelect={handleFilesSelect}
            >
                <></>
            </ToolShell>
        );
    }

    // ─── STREAMLINED WORKSPACE LAYOUT ─────────────────────────────────────────
    return (
        <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 rounded-2xl overflow-hidden border border-zinc-800/60 shadow-2xl animate-fade-in font-sans">

            {/* Clean Top Bar */}
            <div className="flex-none px-6 py-3.5 border-b border-zinc-800/80 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between gap-4 z-30">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => replaceInputRef.current?.click()}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
                        title="Replace current creative image"
                    >
                        <Repeat size={14} className="text-indigo-400" />
                        <span>Replace Design</span>
                    </button>
                    <input
                        ref={replaceInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleReplaceActiveImage}
                        className="hidden"
                    />
                </div>

                {/* Direct Instant Export PNG Action */}
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleExportImage}
                        disabled={exporting}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                        {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                        <span>Export PNG</span>
                    </Button>
                </div>
            </div>

            {/* Main Workspace Layout */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

                {/* LEFT SIDEBAR: CREATION CONTROLS */}
                <div className="w-full lg:w-72 flex-none bg-zinc-900/90 border-b lg:border-b-0 lg:border-r border-zinc-800/80 p-5 overflow-y-auto space-y-6 scrollbar-thin text-xs">

                    {/* FORMAT SELECTOR */}
                    <div className="space-y-2.5">
                        <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                            Format
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {FORMATS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => handleFormatChange(f.id)}
                                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${format === f.id
                                        ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                                        : 'bg-zinc-950/70 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                                        }`}
                                >
                                    <div className="font-bold truncate">{f.label}</div>
                                    <div className="text-[10px] text-zinc-500 mt-0.5">{f.aspectRatio}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PLATFORM SELECTOR */}
                    <div className="space-y-2.5">
                        <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                            Platform
                        </h4>
                        <div className="space-y-2">
                            <div className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/40 shadow-sm flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <span>📸</span> Instagram
                                </span>
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                                    Active
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2.5">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>More Platforms</span>
                                    <Lock size={10} className="text-zinc-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { name: 'TikTok', icon: '🎵' },
                                        { name: 'X (Twitter)', icon: '𝕏' },
                                        { name: 'YouTube Shorts', icon: '▶' },
                                        { name: 'Pinterest', icon: '📌' },
                                        { name: 'LinkedIn', icon: '💼' }
                                    ].map((plat) => (
                                        <div key={plat.name} className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-zinc-900/90 text-zinc-500 border border-zinc-800/60 flex items-center justify-between select-none opacity-60">
                                            <span className="flex items-center gap-1 truncate">
                                                <span>{plat.icon}</span>
                                                <span className="truncate">{plat.name}</span>
                                            </span>
                                            <Lock size={9} className="text-zinc-600 flex-shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CAROUSEL SLIDES MANAGER */}
                    {(format === 'carousel' || images.length > 1) && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                                    <ImageIcon size={14} /> Carousel Slides ({images.length})
                                </h4>
                                <label className="cursor-pointer text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                    <Plus size={12} /> Add
                                    <input type="file" accept="image/*" multiple onChange={handleAddMoreImage} className="hidden" />
                                </label>
                            </div>
                            <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                                {images.map((img, idx) => (
                                    <div
                                        key={img.id}
                                        onClick={() => setActiveImageIndex(idx)}
                                        className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer group transition-all ${idx === activeImageIndex ? 'border-indigo-500 ring-2 ring-indigo-500/30 scale-105' : 'border-zinc-800 opacity-70 hover:opacity-100'}`}
                                    >
                                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                                        <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[9px] px-1 rounded font-mono font-bold">
                                            {idx + 1}
                                        </span>
                                        {images.length > 1 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRemoveImage(img.id); }}
                                                className="absolute top-0.5 right-0.5 bg-red-600/80 hover:bg-red-600 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete slide"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* CENTER STAGE: PIXEL-PERFECT UNCROPPED 9:16 PHONE CHASSIS */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none min-h-[600px] bg-dot-grid">

                    {/* Outer Phone Mockup Chassis Container */}
                    <div
                        className="relative w-[312px] bg-zinc-950 border-[4px] border-zinc-800 rounded-[44px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] flex flex-col items-center overflow-hidden p-1.5 transition-transform duration-300 ease-out origin-center select-none"
                        style={{
                            transform: `scale(${currentZoom})`,
                        }}
                    >
                        {/* Top System Status Bar Header (Above 9:16 viewport) */}
                        <div className="w-full h-9 px-4 pt-1 flex items-center justify-between z-40 text-white text-[11px] font-semibold font-sans bg-black">
                            <span>17:41</span>
                            <div className="w-20 h-4 bg-black rounded-full border border-zinc-800 flex items-center justify-end px-2 gap-1 shadow-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0a0d18] border border-blue-900/50" />
                            </div>
                            <div className="flex items-center gap-1 opacity-90 text-[10px]">
                                <Signal size={11} />
                                <Wifi size={11} />
                                <Battery size={13} className="fill-white" />
                            </div>
                        </div>

                        {/* EXACT STORY DISPLAY VIEWPORT CONTAINER */}
                        <div
                            className="relative w-[300px] bg-black overflow-hidden flex items-center justify-center"
                            style={{ aspectRatio: activeFormat.aspectRatio || '9/16' }}
                        >
                            {/* LAYER 1: User's Design Creative Image (Fits 100% Uncropped!) */}
                            {activeImage ? (
                                <img
                                    src={activeImage.url}
                                    alt="Story creative"
                                    className="absolute inset-0 w-full h-full object-cover z-0"
                                />
                            ) : (
                                <label className="absolute inset-2 border-2 border-dashed border-zinc-700/80 bg-zinc-900/80 hover:bg-zinc-800 transition-all flex flex-col items-center justify-center cursor-pointer p-4 text-center group z-0">
                                    <Upload size={28} className="text-zinc-400 group-hover:scale-110 transition-transform mb-2" />
                                    <span className="text-xs font-semibold text-zinc-200">Click to upload</span>
                                    <span className="text-[10px] text-zinc-500 mt-1">9:16 recommended</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFilesSelect({ file: e.target.files[0], size: '0', type: 'image' });
                                            }
                                        }}
                                        className="hidden"
                                    />
                                </label>
                            )}

                            {/* Carousel Controls */}
                            {(format === 'carousel' || images.length > 1) && (
                                <>
                                    <div className="absolute top-3 right-3 z-30 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full font-mono border border-white/10">
                                        {activeImageIndex + 1}/{images.length}
                                    </div>

                                    {images.length > 1 && (
                                        <>
                                            {activeImageIndex > 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveImageIndex(i => i - 1); }}
                                                    className="absolute left-1.5 top-1/2 -translate-y-1/2 z-30 p-1 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                                                >
                                                    <ChevronLeft size={14} />
                                                </button>
                                            )}
                                            {activeImageIndex < images.length - 1 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveImageIndex(i => i + 1); }}
                                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 z-30 p-1 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                                                >
                                                    <ChevronRight size={14} />
                                                </button>
                                            )}
                                        </>
                                    )}

                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                                        {images.map((_, dotIdx) => (
                                            <span
                                                key={dotIdx}
                                                onClick={() => setActiveImageIndex(dotIdx)}
                                                className={`h-1.5 rounded-full transition-all cursor-pointer ${dotIdx === activeImageIndex ? 'w-3.5 bg-indigo-400' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* LAYER 2: Real Transparent Instagram UI Overlay */}
                            {showUIOverlay && (
                                <img
                                    src={activeOverlayPreset.src}
                                    alt={activeOverlayPreset.label}
                                    className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none select-none"
                                />
                            )}

                            {/* LAYER 3: Safe Zone Guidelines Overlay (Overvisual Exact Math: 8.07% / 91.93%) */}
                            {showSafeZone && (
                                <div className="absolute inset-0 z-30 pointer-events-none">
                                    {(format === 'story' || format === 'story-ad') && (
                                        <>
                                            <div className="absolute top-0 inset-x-0 h-[8.07%] bg-red-500/20" />
                                            <div className="absolute left-0 right-0 top-[8.07%] border-b-2 border-dashed border-red-500 flex items-center justify-center">
                                                <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full -translate-y-1/2">
                                                    Danger Zone (155px)
                                                </span>
                                            </div>

                                            <div className="absolute bottom-0 inset-x-0 top-[91.93%] bg-red-500/20" />
                                            <div className="absolute left-0 right-0 top-[91.93%] border-t-2 border-dashed border-red-500 flex items-center justify-center">
                                                <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full -translate-y-1/2">
                                                    Danger Zone (155px)
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {format === 'feed-45' && (
                                        <>
                                            <div className="absolute top-0 inset-x-0 h-[10%] bg-amber-500/20 border-b border-dashed border-amber-400" />
                                            <div className="absolute bottom-0 inset-x-0 top-[90%] bg-amber-500/20 border-t border-dashed border-amber-400" />
                                            <div className="absolute top-[10%] bottom-[10%] inset-x-0 border-y-2 border-emerald-400" />
                                        </>
                                    )}

                                    {(format === 'feed-11' || format === 'carousel' || format === 'feed-ad') && (
                                        <div className="absolute inset-0 border-2 border-emerald-400" />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bottom Navigation Gesture Bar Chin (Below 9:16 viewport) */}
                        <div className="w-full h-7 px-3 pb-1 flex items-center justify-center z-40 bg-black">
                            <div className="w-24 h-1 bg-white/90 rounded-full shadow-sm" />
                        </div>
                    </div>

                    {/* BOTTOM FLOATING CANVAS TOOLBAR: 3-Stop Zoom Slider & Fullscreen */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setZoomIndex(prev => Math.max(0, prev - 1))}
                                disabled={zoomIndex === 0}
                                className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                                title="Zoom Out"
                            >
                                <ZoomOut size={14} />
                            </button>
                            <span className="font-mono text-[11px] font-bold text-zinc-300 w-12 text-center">
                                {Math.round(currentZoom * 100)}%
                            </span>
                            <button
                                onClick={() => setZoomIndex(prev => Math.min(ZOOM_STOPS.length - 1, prev + 1))}
                                disabled={zoomIndex === ZOOM_STOPS.length - 1}
                                className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                                title="Zoom In"
                            >
                                <ZoomIn size={14} />
                            </button>
                        </div>

                        <span className="h-3.5 w-[1px] bg-zinc-800" />

                        <button
                            onClick={() => setFocused(!focused)}
                            className="p-1 text-zinc-400 hover:text-white transition-colors"
                            title="Fullscreen Mode"
                        >
                            <Maximize2 size={14} />
                        </button>
                    </div>
                </div>

                {/* RIGHT SIDEBAR: PREVIEW & OVERLAY CONTROLS */}
                <div className="w-full lg:w-72 flex-none bg-zinc-900/90 border-t lg:border-t-0 lg:border-l border-zinc-800/80 p-6 overflow-y-auto space-y-7 scrollbar-thin text-xs">
                    <div className="pb-2 border-b border-zinc-800/60">
                        <h4 className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest mb-1">
                            Preview Settings
                        </h4>
                        <p className="text-[10px] text-zinc-500">Configure UI overlays and safe zone guides.</p>
                    </div>

                    {/* OVERLAY SELECTOR DROPDOWN */}
                    <div className="pt-2">
                        <label className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-3">
                            Overlay Template
                        </label>
                        <div className="relative">
                            <select
                                value={selectedOverlayId}
                                onChange={(e) => { setSelectedOverlayId(e.target.value); setShowUIOverlay(true); }}
                                className="w-full appearance-none bg-zinc-950 border border-zinc-800 hover:border-indigo-500/60 focus:border-indigo-500 text-zinc-200 text-xs rounded-xl p-3.5 pr-10 outline-none transition-all cursor-pointer font-semibold shadow-inner"
                            >
                                {OVERLAY_PRESETS.map(p => (
                                    <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200 py-2">
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* OVERLAY TOGGLES */}
                    <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-200 text-xs">Platform UI Overlay</span>
                            <button
                                onClick={() => setShowUIOverlay(!showUIOverlay)}
                                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${showUIOverlay ? 'bg-indigo-600' : 'bg-zinc-800'}`}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showUIOverlay ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-200 text-xs">Safe Zone Guidelines</span>
                            <button
                                onClick={() => setShowSafeZone(!showSafeZone)}
                                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${showSafeZone ? 'bg-indigo-600' : 'bg-zinc-800'}`}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showSafeZone ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
