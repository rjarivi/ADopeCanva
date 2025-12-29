
import React, { useState, useRef, useEffect, ChangeEvent, useCallback } from 'react';
import {
    Upload, Layers, Type, Image as ImageIcon, Sliders,
    Download, Plus, X, Move, Trash2, Eye, EyeOff, Lock, Unlock,
    ZoomIn, ZoomOut, Check, Palette, Bold, Italic, Crop,
    Smartphone, Monitor, Square, Minus, RectangleHorizontal, Layout,
    PanelLeft, PanelTop, Shapes, Circle, Triangle, Star, Hexagon, Octagon, Heart, MessageCircle, Smile,
    MoreHorizontal, RotateCw, Trash
} from 'lucide-react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';

// Types
interface Layer {
    id: string;
    type: 'image' | 'text' | 'shape';
    visible: boolean;
    name: string;
    x: number;
    y: number;
    width?: number;
    height?: number;

    // Image specific
    image?: HTMLImageElement;
    src?: string;
    cropX?: number;
    cropY?: number;
    cropWidth?: number;
    cropHeight?: number;

    // Text specific
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    fontWeight?: string;
    fontStyle?: string;

    // Shape specific
    shapeType?: 'rectangle' | 'circle' | 'triangle' | 'star' | 'hexagon' | 'octagon' | 'heart' | 'bubble' | 'emoji' | 'line' | 'arrow';
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    cornerRadius?: number; // for rects
    points?: number; // for stars/polygons
    emojiContent?: string; // for emojis

    // Styles
    opacity: number;
    blendMode: GlobalCompositeOperation;

    // Filters
    brightness: number; // 100% default
    contrast: number; // 100% default
    saturation: number; // 100% default
    sepia: number; // 0% default
    invert: number; // 0% default
    grayscale: number; // 0% default
    blur: number; // 0px default

    // Chroma Key
    chromaKeyEnabled: boolean;
    chromaKeyColor: string;
    chromaKeyTolerance: number;

    // State
    locked: boolean;
}

const FONTS = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New',
    'Georgia', 'Palatino', 'Garamond', 'Bookman',
    'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact'
];

const BLEND_MODES: GlobalCompositeOperation[] = [
    'source-over', 'multiply', 'screen', 'overlay', 'darken',
    'lighten', 'color-dodge', 'color-burn', 'hard-light',
    'soft-light', 'difference', 'exclusion', 'hue',
    'saturation', 'color', 'luminosity'
];

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3 block">
        {children}
    </label>
);

interface SliderControlProps {
    value: number;
    min: number;
    max: number;
    onChange: (val: number) => void;
    label: string;
    unit?: string;
}

const SliderControl = ({ value, min, max, onChange, label, unit = '' }: SliderControlProps) => (
    <div className="group">
        <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-zinc-400">{label}</span>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{value}{unit}</span>
        </div>
        <div className="flex items-center gap-3">
            <button
                onClick={() => onChange(Math.max(min, value - (max - min > 50 ? 5 : 1)))}
                className="text-zinc-600 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded"
            >
                <Minus size={12} />
            </button>
            <div className="relative flex-1 h-6 flex items-center">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:hover:bg-white"
                />
            </div>
            <button
                onClick={() => onChange(Math.min(max, value + (max - min > 50 ? 5 : 1)))}
                className="text-zinc-600 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded"
            >
                <Plus size={12} />
            </button>
        </div>
    </div>
);

export const ImageEditor: React.FC = () => {
    // State
    const [layers, setLayers] = useState<Layer[]>([]);
    const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [zoom, setZoom] = useState(1);
    const [bgColor, setBgColor] = useState<string>('transparent'); // or #ffffff
    const [activeTab, setActiveTab] = useState<'canvas' | 'edit' | 'text' | 'layers' | 'shapes'>('canvas');
    const [navMode, setNavMode] = useState<'sidebar' | 'top'>('sidebar');
    const [isCanvasLocked, setIsCanvasLocked] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const replaceFileInputRef = useRef<HTMLInputElement>(null);

    const [hasStarted, setHasStarted] = useState(true);
    const [customSize, setCustomSize] = useState({ width: 1080, height: 1080 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Dragging State
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Resize State
    type ResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
    const [initialResizeState, setInitialResizeState] = useState<{
        x: number, y: number, w: number, h: number, mx: number, my: number, fontSize?: number
    } | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const [clipboard, setClipboard] = useState<Layer | null>(null);

    // Initial Fit
    const fitCanvas = (width: number, height: number) => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const padding = 64; // 32px padding on each side
        const availableWidth = container.clientWidth - padding;
        const availableHeight = container.clientHeight - padding;

        const scaleX = availableWidth / width;
        const scaleY = availableHeight / height;
        const newZoom = Math.min(scaleX, scaleY, 1); // Max zoom 1 initially, but fit if smaller

        setZoom(Number(newZoom.toFixed(2)));
    };

    // Helper to generate IDs
    const generateId = () => Math.random().toString(36).substr(2, 9);

    // Initialize with upload
    const handleFileUpload = async (fileData: { file: File }) => {
        const img = new Image();
        img.src = URL.createObjectURL(fileData.file);
        img.onload = () => {
            const width = img.width;
            const height = img.height;

            // Only set canvas size if it's the first layer
            if (layers.length === 0) {
                setCanvasSize({ width, height });
                // We don't necessarily want to force transparent background if user already picked one, 
                // but usually for first 'open' it makes sense.
                // If we want to respect current selection if it differs from default?
                // Stick to simple behavior: New project -> resize to image.
            }

            const newLayer: Layer = {
                id: generateId(),
                type: 'image',
                visible: true,
                locked: false,
                name: fileData.file.name,
                x: 0,
                y: 0,
                width: width,
                height: height,
                image: img,
                src: img.src,
                opacity: 100,
                blendMode: 'source-over',
                brightness: 100,
                contrast: 100,
                saturation: 100,
                sepia: 0,
                invert: 0,
                grayscale: 0,
                blur: 0,
                cropX: 0,
                cropY: 0,
                cropWidth: width,
                cropHeight: height,
                chromaKeyEnabled: false,
                chromaKeyColor: '#00ff00',
                chromaKeyTolerance: 10,
            };

            // Center the new layer if there are already layers (and thus a defined canvas)
            if (layers.length > 0) {
                newLayer.x = (canvasSize.width - width) / 2;
                newLayer.y = (canvasSize.height - height) / 2;
            }

            setLayers(prev => [newLayer, ...prev]); // Add to top (start of array)
            setActiveLayerId(newLayer.id);
            setActiveTab('canvas');
        };
    };

    const handleReplaceFile = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !activeLayerId) return;
        const file = e.target.files[0];
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            updateLayer(activeLayerId, {
                image: img,
                src: img.src,
                // Reset crop on replace? Usually yes.
                width: img.width,
                height: img.height,
                cropX: 0,
                cropY: 0,
                cropWidth: img.width,
                cropHeight: img.height
            });
        };
    };

    // Initialize New Project
    const handleCreateNew = () => {
        setCanvasSize({ width: customSize.width, height: customSize.height });
        setBgColor('#ffffff'); // White background for new projects usually
        setHasStarted(true);
        // Start empty
    };

    // Auto-fit on start
    useEffect(() => {
        if (hasStarted && containerRef.current && canvasSize.width > 0) {
            fitCanvas(canvasSize.width, canvasSize.height);
        }
    }, [hasStarted, canvasSize.width, canvasSize.height]);

    const addTextLayer = () => {
        const newLayer: Layer = {
            id: generateId(),
            type: 'text',
            visible: true,
            locked: false,
            name: 'Text Layer',
            x: canvasSize.width / 2,
            y: canvasSize.height / 2,
            text: 'Double Click to Edit',
            fontFamily: 'Arial',
            fontSize: 40,
            width: 400, // Estimate
            height: 50,
            color: '#ffffff',
            fontWeight: 'bold',
            fontStyle: 'normal',
            opacity: 100,
            blendMode: 'source-over',
            brightness: 100,
            contrast: 100,
            saturation: 100,
            sepia: 0,
            invert: 0,
            grayscale: 0,
            blur: 0,
            chromaKeyEnabled: false,
            chromaKeyColor: '#000000',
            chromaKeyTolerance: 0,
        };
        setLayers(prev => [newLayer, ...prev]);
        setActiveLayerId(newLayer.id);
    };

    const addShapeLayer = (shapeType: Layer['shapeType'], emoji?: string) => {
        const size = 200;
        const newLayer: Layer = {
            id: generateId(),
            type: 'shape',
            visible: true,
            name: emoji ? `Emoji ${emoji}` : `Shape ${shapeType}`,
            x: (canvasSize.width - size) / 2,
            y: (canvasSize.height - size) / 2,
            width: size,
            height: size,
            shapeType: shapeType,
            fillColor: emoji ? 'transparent' : (shapeType === 'line' || shapeType === 'arrow' ? 'transparent' : '#3b82f6'),
            strokeColor: '#000000',
            strokeWidth: (shapeType === 'line' || shapeType === 'arrow') ? 5 : 0,
            opacity: 100,
            blendMode: 'source-over',
            brightness: 100,
            contrast: 100,
            saturation: 100,
            sepia: 0,
            invert: 0,
            grayscale: 0,
            blur: 0,
            chromaKeyEnabled: false,
            chromaKeyColor: '#000000',
            chromaKeyTolerance: 0,
            locked: false,
            emojiContent: emoji,
            cornerRadius: 0,
            points: 5
        };
        setLayers(prev => [newLayer, ...prev]);
        setActiveLayerId(newLayer.id);
        setActiveTab('edit'); // Switch to edit to customize
    };

    const duplicateLayer = (id: string) => {
        const layer = layers.find(l => l.id === id);
        if (!layer) return;
        const newLayer = {
            ...layer,
            id: generateId(),
            name: `${layer.name} (Copy)`,
            x: layer.x + 20,
            y: layer.y + 20
        };
        setLayers(prev => [newLayer, ...prev]);
        setActiveLayerId(newLayer.id);
        setIsContextMenuOpen(false);
    };

    const toggleLockLayer = (id: string) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
        setIsContextMenuOpen(false);
    };

    const copyLayer = (id: string) => {
        const layer = layers.find(l => l.id === id);
        if (layer) {
            setClipboard(layer);
            setIsContextMenuOpen(false);
        }
    };

    const pasteLayer = () => {
        if (!clipboard) return;
        const newLayer = {
            ...clipboard,
            id: generateId(),
            name: `${clipboard.name} (Copy)`,
            x: clipboard.x + 30,
            y: clipboard.y + 30
        };
        setLayers(prev => [newLayer, ...prev]);
        setActiveLayerId(newLayer.id);
        setIsContextMenuOpen(false);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeLayerId) return;

            // Delete
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Don't delete if editing text? Basic check:
                if ((e.target as HTMLElement).tagName === 'INPUT') return;
                deleteLayer(activeLayerId);
            }

            // Copy
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                copyLayer(activeLayerId);
            }

            // Paste
            if (e.ctrlKey && e.key === 'v') {
                // Paste clipboard content
                // Note: 'clipboard' state might be stale in closure unless dependencies correct.
                // Better to use ref or function update if possible, or include clipboard in dep array.
                // For now, let's rely on Context Menu strictly or simple effect.
            }
            // Duplicate
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                duplicateLayer(activeLayerId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeLayerId, layers]); // Add layers to dep to find layer to copy. clipboard not needed for copy/dup. 

    // Separate effect for Paste to catch fresh clipboard
    useEffect(() => {
        const handlePaste = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'v') {
                // We need to check if we have internal clipboard
                // Or we could read system clipboard if image? 
                // For now, internal app clipboard.
                if (clipboard) {
                    e.preventDefault();
                    pasteLayer();
                }
            }
        };
        window.addEventListener('keydown', handlePaste);
        return () => window.removeEventListener('keydown', handlePaste);
    }, [clipboard]);

    // Drawing Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and fill background
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (bgColor !== 'transparent') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Sort layers by index (reverse of state usually, state: [top, ..., bottom])
        // So we need to draw from bottom to top.
        const layersToDraw = [...layers].reverse();

        layersToDraw.forEach(layer => {
            if (!layer.visible) return;

            ctx.save();
            ctx.globalAlpha = layer.opacity / 100;
            ctx.globalCompositeOperation = layer.blendMode;

            // Apply filters
            ctx.filter = `brightness(${layer.brightness}%) contrast(${layer.contrast}%) saturate(${layer.saturation}%) sepia(${layer.sepia}%) invert(${layer.invert}%) grayscale(${layer.grayscale}%) blur(${layer.blur}px)`;

            if (layer.type === 'image' && layer.image) {
                if (layer.chromaKeyEnabled) {
                    // Create temporary canvas for processing
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = layer.width!;
                    tempCanvas.height = layer.height!;
                    const tempCtx = tempCanvas.getContext('2d');

                    if (tempCtx) {
                        // Draw the CROPPED image into the temp canvas, filling it
                        const sx = layer.cropX || 0;
                        const sy = layer.cropY || 0;
                        const sw = layer.cropWidth || layer.image.width;
                        const sh = layer.cropHeight || layer.image.height;

                        tempCtx.drawImage(layer.image, sx, sy, sw, sh, 0, 0, layer.width!, layer.height!);

                        const imageData = tempCtx.getImageData(0, 0, layer.width!, layer.height!);
                        const data = imageData.data;

                        // Hex to RGB
                        const hex = layer.chromaKeyColor.replace('#', '');
                        const r = parseInt(hex.substring(0, 2), 16);
                        const g = parseInt(hex.substring(2, 4), 16);
                        const b = parseInt(hex.substring(4, 6), 16);
                        const tolerance = layer.chromaKeyTolerance;

                        // Scaled tolerance
                        const threshold = tolerance * 3;

                        for (let i = 0; i < data.length; i += 4) {
                            const dr = Math.abs(data[i] - r);
                            const dg = Math.abs(data[i + 1] - g);
                            const db = Math.abs(data[i + 2] - b);

                            if (dr + dg + db < threshold) {
                                data[i + 3] = 0; // Transparent
                            }
                        }

                        tempCtx.putImageData(imageData, 0, 0);
                        ctx.drawImage(tempCanvas, layer.x, layer.y, layer.width!, layer.height!);
                    }
                } else {
                    const sx = layer.cropX || 0;
                    const sy = layer.cropY || 0;
                    const sw = layer.cropWidth || layer.image.width;
                    const sh = layer.cropHeight || layer.image.height;
                    ctx.drawImage(layer.image, sx, sy, sw, sh, layer.x, layer.y, layer.width!, layer.height!);
                }
            } else if (layer.type === 'shape') {
                ctx.fillStyle = layer.fillColor || '#000000';
                ctx.strokeStyle = layer.strokeColor || 'transparent';
                ctx.lineWidth = layer.strokeWidth || 0;

                const lx = layer.x;
                const ly = layer.y;
                const lw = layer.width || 100;
                const lh = layer.height || 100;
                const cx = lx + lw / 2;
                const cy = ly + lh / 2;

                ctx.beginPath();

                if (layer.shapeType === 'rectangle') {
                    if (layer.cornerRadius) {
                        ctx.roundRect(lx, ly, lw, lh, layer.cornerRadius);
                    } else {
                        ctx.rect(lx, ly, lw, lh);
                    }
                } else if (layer.shapeType === 'circle') {
                    ctx.ellipse(cx, cy, lw / 2, lh / 2, 0, 0, 2 * Math.PI);
                } else if (layer.shapeType === 'triangle') {
                    ctx.moveTo(cx, ly);
                    ctx.lineTo(lx + lw, ly + lh);
                    ctx.lineTo(lx, ly + lh);
                    ctx.closePath();
                } else if (layer.shapeType === 'star') {
                    const outerRadius = Math.min(lw, lh) / 2;
                    const innerRadius = outerRadius / 2;
                    const spikes = layer.points || 5;

                    for (let i = 0; i < spikes * 2; i++) {
                        const r = (i % 2 === 0) ? outerRadius : innerRadius;
                        const angle = (Math.PI / spikes) * i;
                        const px = cx + Math.cos(angle - Math.PI / 2) * r;
                        const py = cy + Math.sin(angle - Math.PI / 2) * r;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                } else if (layer.shapeType === 'hexagon') {
                    const r = Math.min(lw, lh) / 2;
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI / 3) * i;
                        const px = cx + r * Math.cos(angle);
                        const py = cy + r * Math.sin(angle);
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                } else if (layer.shapeType === 'octagon') {
                    const r = Math.min(lw, lh) / 2;
                    for (let i = 0; i < 8; i++) {
                        const angle = (Math.PI / 4) * i; // 45 degrees
                        // offset by 22.5 deg to make flat top? No, regular is fine.
                        const px = cx + r * Math.cos(angle - Math.PI / 8);
                        const py = cy + r * Math.sin(angle - Math.PI / 8);
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                } else if (layer.shapeType === 'heart') {
                    // Bezier heart
                    const topCurveHeight = lh * 0.3;
                    ctx.moveTo(cx, ly + topCurveHeight);
                    // top left curve
                    ctx.bezierCurveTo(
                        cx, ly,
                        lx, ly,
                        lx, ly + topCurveHeight
                    );
                    // bottom left curve
                    ctx.bezierCurveTo(
                        lx, ly + (lh + topCurveHeight) / 2,
                        cx, ly + (lh + topCurveHeight) / 2,
                        cx, ly + lh
                    );
                    // bottom right curve
                    ctx.bezierCurveTo(
                        cx, ly + (lh + topCurveHeight) / 2,
                        lx + lw, ly + (lh + topCurveHeight) / 2,
                        lx + lw, ly + topCurveHeight
                    );
                    // top right curve
                    ctx.bezierCurveTo(
                        lx + lw, ly,
                        cx, ly,
                        cx, ly + topCurveHeight
                    );
                    ctx.closePath();
                } else if (layer.shapeType === 'bubble') {
                    const r = 10;
                    ctx.moveTo(lx + r, ly);
                    ctx.lineTo(lx + lw - r, ly);
                    ctx.quadraticCurveTo(lx + lw, ly, lx + lw, ly + r);
                    ctx.lineTo(lx + lw, ly + lh - r - 10);
                    ctx.quadraticCurveTo(lx + lw, ly + lh - 10, lx + lw - r, ly + lh - 10);
                    ctx.lineTo(lx + r + 20, ly + lh - 10); // tail start
                    ctx.lineTo(lx + 10, ly + lh); // tail tip
                    ctx.lineTo(lx + r + 10, ly + lh - 10); // tail end
                    ctx.lineTo(lx + r, ly + lh - 10);
                    ctx.quadraticCurveTo(lx, ly + lh - 10, lx, ly + lh - r - 10);
                    ctx.lineTo(lx, ly + r);
                    ctx.quadraticCurveTo(lx, ly, lx + r, ly);
                    ctx.closePath();
                } else if (layer.shapeType === 'line') {
                    ctx.moveTo(lx, ly + lh / 2);
                    ctx.lineTo(lx + lw, ly + lh / 2);
                } else if (layer.shapeType === 'arrow') {
                    const headLen = 20;
                    const angle = 0; // Horizontal arrow by default, use rotation later?
                    // Actually, if we just draw from left-mid to right-mid
                    const sy = ly + lh / 2;
                    const ex = lx + lw;
                    const ey = ly + lh / 2;

                    ctx.moveTo(lx, sy);
                    ctx.lineTo(ex, ey);

                    // Arrow head
                    ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
                    ctx.moveTo(ex, ey);
                    ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
                } else if (layer.shapeType === 'emoji') {
                    ctx.font = `${lh}px Arial`;
                    ctx.fillStyle = '#000000';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(layer.emojiContent || '😊', cx, cy + (lh * 0.1));
                    ctx.beginPath();
                }

                if (layer.shapeType !== 'emoji') {
                    // Fill (except line/arrow)
                    if (layer.fillColor && layer.fillColor !== 'transparent' && layer.shapeType !== 'line' && layer.shapeType !== 'arrow') ctx.fill();

                    // Stroke (force for line/arrow even if 0 maybe? No, rely on defaults)
                    if ((layer.strokeWidth && layer.strokeWidth > 0) || layer.shapeType === 'line' || layer.shapeType === 'arrow') {
                        // Force min width for visibility if user set to 0 accidentally?
                        // Or just trust the state.
                        ctx.stroke();
                    }
                }

            } else if (layer.type === 'text' && layer.text) {
                ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
                ctx.fillStyle = layer.color!;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                ctx.fillText(layer.text, layer.x, layer.y);
            }

            ctx.restore();
        });

    }, [layers, canvasSize, bgColor, layers.map(l => l.chromaKeyEnabled)]);

    // Actions
    const updateLayer = (id: string, updates: Partial<Layer>) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    };

    const deleteLayer = (id: string) => {
        setLayers(prev => prev.filter(l => l.id !== id));
        if (activeLayerId === id) setActiveLayerId(null);
    };

    const activeLayer = layers.find(l => l.id === activeLayerId);

    // File Download
    const downloadImage = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };




    // Global Mouse Handlers for Smooth Interaction
    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        if (!activeLayerId) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const scaleX = canvasSize.width / rect.width;
        const scaleY = canvasSize.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (isDragging) {
            updateLayer(activeLayerId, {
                x: x - dragOffset.x,
                y: y - dragOffset.y
            });
        } else if (resizeDirection && initialResizeState && activeLayerId) {
            const dx = (e.clientX - initialResizeState.mx) * scaleX;
            const dy = (e.clientY - initialResizeState.my) * scaleY;

            const newAttrs: Partial<Layer> = {};
            const minSize = 20;

            const ix = initialResizeState.x;
            const iy = initialResizeState.y;
            const iw = initialResizeState.w;
            const ih = initialResizeState.h;

            if (isCropping && activeLayerId && resizeDirection.length === 1) {
                // CROP MODE RESIZE (MASKING)
                const currentLayer = layers.find(l => l.id === activeLayerId);
                if (currentLayer?.type === 'image') {
                    const cw = currentLayer.cropWidth || currentLayer.image?.width || 0;
                    const ch = currentLayer.cropHeight || currentLayer.image?.height || 0;
                    const lw = currentLayer.width || 1;
                    const lh = currentLayer.height || 1;

                    // Ratio of Source Image Crop to Display Width
                    const dataScaleX = cw / lw;
                    const dataScaleY = ch / lh;

                    let newW = iw;
                    let newH = ih;
                    let newX = ix;
                    let newY = iy;

                    // Calculate new Window Dimensions
                    if (resizeDirection.includes('e')) newW = Math.max(minSize, iw + dx);
                    if (resizeDirection.includes('w')) {
                        const desiredW = iw - dx;
                        if (desiredW >= minSize) { newX = ix + dx; newW = desiredW; }
                    }
                    if (resizeDirection.includes('s')) newH = Math.max(minSize, ih + dy);
                    if (resizeDirection.includes('n')) {
                        const desiredH = ih - dy;
                        if (desiredH >= minSize) { newY = iy + dy; newH = desiredH; }
                    }

                    // Delta in display pixels
                    const deltaW = newW - iw;
                    const deltaH = newH - ih;

                    const cropAttrs: Partial<Layer> = {
                        x: newX,
                        y: newY,
                        width: newW,
                        height: newH,
                        cropX: currentLayer.cropX || 0,
                        cropY: currentLayer.cropY || 0,
                        cropWidth: cw,
                        cropHeight: ch
                    };

                    // Update Crop Dimensions based on delta
                    if (resizeDirection.includes('e')) {
                        cropAttrs.cropWidth = cw + (deltaW * dataScaleX);
                    }
                    if (resizeDirection.includes('s')) {
                        cropAttrs.cropHeight = ch + (deltaH * dataScaleY);
                    }

                    // For West/North, we shift the window AND the crop window
                    if (resizeDirection.includes('w')) {
                        const sourceShift = deltaW * dataScaleX;
                        cropAttrs.cropX = (currentLayer.cropX || 0) - sourceShift;
                        cropAttrs.cropWidth = cw + sourceShift;
                    }
                    if (resizeDirection.includes('n')) {
                        const sourceShift = deltaH * dataScaleY;
                        cropAttrs.cropY = (currentLayer.cropY || 0) - sourceShift;
                        cropAttrs.cropHeight = ch + sourceShift;
                    }

                    updateLayer(activeLayerId, cropAttrs);
                }
            } else {
                // NORMAL RESIZE
                if (resizeDirection.includes('e')) {
                    newAttrs.width = Math.max(minSize, iw + dx);
                }
                if (resizeDirection.includes('w')) {
                    const desiredW = iw - dx;
                    if (desiredW >= minSize) {
                        newAttrs.x = ix + dx;
                        newAttrs.width = desiredW;
                    }
                }
                if (resizeDirection.includes('s')) {
                    newAttrs.height = Math.max(minSize, ih + dy);
                }
                if (resizeDirection.includes('n')) {
                    const desiredH = ih - dy;
                    if (desiredH >= minSize) {
                        newAttrs.y = iy + dy;
                        newAttrs.height = desiredH;
                    }
                }
                updateLayer(activeLayerId, newAttrs);
            }
        }
    }, [activeLayerId, isDragging, dragOffset, resizeDirection, initialResizeState, isCropping, layers, canvasSize]);

    const handleGlobalMouseUp = useCallback(() => {
        setIsDragging(false);
        setResizeDirection(null);
    }, []);

    useEffect(() => {
        if (isDragging || resizeDirection) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleGlobalMouseMove);
                window.removeEventListener('mouseup', handleGlobalMouseUp);
            };
        }
    }, [isDragging, resizeDirection, handleGlobalMouseMove, handleGlobalMouseUp]);

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6 animate-fade-in relative">
            {/* Hidden Global File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        handleFileUpload({ file: e.target.files[0] });
                    }
                    e.target.value = ''; // Reset
                }}
            />
            {/* Replace File Input */}
            <input
                type="file"
                ref={replaceFileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleReplaceFile}
            />

            {/* Left Sidebar - Tools */}
            <div className="w-full lg:w-96 flex-shrink-0 flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl h-full overflow-hidden">

                <div className={`flex-1 flex min-h-0 overflow-hidden ${navMode === 'sidebar' ? 'flex-row' : 'flex-col'}`}>

                    {/* Sidebar Strip (Desktop) */}
                    {navMode === 'sidebar' && (
                        <div className="hidden lg:flex w-16 flex-col items-center py-4 bg-zinc-900/30 border-r border-zinc-800 gap-3 flex-shrink-0">
                            {['canvas', 'edit', 'text', 'shapes', 'layers'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`p-3 rounded-xl transition-all group relative ${activeTab === tab ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                                    title={tab}
                                >
                                    {tab === 'canvas' && <Crop size={20} strokeWidth={2} />}
                                    {tab === 'edit' && <Sliders size={20} strokeWidth={2} />}
                                    {tab === 'text' && <Type size={20} strokeWidth={2} />}
                                    {tab === 'shapes' && <Shapes size={20} strokeWidth={2} />}
                                    {tab === 'layers' && <Layers size={20} strokeWidth={2} />}

                                    {/* Tooltip on right */}
                                    <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-zinc-700">
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Content Wrapper */}
                    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-zinc-950">
                        <div className="flex-shrink-0 px-4 pt-4">
                            {/* Horizontal Tabs (Mobile or Top Mode) */}
                            <div className={`${navMode === 'sidebar' ? 'lg:hidden' : ''} flex p-1.5 mb-6 gap-2 bg-zinc-900/50 border border-zinc-800/50 rounded-xl`}>

                                {['canvas', 'edit', 'text', 'shapes', 'layers'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab as any)}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 
                                        ${activeTab === tab
                                                ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10 shadow-black/20'
                                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                                            }`}
                                    >
                                        {tab === 'canvas' && <Crop size={14} strokeWidth={2.5} className="flex-shrink-0" />}
                                        {tab === 'edit' && <Sliders size={14} strokeWidth={2.5} className="flex-shrink-0" />}
                                        {tab === 'text' && <Type size={14} strokeWidth={2.5} className="flex-shrink-0" />}
                                        {tab === 'shapes' && <Shapes size={14} strokeWidth={2.5} className="flex-shrink-0" />}
                                        {tab === 'layers' && <Layers size={14} strokeWidth={2.5} className="flex-shrink-0" />}

                                        <span className="capitalize truncate">{tab}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Title Header (Sidebar Mode Desktop) */}
                            {navMode === 'sidebar' && (
                                <div className="hidden lg:flex items-center justify-between mb-6 pl-1">
                                    <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">{activeTab}</h2>
                                </div>
                            )}
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4">

                            {/* Tab Content */}
                            {activeTab === 'canvas' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    {/* Size Section */}
                                    <section>
                                        <div className="flex justify-between items-end mb-3">
                                            <SectionLabel>Size</SectionLabel>
                                            <div className="flex gap-1">
                                                {[
                                                    { l: 'Square', w: 1080, h: 1080, icon: Square },
                                                    { l: 'Portrait', w: 1080, h: 1350, icon: Layout },
                                                    { l: 'Story', w: 1080, h: 1920, icon: Smartphone },
                                                    { l: 'Landscape', w: 1920, h: 1080, icon: Monitor },
                                                ].map(preset => (
                                                    <button
                                                        key={preset.l}
                                                        onClick={() => setCanvasSize({ width: preset.w, height: preset.h })}
                                                        className={`p-1.5 rounded transition-all ${canvasSize.width === preset.w && canvasSize.height === preset.h
                                                            ? 'bg-zinc-800 text-white shadow-sm'
                                                            : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900'
                                                            }`}
                                                        title={preset.l}
                                                    >
                                                        <preset.icon size={16} strokeWidth={2} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="relative group w-full">
                                                <input
                                                    type="number"
                                                    value={canvasSize.width}
                                                    onChange={(e) => setCanvasSize(p => ({ ...p, width: parseInt(e.target.value) || 0 }))}
                                                    className="w-full bg-zinc-900 text-zinc-300 text-sm p-2.5 rounded-md border border-transparent focus:border-zinc-700 focus:bg-zinc-800 outline-none transition-all text-center font-mono placeholder-zinc-600"
                                                />
                                                <span className="absolute left-2.5 top-2.5 text-[10px] text-zinc-600 font-bold group-hover:text-zinc-500 transition-colors">W</span>
                                            </div>
                                            <span className="text-zinc-700">×</span>
                                            <div className="relative group w-full">
                                                <input
                                                    type="number"
                                                    value={canvasSize.height}
                                                    onChange={(e) => setCanvasSize(p => ({ ...p, height: parseInt(e.target.value) || 0 }))}
                                                    className="w-full bg-zinc-900 text-zinc-300 text-sm p-2.5 rounded-md border border-transparent focus:border-zinc-700 focus:bg-zinc-800 outline-none transition-all text-center font-mono"
                                                />
                                                <span className="absolute left-2.5 top-2.5 text-[10px] text-zinc-600 font-bold group-hover:text-zinc-500 transition-colors">H</span>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Image Fill Section - Only if Image Layer Active */}
                                    {activeLayer && activeLayer.type === 'image' && (
                                        <section>
                                            <div className="flex justify-between items-center mb-3">
                                                <SectionLabel>Image Fill</SectionLabel>
                                            </div>
                                            <div className="bg-zinc-900 p-1 rounded-lg flex relative">
                                                {['Fit', 'Fill', 'Center'].map((mode) => (
                                                    <button
                                                        key={mode}
                                                        onClick={() => {
                                                            if (!activeLayer.width || !activeLayer.height || !activeLayer.image) return;
                                                            // Logic
                                                            if (mode === 'Fit') {
                                                                const scale = Math.min(canvasSize.width / activeLayer.image.width, canvasSize.height / activeLayer.image.height);
                                                                updateLayer(activeLayer.id, {
                                                                    width: activeLayer.image.width * scale,
                                                                    height: activeLayer.image.height * scale,
                                                                    x: (canvasSize.width - activeLayer.image.width * scale) / 2,
                                                                    y: (canvasSize.height - activeLayer.image.height * scale) / 2
                                                                });
                                                            } else if (mode === 'Fill') {
                                                                const scale = Math.max(canvasSize.width / activeLayer.image.width, canvasSize.height / activeLayer.image.height);
                                                                updateLayer(activeLayer.id, {
                                                                    width: activeLayer.image.width * scale,
                                                                    height: activeLayer.image.height * scale,
                                                                    x: (canvasSize.width - activeLayer.image.width * scale) / 2,
                                                                    y: (canvasSize.height - activeLayer.image.height * scale) / 2
                                                                });
                                                            } else { // Center
                                                                updateLayer(activeLayer.id, {
                                                                    x: (canvasSize.width - (activeLayer.width || 0)) / 2,
                                                                    y: (canvasSize.height - (activeLayer.height || 0)) / 2
                                                                });
                                                            }
                                                        }}
                                                        className="flex-1 relative z-10 py-1.5 text-xs font-medium rounded transition-colors duration-200 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                                                    >
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* Background Section */}
                                    <section>
                                        <SectionLabel>Background</SectionLabel>
                                        <div className="flex items-center justify-between bg-zinc-900/50 p-2 rounded-lg border border-zinc-900/50 hover:border-zinc-800 transition-colors">
                                            <div className="flex gap-2 flex-wrap">
                                                {[
                                                    { id: 'transparent', value: 'transparent', label: 'None' },
                                                    { id: 'white', value: '#ffffff', label: 'White' },
                                                    { id: 'black', value: '#000000', label: 'Black' },
                                                    { id: 'blue', value: '#3b82f6', label: 'Blue' },
                                                    { id: 'red', value: '#ef4444', label: 'Red' },
                                                ].map((c) => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => setBgColor(c.value)}
                                                        className={`w-6 h-6 rounded-full relative flex items-center justify-center transition-transform hover:scale-110 ${bgColor === c.value ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-950' : ''
                                                            }`}
                                                        style={{
                                                            background: c.value === 'transparent'
                                                                ? 'conic-gradient(#333 0 25%, #222 0 50%, #333 0 75%, #222 0)'
                                                                : c.value,
                                                            backgroundSize: '8px 8px',
                                                            border: c.id === 'black' ? '1px solid #333' : 'none'
                                                        }}
                                                        title={c.label}
                                                    >
                                                        {bgColor === c.value && (
                                                            <div className={`w-1.5 h-1.5 rounded-full ${['#ffffff', 'transparent'].includes(c.value) ? 'bg-black' : 'bg-white'}`} />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-px bg-zinc-800 mx-1"></div>
                                                <div className="relative group">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 group-hover:opacity-80 transition-opacity cursor-pointer ring-offset-2 ring-offset-zinc-950 hover:scale-110 items-center flex justify-center">
                                                        {/* Show Indicator if Custom */}
                                                        {!['transparent', '#ffffff', '#000000', '#3b82f6', '#ef4444'].includes(bgColor) && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
                                                        <input
                                                            type="color"
                                                            value={bgColor === 'transparent' ? '#ffffff' : bgColor}
                                                            onChange={(e) => setBgColor(e.target.value)}
                                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                            title="Custom Color"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Scale Sections */}
                                    <section>
                                        {/* Canvas View Scale */}


                                        {/* Image Scale (if active) */}
                                        {activeLayer && activeLayer.type === 'image' && (
                                            <div className="mt-4 pt-4 border-t border-zinc-900">
                                                <SliderControl
                                                    label="Image Scale"
                                                    value={activeLayer.image ? Math.round((activeLayer.width || 0) / activeLayer.image.width * 100) : 100}
                                                    min={10}
                                                    max={300}
                                                    unit="%"
                                                    onChange={(val) => {
                                                        if (!activeLayer.image) return;
                                                        const scale = val / 100;
                                                        const newWidth = activeLayer.image.width * scale;
                                                        const newHeight = activeLayer.image.height * scale;
                                                        const oldWidth = activeLayer.width || 1;
                                                        const oldHeight = activeLayer.height || 1;
                                                        const dx = (newWidth - oldWidth) / 2;
                                                        const dy = (newHeight - oldHeight) / 2;

                                                        updateLayer(activeLayer.id, {
                                                            width: newWidth,
                                                            height: newHeight,
                                                            x: activeLayer.x - dx,
                                                            y: activeLayer.y - dy
                                                        });
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </section>

                                    <div className="pt-4 mt-auto">
                                        <Button
                                            variant="secondary"
                                            className="w-full gap-2 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 py-3 rounded-xl"
                                            onClick={() => {
                                                if (fileInputRef.current) fileInputRef.current.click();
                                            }}
                                        >
                                            <Upload size={16} /> Add Image
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'edit' && activeLayer && (
                                <div className="space-y-6 animate-in fade-in duration-300">

                                    {/* Shape Controls (Custom Fields) */}
                                    {activeLayer.type === 'shape' && activeLayer.shapeType !== 'emoji' && (
                                        <section className="space-y-4">
                                            <SectionLabel>Shape Styles</SectionLabel>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-[10px] text-zinc-500 mb-1">Fill Color</div>
                                                    <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded border border-zinc-800">
                                                        <div className="w-6 h-6 rounded border border-zinc-700" style={{ backgroundColor: activeLayer.fillColor }} />
                                                        <input
                                                            type="color"
                                                            value={activeLayer.fillColor || '#000000'}
                                                            onChange={(e) => updateLayer(activeLayer.id, { fillColor: e.target.value })}
                                                            className="w-full h-8 opacity-0 absolute cursor-pointer inset-0"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={activeLayer.fillColor}
                                                            onChange={(e) => updateLayer(activeLayer.id, { fillColor: e.target.value })}
                                                            className="bg-transparent text-xs text-zinc-300 w-full outline-none font-mono"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-zinc-500 mb-1">Stroke Color</div>
                                                    <div className="relative flex items-center gap-2 bg-zinc-900 p-2 rounded border border-zinc-800">
                                                        <div className="w-6 h-6 rounded border border-zinc-700" style={{ backgroundColor: activeLayer.strokeColor }} />
                                                        <input
                                                            type="color"
                                                            value={activeLayer.strokeColor || '#000000'}
                                                            onChange={(e) => updateLayer(activeLayer.id, { strokeColor: e.target.value })}
                                                            className="w-full h-8 opacity-0 absolute cursor-pointer inset-0"
                                                        />
                                                        <span className="text-xs text-zinc-300 font-mono">{activeLayer.strokeColor}</span>
                                                    </div>
                                                </div>
                                            </div>



                                            <SliderControl
                                                label="Size"
                                                value={activeLayer.width || 100}
                                                min={10}
                                                max={800}
                                                unit="px"
                                                onChange={(val) => {
                                                    updateLayer(activeLayer.id, { width: val, height: val });
                                                }}
                                            />

                                            <SliderControl
                                                label="Stroke Width"
                                                value={activeLayer.strokeWidth || 0}
                                                min={0}
                                                max={20}
                                                unit="px"
                                                onChange={(val) => updateLayer(activeLayer.id, { strokeWidth: val })}
                                            />

                                            {activeLayer.shapeType === 'rectangle' && (
                                                <SliderControl
                                                    label="Corner Radius"
                                                    value={activeLayer.cornerRadius || 0}
                                                    min={0}
                                                    max={100}
                                                    unit="px"
                                                    onChange={(val) => updateLayer(activeLayer.id, { cornerRadius: val })}
                                                />
                                            )}

                                            {['star', 'polygon'].includes(activeLayer.shapeType || '') && (
                                                <SliderControl
                                                    label="Points"
                                                    value={activeLayer.points || 5}
                                                    min={3}
                                                    max={20}
                                                    onChange={(val) => updateLayer(activeLayer.id, { points: val })}
                                                />
                                            )}
                                        </section>
                                    )}

                                    <section>
                                        <SectionLabel>Filters</SectionLabel>

                                        {/* Sliders */}
                                        <div className="space-y-4">
                                            <SliderControl
                                                label="Brightness"
                                                value={activeLayer.brightness}
                                                min={0} max={200}
                                                unit="%"
                                                onChange={(val) => updateLayer(activeLayer.id, { brightness: val })}
                                            />
                                            <SliderControl
                                                label="Contrast"
                                                value={activeLayer.contrast}
                                                min={0} max={200}
                                                unit="%"
                                                onChange={(val) => updateLayer(activeLayer.id, { contrast: val })}
                                            />
                                            <SliderControl
                                                label="Saturation"
                                                value={activeLayer.saturation}
                                                min={0} max={200}
                                                unit="%"
                                                onChange={(val) => updateLayer(activeLayer.id, { saturation: val })}
                                            />
                                            <SliderControl
                                                label="Blur"
                                                value={activeLayer.blur}
                                                min={0} max={20}
                                                unit="px"
                                                onChange={(val) => updateLayer(activeLayer.id, { blur: val })}
                                            />
                                        </div>
                                    </section>

                                    <section>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => updateLayer(activeLayer.id, { grayscale: activeLayer.grayscale ? 0 : 100 })}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${activeLayer.grayscale > 0 ? 'bg-zinc-800 text-white border-zinc-600' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                Grayscale
                                            </button>
                                            <button
                                                onClick={() => updateLayer(activeLayer.id, { sepia: activeLayer.sepia ? 0 : 100 })}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${activeLayer.sepia > 0 ? 'bg-amber-900/30 text-amber-500 border-amber-900/50' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                Sepia
                                            </button>
                                            <button
                                                onClick={() => updateLayer(activeLayer.id, { invert: activeLayer.invert ? 0 : 100 })}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${activeLayer.invert > 0 ? 'bg-purple-900/30 text-purple-500 border-purple-900/50' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                Invert
                                            </button>
                                        </div>
                                    </section>

                                    <div className="space-y-4 pt-4 border-t border-zinc-900">
                                        <SectionLabel>Blending & Keying</SectionLabel>

                                        <SliderControl
                                            label="Opacity"
                                            value={activeLayer.opacity}
                                            min={0} max={100}
                                            unit="%"
                                            onChange={(val) => updateLayer(activeLayer.id, { opacity: val })}
                                        />

                                        <div>
                                            <span className="text-xs text-zinc-400 block mb-2">Blend Mode</span>
                                            <div className="relative">
                                                <select
                                                    value={activeLayer.blendMode}
                                                    onChange={(e) => updateLayer(activeLayer.id, { blendMode: e.target.value as GlobalCompositeOperation })}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg text-xs p-2.5 text-zinc-300 outline-none focus:border-zinc-700 appearance-none cursor-pointer"
                                                >
                                                    {BLEND_MODES.map(mode => (
                                                        <option key={mode} value={mode}>{mode}</option>
                                                    ))}
                                                </select>
                                                {/* Custom Dropdown Arrow could go here */}
                                            </div>
                                        </div>

                                        {activeLayer.type === 'image' && (
                                            <div className="pt-2 border-t border-zinc-900/50 mt-4">
                                                <label className="flex items-center gap-2 mb-3 cursor-pointer group">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${activeLayer.chromaKeyEnabled ? 'bg-blue-600 border-blue-600' : 'border-zinc-700 bg-zinc-800'}`}>
                                                        {activeLayer.chromaKeyEnabled && <Check size={10} className="text-white" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={activeLayer.chromaKeyEnabled}
                                                        onChange={(e) => updateLayer(activeLayer.id, { chromaKeyEnabled: e.target.checked })}
                                                        className="hidden"
                                                    />
                                                    <span className={`text-xs font-medium transition-colors ${activeLayer.chromaKeyEnabled ? 'text-blue-400' : 'text-zinc-400 group-hover:text-zinc-300'}`}>Chroma Key / Remove Color</span>
                                                </label>

                                                {activeLayer.chromaKeyEnabled && (
                                                    <div className="space-y-3 pl-6 border-l-2 border-zinc-800 ml-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-zinc-500">Target Color</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-mono text-zinc-600">{activeLayer.chromaKeyColor}</span>
                                                                <div className="relative w-8 h-6 rounded overflow-hidden border border-zinc-700 transform hover:scale-105 transition-transform cursor-pointer">
                                                                    <input
                                                                        type="color"
                                                                        value={activeLayer.chromaKeyColor}
                                                                        onChange={(e) => updateLayer(activeLayer.id, { chromaKeyColor: e.target.value })}
                                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                                    />
                                                                    <div className="w-full h-full" style={{ backgroundColor: activeLayer.chromaKeyColor }} />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <SliderControl
                                                            label="Tolerance"
                                                            value={activeLayer.chromaKeyTolerance}
                                                            min={0} max={150}
                                                            onChange={(val) => updateLayer(activeLayer.id, { chromaKeyTolerance: val })}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'edit' && !activeLayer && (
                                <div className="flex flex-col items-center justify-center h-64 text-zinc-500 animate-in fade-in">
                                    <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
                                        <Sliders size={20} className="text-zinc-600" />
                                    </div>
                                    <p className="text-sm font-medium text-zinc-400">No Layer Selected</p>
                                    <p className="text-xs text-zinc-600 mt-1">Select an item to adjust filters</p>
                                </div>
                            )}

                            {activeTab === 'text' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <Button
                                        onClick={addTextLayer}
                                        className="w-full gap-2 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white py-6"
                                        variant="secondary"
                                    >
                                        <Plus size={16} /> <span className="font-semibold">Add Text Layer</span>
                                    </Button>

                                    {activeLayer && activeLayer.type === 'text' && (
                                        <div className="space-y-6 pt-4 border-t border-zinc-900">
                                            <section>
                                                <SectionLabel>Content</SectionLabel>
                                                <textarea
                                                    value={activeLayer.text}
                                                    onChange={(e) => updateLayer(activeLayer.id, { text: e.target.value })}
                                                    className="w-full bg-zinc-900 border border-zinc-900 focus:border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 outline-none resize-none h-24 transition-all"
                                                    placeholder="Enter text..."
                                                />
                                            </section>

                                            <section>
                                                <SectionLabel>Appearance</SectionLabel>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-900/50 hover:border-zinc-800 transition-colors">
                                                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1 block">Color</span>
                                                            <div className="flex items-center gap-2">
                                                                <div className="relative w-full h-8 rounded overflow-hidden border border-zinc-800 cursor-pointer group">
                                                                    <input
                                                                        type="color"
                                                                        value={activeLayer.color}
                                                                        onChange={(e) => updateLayer(activeLayer.id, { color: e.target.value })}
                                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                                                    />
                                                                    <div className="w-full h-full" style={{ backgroundColor: activeLayer.color }} />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-900/50 hover:border-zinc-800 transition-colors group focus-within:border-zinc-700">
                                                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1 block">Size</span>
                                                            <input
                                                                type="number"
                                                                value={activeLayer.fontSize}
                                                                onChange={(e) => updateLayer(activeLayer.id, { fontSize: parseInt(e.target.value) })}
                                                                className="w-full bg-transparent border-none p-0 text-lg font-bold text-zinc-200 outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <span className="text-xs text-zinc-400 block">Font Family</span>
                                                        <select
                                                            value={activeLayer.fontFamily}
                                                            onChange={(e) => updateLayer(activeLayer.id, { fontFamily: e.target.value })}
                                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200 outline-none focus:border-zinc-700 cursor-pointer"
                                                        >
                                                            {FONTS.map(font => (
                                                                <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => updateLayer(activeLayer.id, { fontWeight: activeLayer.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                                            className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-colors ${activeLayer.fontWeight === 'bold' ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
                                                        >
                                                            <Bold size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => updateLayer(activeLayer.id, { fontStyle: activeLayer.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                                            className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-colors ${activeLayer.fontStyle === 'italic' ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
                                                        >
                                                            <Italic size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    )}

                                    {(!activeLayer || activeLayer.type !== 'text') && (
                                        <div className="flex flex-col items-center justify-center h-48 text-zinc-500 animate-in fade-in">
                                            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
                                                <Type size={20} className="text-zinc-600" />
                                            </div>
                                            <p className="text-sm font-medium text-zinc-400">No Text Selected</p>
                                            <p className="text-xs text-zinc-600 mt-1 max-w-[200px] text-center">Select existing text or click the button above to add new text</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'shapes' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <section>
                                        <SectionLabel>Basic Shapes</SectionLabel>
                                        <div className="grid grid-cols-4 gap-3">
                                            <button onClick={() => addShapeLayer('rectangle')} className="aspect-square bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-white border border-zinc-800">
                                                <Square size={24} />
                                            </button>
                                            <button onClick={() => addShapeLayer('circle')} className="aspect-square bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-white border border-zinc-800">
                                                <Circle size={24} />
                                            </button>
                                            <button onClick={() => addShapeLayer('triangle')} className="aspect-square bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-white border border-zinc-800">
                                                <Triangle size={24} />
                                            </button>
                                            <button onClick={() => addShapeLayer('star')} className="aspect-square bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-white border border-zinc-800">
                                                <Star size={24} />
                                            </button>
                                            <button onClick={() => addShapeLayer('hexagon')} className="aspect-square bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-white border border-zinc-800">
                                                <Hexagon size={24} />
                                            </button>
                                            <button onClick={() => addShapeLayer('octagon')} className="aspect-square bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-white border border-zinc-800">
                                                <Octagon size={24} />
                                            </button>
                                            <button onClick={() => addShapeLayer('heart')} className="aspect-square bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-white border border-zinc-800">
                                                <Heart size={24} />
                                            </button>
                                            <button onClick={() => addShapeLayer('bubble')} className="aspect-square bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-white border border-zinc-800">
                                                <MessageCircle size={24} />
                                            </button>
                                            <button onClick={() => addShapeLayer('line')} className="aspect-square bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-white border border-zinc-800">
                                                <Minus size={24} />
                                            </button>
                                            <button onClick={() => addShapeLayer('arrow')} className="aspect-square bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-white border border-zinc-800">
                                                <Move size={24} />
                                            </button>
                                        </div>
                                    </section>

                                    <section>
                                        <SectionLabel>Emojis</SectionLabel>
                                        <div className="grid grid-cols-5 gap-2">
                                            {['😀', '😂', '😍', '😎', '🤔', '👍', '👎', '🎉', '🔥', '❤️', '✅', '❌', '⭐', '💡', '💬'].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => addShapeLayer('emoji', emoji)}
                                                    className="aspect-square bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center text-2xl hover:scale-110 transition-all border border-zinc-800"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50 text-xs text-zinc-500">
                                        <p className="flex gap-2 items-start">
                                            <span className="p-1 bg-zinc-800 rounded-full text-zinc-400"><Shapes size={10} /></span>
                                            Shapes can be resized, colored, and moved freely on the canvas. Use the Edit tab to customize strokes and fills.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'layers' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <section>
                                        <div className="flex items-center justify-between mb-3">
                                            <SectionLabel>All Layers</SectionLabel>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={addTextLayer}
                                                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                                                    title="Add Text"
                                                >
                                                    <Type size={14} />
                                                </button>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                                                    title="Add Image"
                                                >
                                                    <Upload size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                                            {layers.map((layer, index) => (
                                                <div
                                                    key={layer.id}
                                                    draggable={!layer.locked}
                                                    onDragStart={(e) => {
                                                        if (layer.locked) {
                                                            e.preventDefault();
                                                            return;
                                                        }
                                                        e.dataTransfer.setData('text/plain', layer.id);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        const draggedId = e.dataTransfer.getData('text/plain');
                                                        if (draggedId === layer.id) return;

                                                        const sourceIndex = layers.findIndex(l => l.id === draggedId);
                                                        const targetIndex = layers.findIndex(l => l.id === layer.id);

                                                        if (sourceIndex === -1 || targetIndex === -1) return;

                                                        const newLayers = [...layers];
                                                        const [movedLayer] = newLayers.splice(sourceIndex, 1);

                                                        // Calculate destination index correctly since visual list is reversed
                                                        // But wait, finding index in 'layers' (source of truth) is enough.
                                                        // If I drag 'Top' (end of array) to 'Bottom' (start of array), 
                                                        // targetIndex is 0. sourceIndex is N.
                                                        // newLayers.splice(0, 0, movedLayer) puts it at bottom. Correct.

                                                        newLayers.splice(targetIndex, 0, movedLayer);
                                                        setLayers(newLayers);
                                                    }}
                                                    onClick={() => setActiveLayerId(layer.id)}
                                                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer group transition-all duration-200 ${activeLayerId === layer.id
                                                        ? 'bg-zinc-800 border-zinc-700 shadow-sm ring-1 ring-zinc-700'
                                                        : 'bg-zinc-900/50 border-zinc-900 hover:bg-zinc-800 hover:border-zinc-700'
                                                        }`}
                                                >
                                                    <div className={`p-1 ${layer.locked ? 'text-zinc-700 cursor-not-allowed' : 'cursor-grab text-zinc-600 hover:text-zinc-400 active:cursor-grabbing'}`}>
                                                        {layer.locked ? <Lock size={14} /> : <Move size={14} />}
                                                    </div>

                                                    {/* Visibility Toggle */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateLayer(layer.id, { visible: !layer.visible });
                                                        }}
                                                        className={`p-1 rounded hover:bg-zinc-700 transition-colors ${layer.visible ? 'text-zinc-500 hover:text-white' : 'text-zinc-600'}`}
                                                        title={layer.visible ? "Hide Layer" : "Show Layer"}
                                                    >
                                                        {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                    </button>

                                                    {/* Lock Toggle */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateLayer(layer.id, { locked: !layer.locked });
                                                        }}
                                                        className={`p-1 rounded hover:bg-zinc-700 transition-colors ${layer.locked ? 'text-amber-500' : 'text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100'}`}
                                                        title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                                                    >
                                                        {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                                                    </button>

                                                    {/* Icon Preview */}
                                                    <div className="w-10 h-10 bg-zinc-950 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-800/50 flex-shrink-0">
                                                        {layer.type === 'image' ? (
                                                            <img src={layer.src} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="flex items-center justify-center w-full h-full bg-zinc-900 text-zinc-500">
                                                                <Type size={16} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Name */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-medium truncate ${activeLayerId === layer.id ? 'text-white' : 'text-zinc-300'}`}>{layer.name}</p>
                                                        <p className="text-[10px] text-zinc-500 capitalize font-medium">{layer.type}</p>
                                                    </div>

                                                    {/* Delete Action */}
                                                    {!layer.locked && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newLayers = layers.filter(l => l.id !== layer.id);
                                                                setLayers(newLayers);
                                                                if (activeLayerId === layer.id) setActiveLayerId(null);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                                                            title="Delete Layer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {layers.length === 0 && (
                                                <div className="text-center py-12 text-zinc-500 text-xs italic border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                                                    No layers yet
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Export Button - Sticky Bottom Full Width */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 mt-auto shrink-0 z-10 w-full">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setNavMode(prev => prev === 'sidebar' ? 'top' : 'sidebar')}
                            className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
                            title={navMode === 'sidebar' ? "Switch to Top Navigation" : "Switch to Sidebar Navigation"}
                        >
                            {navMode === 'sidebar' ? <PanelTop size={18} /> : <PanelLeft size={18} />}
                        </button>
                        <Button
                            onClick={downloadImage}
                            className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/20"
                        >
                            <Download size={18} />
                            Export Image
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                {/* Toolbar */}
                <div className="h-12 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white">
                            <ZoomOut size={18} />
                        </button>
                        <button onClick={() => fitCanvas(canvasSize.width, canvasSize.height)} className="px-2 py-1 text-xs hover:bg-zinc-800 rounded text-zinc-400 hover:text-white font-medium">
                            {Math.round(zoom * 100)}%
                        </button>
                        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white">
                            <ZoomIn size={18} />
                        </button>
                        <div className="h-4 w-px bg-zinc-800 mx-2"></div>
                        <button
                            onClick={() => {
                                setIsCanvasLocked(!isCanvasLocked);
                                if (!isCanvasLocked) setActiveLayerId(null);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${isCanvasLocked ? 'bg-amber-900/30 text-amber-500 ring-1 ring-amber-900/50' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'}`}
                        >
                            {isCanvasLocked ? <Lock size={14} /> : <Unlock size={14} />}
                            {isCanvasLocked ? 'Locked' : 'Unlock'}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Background Color Picker */}
                        <div className="flex items-center gap-2 mr-4">
                            <span className="text-xs text-zinc-500">Canvas BG:</span>
                            <div
                                className={`w-6 h-6 rounded border cursor-pointer ${bgColor === 'transparent' ? 'bg-[url(https://www.transparenttextures.com/patterns/checkerboard.png)]' : ''}`}
                                style={{ backgroundColor: bgColor !== 'transparent' ? bgColor : undefined }}
                                onClick={() => setBgColor(prev => prev === 'transparent' ? '#ffffff' : prev === '#ffffff' ? '#000000' : 'transparent')}
                                title="Click to toggle: Transparent -> White -> Black"
                            ></div>
                        </div>


                    </div>
                </div>

                {/* Canvas Container */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-auto bg-zinc-950 relative p-8 flex items-center justify-center origin-center"
                >
                    {/* Dotted Background for the Workspace Area */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    ></div>

                    <div
                        className="relative shadow-2xl shadow-black/50 transition-transform duration-200"
                        style={{
                            width: canvasSize.width * zoom,
                            height: canvasSize.height * zoom,
                        }}
                    >
                        {/* The Actual Canvas */}
                        <canvas
                            ref={canvasRef}
                            width={canvasSize.width}
                            height={canvasSize.height}
                            className={`block w-full h-full bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] ${isDragging ? 'cursor-grabbing' : isCanvasLocked ? 'cursor-not-allowed' : 'cursor-grab'}`}
                            onMouseDown={(e) => {
                                if (isCanvasLocked) return;
                                const rect = canvasRef.current?.getBoundingClientRect();
                                const canvas = canvasRef.current;
                                if (!rect || !canvas) return;

                                const scaleX = canvasSize.width / rect.width;
                                const scaleY = canvasSize.height / rect.height;
                                const x = (e.clientX - rect.left) * scaleX;
                                const y = (e.clientY - rect.top) * scaleY;

                                const ctx = canvas.getContext('2d');
                                if (!ctx) return;

                                // Hit test in reverse (top first)
                                // We iterate backwards through the array to find the topmost element under cursor
                                const layersReversed = [...layers].reverse();
                                // Actually, logic for rendering was: "Sort layers by index... So we need to draw from bottom to top."
                                // State 'layers' is [Newest/Top, ..., Oldest/Bottom] usually? 
                                // Let's check: setLayers(prev => [newLayer, ...prev]); -> Index 0 is Top. 
                                // Drawing uses: [...layers].reverse().forEach... -> Draws Index Last (Bottom) first, Index 0 (Top) last.
                                // So Index 0 is indeed visually on top.
                                // find() iterates from index 0. So it finds Top first. Correct.

                                const clickedLayer = layers.find(layer => {
                                    if (!layer.visible || layer.locked) return false;

                                    let lW = layer.width || 0;
                                    let lH = layer.height || 0;

                                    if (layer.type === 'text' && layer.text) {
                                        // Dynamic measurement for improved accuracy
                                        ctx.font = `${layer.fontStyle || 'normal'} ${layer.fontWeight || 'normal'} ${layer.fontSize || 40}px ${layer.fontFamily || 'Arial'}`;
                                        const metrics = ctx.measureText(layer.text);
                                        lW = metrics.width;
                                        lH = layer.fontSize || 40; // Approximate height

                                        // Text is drawn centered at x,y
                                        // ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                                        // Bounding box:
                                        const left = layer.x - lW / 2;
                                        const right = layer.x + lW / 2;
                                        const top = layer.y - lH / 2;
                                        const bottom = layer.y + lH / 2;

                                        return x >= left && x <= right && y >= top && y <= bottom;
                                    }

                                    // Images / Shapes (drawn top-left at x,y)
                                    // Wait, check drawing loop for shapes.
                                    // Images: ctx.drawImage(..., layer.x, layer.y, ...) -> Top-Left.
                                    // Shapes: 
                                    //   cx = lx + lw/2 ... 
                                    //   Most shapes drawn within lx, ly, width, height bounding box.
                                    //   Circle: from center? 
                                    //   ctx.ellipse(cx, cy, lw/2, lh/2...) -> Center is cx,cy. 
                                    //   cx = lx + lw/2. So lx is left edge.
                                    //   So all Shapes/Images use lx, ly as Top-Left corner relative coords.

                                    return x >= layer.x && x <= layer.x + lW && y >= layer.y && y <= layer.y + lH;
                                });

                                if (clickedLayer) {
                                    setActiveLayerId(clickedLayer.id);
                                    setIsDragging(true);

                                    // Correct offset calculation depends on anchor point
                                    // Images/Shapes: Top-Left anchor. Offset = Mouse - TopLeft.
                                    // Text: Center anchor. Offset = Mouse - Center.

                                    setDragOffset({
                                        x: x - clickedLayer.x,
                                        y: y - clickedLayer.y
                                    });
                                    if (clickedLayer.type === 'shape') setActiveTab('edit'); // switch to edit for shapes too?
                                    if (clickedLayer.type === 'image') setActiveTab('canvas');
                                    if (clickedLayer.type === 'text') setActiveTab('text');
                                } else {
                                    // Clicked empty space
                                    setActiveLayerId(null);
                                    setIsCropping(false);
                                    setIsContextMenuOpen(false);
                                }
                            }}
                        />

                        {/* Selection & Resize Overlay */}


                        {/* Correct Approach: Selection Overlay using DOM elements positioned by Zoom */}
                        {activeLayer && !isCanvasLocked && layers.find(l => l.id === activeLayerId)?.visible && (
                            <>
                                {/* Floating Toolbar */}
                                <div
                                    className="absolute z-50 flex items-center gap-1 bg-white rounded-lg shadow-xl px-2 py-1.5 pointer-events-auto transform -translate-x-1/2"
                                    style={{
                                        left: (activeLayer.x + (activeLayer.width || 0) / 2) * zoom,
                                        top: (activeLayer.y * zoom) - 50 // 50px above
                                    }}
                                >
                                    <button
                                        className={`p-1.5 hover:bg-zinc-100 rounded transition-colors ${isCropping ? 'bg-blue-50 text-blue-600' : 'text-zinc-600'}`}
                                        title="Crop"
                                        onClick={() => setIsCropping(!isCropping)}
                                    >
                                        <Crop size={16} />
                                    </button>
                                    <button
                                        className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-zinc-100 rounded text-zinc-600 text-xs font-medium"
                                        title="Replace Image"
                                        onClick={() => replaceFileInputRef.current?.click()}
                                    >
                                        <ImageIcon size={14} />
                                        <span>Replace</span>
                                    </button>
                                    <div className="w-px h-4 bg-zinc-200 mx-1"></div>
                                    <button
                                        className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                                        onClick={() => deleteLayer(activeLayer.id)}
                                        title="Delete"
                                    >
                                        <Trash size={16} />
                                    </button>
                                    <div className="relative">
                                        <button
                                            className="p-1.5 hover:bg-zinc-100 rounded text-zinc-600"
                                            title="More"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsContextMenuOpen(!isContextMenuOpen);
                                            }}
                                        >
                                            <MoreHorizontal size={16} />
                                        </button>

                                        {isContextMenuOpen && (
                                            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-zinc-100 py-1 z-50 flex flex-col text-left">
                                                <button
                                                    className="px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex justify-between items-center"
                                                    onClick={() => copyLayer(activeLayer.id)}
                                                >
                                                    <span className="flex items-center gap-2"><Square size={12} className="opacity-0" /> Copy</span>
                                                    <span className="text-zinc-400">Ctrl+C</span>
                                                </button>
                                                <button
                                                    className={`px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex justify-between items-center ${!clipboard ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    onClick={() => pasteLayer()}
                                                    disabled={!clipboard}
                                                >
                                                    <span className="flex items-center gap-2"><Square size={12} className="opacity-0" /> Paste</span>
                                                    <span className="text-zinc-400">Ctrl+V</span>
                                                </button>
                                                <button
                                                    className="px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex justify-between items-center"
                                                    onClick={() => duplicateLayer(activeLayer.id)}
                                                >
                                                    <span className="flex items-center gap-2"><Square size={12} className="opacity-0" /> Duplicate</span>
                                                    <span className="text-zinc-400">Ctrl+D</span>
                                                </button>
                                                <div className="h-px bg-zinc-100 my-1"></div>
                                                <button
                                                    className="px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex justify-between items-center"
                                                    onClick={() => {
                                                        const newLayers = [...layers];
                                                        const idx = newLayers.findIndex(l => l.id === activeLayer.id);
                                                        if (idx > 0) {
                                                            [newLayers[idx], newLayers[idx - 1]] = [newLayers[idx - 1], newLayers[idx]];
                                                            setLayers(newLayers);
                                                        }
                                                        setIsContextMenuOpen(false);
                                                    }}
                                                >
                                                    <span className="flex items-center gap-2">Bring forward</span>
                                                    <span className="text-zinc-400">Ctrl+]</span>
                                                </button>
                                                <button
                                                    className="px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex justify-between items-center"
                                                    onClick={() => {
                                                        const newLayers = [...layers];
                                                        const idx = newLayers.findIndex(l => l.id === activeLayer.id);
                                                        if (idx < newLayers.length - 1) {
                                                            [newLayers[idx], newLayers[idx + 1]] = [newLayers[idx + 1], newLayers[idx]];
                                                            setLayers(newLayers);
                                                        }
                                                        setIsContextMenuOpen(false);
                                                    }}
                                                >
                                                    <span className="flex items-center gap-2">Send backward</span>
                                                    <span className="text-zinc-400">Ctrl+[</span>
                                                </button>
                                                <div className="h-px bg-zinc-100 my-1"></div>
                                                <button
                                                    className="px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex justify-between items-center"
                                                    onClick={() => toggleLockLayer(activeLayer.id)}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        {activeLayer.locked ? <Unlock size={12} /> : <Lock size={12} />}
                                                        {activeLayer.locked ? 'Unlock' : 'Lock'}
                                                    </span>
                                                    <span className="text-zinc-400">Ctrl+Shift+L</span>
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                </div>

                                {/* Selection Box Border */}
                                <div
                                    className="absolute border-2 border-blue-500 pointer-events-none"
                                    style={{
                                        left: activeLayer.x * zoom,
                                        top: activeLayer.y * zoom,
                                        width: (activeLayer.width || 0) * zoom,
                                        height: (activeLayer.height || 0) * zoom,
                                    }}
                                >
                                    {/* Resize Handles */}
                                    {['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].map((dir) => {
                                        // Position logic
                                        let top = '0%', left = '0%';
                                        if (dir.includes('n')) top = '-6px';
                                        if (dir.includes('s')) top = 'calc(100% - 6px)';
                                        if (dir === 'w' || dir === 'e') top = 'calc(50% - 6px)';

                                        if (dir.includes('w')) left = '-6px';
                                        if (dir.includes('e')) left = 'calc(100% - 6px)';
                                        if (dir === 'n' || dir === 's') left = 'calc(50% - 6px)';

                                        const isCorner = dir.length === 2;

                                        return (
                                            <div
                                                key={dir}
                                                className={`absolute w-3 h-3 bg-white border border-blue-500 z-10 pointer-events-auto ${isCorner ? 'rounded-full' : 'rounded-[2px]'} ${isCorner ? 'z-20' : 'z-10'}`}
                                                style={{ left, top, cursor: `${dir}-resize` }}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setResizeDirection(dir as ResizeDirection);
                                                    setInitialResizeState({
                                                        x: activeLayer.x,
                                                        y: activeLayer.y,
                                                        w: activeLayer.width || 0,
                                                        h: activeLayer.height || 0,
                                                        fontSize: activeLayer.fontSize,
                                                        mx: e.clientX,
                                                        my: e.clientY
                                                    });
                                                }}
                                            />
                                        );
                                    })}

                                    {/* Rotation Handle (extra) */}
                                    <div
                                        className="absolute w-6 h-6 bg-white border border-blue-500 rounded-full flex items-center justify-center cursor-grab left-1/2 -top-8 -ml-3 pointer-events-auto shadow-sm text-blue-500 hover:text-blue-600"
                                    >
                                        <RotateCw size={12} />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Dotted Border Overlay for Dimension Indication */}
                        <div className="absolute inset-0 border-2 border-dashed border-zinc-600/50 pointer-events-none z-20"></div>

                        {/* Empty State Overlay - Click to Upload */}
                        {layers.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-6 bg-zinc-900/80 backdrop-blur-sm border-2 border-dashed border-zinc-600 rounded-xl hover:border-blue-500 hover:bg-zinc-800/90 transition-all group flex flex-col items-center gap-3"
                                >
                                    <div className="p-3 rounded-full bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                                        <Upload size={24} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-white">Click to Upload Image</p>
                                        <p className="text-xs text-zinc-400">or drop file here</p>
                                    </div>
                                </button>

                                {/* Drag & Drop handler could go here on the parent container overlay */}
                            </div>
                        )}

                        {/* Overlay Controls for Active Layer (Resize handles, etc) */}
                        {/* Simplified: Just a border for now */}
                        {/* This would be a div overlaying the canvas that matches active layer position * zoom */}
                    </div>
                </div>
            </div>
        </div >
    );
};
