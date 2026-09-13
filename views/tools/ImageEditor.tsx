
import React, { useState, useRef, useEffect, ChangeEvent, useCallback } from 'react';
import {
    Upload, Layers, Type, Image as ImageIcon, Sliders,
    Download, Plus, X, Move, Trash2, Eye, EyeOff, Lock, Unlock,
    ZoomIn, ZoomOut, Check, Palette, Bold, Italic, Crop,
    Smartphone, Monitor, Square, Minus, RectangleHorizontal, Layout, LayoutTemplate,
    PanelLeft, PanelTop, PanelRight, Shapes, Circle, Triangle, Star, Hexagon, Octagon, Heart, MessageCircle, Smile,
    MoreHorizontal, RotateCw, RotateCcw, Trash, GripHorizontal, AlignLeft, AlignCenter, AlignRight, Underline,
    AlignCenterVertical, AlignCenterHorizontal, AlignStartHorizontal, AlignEndHorizontal, AlignStartVertical, AlignEndVertical,
    MoveUp, MoveDown, MoveLeft, MoveRight, FlipHorizontal, FlipVertical,
    Cpu, Activity, Zap, HardDrive
} from 'lucide-react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { useIsMobile } from '../../hooks/useIsMobile';

// Types
type GradientType = 'linear' | 'radial';

interface GradientStop {
    id: string;
    color: string;
    offset: number;
}

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
    textAlign?: 'left' | 'center' | 'right';
    textDecoration?: 'none' | 'underline';

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
    rotation?: number;
    flipX?: boolean;
    flipY?: boolean;
}

const FONTS = [
    'Plus Jakarta Sans', 'Unbounded', 'Arial', 'Verdana', 'Times New Roman', 'Courier New',
    'Georgia', 'Palatino', 'Garamond', 'Bookman',
    'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact'
];

const BLEND_MODES: GlobalCompositeOperation[] = [
    'source-over', 'multiply', 'screen', 'overlay', 'darken',
    'lighten', 'color-dodge', 'color-burn', 'hard-light',
    'soft-light', 'difference', 'exclusion', 'hue',
    'saturation', 'color', 'luminosity'
];

const SectionLabel = ({ children }: { children: React.ReactNode }) => {
    const isMobile = useIsMobile();
    return (
        <label className={`${isMobile ? 'text-[10px] mb-2' : 'text-[10px] mb-4'} font-bold text-zinc-500 uppercase tracking-widest block`}>
            {children}
        </label>
    );
};

interface SliderControlProps {
    value: number;
    min: number;
    max: number;
    onChange: (val: number) => void;
    label: string;
    unit?: string;
}

const SliderControl = ({ value, min, max, onChange, label, unit = '' }: SliderControlProps) => {
    const isMobile = useIsMobile();
    return (
        <div className="group">
            <div className={`flex justify-between items-center ${isMobile ? 'mb-1' : 'mb-2'}`}>
                <span className="text-xs text-zinc-400">{label}</span>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{value}{unit}</span>
            </div>
            <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                <button
                    onClick={() => onChange(Math.max(min, value - (max - min > 50 ? 5 : 1)))}
                    className="text-zinc-600 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded"
                >
                    <Minus size={isMobile ? 10 : 12} />
                </button>
                <div className={`relative flex-1 ${isMobile ? 'h-4' : 'h-6'} flex items-center`}>
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
                    <Plus size={isMobile ? 10 : 12} />
                </button>
            </div>
        </div>
    );
};

// Helper: Hex to RGB
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

export const ImageEditor: React.FC = () => {
    // State
    const isMobile = useIsMobile();
    const [layers, setLayers] = useState<Layer[]>([]);
    const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [mobileCanvasHeight, setMobileCanvasHeight] = useState(30);
    const [isResizingMobileCanvas, setIsResizingMobileCanvas] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [bgColor, setBgColor] = useState<string>('transparent'); // or #ffffff
    const [activeTab, setActiveTab] = useState<'canvas' | 'edit' | 'text' | 'layers' | 'shapes'>('canvas');
    const [rightTab, setRightTab] = useState<'layers' | 'edit'>('layers');
    const [showLeftSidebar, setShowLeftSidebar] = useState(true);
    const [showRightSidebar, setShowRightSidebar] = useState(true);
    const [isCanvasLocked, setIsCanvasLocked] = useState(false);

    const [customFonts, setCustomFonts] = useState<string[]>([]);
    const [navMode, setNavMode] = useState<'sidebar' | 'sidebar-right' | 'top'>('sidebar');

    // Gradient State
    const [bgType, setBgType] = useState<'solid' | 'gradient'>('solid');
    const [gradientType, setGradientType] = useState<GradientType>('linear');
    const [gradientAngle, setGradientAngle] = useState(90);
    const [gradientStops, setGradientStops] = useState<GradientStop[]>([
        { id: '1', color: '#ff0000', offset: 0 },
        { id: '2', color: '#0000ff', offset: 100 }
    ]);

    // Text Editing State
    const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
    const [editingTextValue, setEditingTextValue] = useState('');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const replaceFileInputRef = useRef<HTMLInputElement>(null);
    const fontInputRef = useRef<HTMLInputElement>(null);

    const [hasStarted, setHasStarted] = useState(false);
    const [customSize, setCustomSize] = useState({ width: 1080, height: 1080 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Dragging State
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Resize State
    type ResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
    const [initialResizeState, setInitialResizeState] = useState<{
        x: number, y: number, w: number, h: number, mx: number, my: number, fontSize?: number,
        cropW?: number, cropH?: number, cropX?: number, cropY?: number
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
                rotation: 0,
                flipX: false,
                flipY: false,
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

    const handleFontUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fontName = file.name.split('.')[0].replace(/\s+/g, '-');
        const reader = new FileReader();

        reader.onload = async (event) => {
            const result = event.target?.result as ArrayBuffer;
            try {
                // @ts-ignore - FontFace might not be in the current TS types but is supported in modern browsers
                const fontFace = new FontFace(fontName, result);
                await fontFace.load();
                // @ts-ignore
                document.fonts.add(fontFace);
                setCustomFonts(prev => !prev.includes(fontName) ? [...prev, fontName] : prev);

                // Also update active layer to use this font if it's a text layer
                const currentActive = layers.find(l => l.id === activeLayerId);
                if (currentActive?.type === 'text') {
                    updateLayer(currentActive.id, { fontFamily: fontName });
                }
            } catch (err) {
                console.error('Failed to load font:', err);
                alert('Failed to load font file. Please ensure it is a valid TTF, OTF, or WOFF file.');
            }
        };
        reader.readAsArrayBuffer(file);
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
            rotation: 0,
            flipX: false,
            flipY: false,
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
            textAlign: 'center',
            textDecoration: 'none',
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
            rotation: 0,
            flipX: false,
            flipY: false,
            emojiContent: emoji,
            cornerRadius: 0,
            points: 5
        };
        setLayers(prev => [newLayer, ...prev]);
        setActiveLayerId(newLayer.id);
        if (isMobile) {
            setActiveTab('edit');
        } else {
            setRightTab('edit');
            setShowRightSidebar(true);
        }
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
                // Don't delete if editing text
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
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
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

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

        if (bgType === 'solid') {
            if (bgColor !== 'transparent') {
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        } else {
            // Gradient Background
            let gradient: CanvasGradient;
            if (gradientType === 'linear') {
                // Calculate simple coords based on angle
                const rad = (gradientAngle * Math.PI) / 180;
                const len = Math.max(canvas.width, canvas.height);
                const x0 = canvas.width / 2 + Math.cos(rad + Math.PI) * len;
                const y0 = canvas.height / 2 + Math.sin(rad + Math.PI) * len;
                const x1 = canvas.width / 2 + Math.cos(rad) * len;
                const y1 = canvas.height / 2 + Math.sin(rad) * len;
                gradient = ctx.createLinearGradient(x0, y0, x1, y1);
            } else {
                gradient = ctx.createRadialGradient(
                    canvas.width / 2, canvas.height / 2, 0,
                    canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
                );
            }

            // Sort stops by offset to prevent rendering glitches
            const sortedStops = [...gradientStops].sort((a, b) => a.offset - b.offset);
            sortedStops.forEach(stop => {
                gradient.addColorStop(stop.offset / 100, stop.color);
            });
            ctx.fillStyle = gradient;
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

            // Apply Transformations (Rotation/Flip)
            if (layer.rotation || layer.flipX || layer.flipY) {
                const cx = layer.x + (layer.width || 0) / 2;
                const cy = layer.y + (layer.height || 0) / 2;
                ctx.translate(cx, cy);
                if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
                if (layer.flipX || layer.flipY) ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
                ctx.translate(-cx, -cy);
            }

            if (layer.type === 'image' && layer.image) {
                if (layer.chromaKeyEnabled) {
                    // Create temporary canvas for processing
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = layer.image.width;
                    tempCanvas.height = layer.image.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    if (tempCtx) {
                        tempCtx.drawImage(layer.image, 0, 0);
                        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                        const data = imageData.data;
                        const targetColor = hexToRgb(layer.chromaKeyColor); // Assuming hexToRgb is defined elsewhere
                        const tolerance = layer.chromaKeyTolerance;

                        if (targetColor) {
                            for (let i = 0; i < data.length; i += 4) {
                                const r = data[i];
                                const g = data[i + 1];
                                const b = data[i + 2];
                                const distance = Math.sqrt(
                                    Math.pow(r - targetColor.r, 2) +
                                    Math.pow(g - targetColor.g, 2) +
                                    Math.pow(b - targetColor.b, 2)
                                );
                                if (distance < tolerance) {
                                    data[i + 3] = 0; // Set alpha to 0
                                }
                            }
                            tempCtx.putImageData(imageData, 0, 0);
                            ctx.drawImage(tempCanvas, layer.cropX || 0, layer.cropY || 0, layer.cropWidth || layer.image.width, layer.cropHeight || layer.image.height, layer.x, layer.y, layer.width || 0, layer.height || 0);
                        } else {
                            ctx.drawImage(layer.image, layer.cropX || 0, layer.cropY || 0, layer.cropWidth || layer.image.width, layer.cropHeight || layer.image.height, layer.x, layer.y, layer.width || 0, layer.height || 0);
                        }
                    }
                } else {
                    ctx.drawImage(layer.image, layer.cropX || 0, layer.cropY || 0, layer.cropWidth || layer.image.width, layer.cropHeight || layer.image.height, layer.x, layer.y, layer.width || 0, layer.height || 0);
                }
            } else if (layer.type === 'text' && layer.text) {
                // SKIP RENDERING IF WE ARE CURRENTLY EDITING THIS TEXT LAYER
                if (layer.id !== editingTextLayerId) {
                    ctx.font = `${layer.fontStyle || 'normal'} ${layer.fontWeight || 'normal'} ${layer.fontSize || 40}px ${layer.fontFamily || 'Arial'}`;
                    ctx.fillStyle = layer.color || '#ffffff';
                    ctx.textAlign = layer.textAlign || 'center';
                    ctx.textBaseline = 'middle';

                    const lines = layer.text.split('\n');
                    const lineHeight = (layer.fontSize || 40) * 1.2;
                    const initialY = layer.y - ((lines.length - 1) * lineHeight) / 2;

                    lines.forEach((line, i) => {
                        const lineY = initialY + i * lineHeight;
                        ctx.fillText(line, layer.x, lineY);
                        if (layer.textDecoration === 'underline') {
                            const metrics = ctx.measureText(line);
                            const width = metrics.width;
                            const height = layer.fontSize || 40;
                            ctx.fillRect(layer.x - width / 2, lineY + height / 2, width, height / 10);
                        }
                    });
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

            }

            ctx.restore();
        });

    }, [layers, canvasSize, bgColor, bgType, gradientType, gradientAngle, gradientStops]);

    // Actions
    const updateLayer = (id: string, updates: Partial<Layer>) => {
        setLayers(prev => prev.map(l => {
            if (l.id === id) {
                const updated = { ...l, ...updates };
                // If text properties changed, re-measure to keep bounds accurate
                if (updated.type === 'text' && (
                    updates.text !== undefined ||
                    updates.fontSize !== undefined ||
                    updates.fontFamily !== undefined ||
                    updates.fontWeight !== undefined ||
                    updates.fontStyle !== undefined
                )) {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.font = `${updated.fontStyle || 'normal'} ${updated.fontWeight || 'normal'} ${updated.fontSize}px ${updated.fontFamily || 'Arial'}`;
                        const metrics = ctx.measureText(updated.text || '');
                        updated.width = metrics.width;
                        updated.height = updated.fontSize;
                    }
                }
                return updated;
            }
            return l;
        }));
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

            if (isCropping && activeLayerId) {
                // CROP MODE RESIZE (MASKING)
                const currentLayer = layers.find(l => l.id === activeLayerId);
                if (currentLayer?.type === 'image') {
                    const cw = initialResizeState.cropW ?? (currentLayer.cropWidth || currentLayer.image?.width || 0);
                    const ch = initialResizeState.cropH ?? (currentLayer.cropHeight || currentLayer.image?.height || 0);
                    const initialCropX = initialResizeState.cropX ?? (currentLayer.cropX || 0);
                    const initialCropY = initialResizeState.cropY ?? (currentLayer.cropY || 0);

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
                        cropX: initialCropX,
                        cropY: initialCropY,
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
                        cropAttrs.cropX = initialCropX - sourceShift;
                        cropAttrs.cropWidth = cw + sourceShift;
                    }
                    if (resizeDirection.includes('n')) {
                        const sourceShift = deltaH * dataScaleY;
                        cropAttrs.cropY = initialCropY - sourceShift;
                        cropAttrs.cropHeight = ch + sourceShift;
                    }

                    const img = currentLayer.image;
                    if (img) {
                        cropAttrs.cropX = Math.max(0, cropAttrs.cropX ?? 0);
                        cropAttrs.cropY = Math.max(0, cropAttrs.cropY ?? 0);
                        cropAttrs.cropWidth = Math.max(20, Math.min((cropAttrs.cropWidth ?? 0), img.naturalWidth - (cropAttrs.cropX ?? 0)));
                        cropAttrs.cropHeight = Math.max(20, Math.min((cropAttrs.cropHeight ?? 0), img.naturalHeight - (cropAttrs.cropY ?? 0)));
                    }

                    updateLayer(activeLayerId, cropAttrs);
                }
            } else {
                // NORMAL RESIZE
                const layerType = layers.find(l => l.id === activeLayerId)?.type;
                if (layerType === 'text') {
                    if (resizeDirection.length === 2 && initialResizeState.fontSize) {
                        // Corner handle: scale font size
                        const scale = (iw + (resizeDirection.includes('e') ? dx : -dx)) / iw;
                        newAttrs.fontSize = Math.max(8, Math.round(initialResizeState.fontSize * scale));
                    }
                    // Side handles for text are ignored for now (could be used for wrapping later)
                } else {
                    const isCorner = resizeDirection.length === 2;

                    if (isCorner) {
                        // Proportional Resize for Corners
                        const ratio = iw / ih;
                        let newW = iw;

                        if (resizeDirection.includes('e')) {
                            newW = Math.max(minSize, iw + dx);
                        } else if (resizeDirection.includes('w')) {
                            newW = Math.max(minSize, iw - dx);
                        }

                        // Calculate height based on aspect ratio
                        const newH = newW / ratio;

                        // Apply
                        newAttrs.width = newW;
                        newAttrs.height = newH;

                        // Adjust positions if resizing from Left or Top
                        if (resizeDirection.includes('w')) {
                            newAttrs.x = ix + (iw - newW);
                        }
                        if (resizeDirection.includes('n')) {
                            newAttrs.y = iy + (ih - newH);
                        }
                    } else {
                        // Normal Non-Proportional Resize for Sides
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

    // Handle Mobile Canvas Resizing
    useEffect(() => {
        const handleTouchMove = (e: TouchEvent) => {
            if (!isResizingMobileCanvas) return;
            const touch = e.touches[0];
            const newHeight = ((touch.clientY - 64) / window.innerHeight) * 100;
            setMobileCanvasHeight(Math.min(maxMobileCanvasHeight, Math.max(minMobileCanvasHeight, newHeight)));
        };

        const handleTouchEnd = () => setIsResizingMobileCanvas(false);

        if (isResizingMobileCanvas) {
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleTouchEnd);
        }
        return () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isResizingMobileCanvas]);

    const minMobileCanvasHeight = 15;
    const maxMobileCanvasHeight = 60;


    if (!hasStarted) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <ImageIcon size={32} /> Image Studio Pro
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Advanced layer-based image editing in your browser.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={(f) => {
                            if (f) {
                                handleFileUpload(f);
                                setHasStarted(true);
                            }
                        }}
                        accept="image/*"
                        label="Open Image"
                        description="JPG, PNG, WEBP, SVG"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Start Blank Option & Features */}
                <div className="flex-none max-w-4xl mx-auto w-full mt-10 space-y-8">
                    <button
                        onClick={handleCreateNew}
                        className="group flex items-center justify-center gap-2 mx-auto text-zinc-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest px-6 py-3 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700"
                    >
                        <LayoutTemplate size={16} /> Start with Blank Canvas
                    </button>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: Layers, label: 'Layer Support', desc: 'Compositing made easy' },
                            { icon: Type, label: 'Rich Text', desc: 'Custom fonts & styles' },
                            { icon: Shapes, label: 'Vector Shapes', desc: 'Geometric primitives' },
                            { icon: Sliders, label: 'Filters', desc: 'Professional adjustments' }
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
            </div>
        );
    }

    return (
        <div className={`flex ${isMobile ? 'flex-col min-h-full bg-zinc-950' : 'flex-col lg:flex-row h-full gap-6'} animate-fade-in relative ${!isMobile && navMode === 'sidebar-right' ? 'lg:flex-row-reverse' : ''}`}>
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

            {/* Sidebar - Tools (Scrollable Middle Section on Mobile) */}
            <div className={`${isMobile ? 'order-2 w-full bg-zinc-950 z-0' : 'w-full lg:w-96 flex-shrink-0 flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl h-full overflow-hidden'}`}>

                <div className={`flex-1 flex min-h-0 ${isMobile ? '' : 'overflow-hidden'} ${navMode.startsWith('sidebar') ? (navMode === 'sidebar-right' ? 'flex-row-reverse' : 'flex-row') : 'flex-col'}`}>

                    {/* Sidebar Strip (Desktop) */}
                    {navMode.startsWith('sidebar') && !isMobile && (
                        <div className={`hidden lg:flex w-16 flex-col items-center py-4 bg-zinc-900/30 border-zinc-800 gap-3 flex-shrink-0 ${navMode === 'sidebar-right' ? 'border-l' : 'border-r'}`}>
                            {['canvas', 'edit', 'text', 'shapes', 'layers'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`p-3 rounded-xl transition-all group relative ${activeTab === tab ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                                    title={tab}
                                >
                                    {tab === 'canvas' && <Monitor size={20} strokeWidth={2} />}
                                    {tab === 'edit' && <Sliders size={20} strokeWidth={2} />}
                                    {tab === 'text' && <Type size={20} strokeWidth={2} />}
                                    {tab === 'shapes' && <Shapes size={20} strokeWidth={2} />}
                                    {tab === 'layers' && <Layers size={20} strokeWidth={2} />}

                                    {/* Tooltip on right (or left if sidebar is on right) */}
                                    <span className={`absolute ${navMode === 'sidebar-right' ? 'right-full mr-2' : 'left-full ml-2'} px-2 py-1 bg-zinc-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-zinc-700`}>
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Content Wrapper */}
                    <div className={`flex-1 flex flex-col min-h-0 min-w-0 bg-zinc-950`}>
                        <div className={`flex-shrink-0 ${isMobile ? 'px-4 pt-2 mb-2 lg:mb-6' : 'px-4 pt-4 mb-6'}`}>
                            {/* Horizontal Tabs (Desktop Mode Only) */}
                            <div className={`${isMobile ? 'hidden' : (navMode.startsWith('sidebar') ? 'lg:hidden' : 'flex')} p-1 gap-1 bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden`}>
                                {['canvas', 'edit', 'text', 'shapes', 'layers'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab as any)}
                                        className={`py-2 rounded-lg text-[11px] font-semibold flex items-center justify-center transition-all duration-300 
                                        ${activeTab === tab
                                                ? 'flex-[2] bg-zinc-800 text-white shadow-sm ring-1 ring-white/10 shadow-black/20 px-3 gap-2'
                                                : 'flex-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 px-2'
                                            }`}
                                    >
                                        <div className="flex-shrink-0">
                                            {tab === 'canvas' && <Monitor size={16} strokeWidth={2.5} />}
                                            {tab === 'edit' && <Sliders size={16} strokeWidth={2.5} />}
                                            {tab === 'text' && <Type size={16} strokeWidth={2.5} />}
                                            {tab === 'shapes' && <Shapes size={16} strokeWidth={2.5} />}
                                            {tab === 'layers' && <Layers size={16} strokeWidth={2.5} />}
                                        </div>

                                        <span className={`capitalize truncate transition-all duration-300 ${activeTab === tab ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0 overflow-hidden'}`}>
                                            {tab}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Title Header (Sidebar Mode Desktop) */}
                            <div className="hidden lg:flex items-center justify-between mb-6 pl-1 pr-4">
                                <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                                    {activeTab === 'canvas' && <Monitor size={20} />}
                                    {activeTab === 'edit' && <Sliders size={20} />}
                                    {activeTab === 'text' && <Type size={20} />}
                                    {activeTab === 'shapes' && <Shapes size={20} />}
                                    {activeTab === 'layers' && <Layers size={20} />}
                                    {activeTab} Settings
                                </h2>
                            </div>
                        </div>

                        {/* Content area */}
                        <div className={`flex-1 ${isMobile ? `pt-[calc(${mobileCanvasHeight}vh+20px)] pb-48` : 'overflow-y-auto no-scrollbar'} px-4 pb-4`}>

                            {/* Tab Content */}
                            {activeTab === 'canvas' && (
                                <div className={`${isMobile ? 'space-y-4' : 'space-y-8'} animate-in fade-in duration-300`}>
                                    {/* Size Section */}
                                    <section>
                                        <div className={`flex justify-between items-end ${isMobile ? 'mb-1.5' : 'mb-3'}`}>
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
                                                    { id: 'iridescent', value: '#d8b4fe', label: 'Iridescent' },
                                                ].map((c) => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => { setBgColor(c.value); setBgType('solid'); }}
                                                        className={`w-6 h-6 rounded-full relative flex items-center justify-center transition-transform hover:scale-110 ${bgType === 'solid' && bgColor === c.value ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-950' : ''
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
                                                        {bgType === 'solid' && bgColor === c.value && (
                                                            <div className={`w-1.5 h-1.5 rounded-full ${['#ffffff', 'transparent'].includes(c.value) ? 'bg-black' : 'bg-white'}`} />
                                                        )}
                                                    </button>
                                                ))}

                                                {/* Gradient Toggle Button */}
                                                <button
                                                    onClick={() => setBgType('gradient')}
                                                    className={`w-6 h-6 rounded-full relative flex items-center justify-center transition-transform hover:scale-110 ${bgType === 'gradient' ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-950' : ''}`}
                                                    style={{
                                                        background: 'linear-gradient(135deg, #1cb5e0 0%, #000851 100%)' // Example attractive gradient
                                                    }}
                                                    title="Gradient"
                                                >
                                                    {bgType === 'gradient' && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-px bg-zinc-800 mx-1"></div>
                                                <div className="relative group">
                                                    <div className="w-6 h-6 rounded-full group-hover:opacity-80 transition-opacity cursor-pointer ring-offset-2 ring-offset-zinc-950 hover:scale-110 items-center flex justify-center"
                                                        style={{ background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)' }}
                                                    >
                                                        {/* Show Indicator if Custom */}
                                                        {bgType === 'solid' && !['transparent', '#ffffff', '#000000', '#3b82f6', '#ef4444', '#d8b4fe'].includes(bgColor) && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
                                                        <input
                                                            type="color"
                                                            value={bgColor === 'transparent' ? '#ffffff' : bgColor}
                                                            onChange={(e) => { setBgColor(e.target.value); setBgType('solid'); }}
                                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                            title="Custom Color"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Gradient Settings */}
                                        {bgType === 'gradient' && (
                                            <div className="mt-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-zinc-500 font-bold">Gradient Settings</span>
                                                    <div className="flex gap-1 bg-zinc-900 p-0.5 rounded border border-zinc-800">
                                                        <button
                                                            onClick={() => setGradientType('linear')}
                                                            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${gradientType === 'linear' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                        >
                                                            Linear
                                                        </button>
                                                        <button
                                                            onClick={() => setGradientType('radial')}
                                                            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${gradientType === 'radial' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                        >
                                                            Radial
                                                        </button>
                                                    </div>
                                                </div>

                                                {gradientType === 'linear' && (
                                                    <SliderControl
                                                        label="Angle"
                                                        value={gradientAngle}
                                                        min={0} max={360}
                                                        unit="°"
                                                        onChange={setGradientAngle}
                                                    />
                                                )}

                                                {/* Gradient Bar Preview */}
                                                <div className="h-4 w-full rounded relative border border-zinc-700"
                                                    style={{
                                                        background: `linear-gradient(to right, ${[...gradientStops].sort((a, b) => a.offset - b.offset).map(s => `${s.color} ${s.offset}%`).join(', ')})`
                                                    }}
                                                >
                                                </div>

                                                {/* Stops */}
                                                <div className="space-y-2">
                                                    {gradientStops.map((stop, index) => (
                                                        <div key={stop.id} className="flex items-center gap-2">
                                                            <div className="relative w-6 h-6 rounded border border-zinc-600 flex-shrink-0">
                                                                <input
                                                                    type="color"
                                                                    value={stop.color}
                                                                    onChange={(e) => {
                                                                        setGradientStops(gradientStops.map(s => s.id === stop.id ? { ...s, color: e.target.value } : s));
                                                                    }}
                                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                                />
                                                                <div className="w-full h-full rounded" style={{ backgroundColor: stop.color }} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <input
                                                                    type="range"
                                                                    min={0} max={100}
                                                                    value={stop.offset}
                                                                    onChange={(e) => {
                                                                        setGradientStops(gradientStops.map(s => s.id === stop.id ? { ...s, offset: parseInt(e.target.value) } : s));
                                                                    }}
                                                                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    if (gradientStops.length > 2) {
                                                                        setGradientStops(gradientStops.filter(s => s.id !== stop.id));
                                                                    }
                                                                }}
                                                                disabled={gradientStops.length <= 2}
                                                                className={`p-1 rounded ${gradientStops.length <= 2 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 hover:text-red-400 hover:bg-zinc-800'}`}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const newId = Math.random().toString(36).substr(2, 9);
                                                            setGradientStops([...gradientStops, { id: newId, color: '#ffffff', offset: 50 }]);
                                                        }}
                                                        className="w-full py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                                                    >
                                                        + Add Stop
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </section>

                                    {/* Canvas Transform Section */}
                                    <section className="space-y-3">
                                        <SectionLabel>Canvas Transform</SectionLabel>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                {
                                                    id: 'rotate-ccw', label: '-90', icon: <RotateCcw size={18} />, action: () => {
                                                        if (!activeLayer) return;
                                                        updateLayer(activeLayer.id, { rotation: (activeLayer.rotation || 0) - 90 });
                                                    }
                                                },
                                                {
                                                    id: 'rotate-cw', label: '+90', icon: <RotateCw size={18} />, action: () => {
                                                        if (!activeLayer) return;
                                                        updateLayer(activeLayer.id, { rotation: (activeLayer.rotation || 0) + 90 });
                                                    }
                                                },
                                                {
                                                    id: 'flip-h', label: 'Flip H', icon: <FlipHorizontal size={18} />, action: () => {
                                                        if (!activeLayer) return;
                                                        updateLayer(activeLayer.id, { flipX: !activeLayer.flipX });
                                                    }
                                                },
                                                {
                                                    id: 'flip-v', label: 'Flip V', icon: <FlipVertical size={18} />, action: () => {
                                                        if (!activeLayer) return;
                                                        updateLayer(activeLayer.id, { flipY: !activeLayer.flipY });
                                                    }
                                                },
                                            ].map((tool) => (
                                                <button
                                                    key={tool.id}
                                                    onClick={tool.action}
                                                    className="flex flex-col items-center justify-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-600 transition-all active:scale-95 group"
                                                >
                                                    <div className="text-zinc-500 group-hover:text-indigo-400 transition-colors">
                                                        {tool.icon}
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-tight">{tool.label}</span>
                                                </button>
                                            ))}
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
                                        <Button variant="secondary" className="w-full gap-2 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 py-3 rounded-xl" onClick={() => {
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
                                <div className={`flex flex-col items-center justify-center ${isMobile ? 'h-32' : 'h-64'} text-zinc-500 animate-in fade-in`}>
                                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-2">
                                        <Sliders size={18} className="text-zinc-600" />
                                    </div>
                                    <p className="text-xs font-semibold text-zinc-400">No Layer Selected</p>
                                    <p className="text-[10px] text-zinc-600 mt-1">Select an item to adjust filters</p>
                                </div>
                            )}

                            {activeTab === 'text' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <button
                                        onClick={addTextLayer}
                                        className="relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 p-px group transition-all hover:scale-[1.01] active:scale-[0.99]"
                                    >
                                        <div className="relative bg-zinc-950/80 backdrop-blur-md rounded-[11px] py-5 px-4 flex items-center justify-center gap-3 transition-all group-hover:bg-blue-600/10">
                                            <div className="p-1 px-1.5 rounded-md bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                <Plus size={14} strokeWidth={3} />
                                            </div>
                                            <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white transition-colors uppercase tracking-widest ml-1">Add New Text</span>
                                        </div>
                                    </button>

                                    {activeLayer && activeLayer.type === 'text' && (
                                        <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                                            {/* Content Section */}
                                            <div className="bg-zinc-900/30 rounded-xl border border-zinc-800/50 p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Text Content</span>
                                                    <Type size={12} className="text-zinc-600" />
                                                </div>
                                                <textarea
                                                    value={activeLayer.text}
                                                    onChange={(e) => updateLayer(activeLayer.id, { text: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500/50 rounded-lg p-3 text-sm text-zinc-200 outline-none resize-none h-20 transition-all placeholder:text-zinc-700"
                                                    placeholder="Enter text..."
                                                />
                                            </div>

                                            {/* Typography Settings */}
                                            <div className="bg-zinc-900/30 rounded-xl border border-zinc-800/50 p-4 space-y-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Typography</span>
                                                    <button
                                                        onClick={() => fontInputRef.current?.click()}
                                                        className="text-[10px] text-indigo-500 hover:text-indigo-400 font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
                                                    >
                                                        <Plus size={10} /> Upload
                                                    </button>
                                                    <input
                                                        type="file"
                                                        ref={fontInputRef}
                                                        className="hidden"
                                                        accept=".ttf,.otf,.woff,.woff2"
                                                        onChange={handleFontUpload}
                                                    />
                                                </div>

                                                <select
                                                    value={activeLayer.fontFamily}
                                                    onChange={(e) => updateLayer(activeLayer.id, { fontFamily: e.target.value })}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200 outline-none focus:border-zinc-700 cursor-pointer font-medium"
                                                >
                                                    {FONTS.map(font => (
                                                        <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                                    ))}
                                                    {customFonts.length > 0 && (
                                                        <optgroup label="Custom Fonts">
                                                            {customFonts.map(font => (
                                                                <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                </select>

                                                {/* Size & Color Mixed Row */}
                                                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-zinc-800/30">
                                                    <div className="bg-zinc-950/30 rounded-lg border border-zinc-800/50 p-2 group focus-within:border-indigo-500/30 transition-colors">
                                                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-1 block">Font Size</span>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                value={activeLayer.fontSize}
                                                                onChange={(e) => updateLayer(activeLayer.id, { fontSize: parseInt(e.target.value) })}
                                                                className="w-full bg-transparent border-none p-0 text-sm font-bold text-zinc-200 outline-none"
                                                            />
                                                            <span className="text-[9px] text-zinc-700 font-bold">PX</span>
                                                        </div>
                                                    </div>

                                                    <div className="bg-zinc-950/30 rounded-lg border border-zinc-800/50 p-2 transition-colors">
                                                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-1 block">Text Color</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="relative w-5 h-5 rounded-md overflow-hidden border border-zinc-800 cursor-pointer shadow-inner shrink-0">
                                                                <input
                                                                    type="color"
                                                                    value={activeLayer.color}
                                                                    onChange={(e) => updateLayer(activeLayer.id, { color: e.target.value })}
                                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                                                />
                                                                <div className="w-full h-full" style={{ backgroundColor: activeLayer.color }} />
                                                            </div>
                                                            <span className="text-[10px] font-mono text-zinc-500 uppercase">{activeLayer.color}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4">
                                                    <div className="flex bg-zinc-950/50 rounded-lg p-1 border border-zinc-800/50 flex-1">
                                                        {[
                                                            { id: 'bold', icon: <Bold size={14} />, active: activeLayer.fontWeight === 'bold', action: () => updateLayer(activeLayer.id, { fontWeight: activeLayer.fontWeight === 'bold' ? 'normal' : 'bold' }) },
                                                            { id: 'italic', icon: <Italic size={14} />, active: activeLayer.fontStyle === 'italic', action: () => updateLayer(activeLayer.id, { fontStyle: activeLayer.fontStyle === 'italic' ? 'normal' : 'italic' }) },
                                                            { id: 'underline', icon: <Underline size={14} />, active: activeLayer.textDecoration === 'underline', action: () => updateLayer(activeLayer.id, { textDecoration: activeLayer.textDecoration === 'underline' ? 'none' : 'underline' }) },
                                                        ].map((tool) => (
                                                            <button
                                                                key={tool.id}
                                                                onClick={tool.action}
                                                                className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${tool.active ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                            >
                                                                {tool.icon}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="flex bg-zinc-950/50 rounded-lg p-1 border border-zinc-800/50 flex-1">
                                                        {['left', 'center', 'right'].map((align) => (
                                                            <button
                                                                key={align}
                                                                onClick={() => updateLayer(activeLayer.id, { textAlign: align as any })}
                                                                className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${activeLayer.textAlign === align ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                                title={`Align ${align}`}
                                                            >
                                                                {align === 'left' && <AlignLeft size={14} />}
                                                                {align === 'center' && <AlignCenter size={14} />}
                                                                {align === 'right' && <AlignRight size={14} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-zinc-800/30">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Align</span>
                                                        <div className="flex bg-zinc-950/40 rounded-lg p-0.5 border border-zinc-800/50 flex-1 justify-between">
                                                            {[
                                                                {
                                                                    id: 'left', icon: <AlignStartHorizontal size={12} />, action: () => {
                                                                        const lw = activeLayer.width || 0;
                                                                        const newX = activeLayer.type === 'text' ? lw / 2 : 0;
                                                                        updateLayer(activeLayer.id, { x: newX });
                                                                    }
                                                                },
                                                                {
                                                                    id: 'center-h', icon: <AlignCenterHorizontal size={12} />, action: () => {
                                                                        const lw = activeLayer.width || 0;
                                                                        const newX = activeLayer.type === 'text' ? canvasSize.width / 2 : (canvasSize.width / 2 - lw / 2);
                                                                        updateLayer(activeLayer.id, { x: newX });
                                                                    }
                                                                },
                                                                {
                                                                    id: 'right', icon: <AlignEndHorizontal size={12} />, action: () => {
                                                                        const lw = activeLayer.width || 0;
                                                                        const newX = activeLayer.type === 'text' ? canvasSize.width - lw / 2 : canvasSize.width - lw;
                                                                        updateLayer(activeLayer.id, { x: newX });
                                                                    }
                                                                },
                                                                {
                                                                    id: 'top', icon: <AlignStartVertical size={12} />, action: () => {
                                                                        const lh = activeLayer.height || 0;
                                                                        const newY = activeLayer.type === 'text' ? lh / 2 : 0;
                                                                        updateLayer(activeLayer.id, { y: newY });
                                                                    }
                                                                },
                                                                {
                                                                    id: 'center-v', icon: <AlignCenterVertical size={12} />, action: () => {
                                                                        const lh = activeLayer.height || 0;
                                                                        const newY = activeLayer.type === 'text' ? canvasSize.height / 2 : (canvasSize.height / 2 - lh / 2);
                                                                        updateLayer(activeLayer.id, { y: newY });
                                                                    }
                                                                },
                                                                {
                                                                    id: 'bottom', icon: <AlignEndVertical size={12} />, action: () => {
                                                                        const lh = activeLayer.height || 0;
                                                                        const newY = activeLayer.type === 'text' ? canvasSize.height - lh / 2 : canvasSize.height - lh;
                                                                        updateLayer(activeLayer.id, { y: newY });
                                                                    }
                                                                },
                                                            ].map((tool) => (
                                                                <button
                                                                    key={tool.id}
                                                                    onClick={tool.action}
                                                                    className="p-1.5 rounded-md text-zinc-500 hover:text-blue-400 hover:bg-zinc-900 transition-all"
                                                                    title={`Align ${tool.id}`}
                                                                >
                                                                    {tool.icon}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
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

                        {/* Resource Monitor Footer */}
                        {!isMobile && (
                            <div className="mt-auto px-6 py-4 border-t border-zinc-900 bg-zinc-950/50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Activity size={10} className="text-blue-500 animate-pulse" />
                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Workspace Health</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-zinc-600">
                                        {Math.round((canvasSize.width * canvasSize.height * layers.length * 4) / (1024 * 1024))}MB
                                    </span>
                                </div>
                                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden mb-1">
                                    <div
                                        className="h-full bg-blue-600 transition-all duration-1000 ease-in-out"
                                        style={{ width: `${Math.min(100, (layers.length / 20) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[8px] font-medium text-zinc-700 uppercase tracking-tighter">
                                    <span>Idle</span>
                                    <span>Optimal</span>
                                    <span>Peak</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div >

                {/* Export Button */}
                < div className={`${isMobile ? 'p-4 border-t-0' : 'p-4 border-t border-zinc-800'} bg-zinc-950 mt-auto shrink-0 z-10 w-full`}>
                    <div className="flex items-center gap-2">
                        {!isMobile && (
                            <button
                                onClick={() => setNavMode(prev => prev === 'sidebar' ? 'sidebar-right' : prev === 'sidebar-right' ? 'top' : 'sidebar')}
                                className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
                                title={navMode === 'sidebar' ? "Move to Right" : navMode === 'sidebar-right' ? "Switch to Top" : "Move to Left"}
                            >
                                {navMode === 'sidebar' && <PanelLeft size={18} />}
                                {navMode === 'sidebar-right' && <PanelRight size={18} />}
                                {navMode === 'top' && <PanelTop size={18} />}
                            </button>
                        )}
                        <Button onClick={downloadImage} className={`flex-1 gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/20 ${isMobile ? 'py-5 rounded-2xl' : ''}`} >
                            <Download size={18} />
                            Export Image
                        </Button>
                    </div>
                </div >
            </div >

            {/* Main Canvas Area (Fixed Section on Mobile) */}
            < div
                style={isMobile ? { height: `${mobileCanvasHeight}vh` } : {}}
                className={`flex flex-col min-w-0 bg-zinc-950 overflow-hidden ${isMobile ? 'order-1 fixed top-16 left-0 right-0 z-40 border-b border-zinc-900 shadow-md' : 'flex-1 rounded-xl border border-zinc-800'}`}
            >
                {/* Toolbar */}
                < div className="h-12 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-4" >
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
                </div >

                {/* Canvas Container */}
                < div
                    ref={containerRef}
                    className="flex-1 overflow-auto bg-zinc-950 relative p-8 flex items-center justify-center origin-center"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setActiveLayerId(null);
                            setIsContextMenuOpen(false);
                            setIsCropping(false);
                        }
                    }}
                >
                    {/* Dotted Background for the Workspace Area */}
                    < div className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    ></div >

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
                                        const lines = layer.text.split('\n');
                                        let maxWidth = 0;
                                        lines.forEach(line => {
                                            const w = ctx.measureText(line).width;
                                            if (w > maxWidth) maxWidth = w;
                                        });
                                        lW = maxWidth;
                                        lH = ((layer.fontSize || 40) * 1.2) * lines.length;

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
                                    if (clickedLayer.type === 'shape') {
                                        if (isMobile) setActiveTab('edit');
                                        else { setRightTab('edit'); setShowRightSidebar(true); }
                                    }
                                    if (clickedLayer.type === 'image') setActiveTab('canvas');
                                    if (clickedLayer.type === 'text') {
                                        if (isMobile) setActiveTab('text');
                                        else {
                                            setActiveTab('text');
                                            setRightTab('edit');
                                            setShowRightSidebar(true);
                                        }
                                    }
                                } else {
                                    // Clicked empty space
                                    setActiveLayerId(null);
                                    setIsCropping(false);
                                    setIsContextMenuOpen(false);
                                }
                            }}
                            onDoubleClick={(e) => {
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

                                // Check for text layer hit
                                const clickedLayer = layers.find(layer => {
                                    if (!layer.visible || layer.locked || layer.type !== 'text' || !layer.text) return false;

                                    ctx.font = `${layer.fontStyle || 'normal'} ${layer.fontWeight || 'normal'} ${layer.fontSize || 40}px ${layer.fontFamily || 'Arial'}`;
                                    const lines = layer.text.split('\n');
                                    let maxWidth = 0;
                                    lines.forEach(line => {
                                        const w = ctx.measureText(line).width;
                                        if (w > maxWidth) maxWidth = w;
                                    });
                                    const lW = maxWidth;
                                    const lH = ((layer.fontSize || 40) * 1.2) * lines.length;

                                    const left = layer.x - lW / 2;
                                    const right = layer.x + lW / 2;
                                    const top = layer.y - lH / 2;
                                    const bottom = layer.y + lH / 2;

                                    return x >= left && x <= right && y >= top && y <= bottom;
                                });

                                if (clickedLayer) {
                                    setEditingTextLayerId(clickedLayer.id);
                                    setEditingTextValue(clickedLayer.text || '');
                                    setActiveLayerId(clickedLayer.id);
                                }
                            }}
                        />

                        {/* Inline Text Editor Overlay */}
                        {editingTextLayerId && (() => {
                            const layer = layers.find(l => l.id === editingTextLayerId);
                            if (!layer || layer.type !== 'text') return null;

                            return (
                                <textarea
                                    value={editingTextValue}
                                    autoFocus
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        setEditingTextValue(newVal);
                                        updateLayer(layer.id, { text: newVal });
                                    }}
                                    onBlur={() => setEditingTextLayerId(null)}
                                    // Make sure it doesn't propagate to canvas drag
                                    onMouseDown={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'absolute',
                                        left: `${layer.x * zoom}px`,
                                        top: `${layer.y * zoom}px`,
                                        transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg) scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})`,
                                        fontSize: `${(layer.fontSize || 40) * zoom}px`,
                                        fontFamily: layer.fontFamily,
                                        fontWeight: layer.fontWeight,
                                        fontStyle: layer.fontStyle,
                                        color: layer.color,
                                        opacity: layer.opacity,
                                        textAlign: layer.textAlign || 'center',
                                        background: 'transparent',
                                        border: '1px dashed #3b82f6',
                                        outline: 'none',
                                        resize: 'none',
                                        overflow: 'hidden',
                                        whiteSpace: 'pre',
                                        padding: 0,
                                        margin: 0,
                                        // Dynamic sizing based on content
                                        width: (() => {
                                            const ctx = canvasRef.current?.getContext('2d');
                                            if (ctx) {
                                                ctx.font = `${layer.fontStyle || 'normal'} ${layer.fontWeight || 'normal'} ${layer.fontSize || 40}px ${layer.fontFamily || 'Arial'}`;
                                                // Add significant character buffer for caret and typing comfort
                                                return `${(ctx.measureText(editingTextValue || ' ').width + (layer.fontSize || 40)) * zoom + 20}px`;
                                            }
                                            return 'auto';
                                        })(),
                                        height: `${(layer.fontSize || 40) * zoom * 1.2}px`, // 1.2 line height buffer
                                        lineHeight: `${(layer.fontSize || 40) * zoom * 1.2}px`, // Vertically center 
                                    }}
                                    className="bg-transparent overflow-hidden place-content-center"
                                />
                            );
                        })()}

                        {/* Selection & Resize Overlay */}


                        {/* Correct Approach: Selection Overlay using DOM elements positioned by Zoom */}
                        {activeLayer && !isCanvasLocked && layers.find(l => l.id === activeLayerId)?.visible && (() => {
                            const rect = (() => {
                                let { x, y, width = 0, height = 0, type, textAlign = 'center' } = activeLayer;
                                let left = x;
                                let top = y;

                                if (type === 'text') {
                                    // Calculate dynamic dimensions for text
                                    const canvas = canvasRef.current;
                                    const ctx = canvas?.getContext('2d');
                                    let lW = width;
                                    let lH = height;

                                    if (ctx && activeLayer.text) {
                                        ctx.font = `${activeLayer.fontStyle || 'normal'} ${activeLayer.fontWeight || 'normal'} ${activeLayer.fontSize || 40}px ${activeLayer.fontFamily || 'Arial'}`;
                                        const lines = activeLayer.text.split('\n');
                                        let maxWidth = 0;
                                        lines.forEach(line => {
                                            const w = ctx.measureText(line).width;
                                            if (w > maxWidth) maxWidth = w;
                                        });
                                        lW = maxWidth;
                                        lH = ((activeLayer.fontSize || 40) * 1.2) * lines.length;
                                    }

                                    top = y - lH / 2;
                                    width = lW;
                                    height = lH;

                                    if (textAlign === 'center') left = x - width / 2;
                                    else if (textAlign === 'right') left = x - width;
                                }

                                return {
                                    left: left * zoom,
                                    top: top * zoom,
                                    width: width * zoom,
                                    height: height * zoom,
                                    centerX: (left + width / 2) * zoom,
                                    centerY: (top + height / 2) * zoom
                                };
                            })();

                            return (
                                <>
                                    {/* Floating Toolbar */}
                                    <div
                                        className="absolute z-50 flex items-center gap-1 bg-white rounded-lg shadow-xl px-2 py-1.5 pointer-events-auto transform -translate-x-1/2"
                                        style={{
                                            left: rect.centerX,
                                            top: rect.top - 50 // 50px above
                                        }}
                                    >
                                        {activeLayer.type === 'image' && (
                                            <>
                                                <button
                                                    className={`p-1.5 hover:bg-zinc-100 rounded transition-colors ${isCropping ? 'bg-blue-50 text-blue-600' : 'text-zinc-600'}`}
                                                    title="Crop"
                                                    onClick={() => setIsCropping(!isCropping)}
                                                >
                                                    <Crop size={16} />
                                                </button>
                                                {isCropping && (
                                                    <>
                                                        <button
                                                            className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-green-50 rounded text-green-600 text-xs font-medium"
                                                            title="Apply Crop"
                                                            onClick={() => {
                                                                const layer = layers.find(l => l.id === activeLayerId);
                                                                if (!layer?.image || layer.type !== 'image') return;
                                                                const offscreen = document.createElement('canvas');
                                                                offscreen.width = layer.width || layer.image.naturalWidth;
                                                                offscreen.height = layer.height || layer.image.naturalHeight;
                                                                const ctx = offscreen.getContext('2d')!;
                                                                ctx.drawImage(layer.image, layer.cropX || 0, layer.cropY || 0, layer.cropWidth || layer.image.naturalWidth, layer.cropHeight || layer.image.naturalHeight, 0, 0, offscreen.width, offscreen.height);
                                                                const newImg = new Image();
                                                                newImg.onload = () => {
                                                                    updateLayer(layer.id, { image: newImg, src: offscreen.toDataURL(), cropX: 0, cropY: 0, cropWidth: newImg.naturalWidth, cropHeight: newImg.naturalHeight });
                                                                };
                                                                newImg.src = offscreen.toDataURL();
                                                                setIsCropping(false);
                                                            }}
                                                        >
                                                            <span>Apply</span>
                                                        </button>
                                                        <button
                                                            className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-red-50 rounded text-red-600 text-xs font-medium"
                                                            title="Cancel Crop"
                                                            onClick={() => { 
                                                                updateLayer(activeLayerId, { cropX: 0, cropY: 0, cropWidth: activeLayer.image?.naturalWidth, cropHeight: activeLayer.image?.naturalHeight }); 
                                                                setIsCropping(false); 
                                                            }}
                                                        >
                                                            <span>Cancel</span>
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-zinc-100 rounded text-zinc-600 text-xs font-medium"
                                                    title="Replace Image"
                                                    onClick={() => replaceFileInputRef.current?.click()}
                                                >
                                                    <ImageIcon size={14} />
                                                    <span>Replace</span>
                                                </button>
                                                <div className="w-px h-4 bg-zinc-200 mx-1"></div>
                                            </>
                                        )}
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
                                            left: rect.left,
                                            top: rect.top,
                                            width: rect.width,
                                            height: rect.height,
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
                                                            my: e.clientY,
                                                            cropX: activeLayer.cropX || 0,
                                                            cropY: activeLayer.cropY || 0,
                                                            cropW: activeLayer.cropWidth || activeLayer.image?.width || 0,
                                                            cropH: activeLayer.cropHeight || activeLayer.image?.height || 0
                                                        } as any);
                                                    }}
                                                />
                                            );
                                        })}

                                        {/* Rotation Handle (extra) */}
                                        <div
                                            className="absolute w-6 h-6 bg-white border border-indigo-500 rounded-full flex items-center justify-center cursor-grab left-1/2 -top-8 -ml-3 pointer-events-auto shadow-sm text-indigo-500 hover:text-indigo-600"
                                        >
                                            <RotateCw size={12} />
                                        </div>
                                    </div>
                                </>
                            );
                        })()}


                        {/* Dotted Border Overlay for Dimension Indication */}
                        <div className="absolute inset-0 border-2 border-dashed border-zinc-600/50 pointer-events-none z-20"></div>

                        {/* Empty State Overlay - Click to Upload */}
                        {layers.length === 0 && bgType === 'solid' && bgColor === 'transparent' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-6 bg-zinc-900/80 backdrop-blur-sm border-2 border-dashed border-zinc-600 rounded-xl hover:border-indigo-500 hover:bg-zinc-800/90 transition-all group flex flex-col items-center gap-3"
                                >
                                    <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
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
                    </div >
                </div >

                {/* Mobile Resize Handle */}
                {
                    isMobile && (
                        <div
                            className="h-6 w-full flex items-center justify-center bg-zinc-900 border-t border-zinc-800 absolute bottom-0 left-0 cursor-row-resize z-50 overflow-hidden"
                            onTouchStart={(e) => {
                                e.stopPropagation();
                                setIsResizingMobileCanvas(true);
                            }}
                        >
                            <div className="w-10 h-1 bg-zinc-700/50 rounded-full"></div>
                        </div>
                    )
                }
            </div >

            {/* Bottom Navigation Navbar - Fixed on Mobile above App Navbar */}
            {
                isMobile && (
                    <div className="order-3 h-16 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900 flex items-center justify-around shrink-0 z-40 fixed bottom-20 left-0 right-0 shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
                        {['canvas', 'edit', 'text', 'shapes', 'layers'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab ? 'text-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <div className={`p-1.5 rounded-xl transition-all ${activeTab === tab ? 'bg-indigo-500/10 scale-110' : ''}`}>
                                    {tab === 'canvas' && <Crop size={22} strokeWidth={2.5} />}
                                    {tab === 'edit' && <Sliders size={22} strokeWidth={2.5} />}
                                    {tab === 'text' && <Type size={22} strokeWidth={2.5} />}
                                    {tab === 'shapes' && <Shapes size={22} strokeWidth={2.5} />}
                                    {tab === 'layers' && <Layers size={22} strokeWidth={2.5} />}
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-widest">{tab}</span>
                            </button>
                        ))}
                    </div>
                )
            }
        </div >
    );
};
