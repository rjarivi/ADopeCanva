import React, { useState, useEffect } from 'react';
import { Pipette, Copy, Check, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useIsMobile } from '../../hooks/useIsMobile';

// --- Types ---
type ActiveTab = 'harmony' | 'contrast' | 'tints-shades' | 'converter';
type HarmonyStrategy = 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic' | 'monochromatic';

interface Hsl {
    h: number; // 0-360
    s: number; // 0-100
    l: number; // 0-100
}

interface Rgb {
    r: number; // 0-255
    g: number; // 0-255
    b: number; // 0-255
}

interface Cmyk {
    c: number; // 0-100
    m: number; // 0-100
    y: number; // 0-100
    k: number; // 0-100
}

interface ColorDetail {
    hex: string;
    rgb: Rgb;
    hsl: Hsl;
}

// --- Helpers for Color Math ---

const hexToRgb = (hex: string): Rgb | null => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
    const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
    const toHex = (val: number) => clamp(val).toString(16).padStart(2, '0').toUpperCase();
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const rgbToHsl = (r: number, g: number, b: number): Hsl => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
};

const hslToRgb = (h: number, s: number, l: number): Rgb => {
    h /= 360;
    s /= 100;
    l /= 100;
    let r = l;
    let g = l;
    let b = l;

    if (s !== 0) {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
};

const rgbToCmyk = (r: number, g: number, b: number): Cmyk => {
    r /= 255;
    g /= 255;
    b /= 255;
    const k = 1 - Math.max(r, g, b);
    if (k === 1) {
        return { c: 0, m: 0, y: 0, k: 100 };
    }
    const c = Math.round(((1 - r - k) / (1 - k)) * 100);
    const m = Math.round(((1 - g - k) / (1 - k)) * 100);
    const y = Math.round(((1 - b - k) / (1 - k)) * 100);
    return { c, m, y, k: Math.round(k * 100) };
};

const cmykToRgb = (c: number, m: number, y: number, k: number): Rgb => {
    c /= 100;
    m /= 100;
    y /= 100;
    k /= 100;
    const r = Math.round(255 * (1 - c) * (1 - k));
    const g = Math.round(255 * (1 - m) * (1 - k));
    const b = Math.round(255 * (1 - y) * (1 - k));
    return { r, g, b };
};

const getRelativeLuminance = (rgb: Rgb): number => {
    const calc = (val: number) => {
        const s = val / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * calc(rgb.r) + 0.7152 * calc(rgb.g) + 0.0722 * calc(rgb.b);
};

const getContrastRatio = (fg: Rgb, bg: Rgb): number => {
    const l1 = getRelativeLuminance(fg);
    const l2 = getRelativeLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return parseFloat(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
};

// --- Color Generator for Palette ---
const getHarmonyColors = (baseHsl: Hsl, strategy: HarmonyStrategy): ColorDetail[] => {
    const { h, s, l } = baseHsl;
    const colorSteps: Hsl[] = [];

    switch (strategy) {
        case 'complementary':
            colorSteps.push(baseHsl);
            colorSteps.push({ h: (h + 180) % 360, s, l });
            break;
        case 'analogous':
            colorSteps.push({ h: (h - 30 + 360) % 360, s, l });
            colorSteps.push(baseHsl);
            colorSteps.push({ h: (h + 30) % 360, s, l });
            break;
        case 'triadic':
            colorSteps.push(baseHsl);
            colorSteps.push({ h: (h + 120) % 360, s, l });
            colorSteps.push({ h: (h + 240) % 360, s, l });
            break;
        case 'split-complementary':
            colorSteps.push(baseHsl);
            colorSteps.push({ h: (h + 150) % 360, s, l });
            colorSteps.push({ h: (h + 210) % 360, s, l });
            break;
        case 'tetradic':
            colorSteps.push(baseHsl);
            colorSteps.push({ h: (h + 30) % 360, s, l });
            colorSteps.push({ h: (h + 180) % 360, s, l });
            colorSteps.push({ h: (h + 210) % 360, s, l });
            break;
        case 'monochromatic':
            const lSteps = [
                Math.max(5, l - 35),
                Math.max(10, l - 20),
                l,
                Math.min(90, l + 20),
                Math.min(95, l + 35)
            ];
            lSteps.forEach(lVal => {
                colorSteps.push({ h, s, l: lVal });
            });
            break;
    }

    return colorSteps.map(hsl => {
        const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
        return {
            hex: rgbToHex(rgb.r, rgb.g, rgb.b),
            rgb,
            hsl
        };
    });
};

export const ColorTool: React.FC = () => {
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState<ActiveTab>('harmony');

    // Shared Base Color State
    const [baseHex, setBaseHex] = useState('#4F46E5');
    const [baseRgb, setBaseRgb] = useState<Rgb>({ r: 79, g: 70, b: 229 });
    const [baseHsl, setBaseHsl] = useState<Hsl>({ h: 243, s: 75, l: 59 });
    const [copiedColor, setCopiedColor] = useState<string | null>(null);

    // Sync formats when HEX changes
    const updateFromHex = (hex: string) => {
        const cleanedHex = hex.trim();
        if (/^#[0-9A-F]{6}$/i.test(cleanedHex)) {
            const rgb = hexToRgb(cleanedHex);
            if (rgb) {
                setBaseHex(cleanedHex);
                setBaseRgb(rgb);
                setBaseHsl(rgbToHsl(rgb.r, rgb.g, rgb.b));
            }
        } else {
            setBaseHex(hex);
        }
    };

    const updateFromRgb = (r: number, g: number, b: number) => {
        const hex = rgbToHex(r, g, b);
        setBaseHex(hex);
        setBaseRgb({ r, g, b });
        setBaseHsl(rgbToHsl(r, g, b));
    };

    const updateFromHsl = (h: number, s: number, l: number) => {
        const rgb = hslToRgb(h, s, l);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        setBaseHex(hex);
        setBaseRgb(rgb);
        setBaseHsl({ h, s, l });
    };

    const triggerCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedColor(text);
        setTimeout(() => setCopiedColor(null), 1500);
    };

    // --- Tab 1: Harmony State ---
    const [harmonyStrategy, setHarmonyStrategy] = useState<HarmonyStrategy>('complementary');
    const harmonyColors = getHarmonyColors(baseHsl, harmonyStrategy);

    const downloadPaletteAsPng = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 900;
        canvas.height = 450;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const numColors = harmonyColors.length;
        const blockWidth = canvas.width / numColors;

        harmonyColors.forEach((color, i) => {
            // Draw color block
            ctx.fillStyle = color.hex;
            ctx.fillRect(i * blockWidth, 0, blockWidth, 330);

            // Draw info panel
            ctx.fillStyle = '#0c0c0e';
            ctx.fillRect(i * blockWidth, 330, blockWidth, 120);

            // Text formatting
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(color.hex, i * blockWidth + blockWidth / 2, 380);

            ctx.fillStyle = '#71717a';
            ctx.font = '14px sans-serif';
            ctx.fillText(`RGB(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`, i * blockWidth + blockWidth / 2, 410);
            ctx.fillText(`HSL(${color.hsl.h}°, ${color.hsl.s}%, ${color.hsl.l}%)`, i * blockWidth + blockWidth / 2, 430);
        });

        const link = document.createElement('a');
        link.download = `palette-${harmonyStrategy}-${baseHex}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    // --- Tab 2: Contrast Checker State ---
    const [contrastFg, setContrastFg] = useState('#FFFFFF');
    const [contrastBg, setContrastBg] = useState('#4F46E5');
    const contrastFgRgb = hexToRgb(contrastFg) || { r: 255, g: 255, b: 255 };
    const contrastBgRgb = hexToRgb(contrastBg) || { r: 79, g: 70, b: 229 };
    const contrastRatio = getContrastRatio(contrastFgRgb, contrastBgRgb);

    // WCAG Criteria Checkers
    const passAA_Normal = contrastRatio >= 4.5;
    const passAA_Large = contrastRatio >= 3.0;
    const passAAA_Normal = contrastRatio >= 7.0;
    const passAAA_Large = contrastRatio >= 4.5;

    // --- Tab 3: Tints & Shades State ---
    const getTintsAndShades = (hsl: Hsl) => {
        const tints: string[] = [];
        const shades: string[] = [];

        // 10 Steps of Tints (Lighter, toward 100%)
        for (let i = 1; i <= 10; i++) {
            const newL = hsl.l + ((100 - hsl.l) * (i / 11));
            const rgb = hslToRgb(hsl.h, hsl.s, Math.round(newL));
            tints.push(rgbToHex(rgb.r, rgb.g, rgb.b));
        }

        // 10 Steps of Shades (Darker, toward 0%)
        for (let i = 1; i <= 10; i++) {
            const newL = hsl.l - (hsl.l * (i / 11));
            const rgb = hslToRgb(hsl.h, hsl.s, Math.round(newL));
            shades.push(rgbToHex(rgb.r, rgb.g, rgb.b));
        }

        return { tints: tints.reverse(), shades };
    };
    const { tints, shades } = getTintsAndShades(baseHsl);

    // --- Tab 4: Multi-Converter State ---
    const [cmykC, setCmykC] = useState(0);
    const [cmykM, setCmykM] = useState(0);
    const [cmykY, setCmykY] = useState(0);
    const [cmykK, setCmykK] = useState(0);

    // Keep CMYK sync with main Base Color HSL/RGB
    useEffect(() => {
        const cmyk = rgbToCmyk(baseRgb.r, baseRgb.g, baseRgb.b);
        setCmykC(cmyk.c);
        setCmykM(cmyk.m);
        setCmykY(cmyk.y);
        setCmykK(cmyk.k);
    }, [baseRgb]);

    const handleCmykChange = (channel: 'c' | 'm' | 'y' | 'k', val: number) => {
        let updatedC = cmykC;
        let updatedM = cmykM;
        let updatedY = cmykY;
        let updatedK = cmykK;

        const value = Math.max(0, Math.min(100, val));
        if (channel === 'c') { setCmykC(value); updatedC = value; }
        if (channel === 'm') { setCmykM(value); updatedM = value; }
        if (channel === 'y') { setCmykY(value); updatedY = value; }
        if (channel === 'k') { setCmykK(value); updatedK = value; }

        const rgb = cmykToRgb(updatedC, updatedM, updatedY, updatedK);
        setBaseHex(rgbToHex(rgb.r, rgb.g, rgb.b));
        setBaseRgb(rgb);
        setBaseHsl(rgbToHsl(rgb.r, rgb.g, rgb.b));
    };

    return (
        <div className={`w-full bg-[#0c0c0e] text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-7xl mx-auto rounded-[32px] border border-zinc-900 h-full shadow-[0_0_50px_rgba(0,0,0,0.5)]'}`}>
            
            {/* Left Control Column (Global Base Color Selector) */}
            <aside className={`${isMobile ? 'order-1 w-full border-b' : 'order-1 w-80 border-r'} border-zinc-900 bg-[#0c0c0e] flex flex-col z-20 shrink-0`}>
                <div className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-[#0c0c0e]/80 backdrop-blur-md">
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-3 font-unbounded">
                        <Pipette size={18} /> BASE COLOR
                    </h2>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                    {/* Visual Color Preview Box */}
                    <div 
                        className="w-full aspect-[4/3] rounded-2xl relative shadow-lg overflow-hidden border border-zinc-800 transition-transform hover:scale-[1.02]"
                        style={{ backgroundColor: baseHex }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                            <span className="text-sm font-bold text-white font-mono drop-shadow">{baseHex}</span>
                            <button 
                                onClick={() => triggerCopy(baseHex)}
                                className="p-2 bg-black/60 hover:bg-black/80 rounded-lg text-zinc-300 hover:text-white transition-colors"
                            >
                                {copiedColor === baseHex ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* Simple Picker Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Color Picker</label>
                        <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5 hover:border-zinc-700 transition-colors">
                            <input 
                                type="color" 
                                value={baseHex}
                                onChange={(e) => updateFromHex(e.target.value)}
                                className="w-10 h-10 border-0 bg-transparent rounded-lg cursor-pointer shrink-0 outline-none"
                            />
                            <div className="flex-1 min-w-0">
                                <input 
                                    type="text"
                                    value={baseHex}
                                    onChange={(e) => updateFromHex(e.target.value)}
                                    maxLength={7}
                                    className="w-full bg-transparent border-0 p-0 text-sm font-mono font-bold text-white focus:ring-0 focus:outline-none"
                                    placeholder="#000000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fast presets / Color spectrum blocks */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Presets</label>
                        <div className="grid grid-cols-6 gap-2">
                            {['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#6B7280', '#000000', '#FFFFFF'].map((preset) => (
                                <button 
                                    key={preset}
                                    onClick={() => updateFromHex(preset)}
                                    className="w-full aspect-square rounded-lg border border-zinc-900 hover:scale-110 active:scale-95 transition-transform"
                                    style={{ backgroundColor: preset }}
                                    title={preset}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Interactive Tabbed Panel */}
            <main className="order-2 flex-1 flex flex-col bg-[#09090b] overflow-hidden min-w-0">
                {/* Horizontal Tab bar */}
                <div className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-[#09090b]/80 backdrop-blur-md overflow-x-auto gap-4 scrollbar-none">
                    <div className="flex gap-4">
                        {[
                            { id: 'harmony', label: 'Palette & Harmonies' },
                            { id: 'contrast', label: 'WCAG Contrast' },
                            { id: 'tints-shades', label: 'Tints & Shades' },
                            { id: 'converter', label: 'Color Converter' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as ActiveTab)}
                                className={`text-[11px] font-bold tracking-widest uppercase transition-all whitespace-nowrap h-16 border-b-2 px-1 flex items-center justify-center ${
                                    activeTab === tab.id 
                                        ? 'border-indigo-500 text-white font-black' 
                                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab content area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    
                    {/* Tab 1: Harmony & Palette Board */}
                    {activeTab === 'harmony' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-black text-white font-unbounded uppercase tracking-wider">Color Harmony Rules</h3>
                                    <p className="text-xs text-zinc-500 mt-1 font-medium">Automatic palettes generated using color wheels.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <select 
                                        value={harmonyStrategy}
                                        onChange={(e) => setHarmonyStrategy(e.target.value as HarmonyStrategy)}
                                        className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold text-zinc-300 outline-none focus:border-indigo-500 transition-colors"
                                    >
                                        <option value="complementary">Complementary (2 colors)</option>
                                        <option value="analogous">Analogous (3 colors)</option>
                                        <option value="triadic">Triadic (3 colors)</option>
                                        <option value="split-complementary">Split-Complementary (3 colors)</option>
                                        <option value="tetradic">Tetradic / Double (4 colors)</option>
                                        <option value="monochromatic">Monochromatic (5 colors)</option>
                                    </select>
                                    <Button onClick={downloadPaletteAsPng} variant="secondary" size="sm" className="h-9 font-bold text-xs uppercase tracking-wider rounded-xl">
                                        <Download size={14} className="mr-1.5" /> Export PNG
                                    </Button>
                                </div>
                            </div>

                            {/* Color Grid list */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                                {harmonyColors.map((color, idx) => (
                                    <div 
                                        key={idx} 
                                        className="group rounded-2xl bg-zinc-900/40 border border-zinc-800/80 overflow-hidden shadow-md flex flex-col hover:border-zinc-700/60 transition-colors"
                                    >
                                        <div 
                                            className="w-full aspect-video sm:aspect-square relative cursor-pointer"
                                            style={{ backgroundColor: color.hex }}
                                            onClick={() => triggerCopy(color.hex)}
                                        >
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-[10px] font-bold text-white tracking-widest uppercase">Copy HEX</span>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div>
                                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-0.5">Color {idx + 1}</span>
                                                <h4 className="font-mono text-sm font-bold text-white">{color.hex}</h4>
                                            </div>
                                            <div className="space-y-1.5 pt-2 border-t border-zinc-800/50">
                                                <button 
                                                    onClick={() => triggerCopy(`rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`)}
                                                    className="w-full flex justify-between text-[9px] font-semibold text-zinc-500 hover:text-white font-mono text-left transition-colors"
                                                >
                                                    <span>RGB</span>
                                                    <span>{color.rgb.r}, {color.rgb.g}, {color.rgb.b}</span>
                                                </button>
                                                <button 
                                                    onClick={() => triggerCopy(`hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`)}
                                                    className="w-full flex justify-between text-[9px] font-semibold text-zinc-500 hover:text-white font-mono text-left transition-colors"
                                                >
                                                    <span>HSL</span>
                                                    <span>{color.hsl.h}°, {color.hsl.s}%, {color.hsl.l}%</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tab 2: WCAG Contrast Checker */}
                    {activeTab === 'contrast' && (
                        <div className="space-y-8 animate-fade-in max-w-4xl">
                            <div>
                                <h3 className="text-lg font-black text-white font-unbounded uppercase tracking-wider">WCAG Contrast Checker</h3>
                                <p className="text-xs text-zinc-500 mt-1 font-medium">Verify text readability according to the Web Content Accessibility Guidelines (WCAG 2.1).</p>
                            </div>

                            {/* Foreground / Background color setup fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Foreground (Text) Color</label>
                                    <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5 hover:border-zinc-700 transition-colors">
                                        <input 
                                            type="color" 
                                            value={contrastFg}
                                            onChange={(e) => setContrastFg(e.target.value)}
                                            className="w-8 h-8 border-0 bg-transparent rounded-lg cursor-pointer shrink-0 outline-none"
                                        />
                                        <input 
                                            type="text"
                                            value={contrastFg}
                                            onChange={(e) => setContrastFg(e.target.value)}
                                            maxLength={7}
                                            className="w-full bg-transparent border-0 p-0 text-sm font-mono font-bold text-white focus:ring-0 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Background Color</label>
                                    <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5 hover:border-zinc-700 transition-colors">
                                        <input 
                                            type="color" 
                                            value={contrastBg}
                                            onChange={(e) => setContrastBg(e.target.value)}
                                            className="w-8 h-8 border-0 bg-transparent rounded-lg cursor-pointer shrink-0 outline-none"
                                        />
                                        <input 
                                            type="text"
                                            value={contrastBg}
                                            onChange={(e) => setContrastBg(e.target.value)}
                                            maxLength={7}
                                            className="w-full bg-transparent border-0 p-0 text-sm font-mono font-bold text-white focus:ring-0 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Ratio result overview card */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center bg-zinc-900/20 border border-zinc-900 p-6 md:p-8 rounded-3xl">
                                
                                {/* Ratio Score Display */}
                                <div className="flex flex-col items-center justify-center text-center p-4 border-b lg:border-b-0 lg:border-r border-zinc-900/60 lg:pr-8">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] font-unbounded">Contrast Ratio</span>
                                    <span className="text-6xl font-black font-unbounded text-white tracking-tight mt-3">{contrastRatio}:1</span>
                                    
                                    {/* compliance indicator badge */}
                                    <div className={`mt-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                        contrastRatio >= 4.5 
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                            : contrastRatio >= 3.0 
                                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' 
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {contrastRatio >= 4.5 ? 'Excellent Readability' : contrastRatio >= 3.0 ? 'Marginal Readability' : 'Fails Compliance'}
                                    </div>
                                </div>

                                {/* Detailed Checklist Indicators */}
                                <div className="lg:col-span-2 space-y-4 lg:pl-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-bold text-white">Normal Text (AA)</h4>
                                                <span className="text-[10px] text-zinc-500 font-medium">Req. Ratio 4.5:1</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {passAA_Normal ? <CheckCircle2 className="text-green-500" size={16} /> : <AlertCircle className="text-red-500" size={16} />}
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${passAA_Normal ? 'text-green-500' : 'text-red-500'}`}>{passAA_Normal ? 'Pass' : 'Fail'}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-bold text-white">Large Text (AA)</h4>
                                                <span className="text-[10px] text-zinc-500 font-medium">Req. Ratio 3.0:1</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {passAA_Large ? <CheckCircle2 className="text-green-500" size={16} /> : <AlertCircle className="text-red-500" size={16} />}
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${passAA_Large ? 'text-green-500' : 'text-red-500'}`}>{passAA_Large ? 'Pass' : 'Fail'}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-bold text-white">Normal Text (AAA)</h4>
                                                <span className="text-[10px] text-zinc-500 font-medium">Req. Ratio 7.0:1</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {passAAA_Normal ? <CheckCircle2 className="text-green-500" size={16} /> : <AlertCircle className="text-red-500" size={16} />}
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${passAAA_Normal ? 'text-green-500' : 'text-red-500'}`}>{passAAA_Normal ? 'Pass' : 'Fail'}</span>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-bold text-white">Large Text (AAA)</h4>
                                                <span className="text-[10px] text-zinc-500 font-medium">Req. Ratio 4.5:1</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {passAAA_Large ? <CheckCircle2 className="text-green-500" size={16} /> : <AlertCircle className="text-red-500" size={16} />}
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${passAAA_Large ? 'text-green-500' : 'text-red-500'}`}>{passAAA_Large ? 'Pass' : 'Fail'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live rendering preview panel */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Live Preview</label>
                                <div 
                                    className="p-8 rounded-3xl border border-zinc-800 text-left transition-colors"
                                    style={{ backgroundColor: contrastBg, color: contrastFg }}
                                >
                                    <h4 className="text-2xl font-black tracking-tight mb-2">Lorem Ipsum heading</h4>
                                    <p className="text-sm leading-relaxed mb-6 font-medium">
                                        This is a preview of normal body text. The contrast ratio details whether this text is easy to read for users with various forms of color blindness or low vision.
                                    </p>
                                    <div className="flex gap-4">
                                        <span className="text-xs font-bold px-3 py-1.5 rounded-lg border" style={{ borderColor: contrastFg }}>Sample Button</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Tints & Shades Generator */}
                    {activeTab === 'tints-shades' && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-black text-white font-unbounded uppercase tracking-wider">Tints & Shades</h3>
                                <p className="text-xs text-zinc-500 mt-1 font-medium">A dynamic scale of lighting variations for the base color.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                
                                {/* Tints Scale */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Tints (White Added)</h4>
                                        <span className="text-[9px] text-zinc-600 font-bold uppercase">10 Steps</span>
                                    </div>
                                    <div className="space-y-2">
                                        {tints.map((tintHex, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => triggerCopy(tintHex)}
                                                className="w-full h-11 rounded-xl flex items-center justify-between px-4 cursor-pointer hover:scale-[1.01] transition-transform border border-zinc-900 group"
                                                style={{ backgroundColor: tintHex }}
                                            >
                                                {/* Ensure text color is visible by switching based on luminance */}
                                                <span 
                                                    className="text-xs font-mono font-bold group-hover:scale-105 transition-transform" 
                                                    style={{ color: i > 5 ? '#ffffff' : '#000000' }}
                                                >
                                                    {tintHex}
                                                </span>
                                                <span 
                                                    className="text-[9px] font-bold uppercase tracking-wider" 
                                                    style={{ color: i > 5 ? '#ffffff50' : '#00000050' }}
                                                >
                                                    Step {10 - i}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Shades Scale */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Shades (Black Added)</h4>
                                        <span className="text-[9px] text-zinc-600 font-bold uppercase">10 Steps</span>
                                    </div>
                                    <div className="space-y-2">
                                        {shades.map((shadeHex, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => triggerCopy(shadeHex)}
                                                className="w-full h-11 rounded-xl flex items-center justify-between px-4 cursor-pointer hover:scale-[1.01] transition-transform border border-zinc-900 group"
                                                style={{ backgroundColor: shadeHex }}
                                            >
                                                <span 
                                                    className="text-xs font-mono font-bold group-hover:scale-105 transition-transform" 
                                                    style={{ color: i < 5 ? '#ffffff' : '#ffffff80' }}
                                                >
                                                    {shadeHex}
                                                </span>
                                                <span 
                                                    className="text-[9px] font-bold uppercase tracking-wider" 
                                                    style={{ color: i < 5 ? '#ffffff50' : '#ffffff30' }}
                                                >
                                                    Step {i + 1}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* Tab 4: Color Format Converter */}
                    {activeTab === 'converter' && (
                        <div className="space-y-8 animate-fade-in max-w-2xl">
                            <div>
                                <h3 className="text-lg font-black text-white font-unbounded uppercase tracking-wider">Format Converter</h3>
                                <p className="text-xs text-zinc-500 mt-1 font-medium">Real-time conversion between standard color models.</p>
                            </div>

                            <div className="space-y-6 bg-zinc-900/10 border border-zinc-900 p-6 md:p-8 rounded-3xl">
                                
                                {/* HEX Input */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-xs font-black text-zinc-400 uppercase tracking-wider">HEX Code</label>
                                    <input 
                                        type="text" 
                                        value={baseHex}
                                        onChange={(e) => updateFromHex(e.target.value)}
                                        className="col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-white focus:border-indigo-500 outline-none transition-colors"
                                    />
                                </div>

                                {/* RGB Inputs */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-xs font-black text-zinc-400 uppercase tracking-wider">RGB Channels</label>
                                    <div className="col-span-2 grid grid-cols-3 gap-3">
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min={0} max={255}
                                                value={baseRgb.r}
                                                onChange={(e) => updateFromRgb(parseInt(e.target.value) || 0, baseRgb.g, baseRgb.b)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-bold text-white focus:border-indigo-500 outline-none transition-colors"
                                            />
                                            <span className="absolute left-3 top-3 text-[10px] font-bold text-red-500">R</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min={0} max={255}
                                                value={baseRgb.g}
                                                onChange={(e) => updateFromRgb(baseRgb.r, parseInt(e.target.value) || 0, baseRgb.b)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-bold text-white focus:border-indigo-500 outline-none transition-colors"
                                            />
                                            <span className="absolute left-3 top-3 text-[10px] font-bold text-green-500">G</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min={0} max={255}
                                                value={baseRgb.b}
                                                onChange={(e) => updateFromRgb(baseRgb.r, baseRgb.g, parseInt(e.target.value) || 0)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-bold text-white focus:border-indigo-500 outline-none transition-colors"
                                            />
                                            <span className="absolute left-3 top-3 text-[10px] font-bold text-blue-500">B</span>
                                        </div>
                                    </div>
                                </div>

                                {/* HSL Inputs */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-xs font-black text-zinc-400 uppercase tracking-wider">HSL Channels</label>
                                    <div className="col-span-2 grid grid-cols-3 gap-3">
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min={0} max={360}
                                                value={baseHsl.h}
                                                onChange={(e) => updateFromHsl(parseInt(e.target.value) || 0, baseHsl.s, baseHsl.l)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-bold text-white focus:border-indigo-500 outline-none transition-colors"
                                            />
                                            <span className="absolute left-3 top-3 text-[10px] font-bold text-zinc-500">H</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min={0} max={100}
                                                value={baseHsl.s}
                                                onChange={(e) => updateFromHsl(baseHsl.h, parseInt(e.target.value) || 0, baseHsl.l)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-bold text-white focus:border-indigo-500 outline-none transition-colors"
                                            />
                                            <span className="absolute left-3 top-3 text-[10px] font-bold text-zinc-500">S</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min={0} max={100}
                                                value={baseHsl.l}
                                                onChange={(e) => updateFromHsl(baseHsl.h, baseHsl.s, parseInt(e.target.value) || 0)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-bold text-white focus:border-indigo-500 outline-none transition-colors"
                                            />
                                            <span className="absolute left-3 top-3 text-[10px] font-bold text-zinc-500">L</span>
                                        </div>
                                    </div>
                                </div>

                                {/* CMYK Inputs */}
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-xs font-black text-zinc-400 uppercase tracking-wider">CMYK Channels</label>
                                    <div className="col-span-2 grid grid-cols-4 gap-2">
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min={0} max={100}
                                                value={cmykC}
                                                onChange={(e) => handleCmykChange('c', parseInt(e.target.value) || 0)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-1 py-2.5 text-[11px] font-mono font-bold text-white focus:border-indigo-500 outline-none transition-colors"
                                            />
                                            <span className="absolute left-2 top-3 text-[9px] font-bold text-cyan-500">C</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min={0} max={100}
                                                value={cmykM}
                                                onChange={(e) => handleCmykChange('m', parseInt(e.target.value) || 0)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-1 py-2.5 text-[11px] font-mono font-bold text-white focus:border-indigo-500 outline-none transition-colors"
                                            />
                                            <span className="absolute left-2 top-3 text-[9px] font-bold text-pink-500">M</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min={0} max={100}
                                                value={cmykY}
                                                onChange={(e) => handleCmykChange('y', parseInt(e.target.value) || 0)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-1 py-2.5 text-[11px] font-mono font-bold text-white focus:border-indigo-500 outline-none transition-colors"
                                            />
                                            <span className="absolute left-2 top-3 text-[9px] font-bold text-yellow-500">Y</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min={0} max={100}
                                                value={cmykK}
                                                onChange={(e) => handleCmykChange('k', parseInt(e.target.value) || 0)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-1 py-2.5 text-[11px] font-mono font-bold text-white focus:border-indigo-500 outline-none transition-colors"
                                            />
                                            <span className="absolute left-2 top-3 text-[9px] font-bold text-zinc-400">K</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};
