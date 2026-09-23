import React, { useState, useRef, useCallback, useMemo } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { useToolFile } from '../../hooks/useToolFile';
import {
    AudioWaveform, Download, BarChart3, Palette, Ruler,
    Image as ImageIcon, RefreshCcw, Loader2, Zap, Copy, Check,
    Settings, Shuffle, Play, Pause,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useObjectUrlState } from '../../hooks/useObjectUrl';

type WaveStyle = 'bars' | 'sharp' | 'smooth' | 'dotted' | 'circular' | 'bubbles' | 'stacked' | 'radiating';
type ColorMode = 'solid' | 'gradient-h' | 'gradient-v' | 'gradient-r' | 'image';
type FillMode = 'fill' | 'stroke' | 'both';
type SideTab = 'style' | 'size' | 'color';

const STYLES: { id: WaveStyle; label: string }[] = [
    { id: 'bars',      label: 'Bars'     },
    { id: 'dotted',    label: 'Dotted'   },
    { id: 'stacked',   label: 'Stacked'  },
    { id: 'sharp',     label: 'Sharp'    },
    { id: 'smooth',    label: 'Smooth'   },
    { id: 'circular',  label: 'Circular' },
    { id: 'bubbles',   label: 'Bubbles'  },
    { id: 'radiating', label: 'Radiate'  },
];

const PRESETS = [
    { c1: '#6366f1', c2: '#ec4899' },
    { c1: '#06b6d4', c2: '#3b82f6' },
    { c1: '#f59e0b', c2: '#ef4444' },
    { c1: '#10b981', c2: '#14b8a6' },
    { c1: '#ffffff', c2: '#71717a' },
    { c1: '#f43f5e', c2: '#8b5cf6' },
    { c1: '#fbbf24', c2: '#84cc16' },
    { c1: '#e879f9', c2: '#22d3ee' },
];

const VIBRANT = ['#6366f1','#ec4899','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#f43f5e','#14b8a6','#3b82f6','#a855f7','#22c55e','#f97316','#0ea5e9'];
const rndColor = () => VIBRANT[Math.floor(Math.random() * VIBRANT.length)];

// ── UI helpers ──────────────────────────────────────────────────────────────

function formatTime(s: number) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function Pill({ active, onClick, children, sm }: {
    active: boolean; onClick: () => void; children: React.ReactNode; sm?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`${sm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'} rounded-md font-bold border transition-all ${
                active
                    ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-300'
                    : 'bg-zinc-800/60 border-zinc-700 text-zinc-500 hover:text-zinc-200 hover:border-zinc-500'
            }`}
        >
            {children}
        </button>
    );
}

function Slider({ label, value, min, max, step = 1, unit = '', hint, onChange }: {
    label: string; value: number; min: number; max: number;
    step?: number; unit?: string; hint?: string; onChange: (v: number) => void;
}) {
    return (
        <div>
            <div className="flex justify-between text-[11px] mb-1">
                <span className="text-zinc-400">{label}</span>
                <span className="text-zinc-300 font-mono">{value}{unit}</span>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1"
            />
            {hint && <p className="text-[10px] text-zinc-600 mt-0.5">{hint}</p>}
        </div>
    );
}

function ColorInput({ label, value, onChange }: { label?: string; value: string; onChange: (v: string) => void }) {
    return (
        <div>
            {label && <span className="text-[10px] text-zinc-500 block mb-1.5">{label}</span>}
            <div className="flex items-center gap-2">
                <input
                    type="color" value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
                />
                <input
                    type="text" value={value}
                    onChange={e => onChange(e.target.value)}
                    className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                    onClick={() => onChange(rndColor())}
                    title="Random color"
                    className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/40 transition-all shrink-0"
                >
                    <Shuffle size={11} />
                </button>
            </div>
        </div>
    );
}

// ── SVG path helpers ────────────────────────────────────────────────────────

function smoothPath(pts: [number, number][], smoothing = 0.18): string {
    if (pts.length < 2) return '';
    let d = `M ${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = i > 0 ? pts[i - 1] : pts[0];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = i < pts.length - 2 ? pts[i + 2] : p2;
        
        const cp1x = p1[0] + (p2[0] - p0[0]) * smoothing;
        const cp1y = p1[1] + (p2[1] - p0[1]) * smoothing;
        
        const cp2x = p2[0] - (p3[0] - p1[0]) * smoothing;
        const cp2y = p2[1] - (p3[1] - p1[1]) * smoothing;
        
        d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    return d;
}

function circularPath(pts: [number, number][]): string {
    const n = pts.length;
    if (n < 3) return '';
    const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0]+b[0])/2, (a[1]+b[1])/2];
    const m0 = mid(pts[n-1], pts[0]);
    let d = `M ${m0[0].toFixed(2)},${m0[1].toFixed(2)}`;
    for (let i = 0; i < n; i++) {
        const m1 = mid(pts[i], pts[(i+1) % n]);
        d += ` Q ${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)} ${m1[0].toFixed(2)},${m1[1].toFixed(2)}`;
    }
    return d + ' Z';
}

// ── Main component ──────────────────────────────────────────────────────────

export const AudioWaveformExporter: React.FC = () => {
    const isMobile = useIsMobile();

    // Core state
    const { file, select, clear } = useToolFile();
    const [waveData, setWaveData] = useState<number[]>([]);
    const [rawAudioData, setRawAudioData] = useState<Float32Array | null>(null);
    const [isDecoding, setIsDecoding] = useState(false);
    const [error, setError]       = useState('');
    const [copied, setCopied]     = useState(false);
    const [activeTab, setActiveTab] = useState<SideTab>('style');

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useObjectUrlState();
    const audioRef = useRef<HTMLAudioElement>(null);

    // Style
    const [waveStyle, setWaveStyle]         = useState<WaveStyle>('bars');
    const [mirror, setMirror]               = useState(true);
    const [invertWave, setInvertWave]       = useState(false);
    const [showCenterLine, setShowCenterLine] = useState(false);
    const [centerLineColor, setCenterLineColor] = useState('#ffffff');

    // Size
    const [svgWidth, setSvgWidth]   = useState(800);
    const [svgHeight, setSvgHeight] = useState(200);
    const [samples, setSamples]     = useState(120);
    const [amplitude, setAmplitude] = useState(0.9);
    const [panY, setPanY]           = useState(0);   // -40 to +40 % of H

    // Bar/line options
    const [barWidthPct, setBarWidthPct] = useState(60);
    const [rounded, setRounded]         = useState(true);
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [fillMode, setFillMode]       = useState<FillMode>('fill');

    // Color
    const [colorMode, setColorMode]     = useState<ColorMode>('gradient-h');
    const [color1, setColor1]           = useState('#6366f1');
    const [color2, setColor2]           = useState('#ec4899');
    const [bgTransparent, setBgTransparent] = useState(true);
    const [bgColor, setBgColor]         = useState('#09090b');
    const [maskImageSrc, setMaskImageSrc] = useState<string | null>(null);
    const maskInputRef = useRef<HTMLInputElement>(null);

    const samplesRef = useRef(samples);
    samplesRef.current = samples;

    // ── Audio decode ──────────────────────────────────────────────────────────
    const computeWaveData = useCallback((ch: Float32Array, sampleCount: number) => {
        const chunk = Math.floor(ch.length / sampleCount);
        const peaks = new Float32Array(sampleCount);
        let max = 0.001;
        for (let i = 0; i < sampleCount; i++) {
            const start = i * chunk; 
            let peak = 0;
            const end = start + chunk > ch.length ? ch.length : start + chunk;
            for (let j = start; j < end; j++) {
                const val = ch[j];
                const abs = val < 0 ? -val : val; 
                if (abs > peak) peak = abs;
            }
            peaks[i] = peak;
            if (peak > max) max = peak;
        }
        const finalData = new Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) finalData[i] = peaks[i] / max;
        setWaveData(finalData);
    }, []);

    const decodeAudio = useCallback(async (fileData: FileData, sampleCount = samplesRef.current) => {
        setIsDecoding(true); setError(''); setWaveData([]); setRawAudioData(null);
        let ctx: AudioContext | null = null;
        try {
            ctx = new AudioContext();
            const buf = await fileData.file.arrayBuffer();
            const audio = await ctx.decodeAudioData(buf);
            const ch = audio.getChannelData(0);
            setRawAudioData(ch);
            computeWaveData(ch, sampleCount);
        } catch { setError('Could not decode audio. Try MP3, WAV, OGG, or FLAC.'); }
        finally { 
            if (ctx && ctx.state !== 'closed') await ctx.close();
            setIsDecoding(false); 
        }
    }, [computeWaveData]);

    React.useEffect(() => {
        if (rawAudioData) {
            computeWaveData(rawAudioData, samples);
        }
    }, [samples, rawAudioData, computeWaveData]);

    const handleFile  = useCallback((fd: FileData | FileData[]) => {
        const selected = Array.isArray(fd) ? fd[0] : fd;
        if (!selected) return;
        select(selected); decodeAudio(selected);
        const url = URL.createObjectURL(selected.file);
        setAudioUrl(url);
    }, [decodeAudio, select]);
    const reset       = useCallback(() => {
        clear(); setWaveData([]); setRawAudioData(null); setError('');
        setAudioUrl(null); // useObjectUrlState revokes the previous URL
        setIsPlaying(false);
        setCurrentTime(0);
    }, []);

    // ── SVG generation ────────────────────────────────────────────────────────
    const svgString = useMemo(() => {
        if (waveData.length === 0) return '';
        const W = svgWidth, H = svgHeight;
        const cy = H / 2 + (panY / 100) * H;
        const data = invertWave ? waveData.map(v => 1 - v) : waveData;
        const n = data.length;
        const gradId = 'wg', clipId = 'wc', patId = 'wp';

        let defsInner = '';
        if (colorMode === 'gradient-h') {
            defsInner += `<linearGradient id="${gradId}" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></linearGradient>`;
        } else if (colorMode === 'gradient-v') {
            defsInner += `<linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></linearGradient>`;
        } else if (colorMode === 'gradient-r') {
            defsInner += `<radialGradient id="${gradId}" cx="${W/2}" cy="${H/2}" r="${Math.max(W,H)/2}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></radialGradient>`;
        } else if (colorMode === 'image' && maskImageSrc) {
            defsInner += `<pattern id="${patId}" x="0" y="0" width="${W}" height="${H}" patternUnits="userSpaceOnUse"><image href="${maskImageSrc}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/></pattern>`;
        }
        const fillVal = colorMode === 'solid' ? color1
            : colorMode === 'image' && maskImageSrc ? `url(#${patId})`
            : `url(#${gradId})`;

        const bgEl = bgTransparent ? '' : `<rect x="0" y="0" width="${W}" height="${H}" fill="${bgColor}"/>`;
        const clEl = showCenterLine
            ? `<line x1="0" y1="${cy.toFixed(1)}" x2="${W}" y2="${cy.toFixed(1)}" stroke="${centerLineColor}" stroke-width="1" stroke-dasharray="4 4" opacity="0.4"/>`
            : '';

        let waveEl = '';

        // ── BARS ─────────────────────────────────────────────────────────────────
        if (waveStyle === 'bars') {
            const slotW = W / n;
            const bW = Math.max(1, slotW * (barWidthPct / 100));
            const rx = rounded ? Math.min(bW / 2, 4) : 0;
            let clips = '';
            data.forEach((v, i) => {
                const pH = v * amplitude * (mirror ? cy : H - cy) * 0.97;
                const x  = i * slotW + (slotW - bW) / 2;
                const y  = mirror ? cy - pH : H - pH;
                const bH = Math.max(1, mirror ? pH * 2 : pH);
                clips += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bW.toFixed(1)}" height="${bH.toFixed(1)}" rx="${rx.toFixed(1)}"/>`;
            });
            defsInner += `<clipPath id="${clipId}">${clips}</clipPath>`;
            waveEl = `<rect x="0" y="0" width="${W}" height="${H}" fill="${fillVal}" clip-path="url(#${clipId})"/>`;
        }

        // ── DOTTED ───────────────────────────────────────────────────────────────
        else if (waveStyle === 'dotted') {
            const slotW   = W / n;
            const dotR    = Math.max(1.5, slotW * (barWidthPct / 200));
            const spacing = dotR * 2 + Math.max(1, dotR * 0.6);
            const maxDots = Math.max(1, Math.floor((cy * 0.95) / spacing));
            let clips = '';
            data.forEach((v, i) => {
                const x = i * slotW + slotW / 2;
                const numDots = Math.max(1, Math.round(v * amplitude * maxDots));
                for (let j = 0; j < numDots; j++) {
                    const yT = cy - spacing * j - dotR;
                    clips += `<circle cx="${x.toFixed(1)}" cy="${yT.toFixed(1)}" r="${dotR.toFixed(1)}"/>`;
                    if (mirror) clips += `<circle cx="${x.toFixed(1)}" cy="${(2*cy - yT).toFixed(1)}" r="${dotR.toFixed(1)}"/>`;
                }
            });
            defsInner += `<clipPath id="${clipId}">${clips}</clipPath>`;
            waveEl = `<rect x="0" y="0" width="${W}" height="${H}" fill="${fillVal}" clip-path="url(#${clipId})"/>`;
        }

        // ── STACKED ──────────────────────────────────────────────────────────────
        else if (waveStyle === 'stacked') {
            const slotW = W / n;
            const bW = Math.max(1, slotW * (barWidthPct / 100));
            const rx = rounded ? Math.min(bW / 2, 4) : 0;
            const layers = [
                { scale: 1.0, opacity: 0.18 },
                { scale: 0.68, opacity: 0.42 },
                { scale: 0.38, opacity: 1.0 },
            ];
            layers.forEach(({ scale, opacity }, li) => {
                const cid = `${clipId}${li}`;
                let clips = '';
                data.forEach((v, i) => {
                    const pH = v * amplitude * scale * (mirror ? cy : H - cy) * 0.97;
                    const x  = i * slotW + (slotW - bW) / 2;
                    const y  = mirror ? cy - pH : H - pH;
                    const bH = Math.max(1, mirror ? pH * 2 : pH);
                    clips += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bW.toFixed(1)}" height="${bH.toFixed(1)}" rx="${rx.toFixed(1)}"/>`;
                });
                defsInner += `<clipPath id="${cid}">${clips}</clipPath>`;
                waveEl   += `<rect x="0" y="0" width="${W}" height="${H}" fill="${fillVal}" opacity="${opacity}" clip-path="url(#${cid})"/>`;
            });
        }

        // ── SHARP ────────────────────────────────────────────────────────────────
        else if (waveStyle === 'sharp') {
            const pts: [number, number][] = data.map((v, i) => [
                n === 1 ? W/2 : (i/(n-1)) * W,
                cy - v * amplitude * cy * 0.97,
            ]);
            const topLine = pts.map(([x, y], i) => `${i===0?'M':'L'} ${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
            let pathD: string;
            if (mirror) {
                const botLine = [...pts].reverse().map(([x, y]) => `L ${x.toFixed(2)},${(2*cy-y).toFixed(2)}`).join(' ');
                pathD = `${topLine} ${botLine} Z`;
            } else {
                pathD = `${topLine} L ${W},${H} L 0,${H} Z`;
            }
            const fa = fillMode !== 'stroke' ? `fill="${fillVal}"` : 'fill="none"';
            const sa = fillMode !== 'fill' ? `stroke="${fillVal}" stroke-width="${strokeWidth}" stroke-linejoin="round"` : 'stroke="none"';
            waveEl = `<path d="${pathD}" ${fa} ${sa}/>`;
        }

        // ── SMOOTH ───────────────────────────────────────────────────────────────
        else if (waveStyle === 'smooth') {
            const pts: [number, number][] = data.map((v, i) => [
                n === 1 ? W/2 : (i/(n-1)) * W,
                cy - v * amplitude * cy * 0.97,
            ]);
            const topPath = smoothPath(pts);
            let pathD: string;
            if (mirror) {
                const botPts: [number, number][] = [...pts].reverse().map(([x, y]) => [x, 2*cy-y]);
                pathD = `${topPath} L ${pts[pts.length-1][0].toFixed(2)},${cy.toFixed(2)} ${smoothPath(botPts).replace(/^M/, 'L')} Z`;
            } else {
                pathD = `${topPath} L ${W},${H} L 0,${H} Z`;
            }
            const fa = fillMode !== 'stroke' ? `fill="${fillVal}"` : 'fill="none"';
            const sa = fillMode !== 'fill' ? `stroke="${fillVal}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"` : 'stroke="none"';
            waveEl = `<path d="${pathD}" ${fa} ${sa}/>`;
        }

        // ── CIRCULAR ─────────────────────────────────────────────────────────────
        else if (waveStyle === 'circular') {
            const cx2 = W / 2, cy2 = H / 2;
            const baseR   = Math.min(W, H) * 0.28;
            const maxSpike = Math.min(W, H) * 0.22 * amplitude;
            const outer: [number, number][] = data.map((v, i) => {
                const a = (i / n) * 2 * Math.PI - Math.PI / 2;
                const r = baseR + v * maxSpike;
                return [cx2 + Math.cos(a) * r, cy2 + Math.sin(a) * r];
            });
            let clipPath: string;
            if (mirror) {
                const inner: [number, number][] = data.map((v, i) => {
                    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
                    const r = Math.max(10, baseR * 0.55 - v * maxSpike * 0.45);
                    return [cx2 + Math.cos(a) * r, cy2 + Math.sin(a) * r];
                });
                clipPath = `<path d="${circularPath(outer)} ${circularPath(inner)}" fill-rule="evenodd"/>`;
            } else {
                clipPath = `<path d="${circularPath(outer)}"/>`;
            }
            defsInner += `<clipPath id="${clipId}">${clipPath}</clipPath>`;
            waveEl = `<rect x="0" y="0" width="${W}" height="${H}" fill="${fillVal}" clip-path="url(#${clipId})"/>`;
        }

        // ── BUBBLES ──────────────────────────────────────────────────────────────
        else if (waveStyle === 'bubbles') {
            const slotW = W / n;
            const maxR  = Math.min(slotW * 1.2, cy * amplitude * 0.9);
            let clips = '';
            data.forEach((v, i) => {
                const x  = i * slotW + slotW / 2;
                const r  = Math.max(2, v * maxR);
                const yT = cy - r * 0.6;
                clips += `<circle cx="${x.toFixed(1)}" cy="${yT.toFixed(1)}" r="${r.toFixed(1)}"/>`;
                if (mirror) clips += `<circle cx="${x.toFixed(1)}" cy="${(2*cy-yT).toFixed(1)}" r="${r.toFixed(1)}"/>`;
            });
            defsInner += `<clipPath id="${clipId}">${clips}</clipPath>`;
            waveEl = `<rect x="0" y="0" width="${W}" height="${H}" fill="${fillVal}" clip-path="url(#${clipId})"/>`;
        }

        // ── RADIATING ────────────────────────────────────────────────────────────
        else if (waveStyle === 'radiating') {
            const slotW = W / n;
            const maxR  = Math.min(slotW * 3, cy * 0.92) * amplitude;
            let clips = '';
            data.forEach((v, i) => {
                const x = i * slotW + slotW / 2;
                const r = Math.max(2, v * maxR);
                clips += `<circle cx="${x.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}"/>`;
            });
            defsInner += `<clipPath id="${clipId}">${clips}</clipPath>`;
            waveEl = `<rect x="0" y="0" width="${W}" height="${H}" fill="${fillVal}" clip-path="url(#${clipId})"/>`;
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defsInner}</defs>${bgEl}${waveEl}${clEl}</svg>`;
    }, [waveData, svgWidth, svgHeight, waveStyle, mirror, invertWave, amplitude, panY,
        barWidthPct, rounded, strokeWidth, fillMode, colorMode, color1, color2,
        bgTransparent, bgColor, maskImageSrc, showCenterLine, centerLineColor]);

    const handleDownload = useCallback(() => {
        if (!svgString) return;
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `waveform-${waveStyle}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, [svgString, waveStyle]);

    const handleCopy = useCallback(async () => {
        if (!svgString) return;
        await navigator.clipboard.writeText(svgString);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    }, [svgString]);

    const handleMaskImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        const reader = new FileReader();
        reader.onload = ev => setMaskImageSrc(ev.target?.result as string);
        reader.readAsDataURL(f);
    };

    // ── Pre-upload landing ────────────────────────────────────────────────────
    if (!waveData.length && !isDecoding) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                <div className="flex-none space-y-3 mb-10">
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight flex items-center justify-center gap-4 font-unbounded">
                        <div className="text-indigo-400"><AudioWaveform size={42} /></div>
                        <span className="text-white">Waveform SVG</span>
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium">
                        Turn any audio file into a beautiful, infinitely-scalable SVG waveform.
                    </p>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>

                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={handleFile}
                        accept="audio/*"
                        multiple={false}
                        label="Drop an audio file to visualize"
                        description="MP3, WAV, OGG, FLAC, M4A, AAC — processed entirely in your browser"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-transparent rounded-2xl transition-all"
                    />
                </div>

                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    {[
                        { icon: BarChart3, label: '8 Waveform Styles',      desc: 'Bars, Circular, Stacked & more' },
                        { icon: Palette,   label: 'Gradients & Image Mask', desc: 'Solid, linear, radial, photo-fill' },
                        { icon: Ruler,     label: 'Any Dimensions',         desc: 'Up to 4000 × 1000 px' },
                        { icon: Zap,       label: 'Pure SVG Output',        desc: 'Infinitely scalable vector' },
                    ].map((feat, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors group">
                            <div className="p-3 bg-zinc-900 rounded-full text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
                                <feat.icon size={20} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider font-unbounded">{feat.label}</h3>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1 tracking-tight">{feat.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isDecoding) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-400">
                <Loader2 size={32} className="animate-spin text-indigo-400" />
                <p className="text-sm">Decoding audio waveform…</p>
            </div>
        );
    }

    // ── Post-upload workspace ─────────────────────────────────────────────────

    const barStyles = ['bars', 'dotted', 'stacked'] as WaveStyle[];
    const lineStyles = ['sharp', 'smooth'] as WaveStyle[];

    const TABS = [
        { id: 'style' as SideTab, label: 'Style', icon: BarChart3 },
        { id: 'size'  as SideTab, label: 'Size',  icon: Ruler     },
        { id: 'color' as SideTab, label: 'Color', icon: Palette   },
    ];

    const COLOR_MODES = [
        { id: 'solid'      as ColorMode, label: 'Solid'   },
        { id: 'gradient-h' as ColorMode, label: '→ Grad'  },
        { id: 'gradient-v' as ColorMode, label: '↓ Grad'  },
        { id: 'gradient-r' as ColorMode, label: 'Radial'  },
        { id: 'image'      as ColorMode, label: 'Image'   },
    ];

    return (
        <div className={`w-full bg-[#0c0c0e] text-zinc-200 flex flex-col md:flex-row overflow-hidden selection:bg-indigo-500/30 ${
            isMobile ? 'h-[100vh]' : 'max-w-7xl mx-auto rounded-[32px] border border-zinc-900 h-full shadow-[0_0_50px_rgba(0,0,0,0.5)]'
        }`}>

            {/* ── Sidebar ──────────────────────────────────────────────────────── */}
            <aside className={`${isMobile ? 'order-2 h-1/2' : 'order-1 w-72'} border-r border-zinc-900 bg-[#0c0c0e] flex flex-col z-20 shrink-0`}>

                {/* Header */}
                <div className="h-12 px-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
                    <h2 className="font-black text-[11px] text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 font-unbounded">
                        <Settings size={13} /> Settings
                    </h2>
                    <button onClick={reset} title="New file"
                        className="text-zinc-600 hover:text-indigo-400 transition-all p-1.5 hover:bg-indigo-500/5 rounded-lg">
                        <RefreshCcw size={13} />
                    </button>
                </div>

                {/* Tab bar */}
                <div className="flex border-b border-zinc-900 shrink-0">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold border-b-2 transition-all ${
                                activeTab === t.id
                                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20'
                            }`}
                        >
                            <t.icon size={11} /> {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto">

                    {/* ── STYLE TAB ─────────────────────────────────────────── */}
                    {activeTab === 'style' && (
                        <div className="p-4 space-y-5">
                            {/* Style grid */}
                            <div className="grid grid-cols-3 gap-1.5">
                                {STYLES.map(s => (
                                    <button key={s.id} onClick={() => setWaveStyle(s.id)}
                                        className={`py-2 rounded-lg text-[11px] font-bold border transition-all ${
                                            waveStyle === s.id
                                                ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-300'
                                                : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
                                        }`}
                                    >{s.label}</button>
                                ))}
                            </div>

                            {/* Options as compact pill row */}
                            <div>
                                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-2">Options</p>
                                <div className="flex flex-wrap gap-1.5">
                                    <Pill active={mirror} onClick={() => setMirror(v => !v)}>Mirror</Pill>
                                    <Pill active={invertWave} onClick={() => setInvertWave(v => !v)}>Invert</Pill>
                                    <Pill active={showCenterLine} onClick={() => setShowCenterLine(v => !v)}>Guide Line</Pill>
                                </div>
                                {showCenterLine && (
                                    <div className="mt-3">
                                        <ColorInput label="Guide color" value={centerLineColor} onChange={setCenterLineColor} />
                                    </div>
                                )}
                            </div>

                            {/* Bar-type options */}
                            {barStyles.includes(waveStyle) && (
                                <div className="space-y-3 pt-3 border-t border-zinc-800/60">
                                    <Slider label="Fill" value={barWidthPct} min={10} max={95} unit="%" onChange={setBarWidthPct} />
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-zinc-400">Rounded caps</span>
                                        <Pill sm active={rounded} onClick={() => setRounded(v => !v)}>{rounded ? 'On' : 'Off'}</Pill>
                                    </div>
                                </div>
                            )}

                            {/* Line-type options */}
                            {lineStyles.includes(waveStyle) && (
                                <div className="space-y-3 pt-3 border-t border-zinc-800/60">
                                    <Slider label="Stroke" value={strokeWidth} min={1} max={12} unit="px" onChange={setStrokeWidth} />
                                    <div>
                                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-2">Fill mode</p>
                                        <div className="flex gap-1.5">
                                            {(['fill', 'stroke', 'both'] as FillMode[]).map(m => (
                                                <Pill key={m} active={fillMode === m} onClick={() => setFillMode(m)}>{m}</Pill>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── SIZE TAB ──────────────────────────────────────────── */}
                    {activeTab === 'size' && (
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-2.5">
                                {([
                                    { label: 'Width (px)',  v: svgWidth,  set: setSvgWidth,  min: 100, max: 4000 },
                                    { label: 'Height (px)', v: svgHeight, set: setSvgHeight, min: 40,  max: 1000 },
                                ] as const).map(({ label, v, set, min, max }) => (
                                    <div key={label}>
                                        <span className="text-[10px] text-zinc-500 block mb-1">{label}</span>
                                        <input
                                            type="number" value={v}
                                            onChange={e => (set as (n: number) => void)(Math.max(min, Math.min(max, Number(e.target.value))))}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                ))}
                            </div>
                            <Slider label="Res (Samples)" value={samples} min={20} max={500} onChange={setSamples} hint="Resolution / finer detail" />
                            <Slider label="Amplitude" value={amplitude} min={0.1} max={2.0} step={0.05} unit="×" onChange={setAmplitude} />
                            <Slider label="Vertical Pan" value={panY} min={-40} max={40} unit="%" onChange={setPanY} hint="Move waveform up / down" />
                        </div>
                    )}

                    {/* ── COLOR TAB ─────────────────────────────────────────── */}
                    {activeTab === 'color' && (
                        <div className="p-4 space-y-4">
                            {/* Mode pills */}
                            <div className="flex flex-wrap gap-1.5">
                                {COLOR_MODES.map(m => (
                                    <Pill key={m.id} active={colorMode === m.id} onClick={() => setColorMode(m.id)}>{m.label}</Pill>
                                ))}
                            </div>

                            {/* Color inputs */}
                            <ColorInput label={colorMode === 'solid' ? 'Color' : 'Start color'} value={color1} onChange={setColor1} />

                            {colorMode !== 'solid' && colorMode !== 'image' && (
                                <ColorInput label="End color" value={color2} onChange={setColor2} />
                            )}

                            {/* Presets + random both */}
                            {colorMode !== 'solid' && colorMode !== 'image' && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Presets</span>
                                        <button
                                            onClick={() => { setColor1(rndColor()); setColor2(rndColor()); }}
                                            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-indigo-400 transition-colors"
                                        >
                                            <Shuffle size={9} /> Random both
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {PRESETS.map((p, i) => (
                                            <button key={i}
                                                onClick={() => { setColor1(p.c1); setColor2(p.c2); }}
                                                className="h-8 rounded-lg border border-zinc-700/60 hover:border-zinc-400 hover:scale-105 transition-all"
                                                style={{ background: `linear-gradient(to right, ${p.c1}, ${p.c2})` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Image mask */}
                            {colorMode === 'image' && (
                                <div>
                                    <button onClick={() => maskInputRef.current?.click()}
                                        className="flex items-center gap-2 px-3 py-2 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold transition-all">
                                        <ImageIcon size={12} /> {maskImageSrc ? 'Change mask image' : 'Upload mask image'}
                                    </button>
                                    <input ref={maskInputRef} type="file" accept="image/*" onChange={handleMaskImage} className="hidden" />
                                    {maskImageSrc && (
                                        <img src={maskImageSrc} alt="mask preview" className="mt-2 w-full h-12 object-cover rounded-lg opacity-60" />
                                    )}
                                </div>
                            )}

                            {/* Background */}
                            <div className="pt-3 border-t border-zinc-800/60 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Background</span>
                                    <Pill sm active={bgTransparent} onClick={() => setBgTransparent(v => !v)}>Transparent</Pill>
                                </div>
                                {!bgTransparent && <ColorInput value={bgColor} onChange={setBgColor} />}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* ── Main preview ──────────────────────────────────────────────────── */}
            <main className={`order-3 ${isMobile ? 'h-1/2' : 'flex-1'} relative bg-[#09090b] flex flex-col overflow-hidden`}>
                <div
                    className="flex-1 flex items-center justify-center p-6 overflow-hidden"
                    style={{
                        background: bgTransparent
                            ? 'repeating-conic-gradient(#27272a 0% 25%, #18181b 0% 50%) 0 0 / 16px 16px'
                            : bgColor,
                    }}
                    dangerouslySetInnerHTML={{ __html: svgString }}
                />
                <div className="h-14 border-t border-zinc-900 px-5 flex items-center gap-3 shrink-0 bg-[#0c0c0e]">
                    {audioUrl && (
                        <>
                            <audio
                                ref={audioRef}
                                src={audioUrl}
                                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                                onEnded={() => setIsPlaying(false)}
                            />
                            <button
                                onClick={() => {
                                    if (!audioRef.current) return;
                                    if (isPlaying) audioRef.current.pause();
                                    else audioRef.current.play();
                                    setIsPlaying(!isPlaying);
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shrink-0"
                            >
                                {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <div className="text-[10px] text-zinc-500 font-mono w-16 text-center shrink-0">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                            <div className="h-4 w-px bg-zinc-800 mx-2 shrink-0" />
                        </>
                    )}
                    <span className="text-xs text-zinc-600 font-mono truncate flex-1">{file?.file.name}</span>
                    <button onClick={handleCopy}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all">
                        {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                        {copied ? 'Copied!' : 'Copy SVG'}
                    </button>
                    <Button onClick={handleDownload} variant="primary" className="flex items-center gap-2 text-xs font-bold">
                        <Download size={13} /> Export SVG
                    </Button>
                </div>
            </main>
        </div>
    );
};
