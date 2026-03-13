/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import {
    Crop, RotateCw, RotateCcw, Check, Undo2, Download, Maximize,
    Square, RectangleHorizontal, RectangleVertical, MousePointer2,
    ZoomIn, ZoomOut, Move, Hand, Settings, Share2, Trash2, RefreshCw, Image
} from 'lucide-react';
import { SectionLabel } from '../../components/EditorControls';

interface CropArea {
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    width: number; // Percentage 0-100
    height: number; // Percentage 0-100
}

type AspectRatio = 'free' | 'custom' | '1:1' | '16:9' | '4:3' | '3:2' | '9:16' | '4:5' | '2:1';

export const ImageCropper: React.FC = () => {
    const isMobile = useIsMobile();
    const [file, setFile] = useState<FileData | null>(null);
    const [rotation, setRotation] = useState(0);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');

    // Crop state in percentages
    const [crop, setCrop] = useState<CropArea>({ x: 10, y: 10, width: 80, height: 80 });

    // Viewport State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanMode, setIsPanMode] = useState(false);
    const [isSpaceHeld, setIsSpaceHeld] = useState(false);

    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | 'pan' | null>(null);

    // Custom Dimension Inputs
    const [customW, setCustomW] = useState<number>(0);
    const [customH, setCustomH] = useState<number>(0);
    const [imageDimensions, setImageDimensions] = useState({ w: 0, h: 0 });

    const containerRef = useRef<HTMLDivElement>(null); // The Rotated Wrapper
    const imageRef = useRef<HTMLImageElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Refs for drag operations
    const startMouseRef = useRef({ x: 0, y: 0 });
    const startPanRef = useRef({ x: 0, y: 0 });
    const startCropRef = useRef<CropArea>({ x: 0, y: 0, width: 0, height: 0 });

    useEffect(() => {
        if (file) {
            setCrop({ x: 10, y: 10, width: 80, height: 80 });
            setRotation(0);
            setAspectRatio('free');
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setIsPanMode(false);
        }
    }, [file]);

    // Handle Spacebar for temporary pan mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) setIsSpaceHeld(true);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') setIsSpaceHeld(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Update pixel inputs when crop changes
    useEffect(() => {
        if (imageRef.current) {
            const naturalWidth = imageRef.current.naturalWidth;
            const naturalHeight = imageRef.current.naturalHeight;
            setCustomW(Math.round((crop.width / 100) * naturalWidth));
            setCustomH(Math.round((crop.height / 100) * naturalHeight));
        }
    }, [crop, file]);

    const applyAspectRatio = (ratioType: AspectRatio) => {
        setAspectRatio(ratioType);
        if (ratioType === 'free' || ratioType === 'custom') return;

        let targetRatio = 1;
        switch (ratioType) {
            case '16:9': targetRatio = 16 / 9; break;
            case '4:3': targetRatio = 4 / 3; break;
            case '3:2': targetRatio = 3 / 2; break;
            case '9:16': targetRatio = 9 / 16; break;
            case '4:5': targetRatio = 4 / 5; break;
            case '2:1': targetRatio = 2 / 1; break;
            case '1:1': default: targetRatio = 1; break;
        }

        if (!imageRef.current) return;

        const imgAspect = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
        let newHeight = (crop.width * imgAspect) / targetRatio;

        // Clamp
        if (crop.y + newHeight > 100) {
            newHeight = 100 - crop.y;
            const newWidth = (newHeight * targetRatio) / imgAspect;
            setCrop(c => ({ ...c, width: newWidth, height: newHeight }));
        } else {
            setCrop(c => ({ ...c, height: newHeight }));
        }
    };

    const handleCustomDimensionChange = (dim: 'w' | 'h', value: number) => {
        if (!imageRef.current) return;
        const naturalWidth = imageRef.current.naturalWidth;
        const naturalHeight = imageRef.current.naturalHeight;

        if (dim === 'w') {
            setCustomW(value);
            let newWidthPerc = (value / naturalWidth) * 100;
            if (newWidthPerc > 100) newWidthPerc = 100;
            setCrop(c => ({ ...c, width: newWidthPerc }));
        } else {
            setCustomH(value);
            let newHeightPerc = (value / naturalHeight) * 100;
            if (newHeightPerc > 100) newHeightPerc = 100;
            setCrop(c => ({ ...c, height: newHeightPerc }));
        }
        setAspectRatio('custom');
    };

    const handleWheel = (e: React.WheelEvent) => {
        // Prevent default is harder in passive event listeners, 
        // but inside the component wrapper it usually works if focus is there.
        // We rely on the overflow-hidden of the parent to prevent page scroll mostly.
        const delta = -e.deltaY * 0.001;
        setZoom(z => Math.min(Math.max(0.1, z + delta), 5));
    };

    // Rotate a point (dx, dy) around (0,0) by degrees
    const rotatePoint = (dx: number, dy: number, angleDeg: number) => {
        const angleRad = (angleDeg * Math.PI) / 180;
        return {
            x: dx * Math.cos(angleRad) - dy * Math.sin(angleRad),
            y: dx * Math.sin(angleRad) + dy * Math.cos(angleRad)
        };
    };

    const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'bg') => {
        e.preventDefault();
        e.stopPropagation();

        // Check if we should pan
        const shouldPan = type === 'bg' || isPanMode || isSpaceHeld || e.button === 1; // Middle click

        if (shouldPan) {
            setIsDragging(true);
            setDragType('pan');
            startMouseRef.current = { x: e.clientX, y: e.clientY };
            startPanRef.current = { ...pan };
            return;
        }

        // Otherwise, handle crop drag
        if (!containerRef.current || !imageRef.current) return;
        setIsDragging(true);
        setDragType(type);
        startMouseRef.current = { x: e.clientX, y: e.clientY };
        startCropRef.current = { ...crop };
    };

    useEffect(() => {
        const handleGlobalMove = (e: MouseEvent) => {
            if (!isDragging) return;

            // 1. Panning Logic (Screen Space)
            if (dragType === 'pan') {
                const deltaX = e.clientX - startMouseRef.current.x;
                const deltaY = e.clientY - startMouseRef.current.y;
                setPan({
                    x: startPanRef.current.x + deltaX,
                    y: startPanRef.current.y + deltaY
                });
                return;
            }

            // 2. Cropping Logic (Image Space)
            if (!containerRef.current || !imageRef.current || !dragType) return;

            // Calculate RAW screen delta
            const rawDx = e.clientX - startMouseRef.current.x;
            const rawDy = e.clientY - startMouseRef.current.y;

            // Adjust for Zoom
            const zoomedDx = rawDx / zoom;
            const zoomedDy = rawDy / zoom;

            // Adjust for Rotation (We need to map screen moves to local image moves)
            // If image is rotated 90deg, moving mouse Right (Screen X+) means moving Top (Image Y-)
            const { x: localDxPixels, y: localDyPixels } = rotatePoint(zoomedDx, zoomedDy, -rotation);

            // Convert pixels to Percentages
            // We use the offsetWidth of the container (the rotated wrapper).
            const containerW = containerRef.current.offsetWidth;
            const containerH = containerRef.current.offsetHeight;

            const deltaX = (localDxPixels / containerW) * 100;
            const deltaY = (localDyPixels / containerH) * 100;

            const prev = startCropRef.current;
            const img = imageRef.current;
            const imgAspect = img.naturalWidth / img.naturalHeight;

            // Aspect Ratio Math
            let targetRatio: number | null = null;
            if (aspectRatio !== 'free') {
                if (aspectRatio === 'custom') {
                    targetRatio = (prev.width * img.naturalWidth) / (prev.height * img.naturalHeight);
                } else {
                    const [rW, rH] = aspectRatio.split(':').map(Number);
                    if (rW && rH) targetRatio = rW / rH;
                }
            }

            let newCrop = { ...prev };

            if (dragType === 'move') {
                newCrop.x = Math.min(Math.max(prev.x + deltaX, 0), 100 - prev.width);
                newCrop.y = Math.min(Math.max(prev.y + deltaY, 0), 100 - prev.height);
            } else {
                // Resize with Ratio
                if (targetRatio !== null) {
                    const K = imgAspect / targetRatio;
                    let w = prev.width;
                    let h = prev.height;

                    // Simple scaling logic for constrained ratio
                    // We use the primary axis of movement to determine scale
                    if (dragType === 'se') {
                        // Try to use X delta primarily
                        w = prev.width + deltaX;
                        h = w * K;
                        // Boundary checks
                        if (prev.x + w > 100) { w = 100 - prev.x; h = w * K; }
                        if (prev.y + h > 100) { h = 100 - prev.y; w = h / K; }
                        newCrop.width = w; newCrop.height = h;
                    }
                    else if (dragType === 'sw') {
                        w = prev.width - deltaX;
                        h = w * K;
                        const rightEdge = prev.x + prev.width;
                        if (w > rightEdge) { w = rightEdge; h = w * K; }
                        if (prev.y + h > 100) { h = 100 - prev.y; w = h / K; }
                        newCrop.width = w; newCrop.height = h;
                        newCrop.x = rightEdge - w;
                    }
                    else if (dragType === 'ne') {
                        w = prev.width + deltaX;
                        h = w * K;
                        const bottomEdge = prev.y + prev.height;
                        if (prev.x + w > 100) { w = 100 - prev.x; h = w * K; }
                        if (h > bottomEdge) { h = bottomEdge; w = h / K; }
                        newCrop.width = w; newCrop.height = h;
                        newCrop.y = bottomEdge - h;
                    }
                    else if (dragType === 'nw') {
                        w = prev.width - deltaX;
                        h = w * K;
                        const rightEdge = prev.x + prev.width;
                        const bottomEdge = prev.y + prev.height;
                        if (w > rightEdge) { w = rightEdge; h = w * K; }
                        if (h > bottomEdge) { h = bottomEdge; w = h / K; }
                        newCrop.width = w; newCrop.height = h;
                        newCrop.x = rightEdge - w;
                        newCrop.y = bottomEdge - h;
                    }
                } else {
                    // Free Resize
                    if (dragType === 'se') {
                        newCrop.width = Math.max(1, prev.width + deltaX);
                        newCrop.height = Math.max(1, prev.height + deltaY);
                    } else if (dragType === 'sw') {
                        newCrop.x = Math.min(prev.x + prev.width - 1, prev.x + deltaX);
                        newCrop.width = Math.max(1, prev.width - deltaX);
                        newCrop.height = Math.max(1, prev.height + deltaY);
                    } else if (dragType === 'ne') {
                        newCrop.y = Math.min(prev.y + prev.height - 1, prev.y + deltaY);
                        newCrop.width = Math.max(1, prev.width + deltaX);
                        newCrop.height = Math.max(1, prev.height - deltaY);
                    } else if (dragType === 'nw') {
                        newCrop.x = Math.min(prev.x + prev.width - 1, prev.x + deltaX);
                        newCrop.width = Math.max(1, prev.width - deltaX);
                        newCrop.y = Math.min(prev.y + prev.height - 1, prev.y + deltaY);
                        newCrop.height = Math.max(1, prev.height - deltaY);
                    }

                    // Final clamps
                    if (newCrop.x < 0) { newCrop.width += newCrop.x; newCrop.x = 0; }
                    if (newCrop.y < 0) { newCrop.height += newCrop.y; newCrop.y = 0; }
                    if (newCrop.x + newCrop.width > 100) newCrop.width = 100 - newCrop.x;
                    if (newCrop.y + newCrop.height > 100) newCrop.height = 100 - newCrop.y;
                }
            }
            setCrop(newCrop);
        };

        const handleGlobalUp = () => {
            setIsDragging(false);
            setDragType(null);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleGlobalMove);
            window.addEventListener('mouseup', handleGlobalUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        };
    }, [isDragging, dragType, aspectRatio, zoom, rotation]);


    const handleCropImage = () => {
        if (!imageRef.current) return;

        const canvas = document.createElement('canvas');
        const img = imageRef.current;
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        // Create intermediate canvas to handle rotation
        const tempCanvas = document.createElement('canvas');
        // Calculate rotated bounding box size to avoid clipping
        // For 90 degree increments it swaps W/H
        if (Math.abs(rotation % 180) === 90) {
            tempCanvas.width = naturalHeight;
            tempCanvas.height = naturalWidth;
        } else {
            tempCanvas.width = naturalWidth;
            tempCanvas.height = naturalHeight;
        }

        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Draw rotated image onto temp canvas
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(rotation * Math.PI / 180);
        tempCtx.drawImage(img, -naturalWidth / 2, -naturalHeight / 2);

        // Map crop percentages to rotated dimensions
        const pixelX = (crop.x / 100) * tempCanvas.width;
        const pixelY = (crop.y / 100) * tempCanvas.height;
        const pixelW = (crop.width / 100) * tempCanvas.width;
        const pixelH = (crop.height / 100) * tempCanvas.height;

        canvas.width = pixelW;
        canvas.height = pixelH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(tempCanvas, pixelX, pixelY, pixelW, pixelH, 0, 0, pixelW, pixelH);

        const result = canvas.toDataURL(file?.file.type || 'image/png');
        setCroppedImage(result);
    };

    const handleDownload = () => {
        if (!croppedImage) return;
        const link = document.createElement('a');
        link.href = croppedImage;
        link.download = `cropped-${file?.file.name}`;
        link.click();
    };

    if (!file) {
        return (
            <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <Crop size={32} /> Image Cropper
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Resize, crop, and adjust your images with precision anchors.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={setFile}
                        accept="image/*"
                        label="Upload Image"
                        description="JPG, PNG, WEBP up to 20MB"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Crop, label: 'Precision Crop', desc: 'Exact pixel control' },
                        { icon: RotateCcw, label: 'Rotate', desc: 'Correct orientation' },
                        { icon: ZoomIn, label: 'Zoom & Pan', desc: 'Focus on details' },
                        { icon: Download, label: 'HD Export', desc: 'Lossless quality' }
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

    if (croppedImage) {
        return (
            <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in py-12">
                <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                    <Check size={40} />
                </div>
                <h2 className="text-3xl font-black text-white font-unbounded">Image Ready!</h2>
                <div className="bg-surface p-2 rounded-2xl border border-zinc-800 inline-block shadow-2xl relative bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
                    <img
                        src={croppedImage}
                        alt="Result"
                        className="max-h-[400px] rounded-xl object-contain relative z-10"
                    />
                </div>
                <div className="flex justify-center gap-4">
                    <Button variant="secondary" onClick={() => setCroppedImage(null)}>
                        <Undo2 size={18} className="mr-2" /> Adjust
                    </Button>
                    <Button onClick={handleDownload}>
                        <Download size={18} className="mr-2" /> Download Image
                    </Button>
                </div>
            </div>
        );
    }

    const isHand = isPanMode || isSpaceHeld;

    // Visual scaling: Calculate inverse scale for UI elements
    // This ensures that as zoom increases, the visual size of handles and borders decreases
    // relative to the image, remaining constant relative to the screen.
    const uiScale = 1 / zoom;
    const borderW = 2 * uiScale;
    const handlePx = 14 * uiScale; // 14px visual handle size

    const handleStyle = (pos: React.CSSProperties): React.CSSProperties => ({
        position: 'absolute',
        width: `${handlePx}px`,
        height: `${handlePx}px`,
        borderWidth: `${2 * uiScale}px`,
        borderColor: 'white',
        borderStyle: 'solid',
        backgroundColor: '#3b82f6', // blue-500
        borderRadius: '9999px',
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
        cursor: isHand ? 'grab' : undefined,
        ...pos
    });

    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>


            <aside className={`${isMobile ? 'order-2 w-full h-[55vh]' : 'order-2 w-80 border-l'} border-zinc-800 bg-zinc-950 flex flex-col z-20 shrink-0`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <Crop size={20} /> Cropper Settings
                    </h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[10px] font-bold text-zinc-500 hover:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                            title="Replace Image"
                        >
                            <RefreshCw size={14} /> Replace
                        </button>
                        <button onClick={() => setFile(null)} className="text-zinc-600 hover:text-red-400 transition-colors" title="Close">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* 1. Precise Dimensions */}
                        <section className="space-y-4">
                            <SectionLabel>Precise Dimensions</SectionLabel>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                                    <label className="text-[8px] text-zinc-600 font-bold uppercase mb-1 block tracking-widest">Width (px)</label>
                                    <input
                                        type="number"
                                        value={customW}
                                        onChange={(e) => handleCustomDimensionChange('w', parseInt(e.target.value) || 0)}
                                        className="w-full bg-transparent text-sm font-mono text-white outline-none"
                                    />
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                                    <label className="text-[8px] text-zinc-600 font-bold uppercase mb-1 block tracking-widest">Height (px)</label>
                                    <input
                                        type="number"
                                        value={customH}
                                        onChange={(e) => handleCustomDimensionChange('h', parseInt(e.target.value) || 0)}
                                        className="w-full bg-transparent text-sm font-mono text-white outline-none"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* 2. Orientation */}
                        <section>
                            <SectionLabel>Orientation</SectionLabel>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setRotation(r => r - 45)}
                                    className="flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all text-zinc-400 hover:text-white"
                                >
                                    <RotateCcw size={16} />
                                    <span className="text-[10px] font-bold uppercase">-45°</span>
                                </button>
                                <button
                                    onClick={() => setRotation(r => r + 45)}
                                    className="flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all text-zinc-400 hover:text-white"
                                >
                                    <RotateCw size={16} />
                                    <span className="text-[10px] font-bold uppercase">+45°</span>
                                </button>
                            </div>
                        </section>

                        {/* 3. Aspect Ratios & Presets */}
                        <section className="space-y-4">
                            <SectionLabel>Aspect Ratios</SectionLabel>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'free', icon: MousePointer2, label: 'Free' },
                                    { id: '1:1', icon: Square, label: '1:1' },
                                    { id: '16:9', icon: RectangleHorizontal, label: '16:9' },
                                    { id: '4:3', icon: RectangleHorizontal, label: '4:3' },
                                    { id: '9:16', icon: RectangleVertical, label: '9:16' },
                                    { id: '2:1', icon: RectangleHorizontal, label: '2:1' },
                                ].map((ratio) => (
                                    <button
                                        key={ratio.id}
                                        onClick={() => applyAspectRatio(ratio.id as AspectRatio)}
                                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${aspectRatio === ratio.id ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        <ratio.icon size={14} />
                                        <span className="text-[9px] font-bold">{ratio.label}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="pt-4 space-y-3">
                            <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 border-none shadow-lg shadow-indigo-500/20 font-bold text-xs tracking-widest uppercase" onClick={handleCropImage} >
                                <Check size={18} className="mr-2" /> Apply Changes
                            </Button>
                            <Button variant="secondary" className="w-full h-12 border-zinc-800 font-bold text-xs tracking-widest uppercase" onClick={() => fileInputRef.current?.click()}
                            >
                                <RefreshCw size={16} className="mr-2" /> New Image
                            </Button>
                        </div>
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                        const uploadedFile = e.target.files?.[0];
                        if (uploadedFile) {
                            const reader = new FileReader();
                            reader.onload = (re) => {
                                setFile({
                                    file: uploadedFile,
                                    previewUrl: re.target?.result as string,
                                    size: uploadedFile.size.toString(),
                                    type: uploadedFile.type
                                });
                            };
                            reader.readAsDataURL(uploadedFile);
                        }
                    }}
                />
            </aside>

            {/* 3. Preview Area */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner min-w-0 min-h-0`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div
                    ref={viewportRef}
                    className={`relative w-full h-full overflow-hidden flex items-center justify-center ${isHand ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    onWheel={handleWheel}
                    onMouseDown={(e) => handleMouseDown(e, 'bg')}
                >
                    {/* Viewport Toolbar */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-zinc-900/80 backdrop-blur border border-white/5 p-1 rounded-full shadow-2xl">
                        <button onClick={() => setIsPanMode(!isPanMode)} className={`p-2 rounded-full transition-colors ${isPanMode ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-white'}`}>
                            <Hand size={16} />
                        </button>
                        <div className="w-px h-3 bg-zinc-800 mx-1"></div>
                        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.2))} className="p-2 text-zinc-500 hover:text-white">
                            <ZoomOut size={16} />
                        </button>
                        <span className="text-[10px] font-mono text-zinc-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="p-2 text-zinc-500 hover:text-white">
                            <ZoomIn size={16} />
                        </button>
                        <div className="w-px h-3 bg-zinc-800 mx-1"></div>
                        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-2 text-zinc-500 hover:text-white">
                            <Undo2 size={16} />
                        </button>
                    </div>

                    <div
                        className="origin-center transition-transform duration-75 ease-out will-change-transform"
                        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                    >
                        <div
                            ref={containerRef}
                            className="relative shadow-2xl origin-center transition-transform duration-200 border border-dashed border-zinc-700/50"
                            style={{ transform: `rotate(${rotation}deg)` }}
                        >
                            {/* Image Dimensions Indicator */}
                            {imageDimensions.w > 0 && (
                                <div className="absolute -top-6 left-0 text-[10px] font-mono text-zinc-500 font-bold tracking-widest pointer-events-none uppercase">
                                    {imageDimensions.w} x {imageDimensions.h}px
                                </div>
                            )}
                            <img
                                ref={imageRef}
                                src={file.previewUrl}
                                alt="Crop target"
                                className="max-w-[90vw] max-h-[70vh] block object-contain pointer-events-none"
                                draggable={false}
                                onLoad={(e) => {
                                    if (viewportRef.current) {
                                        const img = e.currentTarget;
                                        setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });
                                        const vw = viewportRef.current.offsetWidth * 0.85;
                                        const vh = viewportRef.current.offsetHeight * 0.85;
                                        const scale = Math.min(vw / img.naturalWidth, vh / img.naturalHeight, 1);
                                        setZoom(scale);
                                    }
                                }}
                            />

                            {/* Crop UI */}
                            <div className="absolute inset-0 bg-black/60">
                                <div
                                    className={`absolute shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] ${isHand ? '' : 'cursor-move'}`}
                                    style={{
                                        left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%`,
                                        pointerEvents: isHand ? 'none' : 'auto', borderWidth: `${borderW}px`, borderColor: 'white', borderStyle: 'solid',
                                    }}
                                    onMouseDown={(e) => !isHand && handleMouseDown(e, 'move')}
                                >
                                    {/* Grids */}
                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className={`${i < 2 ? 'border-r' : 'border-t col-span-3'}`} style={{ borderColor: 'rgba(255,255,255,0.5)', borderWidth: `${0.5 * uiScale}px` }}></div>
                                        ))}
                                    </div>
                                    {!isHand && (
                                        <>
                                            <div className="cursor-nw-resize shadow-lg" style={handleStyle({ top: '0%', left: '0%' })} onMouseDown={(e) => handleMouseDown(e, 'nw')} />
                                            <div className="cursor-ne-resize shadow-lg" style={handleStyle({ top: '0%', left: '100%' })} onMouseDown={(e) => handleMouseDown(e, 'ne')} />
                                            <div className="cursor-sw-resize shadow-lg" style={handleStyle({ top: '100%', left: '0%' })} onMouseDown={(e) => handleMouseDown(e, 'sw')} />
                                            <div className="cursor-se-resize shadow-lg" style={handleStyle({ top: '100%', left: '100%' })} onMouseDown={(e) => handleMouseDown(e, 'se')} />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};