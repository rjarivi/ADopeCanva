import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import {
    Palette, Download, Plus, Trash2, Shuffle, Copy, Check,
    ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
    Layers, Circle,
} from 'lucide-react';

// ─── OKLCH ↔ Hex ─────────────────────────────────────────────────────────────

function oklch2hex(l: number, c: number, h: number): string {
    const hr = (h * Math.PI) / 180;
    const a = c * Math.cos(hr), b = c * Math.sin(hr);
    const lp = Math.cbrt(l + 0.3963377774 * a + 0.2158037573 * b);
    const mp = Math.cbrt(l - 0.1055613458 * a - 0.0638541728 * b);
    const sp = Math.cbrt(l - 0.0894841775 * a - 1.2914855480 * b);
    const lr = lp ** 3, mr = mp ** 3, sr = sp ** 3;
    const g = (x: number) => { const v = Math.max(0, Math.min(1, x)); return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; };
    const r  = Math.round(g(+4.0767416621 * lr - 3.3077115913 * mr + 0.2309699292 * sr) * 255);
    const gv = Math.round(g(-1.2684380046 * lr + 2.6097574011 * mr - 0.3413193965 * sr) * 255);
    const bv = Math.round(g(-0.0041960863 * lr - 0.7034186147 * mr + 1.7076147010 * sr) * 255);
    return `#${r.toString(16).padStart(2,'0')}${gv.toString(16).padStart(2,'0')}${bv.toString(16).padStart(2,'0')}`;
}

function hex2oklch(hex: string): { l: number; c: number; h: number } {
    const normalizedHex = hex.length === 4 
        ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` 
        : hex;
    const ri = parseInt(normalizedHex.slice(1,3),16)/255, gi = parseInt(normalizedHex.slice(3,5),16)/255, bi = parseInt(normalizedHex.slice(5,7),16)/255;
    const lin = (x: number) => x <= 0.04045 ? x / 12.92 : ((x+0.055)/1.055)**2.4;
    const rl = lin(ri), gl = lin(gi), bl = lin(bi);
    const lp = Math.cbrt(0.4122214708*rl + 0.5363325363*gl + 0.0514459929*bl);
    const mp = Math.cbrt(0.2119034982*rl + 0.6806995451*gl + 0.1073969566*bl);
    const sp = Math.cbrt(0.0883024619*rl + 0.2817188376*gl + 0.6299787005*bl);
    const L    = 0.2104542553*lp + 0.7936177850*mp - 0.0040720468*sp;
    const aLab = 1.9779984951*lp - 2.4285922050*mp + 0.4505937099*sp;
    const bLab = 0.0259040371*lp + 0.7827717662*mp - 0.8086757660*sp;
    return { l: Math.max(0,Math.min(1,L)), c: Math.max(0, Math.sqrt(aLab**2+bLab**2)), h: ((Math.atan2(bLab,aLab)*180/Math.PI)+360)%360 };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type GradientType = 'linear' | 'radial' | 'conic';
type AppMode = 'css' | 'mesh';

interface ColorStop {
    id: string;
    color: string; // hex, always synced with l/c/h
    l: number; c: number; h: number;
    position: number;
}

interface MeshBlob {
    id: string;
    hex: string;
    x: number;    // 0–100 %
    y: number;    // 0–100 %
    size: number; // diameter in px (reference: 800px canvas)
    blur: number; // blur in px (reference: 800px canvas)
}

// ─── Presets ──────────────────────────────────────────────────────────────────

interface OklchPreset {
    name: string;
    type: GradientType;
    angle: number;
    stops: Array<{ l: number; c: number; h: number; position: number }>;
}

const PRESETS_2: OklchPreset[] = [
    { name: 'Ocean',        type:'linear', angle:135, stops:[{l:0.70,c:0.22,h:248,position:0},{l:0.62,c:0.20,h:280,position:100}] },
    { name: 'Candy',        type:'linear', angle:135, stops:[{l:0.80,c:0.22,h:355,position:0},{l:0.72,c:0.26,h:290,position:100}] },
    { name: 'Forest',       type:'linear', angle:180, stops:[{l:0.72,c:0.22,h:150,position:0},{l:0.60,c:0.18,h:175,position:100}] },
    { name: 'Gold',         type:'linear', angle: 90, stops:[{l:0.88,c:0.24,h: 78,position:0},{l:0.75,c:0.28,h: 52,position:100}] },
    { name: 'Lava',         type:'radial', angle:  0, stops:[{l:0.65,c:0.28,h: 25,position:0},{l:0.82,c:0.25,h: 55,position:100}] },
    { name: 'Mint Cyan',    type:'linear', angle:180, stops:[{l:0.94,c:0.26,h:248,position:0},{l:0.91,c:0.19,h:139,position:100}] },
    { name: 'Pink Haze',    type:'linear', angle:135, stops:[{l:0.80,c:0.18,h:340,position:0},{l:0.70,c:0.20,h:280,position:100}] },
    { name: 'Tangerine',    type:'linear', angle:135, stops:[{l:0.88,c:0.25,h: 60,position:0},{l:0.78,c:0.28,h: 35,position:100}] },
    { name: 'Cerulean',     type:'linear', angle:135, stops:[{l:0.76,c:0.22,h:255,position:0},{l:0.88,c:0.18,h:220,position:100}] },
    { name: 'Neon Violet',  type:'linear', angle:135, stops:[{l:0.68,c:0.30,h:295,position:0},{l:0.82,c:0.28,h:260,position:100}] },
    { name: 'Ember',        type:'linear', angle:135, stops:[{l:0.82,c:0.28,h: 40,position:0},{l:0.52,c:0.25,h: 15,position:100}] },
    { name: 'Twilight',     type:'linear', angle:135, stops:[{l:0.52,c:0.20,h:275,position:0},{l:0.72,c:0.22,h:305,position:100}] },
    { name: 'Lime Flash',   type:'linear', angle: 90, stops:[{l:0.92,c:0.25,h:130,position:0},{l:0.78,c:0.20,h:155,position:100}] },
    { name: 'Sea Glass',    type:'linear', angle:135, stops:[{l:0.85,c:0.12,h:175,position:0},{l:0.70,c:0.15,h:200,position:100}] },
    { name: 'Lavender',     type:'linear', angle:135, stops:[{l:0.82,c:0.14,h:295,position:0},{l:0.88,c:0.10,h:255,position:100}] },
    { name: 'Deep Ocean',   type:'linear', angle:135, stops:[{l:0.45,c:0.15,h:240,position:0},{l:0.72,c:0.20,h:210,position:100}] },
];

const PRESETS_3: OklchPreset[] = [
    { name: 'Sunset',       type:'linear', angle: 45, stops:[{l:0.72,c:0.26,h: 40,position:0},{l:0.70,c:0.28,h:350,position:50},{l:0.62,c:0.22,h:290,position:100}] },
    { name: 'Aurora',       type:'conic',  angle:  0, stops:[{l:0.72,c:0.22,h:155,position:0},{l:0.65,c:0.26,h:205,position:50},{l:0.60,c:0.20,h:275,position:100}] },
    { name: 'Midnight',     type:'linear', angle:160, stops:[{l:0.25,c:0.12,h:270,position:0},{l:0.32,c:0.16,h:280,position:50},{l:0.18,c:0.08,h:240,position:100}] },
    { name: 'Sunrise',      type:'linear', angle:  0, stops:[{l:0.90,c:0.20,h: 60,position:0},{l:0.85,c:0.25,h: 30,position:50},{l:0.75,c:0.20,h:350,position:100}] },
    { name: 'Ocean Tide',   type:'linear', angle:180, stops:[{l:0.45,c:0.15,h:245,position:0},{l:0.70,c:0.20,h:210,position:50},{l:0.88,c:0.15,h:185,position:100}] },
    { name: 'Tropical',     type:'linear', angle: 90, stops:[{l:0.88,c:0.20,h:200,position:0},{l:0.85,c:0.25,h:130,position:50},{l:0.90,c:0.20,h: 80,position:100}] },
    { name: 'Fire Opal',    type:'linear', angle:135, stops:[{l:0.88,c:0.25,h: 50,position:0},{l:0.80,c:0.28,h: 20,position:50},{l:0.65,c:0.22,h:350,position:100}] },
    { name: 'Amethyst',     type:'linear', angle:135, stops:[{l:0.62,c:0.22,h:285,position:0},{l:0.72,c:0.20,h:315,position:50},{l:0.82,c:0.16,h:345,position:100}] },
    { name: 'Peach Fuzz',   type:'linear', angle:135, stops:[{l:0.90,c:0.12,h: 50,position:0},{l:0.85,c:0.15,h: 30,position:50},{l:0.80,c:0.18,h: 15,position:100}] },
    { name: 'Cotton Candy', type:'linear', angle:135, stops:[{l:0.88,c:0.18,h:350,position:0},{l:0.86,c:0.14,h:285,position:50},{l:0.82,c:0.22,h:220,position:100}] },
    { name: 'Golden Hour',  type:'linear', angle: 45, stops:[{l:0.95,c:0.18,h: 90,position:0},{l:0.88,c:0.24,h: 55,position:50},{l:0.78,c:0.28,h: 25,position:100}] },
    { name: 'Nebula',       type:'radial', angle:  0, stops:[{l:0.60,c:0.22,h:270,position:0},{l:0.50,c:0.28,h:300,position:50},{l:0.42,c:0.20,h:340,position:100}] },
];

// ─── Defaults ─────────────────────────────────────────────────────────────────

const SIZE_PRESETS = [
    { label: 'Square 800',   w: 800,  h: 800  },
    { label: 'HD 1280×720',  w: 1280, h: 720  },
    { label: 'FHD 1920×1080',w: 1920, h: 1080 },
    { label: 'Story 1080×1920', w:1080,h:1920 },
    { label: 'Banner 1500×500', w:1500,h:500  },
];

const DEFAULT_BLOBS: MeshBlob[] = [
    { id:'1', hex:'#6366f1', x:28, y:35, size:450, blur:130 },
    { id:'2', hex:'#ec4899', x:72, y:65, size:380, blur:120 },
    { id:'3', hex:'#06b6d4', x:52, y:82, size:320, blur:110 },
];

function uid() { return Math.random().toString(36).slice(2); }

function makeStop(hex: string, position: number): ColorStop {
    const { l, c, h } = hex2oklch(hex);
    return { id: uid(), color: hex, l, c, h, position };
}

// ─── OklchSlider ──────────────────────────────────────────────────────────────

const OklchSlider: React.FC<{
    label: string; value: number; min: number; max: number; step: number;
    displayValue: string; trackStyle: React.CSSProperties;
    onChange: (v: number) => void;
}> = ({ label, value, min, max, step, displayValue, trackStyle, onChange }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{label}</span>
            <span className="text-[10px] font-mono text-zinc-400">{displayValue}</span>
        </div>
        <div className="relative h-5 flex items-center">
            <div className="absolute inset-x-0 h-2 top-1.5 rounded-full" style={trackStyle} />
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full relative z-10 appearance-none h-2 bg-transparent cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
                           [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5
                           [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
                           [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
            />
        </div>
    </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const GradientCreator: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // ── App mode ──────────────────────────────────────────────────────────────
    const [appMode, setAppMode] = useState<AppMode>('css');

    // ── CSS gradient ──────────────────────────────────────────────────────────
    const [type, setType]       = useState<GradientType>('linear');
    const [angle, setAngle]     = useState(135);
    const [stops, setStops]     = useState<ColorStop[]>([
        makeStop('#6366f1', 0),
        makeStop('#ec4899', 100),
    ]);
    const [width, setWidth]   = useState(800);
    const [height, setHeight] = useState(800);
    const [customW, setCustomW] = useState('800');
    const [customH, setCustomH] = useState('800');
    const [format, setFormat]   = useState<'png' | 'jpeg'>('png');
    const [oklchMode, setOklchMode] = useState(false);
    const [presetTab, setPresetTab] = useState<'2' | '3'>('2');

    // ── Mesh gradient ─────────────────────────────────────────────────────────
    const [meshBg, setMeshBg] = useState('#0d0d1a');
    const [blobs, setBlobs]   = useState<MeshBlob[]>(DEFAULT_BLOBS.map(b => ({ ...b, id: uid() })));

    // ── UI ────────────────────────────────────────────────────────────────────
    const [copied, setCopied] = useState(false);

    // ── Derived ───────────────────────────────────────────────────────────────
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);

    const cssString = (() => {
        const s = sortedStops.map(st => `${st.color} ${st.position}%`).join(', ');
        if (type === 'linear') return `linear-gradient(${angle}deg, ${s})`;
        if (type === 'radial') return `radial-gradient(circle, ${s})`;
        return `conic-gradient(from ${angle}deg, ${s})`;
    })();

    // ── Draw ──────────────────────────────────────────────────────────────────
    const drawCSS = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = width; canvas.height = height;
        let grad: CanvasGradient;
        if (type === 'linear') {
            const rad = ((angle - 90) * Math.PI) / 180;
            const cx = width / 2, cy = height / 2;
            const len = Math.sqrt(width * width + height * height) / 2;
            grad = ctx.createLinearGradient(cx - Math.cos(rad)*len, cy - Math.sin(rad)*len, cx + Math.cos(rad)*len, cy + Math.sin(rad)*len);
        } else if (type === 'radial') {
            grad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.hypot(width, height)/2);
        } else {
            const conicStartAngle = ((angle - 90) * Math.PI) / 180;
            grad = ctx.createConicGradient(conicStartAngle, width/2, height/2);
        }
        sortedStops.forEach(s => grad.addColorStop(s.position / 100, s.color));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }, [type, angle, sortedStops, width, height]);

    const drawMesh = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = width; canvas.height = height;
        const scale = Math.min(width, height) / 800;
        ctx.fillStyle = meshBg;
        ctx.fillRect(0, 0, width, height);
        blobs.forEach(blob => {
            ctx.save();
            ctx.filter = `blur(${blob.blur * scale}px)`;
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.arc(blob.x * width / 100, blob.y * height / 100, blob.size * scale / 2, 0, Math.PI * 2);
            ctx.fillStyle = blob.hex;
            ctx.fill();
            ctx.restore();
        });
    }, [meshBg, blobs, width, height]);

    useEffect(() => {
        if (appMode === 'css') drawCSS();
        else drawMesh();
    }, [appMode, drawCSS, drawMesh]);

    // ── CSS stop helpers ──────────────────────────────────────────────────────
    const updateStopHex = (id: string, hex: string) => {
        const okl = hex2oklch(hex);
        setStops(prev => prev.map(s => s.id === id ? { ...s, color: hex, ...okl } : s));
    };

    const updateStopOklch = (id: string, patch: Partial<{ l: number; c: number; h: number }>) => {
        setStops(prev => prev.map(s => {
            if (s.id !== id) return s;
            const next = { ...s, ...patch };
            return { ...next, color: oklch2hex(next.l, next.c, next.h) };
        }));
    };

    const updateStopPosition = (id: string, position: number) =>
        setStops(prev => prev.map(s => s.id === id ? { ...s, position } : s));

    const addStop = () => {
        const midPos = Math.min(sortedStops[sortedStops.length - 1].position + 10, 100);
        setStops(prev => [...prev, makeStop('#ffffff', midPos)]);
    };

    const removeStop = (id: string) => {
        if (stops.length <= 2) return;
        setStops(prev => prev.filter(s => s.id !== id));
    };

    const handleShuffle = () => {
        const rnd = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
        setStops(prev => prev.map(s => { const hex = rnd(); return { ...s, color: hex, ...hex2oklch(hex) }; }));
    };

    const applyPreset = (preset: OklchPreset) => {
        setType(preset.type);
        setAngle(preset.angle);
        setStops(preset.stops.map(st => {
            const hex = oklch2hex(st.l, st.c, st.h);
            return { id: uid(), color: hex, l: st.l, c: st.c, h: st.h, position: st.position };
        }));
    };

    // ── Mesh helpers ──────────────────────────────────────────────────────────
    const updateBlob = (id: string, patch: Partial<MeshBlob>) =>
        setBlobs(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));

    const addBlob = () => setBlobs(prev => [...prev, { id: uid(), hex: '#8b5cf6', x: 50, y: 50, size: 300, blur: 100 }]);
    const removeBlob = (id: string) => setBlobs(prev => prev.filter(b => b.id !== id));

    // ── Export ────────────────────────────────────────────────────────────────
    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.href = canvas.toDataURL(`image/${format}`, 0.95);
        link.download = `gradient.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const copyCSS = () => {
        navigator.clipboard.writeText(`background: ${cssString};`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const applySize = (w: number, h: number) => {
        setWidth(w); setHeight(h);
        setCustomW(String(w)); setCustomH(String(h));
    };

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col md:flex-row gap-4 animate-slide-up">

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <aside className="w-full md:w-72 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">

                {/* Mode toggle */}
                <div className="flex gap-1 bg-zinc-900 rounded-2xl border border-zinc-800 p-1">
                    <button
                        onClick={() => setAppMode('css')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${appMode === 'css' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        CSS Gradient
                    </button>
                    <button
                        onClick={() => setAppMode('mesh')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${appMode === 'mesh' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Mesh Gradient
                    </button>
                </div>

                {/* ─── CSS MODE ───────────────────────────────────────────── */}
                {appMode === 'css' && <>

                    {/* Gradient type */}
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gradient Type</p>
                        <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                            {(['linear','radial','conic'] as GradientType[]).map(t => (
                                <button key={t} onClick={() => setType(t)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${type === t ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>

                        {(type === 'linear' || type === 'conic') && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-zinc-500 font-bold uppercase tracking-widest">Angle</span>
                                    <span className="text-indigo-400 font-mono">{angle}°</span>
                                </div>
                                {/* Direction shortcuts */}
                                <div className="flex justify-center gap-1">
                                    {([
                                        { Icon: ChevronUp,    deg: 0   },
                                        { Icon: ChevronRight, deg: 90  },
                                        { Icon: ChevronDown,  deg: 180 },
                                        { Icon: ChevronLeft,  deg: 270 },
                                    ] as const).map(({ Icon, deg }) => (
                                        <button key={deg} onClick={() => setAngle(deg)}
                                            className={`p-1.5 rounded-lg transition-all ${angle === deg ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700'}`}>
                                            <Icon size={12} />
                                        </button>
                                    ))}
                                    <div className="flex-1">
                                        <input type="range" min={0} max={360} value={angle}
                                            onChange={e => setAngle(parseInt(e.target.value))}
                                            className="w-full accent-indigo-500 mt-1" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Color stops */}
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Color Stops</p>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setOklchMode(v => !v)}
                                    title={oklchMode ? 'Switch to hex' : 'Switch to OKLCH'}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${oklchMode ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}>
                                    OKLCH
                                </button>
                                <button onClick={handleShuffle} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors" title="Randomize">
                                    <Shuffle size={12} />
                                </button>
                                <button onClick={addStop} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors" title="Add stop">
                                    <Plus size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Mini preview bar */}
                        <div className="h-6 rounded-lg border border-zinc-700 overflow-hidden" style={{ background: cssString }} />

                        <div className="space-y-3">
                            {sortedStops.map(s => {
                                const hexBright = oklch2hex(0.95, s.c * 0.9, s.h);
                                const hexGray   = oklch2hex(s.l, 0, s.h);
                                const hexSat    = oklch2hex(s.l, 0.37, s.h);
                                return (
                                    <div key={s.id} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            {/* Color swatch + hex picker */}
                                            <div className="relative w-7 h-7 rounded-lg border border-zinc-700 overflow-hidden cursor-pointer shrink-0" style={{ backgroundColor: s.color }}>
                                                <input type="color" value={s.color}
                                                    onChange={e => updateStopHex(s.id, e.target.value)}
                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                                            </div>
                                            {/* Position slider */}
                                            <input type="range" min={0} max={100} value={s.position}
                                                onChange={e => updateStopPosition(s.id, parseInt(e.target.value))}
                                                className="flex-1 accent-indigo-500" />
                                            <span className="text-[10px] font-mono text-zinc-500 w-7 text-right shrink-0">{s.position}%</span>
                                            <button onClick={() => removeStop(s.id)} disabled={stops.length <= 2}
                                                className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-30 shrink-0">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        {/* OKLCH sliders */}
                                        {oklchMode && (
                                            <div className="pl-2 space-y-2 border-l-2 border-indigo-500/20 ml-1">
                                                <OklchSlider label="L" displayValue={s.l.toFixed(2)}
                                                    value={s.l} min={0} max={1} step={0.01}
                                                    onChange={v => updateStopOklch(s.id, { l: v })}
                                                    trackStyle={{ background: `linear-gradient(to right, #000, ${hexBright})` }} />
                                                <OklchSlider label="C" displayValue={s.c.toFixed(3)}
                                                    value={s.c} min={0} max={0.37} step={0.005}
                                                    onChange={v => updateStopOklch(s.id, { c: v })}
                                                    trackStyle={{ background: `linear-gradient(to right, ${hexGray}, ${hexSat})` }} />
                                                <OklchSlider label="H" displayValue={Math.round(s.h).toString()}
                                                    value={s.h} min={0} max={360} step={1}
                                                    onChange={v => updateStopOklch(s.id, { h: v })}
                                                    trackStyle={{ background: 'linear-gradient(to right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)' }} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Presets</p>
                            <div className="flex gap-1">
                                {(['2','3'] as const).map(t => (
                                    <button key={t} onClick={() => setPresetTab(t)}
                                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${presetTab === t ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}>
                                        {t} Colors
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {(presetTab === '2' ? PRESETS_2 : PRESETS_3).map(p => {
                                const s = p.stops
                                    .map(st => `oklch(${st.l.toFixed(2)} ${st.c.toFixed(2)} ${Math.round(st.h)}) ${st.position}%`)
                                    .join(', ');
                                const bg = `linear-gradient(135deg, ${s})`;
                                return (
                                    <button key={p.name} onClick={() => applyPreset(p)} title={p.name}
                                        className="aspect-square rounded-lg border border-transparent hover:border-indigo-500/60 hover:scale-105 transition-all overflow-hidden relative group"
                                        style={{ background: bg }}>
                                        <div className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60">
                                            <span className="text-[8px] text-white font-bold leading-tight px-0.5 text-center">{p.name}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </>}

                {/* ─── MESH MODE ──────────────────────────────────────────── */}
                {appMode === 'mesh' && <>

                    {/* Canvas color */}
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Canvas Color</p>
                        <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded-lg border border-zinc-700 overflow-hidden cursor-pointer shrink-0" style={{ backgroundColor: meshBg }}>
                                <input type="color" value={meshBg} onChange={e => setMeshBg(e.target.value)}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                            </div>
                            <span className="text-xs font-mono text-zinc-400">{meshBg}</span>
                        </div>
                    </div>

                    {/* Blobs */}
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Blobs</p>
                            <button onClick={addBlob}
                                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                                <Plus size={12} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {blobs.map((blob, idx) => (
                                <div key={blob.id} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-6 h-6 rounded-md border border-zinc-700 overflow-hidden cursor-pointer shrink-0" style={{ backgroundColor: blob.hex }}>
                                            <input type="color" value={blob.hex}
                                                onChange={e => updateBlob(blob.id, { hex: e.target.value })}
                                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-400 flex-1">Blob {idx + 1}</span>
                                        <span className="text-[10px] font-mono text-zinc-600">{blob.hex}</span>
                                        <button onClick={() => removeBlob(blob.id)}
                                            className="text-zinc-600 hover:text-red-400 transition-colors">
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                    <div className="pl-2 space-y-1.5 border-l-2 border-zinc-800 ml-1">
                                        <OklchSlider label="X" displayValue={`${blob.x}%`}
                                            value={blob.x} min={0} max={100} step={1}
                                            onChange={v => updateBlob(blob.id, { x: v })}
                                            trackStyle={{ background: 'linear-gradient(to right,#27272a,#6366f1,#27272a)' }} />
                                        <OklchSlider label="Y" displayValue={`${blob.y}%`}
                                            value={blob.y} min={0} max={100} step={1}
                                            onChange={v => updateBlob(blob.id, { y: v })}
                                            trackStyle={{ background: 'linear-gradient(to right,#27272a,#6366f1,#27272a)' }} />
                                        <OklchSlider label="Size" displayValue={`${blob.size}px`}
                                            value={blob.size} min={50} max={800} step={10}
                                            onChange={v => updateBlob(blob.id, { size: v })}
                                            trackStyle={{ background: 'linear-gradient(to right,#27272a,#a78bfa)' }} />
                                        <OklchSlider label="Blur" displayValue={`${blob.blur}px`}
                                            value={blob.blur} min={0} max={250} step={5}
                                            onChange={v => updateBlob(blob.id, { blur: v })}
                                            trackStyle={{ background: 'linear-gradient(to right,#27272a,#818cf8)' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 text-[10px] text-zinc-500 leading-relaxed">
                        <span className="text-indigo-400 font-bold">Tip:</span> Overlap blobs with blur 100–200 px for smooth mesh. Dark canvas = dramatic; light = pastel.
                    </div>

                </>}

                {/* ─── Shared: Canvas size ─────────────────────────────────── */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Canvas Size</p>
                    <div className="grid grid-cols-2 gap-1">
                        {SIZE_PRESETS.map(p => (
                            <button key={p.label} onClick={() => applySize(p.w, p.h)}
                                className={`text-[10px] px-2 py-1.5 rounded-lg border transition-all font-bold ${width===p.w && height===p.h ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <p className="text-[10px] text-zinc-600 mb-1">W</p>
                            <input type="number" value={customW}
                                onChange={e => { setCustomW(e.target.value); const v = parseInt(e.target.value); if (v > 0) setWidth(v); }}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] text-zinc-600 mb-1">H</p>
                            <input type="number" value={customH}
                                onChange={e => { setCustomH(e.target.value); const v = parseInt(e.target.value); if (v > 0) setHeight(v); }}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                        </div>
                    </div>
                </div>

                {/* ─── Shared: Export ──────────────────────────────────────── */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Export</p>
                    <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                        {(['png','jpeg'] as const).map(f => (
                            <button key={f} onClick={() => setFormat(f)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg uppercase transition-all ${format === f ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                    <Button className="w-full border-none shadow-lg shadow-indigo-500/20" onClick={handleDownload}>
                        <Download size={14} className="mr-2" /> Download {format.toUpperCase()}
                    </Button>
                    {appMode === 'css' && (
                        <>
                            <button onClick={copyCSS}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-all">
                                {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                                {copied ? 'Copied!' : 'Copy CSS'}
                            </button>
                            <div className="text-[10px] font-mono text-zinc-600 break-all bg-zinc-950 rounded-lg p-2 border border-zinc-800 select-all cursor-text">
                                {cssString}
                            </div>
                        </>
                    )}
                </div>

            </aside>

            {/* ── Canvas Preview ──────────────────────────────────────────── */}
            <main
                className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center p-4 relative overflow-hidden"
                style={{ backgroundImage: 'radial-gradient(circle, #27272a 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            >
                <div
                    className="relative shadow-2xl rounded-xl overflow-hidden flex items-center justify-center max-w-full max-h-full"
                    style={{ aspectRatio: `${width}/${height}`, maxWidth: '100%', maxHeight: '100%' }}
                >
                    <canvas ref={canvasRef} className="max-w-full max-h-full block" />
                </div>
                <div className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-600 bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800">
                    {width} × {height}
                </div>
            </main>

        </div>
    );
};
