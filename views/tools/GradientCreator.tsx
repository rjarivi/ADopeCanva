import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Palette, Download, Plus, Trash2, Shuffle, Sliders } from 'lucide-react';

type GradientType = 'linear' | 'radial' | 'conic';

interface ColorStop {
    id: string;
    color: string;
    position: number;
}

const PRESETS: { name: string; stops: { color: string; position: number }[]; type: GradientType; angle: number }[] = [
    { name: 'Ocean', stops: [{ color: '#0ea5e9', position: 0 }, { color: '#6366f1', position: 100 }], type: 'linear', angle: 135 },
    { name: 'Sunset', stops: [{ color: '#f97316', position: 0 }, { color: '#ec4899', position: 50 }, { color: '#8b5cf6', position: 100 }], type: 'linear', angle: 45 },
    { name: 'Forest', stops: [{ color: '#22c55e', position: 0 }, { color: '#14b8a6', position: 100 }], type: 'linear', angle: 180 },
    { name: 'Lava', stops: [{ color: '#ef4444', position: 0 }, { color: '#f59e0b', position: 100 }], type: 'radial', angle: 0 },
    { name: 'Midnight', stops: [{ color: '#1e1b4b', position: 0 }, { color: '#312e81', position: 50 }, { color: '#0f172a', position: 100 }], type: 'linear', angle: 160 },
    { name: 'Aurora', stops: [{ color: '#a78bfa', position: 0 }, { color: '#34d399', position: 50 }, { color: '#60a5fa', position: 100 }], type: 'conic', angle: 0 },
    { name: 'Gold', stops: [{ color: '#fbbf24', position: 0 }, { color: '#f59e0b', position: 50 }, { color: '#d97706', position: 100 }], type: 'linear', angle: 90 },
    { name: 'Candy', stops: [{ color: '#f472b6', position: 0 }, { color: '#c084fc', position: 100 }], type: 'linear', angle: 135 },
];

const SIZE_PRESETS = [
    { label: 'Square 800', w: 800, h: 800 },
    { label: 'HD 1280×720', w: 1280, h: 720 },
    { label: 'FHD 1920×1080', w: 1920, h: 1080 },
    { label: 'Story 1080×1920', w: 1080, h: 1920 },
    { label: 'Banner 1500×500', w: 1500, h: 500 },
];

function uid() { return Math.random().toString(36).slice(2); }

export const GradientCreator: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [type, setType] = useState<GradientType>('linear');
    const [angle, setAngle] = useState(135);
    const [stops, setStops] = useState<ColorStop[]>([
        { id: uid(), color: '#6366f1', position: 0 },
        { id: uid(), color: '#ec4899', position: 100 },
    ]);
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(800);
    const [customW, setCustomW] = useState('800');
    const [customH, setCustomH] = useState('800');
    const [format, setFormat] = useState<'png' | 'jpeg'>('png');

    const sortedStops = [...stops].sort((a, b) => a.position - b.position);

    const drawGradient = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = width;
        canvas.height = height;

        let grad: CanvasGradient;

        if (type === 'linear') {
            const rad = (angle * Math.PI) / 180;
            const cx = width / 2, cy = height / 2;
            const len = Math.sqrt(width * width + height * height) / 2;
            grad = ctx.createLinearGradient(
                cx - Math.cos(rad) * len, cy - Math.sin(rad) * len,
                cx + Math.cos(rad) * len, cy + Math.sin(rad) * len
            );
        } else if (type === 'radial') {
            grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
        } else {
            grad = ctx.createConicGradient((angle * Math.PI) / 180, width / 2, height / 2);
        }

        sortedStops.forEach(s => {
            grad.addColorStop(s.position / 100, s.color);
        });

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }, [type, angle, sortedStops, width, height]);

    useEffect(() => { drawGradient(); }, [drawGradient]);

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.href = canvas.toDataURL(`image/${format}`, 0.95);
        link.download = `gradient.${format}`;
        link.click();
    };

    const handlePreset = (preset: typeof PRESETS[0]) => {
        setType(preset.type);
        setAngle(preset.angle);
        setStops(preset.stops.map(s => ({ ...s, id: uid() })));
    };

    const handleShuffle = () => {
        const randomHex = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
        setStops(stops.map(s => ({ ...s, color: randomHex() })));
    };

    const addStop = () => {
        const midPos = stops.length > 0 ? Math.min(sortedStops[sortedStops.length - 1].position + 10, 100) : 50;
        setStops(prev => [...prev, { id: uid(), color: '#ffffff', position: midPos }]);
    };

    const removeStop = (id: string) => {
        if (stops.length <= 2) return;
        setStops(prev => prev.filter(s => s.id !== id));
    };

    const updateStop = (id: string, field: 'color' | 'position', val: string | number) => {
        setStops(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
    };

    const applySize = (w: number, h: number) => {
        setWidth(w); setHeight(h);
        setCustomW(String(w)); setCustomH(String(h));
    };

    const cssString = (() => {
        const stopsStr = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ');
        if (type === 'linear') return `linear-gradient(${angle}deg, ${stopsStr})`;
        if (type === 'radial') return `radial-gradient(circle, ${stopsStr})`;
        return `conic-gradient(from ${angle}deg, ${stopsStr})`;
    })();

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col md:flex-row gap-4 animate-slide-up">
            {/* Controls Panel */}
            <aside className="w-full md:w-72 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
                {/* Gradient Type */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gradient Type</p>
                    <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                        {(['linear', 'radial', 'conic'] as GradientType[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${type === t ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >{t}</button>
                        ))}
                    </div>

                    {(type === 'linear' || type === 'conic') && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-zinc-500 font-bold uppercase tracking-widest">Angle</span>
                                <span className="text-indigo-400 font-mono">{angle}°</span>
                            </div>
                            <input
                                type="range" min={0} max={360} value={angle}
                                onChange={e => setAngle(parseInt(e.target.value))}
                                className="w-full accent-indigo-500"
                            />
                        </div>
                    )}
                </div>

                {/* Color Stops */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Color Stops</p>
                        <div className="flex gap-1">
                            <button onClick={handleShuffle} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors" title="Randomize colors">
                                <Shuffle size={12} />
                            </button>
                            <button onClick={addStop} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors" title="Add stop">
                                <Plus size={12} />
                            </button>
                        </div>
                    </div>

                    {/* Gradient preview bar */}
                    <div className="h-8 rounded-xl border border-zinc-700 overflow-hidden" style={{ background: cssString }} />

                    <div className="space-y-2">
                        {sortedStops.map(s => (
                            <div key={s.id} className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={s.color}
                                    onChange={e => updateStop(s.id, 'color', e.target.value)}
                                    className="w-7 h-7 rounded-lg border border-zinc-700 bg-zinc-800 cursor-pointer shrink-0"
                                />
                                <input
                                    type="range" min={0} max={100} value={s.position}
                                    onChange={e => updateStop(s.id, 'position', parseInt(e.target.value))}
                                    className="flex-1 accent-indigo-500"
                                />
                                <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">{s.position}%</span>
                                <button
                                    onClick={() => removeStop(s.id)}
                                    disabled={stops.length <= 2}
                                    className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-30"
                                ><Trash2 size={12} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Presets */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Presets</p>
                    <div className="grid grid-cols-4 gap-2">
                        {PRESETS.map(p => {
                            const stopsStr = p.stops.map(s => `${s.color} ${s.position}%`).join(', ');
                            const bg = p.type === 'linear' ? `linear-gradient(${p.angle}deg, ${stopsStr})`
                                : p.type === 'radial' ? `radial-gradient(circle, ${stopsStr})`
                                    : `conic-gradient(from ${p.angle}deg, ${stopsStr})`;
                            return (
                                <button
                                    key={p.name}
                                    onClick={() => handlePreset(p)}
                                    title={p.name}
                                    className="aspect-square rounded-lg border border-zinc-700 hover:border-indigo-500/50 hover:scale-105 transition-all overflow-hidden"
                                    style={{ background: bg }}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Size */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Canvas Size</p>
                    <div className="grid grid-cols-2 gap-1">
                        {SIZE_PRESETS.map(p => (
                            <button key={p.label} onClick={() => applySize(p.w, p.h)}
                                className={`text-[10px] px-2 py-1.5 rounded-lg border transition-all font-bold ${width === p.w && height === p.h ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <p className="text-[10px] text-zinc-600 mb-1">W</p>
                            <input type="number" value={customW} onChange={e => { setCustomW(e.target.value); const v = parseInt(e.target.value); if (v > 0) setWidth(v); }}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] text-zinc-600 mb-1">H</p>
                            <input type="number" value={customH} onChange={e => { setCustomH(e.target.value); const v = parseInt(e.target.value); if (v > 0) setHeight(v); }}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                        </div>
                    </div>
                </div>

                {/* Export */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Export</p>
                    <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                        {(['png', 'jpeg'] as const).map(f => (
                            <button key={f} onClick={() => setFormat(f)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg uppercase transition-all ${format === f ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                    <Button className="w-full border-none shadow-lg shadow-indigo-500/20" onClick={handleDownload}>
                        <Download size={14} className="mr-2" /> Download {format.toUpperCase()}
                    </Button>
                    <div className="text-[10px] font-mono text-zinc-600 break-all bg-zinc-950 rounded-lg p-2 border border-zinc-800 select-all cursor-text">
                        {cssString}
                    </div>
                </div>
            </aside>

            {/* Canvas Preview */}
            <main className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center p-4 relative overflow-hidden"
                style={{ backgroundImage: 'radial-gradient(circle, #27272a 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <div className="relative shadow-2xl rounded-xl overflow-hidden flex items-center justify-center max-w-full max-h-full"
                    style={{ aspectRatio: `${width}/${height}`, maxWidth: '100%', maxHeight: '100%' }}>
                    <canvas ref={canvasRef} className="max-w-full max-h-full block" style={{ display: 'block' }} />
                </div>
                <div className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-600 bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800">
                    {width} × {height}
                </div>
            </main>
        </div>
    );
};
